// Public/fictional read-only checks. No authentication, ticket writes or AI calls.
const {chromium}=require('playwright-core'),assert=require('node:assert/strict');
async function main(){
 const remote=process.env.MIRA_REVIEW_ORIGIN;
 const server=remote?null:await require('./preview-cloudflare').start({port:0});
 const origin=remote||'http://127.0.0.1:'+server.address().port;
 const browser=await chromium.launch({channel:'msedge',headless:true});
 try{
  const page=await browser.newPage();let calls=0,ai=0;
  page.on('request',r=>{if(r.url().includes('/api/ai')||r.url().includes('/api/demo'))ai++;});
  await page.route('**/api/public-information?*',async route=>{
   calls++;const u=new URL(route.request().url());assert.deepEqual([...u.searchParams.keys()],['source']);assert.equal(route.request().headers().authorization,undefined);
   if(remote)return route.continue();
   const id=u.searchParams.get('source');return route.fulfill({json:{title:'Fictional public test source',url:'https://capstone.cs.fiu.edu/'+id,checkedAt:new Date().toISOString(),excerpts:['Fictional public presentation evidence checklist.','Prepare a backup demonstration recording.']}});
  });
  await page.goto(origin);
  await page.locator('#dashboard-mira-input').fill('What presentation materials are available?');await page.locator('#dashboard-mira-form').getByRole('button',{name:'Ask MIRA'}).click();
  await page.waitForFunction(()=>!document.querySelector('#chat-input').disabled);
  assert.match(await page.locator('.assistant-message').last().textContent(),/Public source excerpts.*checked/s);
  assert.ok(await page.locator('.assistant-message').last().locator('a[href="https://capstone.cs.fiu.edu/resources"]').count());
  await page.locator('#chat-input').fill('What is the public privacy policy?');await page.locator('#chat-input').press('Enter');await page.waitForFunction(()=>!document.querySelector('#chat-input').disabled);assert.match(await page.locator('.assistant-message').last().textContent(),/Public source excerpts/);
  for(const [question,id] of [['Tell me about the Capstone program','about'],['Tell me more','about'],['How can companies engage with Capstone?','engage']]){
   await page.locator('#chat-input').fill(question);await page.locator('#chat-input').press('Enter');await page.waitForFunction(()=>!document.querySelector('#chat-input').disabled);
   assert.ok(await page.locator('.assistant-message').last().locator('a[href="https://capstone.cs.fiu.edu/'+id+'"]').count());
   assert.match(await page.locator('.assistant-message').last().textContent(),/checked.*(?:EST|EDT)/s);
  }
  const before=calls;await page.locator('#chat-input').fill('What is my current grade?');await page.locator('#chat-input').press('Enter');await page.waitForFunction(()=>!document.querySelector('#chat-input').disabled);assert.equal(calls,before);
  await page.unroute('**/api/public-information?*');await page.route('**/api/public-information?*',r=>r.fulfill({status:503,json:{error:'Fictional source failure'}}));
  await page.locator('#chat-input').fill('Show public course resources');await page.locator('#chat-input').press('Enter');await page.waitForFunction(()=>!document.querySelector('#chat-input').disabled);assert.match(await page.locator('#assistant').textContent(),/Current public information could not be verified/);assert.doesNotMatch(await page.locator('.assistant-message').last().textContent(),/backend is not available/);
  await page.unroute('**/api/public-information?*');await page.route('**/api/public-information?*',r=>r.fulfill({json:{url:'https://capstone.cs.fiu.edu/resources',checkedAt:'2020-01-01T00:00:00Z',excerpts:['STALE FICTIONAL VALUE MUST NOT RENDER']}}));
  await page.locator('#chat-input').fill('Show public course resources');await page.locator('#chat-input').press('Enter');await page.waitForFunction(()=>!document.querySelector('#chat-input').disabled);assert.doesNotMatch(await page.locator('#assistant').textContent(),/STALE FICTIONAL VALUE MUST NOT RENDER/);
  assert.equal(ai,0);console.log(JSON.stringify({origin,publicSources:'PASS',embedded:'PASS',floating:'PASS',personalExclusion:'PASS',failureFallback:'PASS',aiCalls:ai}));
 }finally{await browser.close();if(server){server.closeAllConnections();await new Promise(r=>server.close(r));}}
}
main().catch(e=>{console.error(e);process.exitCode=1});
