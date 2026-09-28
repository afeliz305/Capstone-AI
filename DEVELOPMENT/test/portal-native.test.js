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
    Team:[{kind:"task",heading:"Current sprint task",text:"Current sprint deadline is October 2. Acceptance criteria require verified evidence and the Definition of Done.",subview:"Sprint board"}],
    Resources:[{kind:"resource",heading:"Stand-up template",text:"The stand-up template requires progress, next work, blockers, verification, review, and retrospective notes.",subview:"Course templates"}],
    Messages:[{kind:"messages",heading:"Message summary",text:"Message metadata is available without opening a conversation.",subview:"Messages metadata"}]
  };
  const sources=Object.keys(data).map(section=>({id:"source-"+section.toLowerCase(),section,label:section,readable:true,messageContentReadable:false}));
  const adapter={
    getVerifiedSession:async()=>({state:"verified",binding}),
    listAccessibleSources:async()=>sources,
    readAuthorizedSection:async({sourceId,section})=>{reads++;return{sessionBinding:binding,section,records:data[section]||[],coverage:"Synthetic authorized "+section+" fixture."};},
    resolveSourceDestination:async({section})=>({capability:"exact-section",url:"https://capstone.cs.fiu.edu/portal#"+({Grade:"mygrade",Team:"team",Resources:"resources",Messages:"messages"}[section]||"home"),label:"Open "+section}),
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

test("portal-native MIRA searches authorized grade, sprint and nested resource evidence",async()=>{
  const f=fixture(),service=new PortalNativeMira({adapter:f.adapter,now:f.now});
  const grade=await service.ask("What is my posted grade?");
  assert.equal(grade.personal,true);assert.equal(grade.status,"matched");assert.match(grade.sources[0].excerpt,/91 points/);assert.equal(grade.sources[0].destination.url,"https://capstone.cs.fiu.edu/portal#mygrade");
  const follow=await service.ask("Where does it say that?",grade.sources[0].id);
  assert.equal(follow.navigationRequested,true);assert.equal(follow.sources[0].id,grade.sources[0].id);
  await service.openSource(grade.sources[0].id);assert.equal(f.opens.at(-1).section,"Grade");
  const sprint=await service.ask("What is my current sprint deadline and acceptance criteria?");assert.match(sprint.sources[0].excerpt,/October 2/);
  const resource=await service.ask("What does my stand-up template require?");assert.match(resource.sources[0].excerpt,/retrospective/);
  service.destroy();
});

test("private snapshots expire from original retrieval time and searches never extend them",async()=>{
  let clock=Date.parse("2026-09-26T12:00:00Z");const f=fixture({now:()=>clock}),service=new PortalNativeMira({adapter:f.adapter,now:()=>clock});
  await service.ask("What is my posted grade?");assert.equal(f.reads,1);
  clock+=PRIVATE_TTL-1;await service.ask("What is my posted grade?");assert.equal(f.reads,1);
  clock+=2;service.resume();assert.deepEqual(service.status().loadedSections,[]);
  await service.ask("What is my posted grade?");assert.equal(f.reads,2);
  service.destroy();
});

test("account switch, logout and late reads cannot return the previous user's private data",async()=>{
  const f=fixture();let release;
  f.adapter.readAuthorizedSection=({section})=>new Promise(resolve=>{release=()=>resolve({sessionBinding:"synthetic-user-a",section,records:f.data[section],coverage:"Late fixture"});});
  const service=new PortalNativeMira({adapter:f.adapter});
  const pending=service.ask("What is my posted grade?");while(!release)await new Promise(resolve=>setImmediate(resolve));
  f.setBinding("synthetic-user-b");release();await assert.rejects(pending,/session changed/i);assert.deepEqual(service.status().loadedSections,[]);
  f.logout();assert.equal(service.status().state,"not-connected");service.destroy();
});

test("message content stays unavailable unless the owner exposes a confirmed non-mutating source",async()=>{
  const f=fixture(),service=new PortalNativeMira({adapter:f.adapter,messageContent:true});
  await assert.rejects(service.ask("Read my messages"),/outside the approved read scope/);
  assert.equal(f.reads,0);service.destroy();
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
