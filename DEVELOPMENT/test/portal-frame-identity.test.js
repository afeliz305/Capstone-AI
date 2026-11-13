const test=require('node:test');
const assert=require('node:assert/strict');
const {frameIdentity,matchingFrameIdentity}=require('../server/portal-local/frame-identity');
const {PortalService}=require('../server/portal-local/service');
const doc=(...scripts)=>({querySelectorAll:()=>scripts.map(textContent=>({textContent}))});
const source=(id=42,name='Fictional Tester')=>'window.__FRAME__ = '+JSON.stringify({kind:'cap2',me:{id,name,role:'student',initials:'FT'}})+';';
test('current server frame identity reads only stable ID and name without executing scripts',()=>{
  assert.deepEqual(frameIdentity(doc(source())),{portalAccountId:'42',name:'Fictional Tester'});
  assert.deepEqual(frameIdentity(doc(source(42,'Fictional { Tester }'))),{portalAccountId:'42',name:'Fictional { Tester }'});
  assert.equal(frameIdentity(doc('window.__FRAME__ = {me: steal()};')),null);
  assert.equal(frameIdentity(doc(source(),source())),null);
  assert.equal(frameIdentity(doc(source(0))),null);
  assert.equal(frameIdentity(doc(source('42'))),null);
  assert.equal(frameIdentity(doc(source().replace('cap2','anonymous'))),null);
  assert.equal(frameIdentity(doc('window.__FRAME__ = {')),null);
});
test('fresh and loaded page identity must match; names alone cannot bind an account',()=>{
  assert.ok(matchingFrameIdentity(doc(source()),doc(source())));
  assert.equal(matchingFrameIdentity(doc(source(43)),doc(source())),null);
  assert.equal(matchingFrameIdentity(doc(source()),doc()),null);
  assert.equal(matchingFrameIdentity(doc(source(42,'Other fictional name')),doc(source())),null);
});
test('account IDs require the paired extension network proof and remain account-isolated',()=>{
  const s=new PortalService({adapter:{mode:'extension'}});
  const loaded={identity:{portalAccountId:'42',name:'Fictional Tester'},contextBinding:'extension:7:doc',proof:{network:true,status:200}};
  assert.equal(s.identityKey(loaded),'portal-account:42');
  assert.notEqual(s.bindingFor('owner',loaded),s.bindingFor('owner',{...loaded,identity:{...loaded.identity,portalAccountId:'43'}}));
  assert.throws(()=>s.identityKey({...loaded,proof:{network:false,status:200}}));
  assert.throws(()=>s.identityKey({...loaded,proof:{network:true,status:401}}));
  s.adapter.mode='browser';assert.throws(()=>s.identityKey(loaded));
  assert.equal(s.identityKey({identity:{email:'Fictional@Example.test'}}),'fictional@example.test');
});
test('frame account binding supports connection without inventing email and rejects account changes',async()=>{
  let id='42';
  const adapter={mode:'extension',listEligible:async()=>[{id:7,label:'Fictional portal'}],verify:async()=>({state:'verified',identity:{portalAccountId:id,name:'Fictional Tester'},contextBinding:'extension:7:doc',proof:{network:true,status:200},section:'Today',records:[]})};
  const s=new PortalService({adapter});
  await s.discover('fictional-owner');
  const status=await s.connect('fictional-owner',7);
  assert.equal(status.state,'connected');
  assert.deepEqual(s.identity,{name:'Fictional Tester'});
  assert.doesNotMatch(JSON.stringify(status),/portalAccountId|portal-account:|@/);
  id='43';
  assert.equal((await s.verify('fictional-owner')).state,'account-changed');
  assert.equal(s.records.length,0);
});
