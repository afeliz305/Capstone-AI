const test=require('node:test'),assert=require('node:assert/strict');
const fs=require('node:fs'),os=require('node:os'),path=require('node:path');
const {createTrustStore}=require('../server/portal-local/trust-store');
const {ExtensionBridge}=require('../server/portal-local/extension-bridge');
const origin='chrome-extension://'+'a'.repeat(32);
function pair(b){return b.pair(origin,{code:'fictional-code',clientNonce:'f'.repeat(32),version:'test'});}
test('private digest store survives helper recreation and preserves replay protection, expiry and revocation',t=>{
  const dir=fs.mkdtempSync(path.join(os.tmpdir(),'mira-trust-fixture-'));t.after(()=>fs.rmSync(dir,{recursive:true,force:true}));
  const store=createTrustStore(dir);let now=Date.now();
  let b=new ExtensionBridge({trustStore:store,pairingCode:'fictional-code',now:()=>now});const c=pair(b);
  b.next(origin,{token:c.token,seq:1});
  const bytes=fs.readFileSync(path.join(dir,'trust.json'),'utf8');assert.ok(!bytes.includes(c.token));assert.ok(!bytes.includes('fictional-code'));
  b=new ExtensionBridge({trustStore:store,now:()=>now});
  assert.throws(()=>b.next(origin,{token:c.token,seq:1}));
  assert.throws(()=>b.next('chrome-extension://'+'b'.repeat(32),{token:c.token,seq:2}));
  assert.equal(b.next(origin,{token:c.token,seq:2}).operation,'idle');
  assert.equal(b.client.expires,Date.parse(c.trustExpiresAt));
  b.revoke();b=new ExtensionBridge({trustStore:store,now:()=>now});assert.throws(()=>b.next(origin,{token:c.token,seq:3}));
});
test('unwritable accounting fails closed before sequence acceptance or pairing',()=>{
  const store={load:()=>null,save:()=>{throw new Error('fixture disk failure');}};
  const b=new ExtensionBridge({trustStore:store,pairingCode:'fictional-code'});assert.throws(()=>pair(b));assert.equal(b.client,null);
  b.trustStore=null;const c=pair(b);b.trustStore=store;
  assert.throws(()=>b.next(origin,{token:c.token,seq:1}));assert.equal(b.client.lastSeq,0);
});
test('expired and malformed trust cannot reconnect and trust stores reject links',t=>{
  assert.throws(()=>new ExtensionBridge({trustStore:{load:()=>({version:9})}}));
  const b=new ExtensionBridge({pairingCode:'fictional-code',now:()=>1000});const c=pair(b);
  let saved;b.trustStore={save:v=>{saved=v;}};b.persist(b.client);
  const restored=new ExtensionBridge({now:()=>Date.parse(c.trustExpiresAt)+1,trustStore:{load:()=>saved,save:()=>{}}});assert.equal(restored.client,null);
  const dir=fs.mkdtempSync(path.join(os.tmpdir(),'mira-trust-link-'));t.after(()=>fs.rmSync(dir,{recursive:true,force:true}));
  fs.mkdirSync(path.join(dir,'target'));fs.symlinkSync(path.join(dir,'target'),path.join(dir,'link'),'junction');
  assert.throws(()=>createTrustStore(path.join(dir,'link')));
});
