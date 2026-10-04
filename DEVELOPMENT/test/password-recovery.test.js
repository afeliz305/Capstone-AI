"use strict";
const test=require("node:test"),assert=require("node:assert/strict"),fs=require("node:fs"),path=require("node:path"),vm=require("node:vm");
const html=fs.readFileSync(path.join(__dirname,"../pages/recover.html"),"utf8");
const script=fs.readFileSync(path.join(__dirname,"../js/staff/password-recovery.js"),"utf8");
const flush=()=>new Promise(resolve=>setImmediate(resolve));

async function mount({storageMode="supabase",statusResponse={ok:true,status:200,data:{ready:true}},recoverResponse={ok:true,status:200,data:{ok:true}}}={}) {
  class Element {
    constructor(){this.listeners={};this.attributes={};this.value="";this.textContent="";this.type="password";this.disabled=false;this.hidden=false;}
    addEventListener(type,fn){this.listeners[type]=fn;}
    emit(type,event={}){return this.listeners[type]?.({preventDefault(){},...event});}
    setAttribute(name,value){this.attributes[name]=value;}
    focus(){this.focused=true;}
    reportValidity(){return this.valid!==false;}
  }
  const elements=new Map([...html.matchAll(/<[^>]+id="([^"]+)"[^>]*>/g)].map(match=>{
    const element=new Element();element.hidden=/\shidden(?:\s|>)/.test(match[0]);return["#"+match[1],element];
  }));
  const requests=[];
  const api={storageMode,fetch:async(url,options={})=>{
    requests.push({url,options});const response=url.endsWith("recovery-session")?statusResponse:recoverResponse;
    return{ok:response.ok,status:response.status,headers:{get:()=>"application/json"},json:async()=>response.data};
  },readJson:response=>response.json()};
  const document={querySelector:selector=>elements.get(selector)};
  const window={CapstoneApi:api,location:{pathname:"/MIRA/pages/recover.html",hash:"#access_token=redacted",search:""},history:{replaceState(...args){this.args=args;}},addEventListener(){}};
  vm.runInContext(script,vm.createContext({window,document}));await flush();
  return{elements,requests,window};
}

test("recovery landing requires a verified Supabase recovery session",async()=>{
  const unsupported=await mount({storageMode:"browser"});
  assert.match(unsupported.elements.get("#recovery-status").textContent,/only from the hosted Supabase/);
  assert.equal(unsupported.elements.get("#recovery-form").hidden,true);
  const expired=await mount({statusResponse:{ok:false,status:401,data:{error:"This recovery link is invalid or has expired."}}});
  assert.match(expired.elements.get("#recovery-status").textContent,/invalid or has expired/);
  assert.equal(expired.elements.get("#recovery-form").hidden,true);
});

test("recovery password controls toggle independently and mismatch is rejected locally",async()=>{
  const ui=await mount();const newInput=ui.elements.get("#recovery-new-password"),confirm=ui.elements.get("#recovery-confirm-password");
  assert.equal(ui.elements.get("#recovery-form").hidden,false);
  assert.deepEqual(ui.window.history.args,[null,"","/MIRA/pages/recover.html"]);
  newInput.value="fictional-new-password";confirm.value="different";
  ui.elements.get("#toggle-recovery-new-password").emit("click");
  assert.equal(newInput.type,"text");assert.equal(confirm.type,"password");
  await ui.elements.get("#recovery-form").emit("submit");
  assert.match(ui.elements.get("#recovery-status").textContent,/do not match/);
  assert.equal(ui.requests.filter(request=>request.url.endsWith("/recover")).length,0);
});

test("successful recovery updates only the current recovery user, clears fields, and returns to normal sign-in",async()=>{
  const ui=await mount(),newInput=ui.elements.get("#recovery-new-password"),confirm=ui.elements.get("#recovery-confirm-password");
  newInput.value=confirm.value="fictional-new-password";
  await ui.elements.get("#recovery-form").emit("submit");
  const request=ui.requests.find(entry=>entry.url.endsWith("/recover"));
  assert.deepEqual(JSON.parse(request.options.body),{newPassword:"fictional-new-password",confirmPassword:"fictional-new-password"});
  assert.equal(newInput.value,"");assert.equal(confirm.value,"");assert.equal(newInput.type,"password");assert.equal(confirm.type,"password");
  assert.equal(ui.elements.get("#recovery-form").hidden,true);assert.equal(ui.elements.get("#recovery-success").hidden,false);
  assert.equal(ui.elements.get("#return-to-staff").focused,true);
});

test("failed recovery clears password values and permits a safe retry",async()=>{
  const ui=await mount({recoverResponse:{ok:false,status:400,data:{error:"Choose a stronger password."}}});
  ui.elements.get("#recovery-new-password").value=ui.elements.get("#recovery-confirm-password").value="fictional-new-password";
  await ui.elements.get("#recovery-form").emit("submit");
  assert.equal(ui.elements.get("#recovery-new-password").value,"");assert.equal(ui.elements.get("#save-recovery-password").disabled,false);
  assert.equal(ui.elements.get("#recovery-status").textContent,"Choose a stronger password.");
});

test("recovery entry is tab-only and does not opt into Remember me",()=>{
  const source=fs.readFileSync(path.join(__dirname,"../js/shared/supabase-entry.js"),"utf8");
  assert.match(source,/if \(recoveryPage\) staffSessions\.beginLogin\(\)/);
  assert.match(source,/detectSessionInUrl:role === "staff" && recoveryPage/);
  const recoveryBranch=source.slice(source.indexOf("if (recoveryPage)"),source.indexOf("const guestMemory"));
  assert.doesNotMatch(recoveryBranch,/\.remember\(/);
});
