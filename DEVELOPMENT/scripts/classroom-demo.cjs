// Operator-only attended browser workflow. Credentials remain memory-only.
// Invoke via start-classroom-demo.ps1; no secret values in logs or artifacts.
const fs=require('node:fs'),crypto=require('node:crypto'),assert=require('node:assert/strict');
const {chromium}=require('playwright-core');
const sleep=ms=>new Promise(r=>setTimeout(r,ms));
async function main(){
 const operator=fs.readFileSync(0,'utf8').trim();
 if(!/^[A-Za-z0-9_-]{43,128}$/.test(operator))throw Error('Protected operator credential unavailable');
 const minutes=Number(process.argv[process.argv.indexOf('--minutes')+1]);
 if(!Number.isInteger(minutes)||minutes<1||minutes>60)throw Error('Choose session duration 1–60 minutes');
 const acceptance=process.argv.includes('--acceptance'),origin='https://mira-9gg.pages.dev';
 const ledger=async(route,body={})=>{const r=await fetch('http://127.0.0.1:8798',{method:'POST',headers:{authorization:'Bearer '+operator},body:JSON.stringify({route,body})});const value=await r.json();if(!r.ok)throw Error('Operator operation rejected: '+route+' HTTP '+r.status);return value;};
 const record={startedAt:new Date().toISOString(),origin,liveRequests:0,answers:[]};let browser,activated=false;
 try{
  record.before=await ledger('/status');const audit=await ledger('/operator-audit');
  assert.equal(record.before.heldMicroUsd,0);assert.equal(record.before.capMicroUsd,25000000);assert.ok(audit.records.every(r=>r.state==='settled'));
  if(record.before.halted){assert.equal(record.before.haltReason,'controlled-test-complete');await ledger('/recover',{id:crypto.randomUUID(),expectedRevision:record.before.revision,reason:'reviewed-controlled-test-complete',evidence:'INTEGRATED_CLASSROOM_CAMPAIGN'});}
  activated=true;
  let token=crypto.randomBytes(48).toString('base64url');
  const current=await ledger('/status');
  const session=await ledger('/demo-start',{expectedRevision:current.revision,hash:crypto.createHash('sha256').update(token).digest('hex'),durationMinutes:minutes,pricingUntil:Date.now()+60*60000});
  browser=await chromium.launch({channel:'msedge',headless:false});
  const context=await browser.newContext({viewport:{width:1440,height:1000}}),page=await context.newPage();
  // No trace, HAR, network headers, credential screenshot or browser storage dump.
  await page.goto(origin+'/');await page.locator('.mira-demo-controls summary').click();
  const denied=await context.request.post(origin+'/api/demo',{headers:{origin},data:{action:'ask',question:'What do I need to complete before a sprint card is considered Done?',requestId:crypto.randomUUID()}});
  assert.equal(denied.status(),403);record.anonymousDenied=true;
  await page.locator('#mira-demo-code').fill(token);await page.locator('#mira-demo-login button').click();token='';
  await page.waitForFunction(()=>document.querySelector('#mira-demo-status').textContent.includes('session connected'));
  assert.equal(await page.locator('#mira-demo-code').inputValue(),'');record.browserAuthorized=true;
  console.log('Restricted browser session connected. Close this browser to stop; expiration also blocks new requests.');
  if(acceptance){
   const allQuestions=['What do I need to complete before a sprint card is considered Done?','What evidence should I prepare for that?','Help me draft a stand-up for a fictional card where I finished the UI but still need testing.','How do I prepare both Sprint Review and Retrospective?'];
   const questions=process.argv.includes('--review-only')?[allQuestions[3]]:allQuestions;
   for(let i=0;i<questions.length;i++){
    if(i===2)await sleep(61000); // shared 2/minute limit; no retry
    const response=page.waitForResponse(r=>r.url()===origin+'/api/demo'&&r.request().method()==='POST');
    if(i===0){await page.locator('#dashboard-mira-input').fill(questions[i]);await page.locator('#dashboard-mira-form button').click();}
    else {await page.locator('#chat-input').fill(questions[i]);await page.locator('#chat-input').press('Enter');}
    const http=await response, value=await http.json();record.liveRequests++;
    record.answers.push({question:questions[i],httpStatus:http.status(),provider:value.provider,usage:value.usage||value.providerAttempt?.usage,accounting:value.providerAttempt?.accounting,reason:value.providerAttempt?.reason,sourceIds:value.citations?.map(s=>s.id),answer:value.provider==='openai'?value.text:undefined});
    if(value.provider!=='openai')throw Error('Live request did not pass; stopping without retry');
    await page.waitForFunction(()=>!document.querySelector('#chat-input').disabled);
    const last=page.locator('.assistant-message').last();assert.match(await last.textContent(),/Live GPT-6.1 Sol/);assert.ok(await last.locator('a').count());
    fs.mkdirSync('dist/presentation/live-demo',{recursive:true});await page.screenshot({path:`dist/presentation/live-demo/${process.argv.includes('--review-only')?'review-retest':'turn-'+(i+1)}.png`});
   }
   record.browserLive='PASS';
  }else await Promise.race([new Promise(resolve=>browser.on('disconnected',resolve)),sleep(Math.max(1,session.expires-Date.now()))]);
 }catch(error){record.error=error.message;process.exitCode=1;console.log('Demo stopped: '+error.message);}
 finally{
  if(activated){try{await ledger('/demo-stop');record.after=await ledger('/status');assert.equal(record.after.halted,true);record.newCostMicroUsd=record.after.spentMicroUsd-record.before.spentMicroUsd;assert.ok(record.newCostMicroUsd+record.after.heldMicroUsd<=1000000);console.log('Session revoked; persistent halt active.');}catch(error){record.shutdownError=error.message;process.exitCode=1;console.log('URGENT: operator shutdown verification failed.');}}
  if(browser)await browser.close().catch(()=>{});
  fs.mkdirSync('dist/presentation',{recursive:true});const evidencePath='dist/presentation/CLASSROOM_LIVE_ACCEPTANCE.json';if(fs.existsSync(evidencePath))fs.copyFileSync(evidencePath,evidencePath.replace('.json','-'+Date.now()+'.json'));fs.writeFileSync(evidencePath,JSON.stringify(record,null,2));
  console.log(JSON.stringify({liveRequests:record.liveRequests,result:record.browserLive||'NOT VERIFIED',newCostMicroUsd:record.newCostMicroUsd,ledger:record.after}));
 }
}
main().catch(()=>{console.error('Operator preflight failed; no credential was displayed.');process.exitCode=1;});
