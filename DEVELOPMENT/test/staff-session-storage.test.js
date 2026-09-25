"use strict";
const test = require("node:test");
const assert = require("node:assert/strict");
const { createStaffSessionStorage, REMEMBER_MS } = require("../js/shared/staff-session-storage");
const { createSupabaseApi } = require("../js/shared/supabase-api");
const key = "capstone-supabase:https://fixture.supabase.co:/Capstone/:staff";
const token = JSON.stringify({ access_token:"fictional-access", refresh_token:"fictional-refresh", user:{id:"fictional-staff"} });
function store() {
  const values = new Map();
  return { values, getItem:k=>values.get(k)??null, setItem:(k,v)=>values.set(k,v), removeItem:k=>values.delete(k) };
}
function fixture(persistentStorage = store(), tabStorage = store()) {
  let time = Date.now(), id = 0, scheduled;
  const sessions = createStaffSessionStorage({ key, tabStorage, persistentStorage,
    now:()=>time, uuid:()=>"lease-"+(++id), schedule:(fn,delay)=>{scheduled={fn,delay};return 1;}, cancel:()=>{scheduled=null;} });
  return { sessions, storage:sessions.storage, tab:tabStorage, local:persistentStorage,
    advance:ms=>{time+=ms;}, get scheduled(){return scheduled;} };
}
function login(f, remember = true) {
  f.sessions.beginLogin(); f.storage.setItem(key,token);
  return remember ? f.sessions.remember() : null;
}
test("staff sessions default to tab-only and preserve legacy tab sign-in without promotion",()=>{
  const f=fixture(); login(f,false);
  assert.equal(f.local.values.size,0);
  assert.equal(fixture(f.local,f.tab).storage.getItem(key),token);
  assert.equal(fixture(f.local).storage.getItem(key),null);
});
test("Remember me survives a new tab/browser session, only in the same origin/project/folder scope",()=>{
  const f=fixture();login(f);
  assert.equal(f.tab.getItem(key),null);
  assert.equal(fixture(f.local).storage.getItem(key),token);
  const other=createStaffSessionStorage({key:key.replace("/Capstone/","/Other/"),tabStorage:store(),persistentStorage:f.local});
  assert.equal(other.storage.getItem(key.replace("/Capstone/","/Other/")),null);
  assert.equal(f.storage.getItem(key.replace(":staff",":requester")),null);
  assert.doesNotMatch(JSON.stringify([...f.local.values]),/password/);
});
test("seven-day absolute deadline survives refresh/reauth and rejects late writes or timer wakeups",()=>{
  const f=fixture();const expiresAt=login(f);let ended=0;f.sessions.onEnded(()=>ended++);
  const timer=f.scheduled;
  assert.equal(timer.delay,REMEMBER_MS);
  f.advance(REMEMBER_MS-1);
  f.storage.setItem(key,"refreshed-session");
  assert.equal(JSON.parse(f.local.getItem(f.sessions.rememberedKey)).expiresAt,expiresAt);
  assert.equal(f.storage.getItem(key),"refreshed-session");
  f.advance(1);timer.fn();
  assert.equal(ended,1);assert.equal(f.storage.getItem(key),null);
  assert.equal(f.local.values.size,0);assert.equal(f.tab.values.size,0);
  f.storage.setItem(key,token);assert.equal(f.storage.getItem(key),null);
});
test("expired remembered sessions are removed on reopen even if the browser was closed at expiry",()=>{
  const f=fixture();login(f);
  const reopened=fixture(f.local);reopened.advance(REMEMBER_MS+1000);
  assert.equal(reopened.storage.getItem(key),null);assert.equal(f.local.values.size,0);
});
test("sign out clears remembered tokens in other tabs and a late refresh cannot restore them",()=>{
  const f=fixture();login(f);const second=fixture(f.local);
  assert.equal(second.storage.getItem(key),token);
  let ended=0;second.sessions.onEnded(()=>ended++);
  f.sessions.clear();second.sessions.check();
  assert.equal(ended,1);second.storage.setItem(key,token);
  assert.equal(fixture(f.local).storage.getItem(key),null);
  login(f,false);assert.equal(f.local.values.size,0);
});
test("an old tab cannot overwrite a different remembered login",()=>{
  const f=fixture();login(f);const second=fixture(f.local);
  second.storage.getItem(key);
  login(f);const saved=f.local.getItem(f.sessions.rememberedKey);
  second.storage.setItem(key,"late-old-session");
  assert.equal(f.local.getItem(f.sessions.rememberedKey),saved);
  assert.equal(second.storage.getItem(key),null);
});
test("malformed or extended remembered deadlines fail closed",()=>{
  for(const invalid of ["{",JSON.stringify({version:1,id:"x",startedAt:1,expiresAt:999999999999999,session:token}),JSON.stringify({version:1,id:"x",startedAt:Date.now()+REMEMBER_MS,expiresAt:Date.now()+2*REMEMBER_MS,session:token})]) {
    const f=fixture();f.local.setItem(f.sessions.rememberedKey,invalid);
    assert.equal(f.storage.getItem(key),null);assert.equal(f.local.values.size,0);
  }
});
test("blocked persistent storage rejects Remember me but still permits a nonpersistent login",()=>{
  const blocked={getItem(){throw new Error("blocked");},setItem(){throw new Error("blocked");},removeItem(){throw new Error("blocked");}};
  const f=fixture(blocked,blocked);
  assert.throws(()=>login(f),/Uncheck Remember me/);
  assert.equal(f.storage.getItem(key),null);
  login(f,false);assert.equal(f.storage.getItem(key),token);
  f.sessions.clear();assert.equal(f.storage.getItem(key),null);
});

async function sdkFixture(t, { bound=true, denied=false } = {}) {
  const {createClient}=require("@supabase/supabase-js");
  const f=fixture(),requests=[],clients=[];
  const uid="11111111-1111-4111-8111-111111111111";
  const user={id:uid,email:"fictional@example.test",aud:"authenticated",role:"authenticated",app_metadata:{},user_metadata:{},created_at:"2026-09-24T00:00:00Z"};
  const jwt=[{alg:"HS256",typ:"JWT"},{sub:uid,exp:Math.floor(Date.now()/1000)+3600,aud:"authenticated"}].map(v=>Buffer.from(JSON.stringify(v)).toString("base64url")).join(".")+".fictional-signature";
  let failLogout=false;
  function client(sessions) {
    const sdk=createClient("https://fixture.supabase.co","sb_publishable_fixture",{
      auth:{storageKey:key,storage:sessions.storage,persistSession:true,autoRefreshToken:false,detectSessionInUrl:false},
      global:{fetch:async(url,options)=>{
        const target=new URL(url);assert.equal(target.origin,"https://fixture.supabase.co");
        requests.push(target.pathname);
        if(target.pathname==="/auth/v1/token") {
          if(denied) return new Response(JSON.stringify({code:"invalid_credentials",msg:"Invalid credentials"}),{status:400});
          return new Response(JSON.stringify({access_token:jwt,refresh_token:"fictional-refresh",token_type:"bearer",expires_in:3600,user}),{status:200,headers:{"Content-Type":"application/json"}});
        }
        if(target.pathname==="/auth/v1/logout") return failLogout ? new Response("{}",{status:500}) : new Response(null,{status:204});
        throw new Error("Unexpected mocked Auth endpoint");
      }}
    });
    clients.push(sdk);return sdk;
  }
  const sdk=client(f.sessions);
  await sdk.auth.getSession();
  const staffClient={auth:sdk.auth,rpc:async()=>bound?{data:{staff:{email:user.email},members:[],loginMode:"password"}}:{error:{code:"PT403",message:"Unauthorized access"}}};
  const api=createSupabaseApi({baseUrl:"https://example.test/Capstone/",staffClient,guestClient:staffClient,knowledge:{},staffSessions:f.sessions});
  t.after(()=>{for(const c of clients)c.auth.dispose();f.sessions.clear();});
  return {...f,sdk,api,client,requests,failLogout:()=>{failLogout=true;},signIn:rememberMe=>api.fetch("/api/staff/login",{method:"POST",body:JSON.stringify({email:user.email,password:"fictional-password-never-save",rememberMe})})};
}
test("pinned SDK and API remember only verified staff, restore a fresh client and refresh without extending TTL (mock network)",async t=>{
  const f=await sdkFixture(t);
  const response=await f.signIn(true);assert.equal(response.status,200);
  const deadline=(await response.json()).rememberedUntil;
  assert.ok(deadline);assert.doesNotMatch(JSON.stringify([...f.local.values]),/fictional-password/);
  const reopened=fixture(f.local),sdk=f.client(reopened.sessions);
  assert.equal((await sdk.auth.getSession()).data.session.user.email,"fictional@example.test");
  assert.equal((await sdk.auth.refreshSession()).error,null);
  assert.equal(JSON.parse(f.local.getItem(f.sessions.rememberedKey)).expiresAt,deadline);
  reopened.advance(REMEMBER_MS+1000);
  assert.equal((await sdk.auth.getSession()).data.session,null);
  assert.equal((await f.api.fetch("/api/staff/session")).status,401);
});
test("SDK API failed passwords and unbound staff are never remembered",async t=>{
  for(const options of [{bound:false},{denied:true}]) {
    const f=await sdkFixture(t,options);
    assert.equal((await f.signIn(true)).status,options.denied?401:403);
    assert.equal(f.local.values.size,0);assert.equal(f.tab.values.size,0);
  }
});
test("SDK API logout clears persistent sessions even when hosted sign-out fails",async t=>{
  const f=await sdkFixture(t);assert.equal((await f.signIn(true)).status,200);
  f.failLogout();const response=await f.api.fetch("/api/staff/logout",{method:"POST"});
  assert.equal(response.status,200);assert.match((await response.json()).warning,/could not confirm/);
  assert.equal(f.local.values.size,0);assert.equal((await f.sdk.auth.getSession()).data.session,null);
});
test("SDK API does not enable Remember me for absent, false or nonboolean values",async t=>{
  const f=await sdkFixture(t);
  for(const value of [undefined,false,"true",1]) {
    assert.equal((await f.signIn(value)).status,200);
    assert.equal(f.local.values.size,0);assert.ok(f.tab.getItem(key));
  }
});
