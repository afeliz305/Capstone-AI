const test=require('node:test'),assert=require('node:assert/strict'),path=require('node:path');
const {build}=require('esbuild');
async function api(){ const result=await build({entryPoints:[path.resolve(__dirname,'../functions/api/demo.js')],bundle:true,write:false,format:'esm',platform:'browser'});return import('data:text/javascript;base64,'+Buffer.from(result.outputFiles[0].text).toString('base64')); }
test('classroom gateway uses exact server evidence, secure cookies, expiry and rejects arbitrary/private context',async t=>{
 const gateway=await api(); const token='a'.repeat(64),digest=require('crypto').createHash('sha256').update(token).digest('hex');
 let active=true,calls=0,reservations=new Set(),settled=[],mode='good',payload;
 const env={OPENAI_API_KEY:'mock-test-only',MIRA_AI_BUDGET:{idFromName:n=>n,get:()=>({fetch:async(url,init)=>{
  const b=JSON.parse(init.body),route=new URL(url).pathname;
  if(route==='/demo-auth')return Response.json(active&&b.demoHash===digest?{authorized:true,expires:Date.now()+600000,pricingUntil:Date.now()+600000}:{error:'denied'},{status:active&&b.demoHash===digest?200:403});
  if(route==='/reserve'){if(!active||b.demoHash!==digest||reservations.has(b.id))return Response.json({error:'denied'},{status:409});reservations.add(b.id);return Response.json({reserved:true,reservationMicroUsd:250000});}
  if(route==='/settle'){settled.push(b);return Response.json({settled:true,halted:false});}
  if(route==='/halt'){active=false;return Response.json({halted:true});}
  throw Error('Unexpected ledger route');
 }})}};
 const original=global.fetch;t.after(()=>global.fetch=original);
 global.fetch=async(url,init)=>{calls++;assert.equal(url,'https://api.openai.com/v1/responses');payload=JSON.parse(init.body);
  if(mode==='network')throw Error('network');if(mode==='401')return Response.json({}, {status:401});
  return Response.json({status:'completed',output_text:mode==='citation'?'Unsupported [99]':mode==='empty'?'':'Draft recommendation: collect a test run and request review [1].',usage:{input_tokens:100,output_tokens:100,output_tokens_details:{reasoning_tokens:20}}});};
 const run=(body,headers={})=>gateway.onRequestPost({env,request:new Request('https://mira.test/api/demo',{method:'POST',headers:{origin:'https://mira.test',...headers},body:JSON.stringify(body)})});
 assert.equal((await run({action:'login'})).status,403);
 const login=await run({action:'login'},{authorization:'Bearer '+token});assert.equal(login.status,200);
 assert.match(login.headers.get('set-cookie'),/Secure; HttpOnly; SameSite=Strict/);
 const headers={cookie:login.headers.get('set-cookie').split(';')[0]};
 const base={action:'ask',question:'What do I need to complete before a sprint card is considered Done?',requestId:crypto.randomUUID()};
 assert.equal((await run({...base,privatePortalData:'private'},headers)).status,400);
 assert.equal((await run({...base,question:'My private grade is 95'},headers)).status,200);assert.equal(calls,0);
 assert.equal((await run(base,{...headers,origin:'https://evil.test'})).status,403);
 const answer=await (await run(base,headers)).json();assert.equal(answer.provider,'openai');assert.equal(calls,1);assert.equal(settled.length,1);assert.equal(settled[0].costMicroUsd,1500);assert.equal(payload.model,'gpt-6.1-sol');assert.equal(payload.store,false);assert.match(payload.input,/Product Owner/);assert.equal(payload.max_output_tokens,512);
 await run(base,headers);assert.equal(calls,1,'duplicate submission cannot invoke provider twice');
 const follow={...base,question:'What evidence should I prepare for that?',requestId:crypto.randomUUID()};
 await run(follow,headers);assert.equal(calls,1);
 await run({...follow,previous:'done'},headers);assert.equal(calls,2);assert.match(payload.input,/Follow-up to/);
 for(const fault of ['citation','empty','401','network']){ mode=fault;const before=settled.length;const value=await(await run({...base,requestId:crypto.randomUUID()},headers)).json();assert.notEqual(value.provider,'openai');assert.equal(settled.length,before+(['citation','empty'].includes(fault)?1:0)); }
 active=false; const before=calls;assert.equal((await run({...base,requestId:crypto.randomUUID()},headers)).status,403);assert.equal(calls,before);
 const logout=await run({action:'logout'},headers);assert.match(logout.headers.get('set-cookie'),/Max-Age=0/);
});

test('live classroom catalog exactly matches reviewed nonpersonal knowledge',async()=>{
 const fs=require('fs');const module=await import('data:text/javascript;base64,'+Buffer.from(fs.readFileSync(path.resolve(__dirname,'../functions/_lib/demo-catalog.js'),'utf8')).toString('base64'));
 const entries=require('../server/lib/knowledge').reviewedKnowledge(require('../data/capstone-knowledge.json'));
 for(const item of Object.values(module.catalog))for(const source of item.sources){const reviewed=entries.find(e=>e.id===source.id);assert.equal(source.excerpt,reviewed.answer);assert.equal(source.url,reviewed.url);}
});
