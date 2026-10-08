const test=require("node:test");
const assert=require("node:assert/strict");
const fs=require("node:fs/promises");
const os=require("node:os");
const path=require("node:path");
const {PortalNativeMira,PRIVATE_TTL}=require("../portal-native/mira-service");
const {validateHostAdapter}=require("../portal-native/host-adapter");
const {readDestination,buildVerifiedLink,buildOwnerContinuation,validateOwnerContinuation,applyOwnerDestination}=require("../portal-native/navigation-continuation");
const {createOcelotPackage}=require("../scripts/package-ocelot");
const {buildPortalNative}=require("../scripts/build-portal-native");
const {packagePortalOwner}=require("../scripts/package-portal-owner");
const {execFile}=require("node:child_process");
const {promisify}=require("node:util");
const execFileAsync=promisify(execFile);

function fixture({now=()=>Date.now()}={}){
  let binding="synthetic-user-a",listener=()=>{},reads=0,opens=[];
  const data={
    Grade:[{kind:"grade",heading:"Posted grade for current term",text:"Current term posted grade score is 91 points. Previous term posted grade was 84 points.",subview:"Current and previous terms"}],
    Board:[{kind:"task",heading:"Current sprint task",text:"Current sprint deadline is October 2. Acceptance criteria require verified evidence and the Definition of Done.",subview:"Sprint board"}],
    Resources:[{kind:"resource",heading:"Stand-up template",text:"The stand-up template requires progress, next work, blockers, verification, review, and retrospective notes.",subview:"Course templates"}],
    Inbox:[{kind:"messages",heading:"Inbox summary",text:"One unread channel indicator is visible without opening a conversation.",subview:"Inbox metadata"}]
  };
  const sources=Object.keys(data).map(section=>({id:"source-"+section.toLowerCase(),section,label:section,readable:true,messageContentReadable:false}));
  const adapter={
    getVerifiedSession:async()=>({state:"verified",binding}),
    listAccessibleSources:async()=>sources,
    readAuthorizedSection:async({sourceId,section})=>{reads++;return{sessionBinding:binding,section,records:data[section]||[],coverage:"Synthetic authorized "+section+" fixture."};},
    resolveSourceDestination:async({section})=>({capability:"exact-section",url:({Board:"https://capstone.cs.fiu.edu/board",Inbox:"https://capstone.cs.fiu.edu/inbox"}[section]||"https://capstone.cs.fiu.edu/portal#"+({Grade:"mygrade",Resources:"resources"}[section]||"home")),label:"Open "+section}),
    openAuthorizedSection:async input=>{opens.push(input);return{capability:"exact-section",url:"https://capstone.cs.fiu.edu/portal",label:"Opened "+input.section};},
    subscribeToSessionChanges:callback=>{listener=callback;return()=>{listener=()=>{};};}
  };
  return{adapter,now,get binding(){return binding;},setBinding(value){binding=value;listener({state:"verified",binding:value});},logout(){listener({state:"signed-out"});},get reads(){return reads;},opens,data};
}

test("owner adapter contract fails closed when a required portal hook is missing",()=>{
  assert.throws(()=>validateHostAdapter({}),/missing:/);
});

test("verified portal destinations use observed hash routes and proposed continuations stay allowlisted",async()=>{
  assert.equal(buildVerifiedLink("grade"),"https://capstone.cs.fiu.edu/portal#mygrade");
  assert.deepEqual(readDestination("https://capstone.cs.fiu.edu/portal#mygrade"),{sectionId:"grade",section:"Grade",viewId:"mygrade",assistant:false});
  assert.equal(buildOwnerContinuation("grade",{assistant:true}),"/portal?section=grade&assistant=1#mygrade");
  assert.equal(validateOwnerContinuation("/portal?section=grade&assistant=1#mygrade"),"/portal?section=grade&assistant=1#mygrade");
  assert.equal(buildVerifiedLink("board"),"https://capstone.cs.fiu.edu/board");
  assert.deepEqual(readDestination("https://capstone.cs.fiu.edu/board"),{sectionId:"board",section:"Board",viewId:null,assistant:false});
  assert.equal(buildOwnerContinuation("board",{assistant:true}),"/board?assistant=1");
  assert.equal(validateOwnerContinuation("/board?assistant=1"),"/board?assistant=1");
  for(const unsafe of ["https://evil.test/portal?section=grade","/portal?section=javascript:alert(1)","/admin#mygrade","/portal?section=unknown"] )assert.equal(validateOwnerContinuation(unsafe),null);
  const f=fixture();
  const opened=await applyOwnerDestination(f.adapter,"https://capstone.cs.fiu.edu/portal?section=grade&assistant=1#mygrade");
  assert.equal(opened.state,"opened");assert.equal(opened.section,"Grade");assert.equal(opened.assistant,true);
  f.adapter.getVerifiedSession=async()=>({state:"signed-out"});
  const pending=await applyOwnerDestination(f.adapter,"https://capstone.cs.fiu.edu/portal?section=grade#mygrade");
  assert.equal(pending.state,"sign-in-required");assert.equal(pending.continuation,"/portal?section=grade#mygrade");
  f.adapter.getVerifiedSession=async()=>({state:"verified",binding:"synthetic-user-a"});
  f.adapter.listAccessibleSources=async()=>[];
  await assert.rejects(applyOwnerDestination(f.adapter,"https://capstone.cs.fiu.edu/portal#mygrade"),/not available/);
});

test("portal-native MIRA keeps Grade navigation-only and searches sprint and nested resource evidence",async()=>{
  const f=fixture(),service=new PortalNativeMira({adapter:f.adapter,now:f.now});
  const grade=await service.ask("What is my posted grade?");
  assert.equal(grade.personal,true);assert.equal(grade.answerStatus,"not_found");assert.equal(grade.sources.length,0);assert.doesNotMatch(JSON.stringify(grade),/91 points|84 points/);assert.equal(f.reads,0);
  const sprint=await service.ask("What is my current sprint deadline and acceptance criteria?");assert.match(sprint.sources[0].excerpt,/October 2/);
  const resource=await service.ask("What does my stand-up template require?");assert.match(resource.sources[0].excerpt,/retrospective/);
  service.destroy();
});

test("private snapshots expire from original retrieval time and searches never extend them",async()=>{
  let clock=Date.parse("2026-09-26T12:00:00Z");const f=fixture({now:()=>clock}),service=new PortalNativeMira({adapter:f.adapter,now:()=>clock});
  await service.ask("What work is assigned to me on the board?");assert.equal(f.reads,1);
  clock+=PRIVATE_TTL-1;await service.ask("What work is assigned to me on the board?");assert.equal(f.reads,1);
  clock+=2;service.resume();assert.deepEqual(service.status().loadedSections,[]);
  await service.ask("What work is assigned to me on the board?");assert.equal(f.reads,2);
  service.destroy();
});

test("account switch, logout and late reads cannot return the previous user's private data",async()=>{
  const f=fixture();let release;
  f.adapter.readAuthorizedSection=({section})=>new Promise(resolve=>{release=()=>resolve({sessionBinding:"synthetic-user-a",section,records:f.data[section],coverage:"Late fixture"});});
  const service=new PortalNativeMira({adapter:f.adapter});
  const pending=service.ask("What work is assigned to me on the board?");while(!release)await new Promise(resolve=>setImmediate(resolve));
  f.setBinding("synthetic-user-b");release();await assert.rejects(pending,/session changed/i);assert.deepEqual(service.status().loadedSections,[]);
  f.logout();assert.equal(service.status().state,"not-connected");service.destroy();
});

test("Inbox returns metadata only even when legacy message-content scope is requested",async()=>{
  const f=fixture(),service=new PortalNativeMira({adapter:f.adapter,messageContent:true});
  const result=await service.ask("Do I have unread messages?");
  assert.equal(f.reads,1);assert.equal(result.sources[0].section,"Inbox");assert.match(result.sources[0].excerpt,/unread channel indicator/);assert.doesNotMatch(result.sources[0].excerpt,/conversation body/i);service.destroy();
});

test("Ocelot package excludes owner-only assets while the separate owner bundle builds",async()=>{
  const root=path.resolve(__dirname,".."),temp=await fs.mkdtemp(path.join(os.tmpdir(),"capstone-owner-test-"));
  const built=await createOcelotPackage({root,outputRoot:temp,transport:"browser"});
  assert.ok(!built.manifest.some(item=>item.file.startsWith("portal-native/")||item.file.startsWith("js/hosted/")));
  const ownerOutput=path.join(temp,"owner");await buildPortalNative({root,output:ownerOutput});
  const js=await fs.readFile(path.join(ownerOutput,"mira-portal-native.bundle.js"),"utf8");
  assert.match(js,/CapstonePortalNativeMira/);assert.doesNotMatch(js,/ocelot\.aul\.fiu\.edu|chrome\.debugger|localhost:3005/);
  assert.ok((await fs.stat(path.join(ownerOutput,"mira-portal-native.css"))).size>100);
});

test("portal-owner release is a sanitized standalone review package with checksums",async()=>{
  const root=path.resolve(__dirname,".."),temp=await fs.mkdtemp(path.join(os.tmpdir(),"capstone-owner-release-"));
  const released=await packagePortalOwner({root,outputRoot:temp,now:new Date("2026-09-26T12:00:00Z")});
  const manifest=JSON.parse(await fs.readFile(path.join(released.packageDirectory,"manifest.json"),"utf8"));
  const names=manifest.files.map(item=>item.file);
  for(const required of ["README.md","TESTING.md","assets/mira-portal-native.bundle.js","assets/mira-portal-native.css","portal-native/host-adapter.js","portal-native/navigation-continuation.js","portal-native/examples/synthetic-host-adapter.js","portal-native/owner-contract.test.js","js/shared/portal-navigation.js"])assert.ok(names.includes(required),required);
  assert.ok(!names.some(name=>/supabase|ocelot|extension|node_modules|server\/|data\//i.test(name)));
  const archive=await fs.readFile(released.archive);
  assert.equal(archive.readUInt32LE(0),0x04034b50);
  assert.match(await fs.readFile(path.join(released.packageDirectory,"SHA256SUMS.txt"),"utf8"),/[a-f0-9]{64}  assets\/mira-portal-native\.bundle\.js/);
  const childEnv={...process.env};delete childEnv.NODE_TEST_CONTEXT;
  const result=await execFileAsync(process.execPath,["--test","portal-native/owner-contract.test.js"],{cwd:released.packageDirectory,env:childEnv});
  assert.match(result.stdout+result.stderr,/pass 3/);
});
