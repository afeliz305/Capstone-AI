const test=require("node:test"),assert=require("node:assert/strict"),fs=require("node:fs/promises"),path=require("node:path"),os=require("node:os");
const {createSupabaseApi}=require("../js/shared/supabase-api");
const {createOcelotPackage}=require("../scripts/package-ocelot");
const baseUrl="https://example.test/Capstone/", uid="11111111-1111-4111-8111-111111111111";
const input={name:"Fictional",email:"fictional@example.test",question:"TEST",details:"Test only",category:"Other",identityContext:"supabase-requester-v1",attachments:[{name:"test.txt",size:4,data:btoa("test")}]};
function fixture() {
  const requests=[]; const f={requests,failUpload:false,lostResponse:false,finalized:0,bytes:null,signOut:0};
  f.client={auth:{getSession:async()=>({data:{session:{user:{id:uid}}}}),signOut:async()=>{f.signOut++;return{};},signInWithPassword:async()=>({data:{}})},
    rpc:async(name,args)=>{
      requests.push({name,args});
      if(name==="capstone_staff_session") return{data:{staff:{email:"afeli016@fiu.edu"},members:[],loginMode:"password"}};
      if(name==="capstone_submit") return{data:{id:"CAP-1001",complete:false,attachments:[{id:"22222222-2222-4222-8222-222222222222",path:uid+"/CAP-1001/22222222-2222-4222-8222-222222222222",name:"test.txt",size:4,type:"text/plain"}]}};
      if(name==="capstone_finalize") {f.finalized++;if(f.lostResponse){f.lostResponse=false;return{error:{code:"NETWORK"}};}return{data:{id:"CAP-1001",status:"open"}};}
      return {data:[]};
    },storage:{from:()=>({upload:async(p,bytes,options)=>{assert.equal(options.upsert,false); if(f.failUpload)return{error:{code:"FAILED"}}; if(f.bytes)return{error:{code:"DUPLICATE"}};f.bytes=bytes;return{};},download:async()=>f.bytes?{data:new Blob([f.bytes])}:{error:{code:"NOT_FOUND"}}})}};
  f.api=createSupabaseApi({baseUrl,staffClient:f.client,guestClient:f.client,knowledge:{}}); return f;
}
const submit=f=>f.api.fetch("/api/tickets",{method:"POST",body:JSON.stringify(input)});
test("Supabase attachment failure never confirms a ticket or falls back to local persistence",async()=>{
  const f=fixture();f.failUpload=true;
  assert.equal((await submit(f)).status,503);assert.equal(f.finalized,0);
  f.failUpload=false;assert.equal((await submit(f)).status,201);
  const submits=f.requests.filter(r=>r.name==="capstone_submit");
  assert.equal(submits[0].args.request_id,submits[1].args.request_id);
  assert.equal(submits[0].args.input.attachments[0].data,undefined);
});
test("Supabase uncertain finalization retries the same submission and verifies existing file bytes",async()=>{
  const f=fixture();f.lostResponse=true;
  assert.equal((await submit(f)).status,503);assert.equal((await submit(f)).status,201);
  const submits=f.requests.filter(r=>r.name==="capstone_submit");
  assert.equal(submits[0].args.request_id,submits[1].args.request_id);
});
test("Supabase rejects unsafe routes, invalid documents and unprovisioned staff",async()=>{
  const f=fixture();assert.equal((await f.api.fetch("https://attacker.test")).status,400);
  assert.notEqual((await f.api.fetch("/api/tickets",{method:"POST",body:JSON.stringify({...input,attachments:[{name:"fake.pdf",size:4,data:btoa("fake")} ]})})).status,201);
  f.client.rpc=async()=>({error:{code:"PT403",message:"Unauthorized access"}});
  const response=await f.api.fetch("/api/staff/login",{method:"POST",body:JSON.stringify({email:"outsider@example.test",password:"fictional-test-password"})});
  assert.equal(response.status,403);assert.equal(f.signOut,2);
});
test("Supabase package has a bundled SDK, correct labels, and no private files or PHP",async()=>{
  const root=path.resolve(__dirname,".."),out=await fs.mkdtemp(path.join(os.tmpdir(),"capstone-supabase-package-"));
  const built=await createOcelotPackage({root,outputRoot:out,transport:"supabase",supabaseConfig:{url:"https://abcdefghijklmnopqrst.supabase.co",publishableKey:"sb_publishable_fixture"}});
  for(const page of ["index.html","pages/staff.html"]) {
    const html=await fs.readFile(path.join(built.uploadDirectory,page),"utf8");
    assert.match(html,/data-api-transport="supabase"/);assert.match(html,/Supabase shared test queue/);assert.match(html,/supabase.bundle.js/);
    if(page.includes("staff")){assert.match(html,/Supabase password/);assert.doesNotMatch(html,/Run <code>npm.cmd run staff:password/);}
  }
  const bundle=await fs.readFile(path.join(built.uploadDirectory,"js/shared/supabase.bundle.js"),"utf8");
  assert.match(bundle,/sb_publishable_fixture/);assert.match(bundle,/capstone_finalize/);
  assert.ok(!built.manifest.some(item=>/^(server|data|docs|api)\//.test(item.file)));
  assert.ok(!built.manifest.some(item=>item.file.includes("browser-demo")));
  await assert.rejects(()=>createOcelotPackage({root,outputRoot:out,transport:"supabase",supabaseConfig:{url:"https://abcdefghijklmnopqrst.supabase.co",publishableKey:"sb_secret_no"}}),/publishable/);
});
