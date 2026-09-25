const test=require("node:test"),assert=require("node:assert/strict"),fs=require("node:fs/promises"),path=require("node:path"),os=require("node:os");
const {createSupabaseApi}=require("../js/shared/supabase-api");
const {createOcelotPackage}=require("../scripts/package-ocelot");
const baseUrl="https://example.test/Capstone/", uid="11111111-1111-4111-8111-111111111111";
const input={name:"Fictional",email:"fictional@example.test",question:"TEST",details:"Test only",category:"Other",identityContext:"supabase-requester-v1",attachments:[{name:"test.txt",size:4,data:btoa("test")}]};
function fixture() {
  const requests=[]; const f={requests,failUpload:false,lostResponse:false,finalized:0,bytes:null,signOut:0};
  f.client={auth:{getSession:async()=>({data:{session:{user:{id:uid}}}}),signOut:async()=>{f.signOut++;return{};},signInWithPassword:async()=>({data:{user:{id:uid}}})},
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
    if(page.includes("staff")){
      assert.match(html,/<label id="staff-password-label" for="staff-password" hidden>Password<\/label>/);
      assert.doesNotMatch(html,/Supabase password/);
      assert.match(html,/<input id="staff-password" type="password" autocomplete="current-password"/);
      assert.doesNotMatch(html,/Run <code>npm.cmd run staff:password/);
    }
  }
  const bundle=await fs.readFile(path.join(built.uploadDirectory,"js/shared/supabase.bundle.js"),"utf8");
  assert.match(bundle,/sb_publishable_fixture/);assert.match(bundle,/capstone_finalize/);
  assert.ok(!built.manifest.some(item=>/^(server|data|docs|api)\//.test(item.file)));
  assert.ok(!built.manifest.some(item=>item.file.includes("browser-demo")));
  await assert.rejects(()=>createOcelotPackage({root,outputRoot:out,transport:"supabase",supabaseConfig:{url:"https://abcdefghijklmnopqrst.supabase.co",publishableKey:"sb_secret_no"}}),/publishable/);
});
test("Supabase sign-in prompt uses plain password wording without changing access checks",async()=>{
  const f=fixture();
  f.client.auth.getSession=async()=>({data:{session:null}});
  const response=await f.api.fetch("/api/staff/session");
  assert.equal(response.status,401);
  assert.equal((await response.json()).error,"Sign in with your staff email and password.");
});

const passwordInput={currentPassword:"fictional-old-password",newPassword:"fictional-new-password",confirmPassword:"fictional-new-password"};
const changePassword=(f,changes={})=>f.api.fetch("/api/staff/password",{method:"POST",body:JSON.stringify({...passwordInput,...changes})});
test("password change verifies the current password and changes only the signed-in active staff account",async()=>{
  const f=fixture(),calls=[];
  f.client.auth.signInWithPassword=async input=>{calls.push(["verify",input]);return{data:{user:{id:uid}}};};
  f.client.auth.updateUser=async input=>{calls.push(["update",input]);return{data:{user:{id:uid}}};};
  const response=await changePassword(f,{email:"outsider@example.test",userId:"ignored",data:{staff:true}});
  assert.equal(response.status,200);assert.deepEqual(await response.json(),{ok:true});
  assert.deepEqual(calls,[
    ["verify",{email:"afeli016@fiu.edu",password:passwordInput.currentPassword}],
    ["update",{password:passwordInput.newPassword,current_password:passwordInput.currentPassword}]
  ]);
  assert.deepEqual(f.requests.map(r=>r.name),["capstone_staff_session","capstone_staff_session"]);
  assert.equal(f.signOut,0);
});
test("password validation rejects missing, short, oversized, unchanged, and mismatched inputs before Auth calls",async()=>{
  const f=fixture();
  f.client.auth.signInWithPassword=async()=>{throw new Error("Must not call Auth");};
  for(const change of [{currentPassword:""},{currentPassword:3},{currentPassword:"a".repeat(129)},
    {newPassword:"short"},{newPassword:null},{newPassword:" ".repeat(8)},{newPassword:"a".repeat(129)},
    {newPassword:passwordInput.currentPassword,confirmPassword:passwordInput.currentPassword},{confirmPassword:"mismatch"}]) {
    assert.equal((await changePassword(f,change)).status,400);
  }
  assert.equal(f.requests.length,0);
});
test("signed-out, retired/unbound, or changed identities cannot change a staff password",async()=>{
  for(const mode of ["signed-out","unbound","switched","revoked"]) {
    const f=fixture();let updates=0,checks=0;
    f.client.auth.updateUser=async()=>{updates++;return{data:{user:{id:uid}}};};
    if(mode==="signed-out") f.client.auth.getSession=async()=>({data:{session:null}});
    if(mode==="unbound" || mode==="revoked") f.client.rpc=async()=>{
      checks++;return mode==="revoked"&&checks===1 ? {data:{staff:{email:"afeli016@fiu.edu"}}} : {error:{code:"PT403",message:"Unauthorized access"}};
    };
    if(mode==="switched") f.client.auth.signInWithPassword=async()=>({data:{user:{id:"different-user"}}});
    assert.equal((await changePassword(f)).status,["unbound","revoked"].includes(mode)?403:401);
    assert.equal(updates,0);
    if(mode==="switched") assert.equal(f.signOut,1);
  }
});
test("incorrect current password and Auth failures do not leak provider messages or confirm success",async()=>{
  const cases=[
    ["verify",{code:"invalid_credentials"},400,/current password is incorrect/],
    ["verify",{status:429},429,/Too many attempts/],
    ["verify",{code:"unknown"},503,/No password change was attempted/],
    ["update",{code:"weak_password"},400,/stronger password/],
    ["update",{code:"same_password"},400,/different/],
    ["update",{code:"current_password_mismatch"},400,/incorrect/],
    ["update",{code:"reauthentication_needed"},400,/Sign out and sign in again/],
    ["update",{code:"session_not_found"},401,/session has ended/],
    ["update",{status:429},429,/Too many attempts/],
    ["update",{code:"unknown"},503,/No password change was confirmed/]
  ];
  for(const [stage,error,status,pattern] of cases) {
    const f=fixture();let updates=0;
    f.client.auth.updateUser=async()=>{updates++;return stage==="update"?{error:{...error,message:passwordInput.newPassword}}:{data:{user:{id:uid}}};};
    if(stage==="verify") f.client.auth.signInWithPassword=async()=>({error:{...error,message:passwordInput.currentPassword}});
    const response=await changePassword(f),body=await response.json();
    assert.equal(response.status,status);assert.match(body.error,pattern);
    assert.ok(!JSON.stringify(body).includes("fictional-"));assert.equal(body.ok,undefined);
    assert.equal(updates,stage==="update"?1:0);
  }
  for(const result of [{data:{}},{data:{user:{id:"wrong"}}},null]) {
    const f=fixture();f.client.auth.updateUser=async()=>{if(!result)throw new Error(passwordInput.newPassword);return result;};
    const response=await changePassword(f);assert.equal(response.status,503);
    assert.doesNotMatch((await response.json()).error,/fictional-/);
  }
});
test("password changes prevent duplicate submission and concurrent login/logout and release the lock on failure",async()=>{
  const f=fixture();let release;
  f.client.auth.updateUser=()=>new Promise(resolve=>{release=resolve;});
  const first=changePassword(f);
  while(!release) await new Promise(resolve=>setImmediate(resolve));
  assert.equal((await changePassword(f)).status,409);
  for(const route of ["login","logout"]) assert.equal((await f.api.fetch("/api/staff/"+route,{method:"POST",body:"{}"})).status,409);
  release({error:{code:"weak_password"}});assert.equal((await first).status,400);
  f.client.auth.updateUser=async()=>({data:{user:{id:uid}}});
  assert.equal((await changePassword(f)).status,200);
});
test("pinned Supabase SDK sends current_password and new password only to its authenticated Auth endpoint (mock network)",async()=>{
  const {createClient}=require("@supabase/supabase-js");
  const requests=[],exp=Math.floor(Date.now()/1000)+3600;
  const token=[{alg:"HS256",typ:"JWT"},{sub:uid,exp,aud:"authenticated"}].map(value=>Buffer.from(JSON.stringify(value)).toString("base64url")).join(".")+".fictional-signature";
  const user={id:uid,email:"afeli016@fiu.edu",aud:"authenticated",role:"authenticated",app_metadata:{},user_metadata:{},created_at:"2026-09-24T00:00:00Z"};
  const sdk=createClient("https://fixture.supabase.co","sb_publishable_fixture",{
    auth:{persistSession:false,autoRefreshToken:false,detectSessionInUrl:false},
    global:{fetch:async(url,options)=>{
      const target=new URL(url);assert.equal(target.origin,"https://fixture.supabase.co");
      const body=options.body?JSON.parse(options.body):null;
      requests.push({path:target.pathname,method:options.method,body});
      if(target.pathname==="/auth/v1/token") return new Response(JSON.stringify({access_token:token,refresh_token:"fictional-refresh",token_type:"bearer",expires_in:3600,user}),{status:200,headers:{"Content-Type":"application/json"}});
      if(target.pathname==="/auth/v1/user"&&options.method==="PUT") return new Response(JSON.stringify(user),{status:200,headers:{"Content-Type":"application/json"}});
      throw new Error("Unexpected mocked Auth endpoint");
    }}
  });
  assert.equal((await sdk.auth.signInWithPassword({email:user.email,password:passwordInput.currentPassword})).error,null);
  const f=fixture();
  f.api=createSupabaseApi({baseUrl,staffClient:{auth:sdk.auth,rpc:f.client.rpc},guestClient:f.client,knowledge:{}});
  assert.equal((await changePassword(f)).status,200);
  assert.equal(requests.filter(request=>request.path==="/auth/v1/token").length,2);
  const updates=requests.filter(request=>request.path==="/auth/v1/user");
  assert.equal(updates.length,1);
  assert.deepEqual(updates[0].body,{password:passwordInput.newPassword,current_password:passwordInput.currentPassword,code_challenge:null,code_challenge_method:null});
});
