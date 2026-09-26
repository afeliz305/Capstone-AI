const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const {ExtensionBridge,TRUST_TTL}=require('../server/portal-local/extension-bridge');
const {ExtensionAdapter}=require('../server/portal-local/extension-adapter');

const root=path.resolve(__dirname,'..');
const origin='chrome-extension://'+'a'.repeat(32);
const nonce='b'.repeat(32);

function paired(options={}){
  const bridge=new ExtensionBridge({pairingCode:'fixture-pair-code',requestTimeout:1000,...options});
  const credentials=bridge.pair(origin,{code:'fixture-pair-code',clientNonce:nonce,version:'0.2.0'});
  let seq=0;
  return{bridge,credentials,next:()=>bridge.next(origin,{token:credentials.token,seq:++seq}),complete:(command,value,ok=true)=>bridge.complete(origin,{token:credentials.token,seq:++seq,id:command.id,ok,value,...(ok?{}:{error:value})}),sequence:()=>seq};
}

test('extension manifest requests loopback plus explicit portal and hosted-app grants',()=>{
  const manifest=JSON.parse(fs.readFileSync(path.join(root,'portal-extension','manifest.json'),'utf8'));
  assert.equal(manifest.manifest_version,3);
  assert.deepEqual(manifest.permissions.sort(),['alarms','scripting','storage']);
  assert.deepEqual(manifest.host_permissions,['http://127.0.0.1:3005/*']);
  assert.deepEqual(manifest.optional_host_permissions,['https://capstone.cs.fiu.edu/*','https://ocelot.aul.fiu.edu/*']);
  assert.equal(manifest.background.service_worker,'background.js');
  assert.ok(!manifest.permissions.includes('debugger'));
  assert.ok(!manifest.permissions.includes('tabs'));
  assert.doesNotMatch(JSON.stringify(manifest),/<all_urls>|\*:\/\/\*/);
});

test('normal extension source has no debugger or MCP dependency and persists no portal content',()=>{
  const background=fs.readFileSync(path.join(root,'portal-extension','background.js'),'utf8');
  const content=fs.readFileSync(path.join(root,'portal-extension','content-entry.js'),'utf8');
  const bundle=fs.readFileSync(path.join(root,'portal-extension','content.bundle.js'),'utf8');
  const source=background+'\n'+content+'\n'+bundle;
  assert.doesNotMatch(source,/chrome\.debugger|remote-debug|devtools|modelcontextprotocol|chrome-devtools-mcp/i);
  assert.doesNotMatch(source,/indexedDB|storage\.sync|localStorage|sessionStorage|document\.cookie/);
  assert.match(background,/setAccessLevel\(\{accessLevel:'TRUSTED_CONTEXTS'\}\)/);
  assert.match(background,/local\.set\(\{token:response\.token,trustExpiresAt:response\.trustExpiresAt,seq:0,manualDisconnect:false\}\)/);
  assert.doesNotMatch(background,/local\.set\([^\n]*(?:records|messages|grades|standing|content|answer|question)/i);
  const hosted=fs.readFileSync(path.join(root,'portal-extension','hosted-entry.js'),'utf8');
  assert.match(background,/permissions\.onRemoved[\s\S]*disconnect/);
  assert.match(background,/runtime\.onStartup[\s\S]*poll/);
  assert.match(background,/alarms\.onAlarm[\s\S]*poll/);
  assert.match(background,/message\.operation==='grant-app'/);
  assert.match(background,/exactHostedSender/);
  assert.match(background,/DIRECT_OPERATIONS/);
  assert.match(background,/if\(pollPromise\)return pollPromise/);
  assert.match(hosted,/event\.source!==window/);
  assert.match(hosted,/~afeli016\/Capstone - AI/);
  assert.doesNotMatch(hosted,/fetch\(|localStorage|sessionStorage|indexedDB|document\.cookie/);
});

test('hosted Ocelot client keeps personal search in memory and uses an exact app path',()=>{
  const client=fs.readFileSync(path.join(root,'js','hosted','portal-client-entry.js'),'utf8');
  assert.match(client,/EXPECTED_ORIGIN='https:\/\/ocelot\.aul\.fiu\.edu'/);
  assert.match(client,/EXPECTED_PATH='\/~afeli016\/Capstone - AI\/'/);
  assert.match(client,/if\(routeQuestion\(question,context\)\)/);
  assert.match(client,/service\.search\(owner,\{question,context\}\)/);
  assert.match(client,/Cache-Control':'no-store/);
  assert.doesNotMatch(client,/localStorage|sessionStorage|indexedDB|document\.cookie|createClient|supabaseUrl|sb_(?:secret|publishable)_/i);
});

test('loopback bridge authenticates one extension origin and rejects replay and stale commands',async()=>{
  const state=paired();
  assert.throws(()=>state.bridge.pair('https://capstone.cs.fiu.edu',{code:'fixture-pair-code',clientNonce:nonce,version:'0.2.0'}));
  const pending=state.bridge.request('discover');
  const command=state.next();
  assert.equal(command.operation,'command');assert.equal(command.name,'discover');
  state.complete(command,{tabs:[{id:17}]});
  assert.deepEqual(await pending,{tabs:[{id:17}]});
  assert.throws(()=>state.bridge.next(origin,{token:state.credentials.token,seq:state.sequence()}),/trust is unavailable|Pair/);
  assert.throws(()=>state.bridge.request('arbitrary-url',{url:'https://example.test'}),/Unsupported/);
});

test('extension adapter completes normal discovery and verified reads with no MCP adapter',async()=>{
  const state=paired(),adapter=new ExtensionAdapter(state.bridge);
  const answer=async(promise,value)=>{const command=state.next();state.complete(command,value);return promise;};
  const choices=await answer(adapter.listEligible(),{tabs:[{id:17}]});
  assert.deepEqual(choices,[{id:17,label:'Capstone portal tab 17'}]);
  const identity={state:'verified',identity:{name:'Synthetic Student',email:'student@example.test'},active:'Team',documentId:'doc-1',proof:{network:true,status:200}};
  assert.equal((await answer(adapter.identity(17),identity)).identity.email,'student@example.test');
  const section={...identity,section:'Team',records:[{kind:'task',heading:'Synthetic task',text:'Acceptance criteria and evidence are visible.',url:'https://capstone.cs.fiu.edu/portal',section:'Team',subview:'Sprint board'}]};
  const loaded=await answer(adapter.inspectSection(17,'Team'),section);
  assert.equal(loaded.records[0].kind,'task');
  assert.equal(adapter.mode,'extension');assert.equal(adapter.continuous,true);
});

test('pairing survives worker pauses, expires deliberately, and helper restart requires re-pairing',async()=>{
  let now=Date.parse('2026-09-26T12:00:00Z');const state=paired({now:()=>now});
  assert.equal(state.next().operation,'idle');
  now+=30_000;const pending=state.bridge.request('discover'),command=state.next();state.complete(command,{tabs:[]});await pending;
  now+=TRUST_TTL+1;assert.throws(()=>state.bridge.request('discover'),/Pair|trust/i);
  const restarted=new ExtensionBridge({pairingCode:'new-code'});
  assert.throws(()=>restarted.next(origin,{token:state.credentials.token,seq:999}),/Pair|trust/i);
});

test('explicit bridge revocation clears pending work and blocks silent reconnect',async()=>{
  const state=paired(),pending=state.bridge.request('discover');
  state.bridge.revoke();
  await assert.rejects(pending,/disconnected|Pair/i);
  assert.throws(()=>state.bridge.next(origin,{token:state.credentials.token,seq:1}),/Pair|trust/i);
});
