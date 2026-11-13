// Read-only public acceptance. No credentials, email, ticket writes or paid AI.
const {chromium}=require('playwright-core');
const assert=require('node:assert/strict'),fs=require('node:fs/promises'),path=require('node:path');
async function main(){
 const origin=(process.env.MIRA_REVIEW_ORIGIN||'https://mira-9gg.pages.dev').replace(/\/$/,'');
 const out=path.resolve('dist/presentation');await fs.mkdir(out,{recursive:true});
 const browser=await chromium.launch({channel:'msedge',headless:true});
 const results={origin,checkedAt:new Date().toISOString(),questions:[],actions:[],viewports:[],authenticatedStaff:'NOT TESTED: owner session unavailable'};
 try{
 const page=await browser.newPage({viewport:{width:1440,height:1000},reducedMotion:'reduce'}),errors=[],failed=[];
 page.on('pageerror',e=>errors.push(e.message));page.on('requestfailed',r=>failed.push({url:new URL(r.url()).pathname,error:r.failure()?.errorText}));
 await page.goto(origin+'/');await page.screenshot({path:path.join(out,'dashboard.png')});
 for(const q of ['What are acceptance criteria?','What counts as evidence?','What is the difference between Verify and Done?','How do I post a standup?','How do I prepare a Sprint Review?','How do I prepare a retrospective?','What does the Product Owner do?','What are attendance requirements?','Can I get a grading exception?','Can I change teams?','Where is my grade?','acceptnce criteria','What should I do next?','What are acceptance criteria and what evidence should I prepare?']){
  if(!await page.locator('#assistant').isVisible())await page.getByRole('button',{name:'Open MIRA chat',exact:true}).click();
  const before=await page.locator('.assistant-message').count();await page.locator('#chat-input').fill(q);await page.locator('#chat-input').press('Enter');
  await page.waitForFunction(n=>!document.querySelector('#chat-input').disabled&&document.querySelectorAll('.assistant-message').length>n,before);
  const answer=page.locator('.assistant-message').last();const text=await answer.textContent();assert.doesNotMatch(text,/backend is not available|search is temporarily unavailable/i);
  const links=await answer.locator('a').evaluateAll(els=>els.map(e=>({label:e.textContent,url:e.href})));
  assert.ok(text.length>30);results.questions.push({q,text,links});
 }
 await page.screenshot({path:path.join(out,'grounded-answer.png')});await page.locator('#minimize-chat').click();
 // Start from the embedded composer, then continue in the same floating chat.
 await page.locator('#dashboard-mira-input').fill('How do I prepare a standup?');await page.locator('#dashboard-mira-form').getByRole('button',{name:'Ask MIRA'}).click();await page.waitForFunction(()=>!document.querySelector('#chat-input').disabled);
 await page.locator('#chat-input').fill('Make that shorter');await page.locator('#chat-input').press('Enter');await page.waitForFunction(()=>!document.querySelector('#chat-input').disabled);
 assert.match(await page.locator('.assistant-message').last().textContent(),/Draft only/);assert.match(await page.locator('.assistant-message').last().textContent(),/disagree/);
 assert.ok(await page.locator('.assistant-message').last().locator('a').count()>0);results.multiTurn='PASS embedded stand-up to floating shorter draft with citations';await page.locator('#minimize-chat').click();
 await page.locator('#dashboard-mira-input').fill('What counts as evidence?');await page.locator('#dashboard-mira-form').getByRole('button',{name:'Ask MIRA'}).click();await page.waitForFunction(()=>!document.querySelector('#chat-input').disabled);await page.locator('#minimize-chat').click();
 const w=page.locator('#team-workspace');await w.scrollIntoViewIfNeeded();assert.match(await w.textContent(),/Snapshot, not live portal state/);await w.getByRole('button',{name:/CAP-1316/}).click();await page.locator('#selected-work-card textarea').first().fill('Fictional presentation evidence: test output prepared, not submitted or accepted.');
 for(const name of ['Explain this card','What should I do?','Check my progress',"What's missing?",'Prepare evidence','Ask a teammate','Ready for Review?']){
  const button=w.getByRole('button',{name,exact:true});await button.click();await page.waitForFunction(()=>!Array.from(document.querySelectorAll('#team-workspace button')).some(b=>b.disabled&&/Explain this card|What should I do\?|Ask a teammate/.test(b.textContent)));
  const text=await page.locator('.workspace-draft-output').textContent();assert.match(text,/Mock AI|Deterministic fallback/);results.actions.push({name,text});
 }
 await w.getByRole('button',{name:'Check my progress',exact:true}).click();assert.match(await page.locator('.evidence-result').textContent(),/1 of 5/);assert.match(await page.locator('#selected-work-card').textContent(),/Work completed: not confirmed/);
 await w.getByRole('button',{name:'Prepare from selected card'}).click();assert.match(await page.locator('#standup-draft-status').textContent(),/Duplicate warning/);
 await w.getByRole('tab',{name:'Sprint Review'}).click();assert.match(await page.locator('#ceremony-prompts').textContent(),/demonstrate|evidence/i);
 await w.getByRole('tab',{name:'Retrospective'}).click();assert.match(await page.locator('#ceremony-prompts').textContent(),/Keep:/);await w.screenshot({path:path.join(out,'workspace.png')});
 // Simulate a provider outage in this isolated browser only; no server mutation.
 await page.route('**/api/ai',route=>route.fulfill({status:503,contentType:'application/json',body:'{"error":"Fictional test outage"}'}));
 const fallback=await page.evaluate(()=>window.MiraAiGateway.request({task:'next-steps',context:'Fictional acceptance test only'},{mode:'gateway'}));assert.equal(fallback.provider,'deterministic');assert.equal(fallback.fallback,true);results.providerFailureFallback='PASS (gateway API with isolated synthetic 503; workspace remains local mock)';await page.unroute('**/api/ai');
 await page.goto(origin+'/');await page.locator('#dashboard-profile-trigger').click();await page.locator('[data-theme-choice="dark"]').click();assert.equal(await page.locator('html').getAttribute('data-theme'),'dark');await page.reload();assert.equal(await page.locator('html').getAttribute('data-theme'),'dark');
 await page.locator('#dashboard-profile-trigger').click();await page.keyboard.press('Escape');assert.equal(await page.locator('#dashboard-profile-trigger').evaluate(e=>e===document.activeElement),true);
 await page.locator('#dashboard-presence-trigger').click();assert.match(await page.locator('#presence-capability').textContent(),/Team availability is shown only in the official portal/i);await page.keyboard.press('Escape');
 await page.locator('#dashboard-profile-trigger').click();await page.locator('[data-theme-choice="light"]').click();
 for(const width of [1440,768,390,320]){await page.setViewportSize({width,height:900});await page.reload();assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),true);if(!await page.locator('#assistant').isVisible())await page.getByRole('button',{name:'Open MIRA chat',exact:true}).click();const r=await page.locator('#assistant').boundingBox();assert.ok(r.x>=-1&&r.x+r.width<=width+1);await page.screenshot({path:path.join(out,`mobile-${width}.png`)});results.viewports.push({width,pass:true});}
 await page.setViewportSize({width:1440,height:1000});await page.goto(origin+'/');await page.evaluate(()=>document.documentElement.style.zoom='2');if(!await page.locator('#assistant').isVisible())await page.getByRole('button',{name:'Open MIRA chat',exact:true}).click();assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth<=document.documentElement.clientWidth),true);results.zoom='200% CSS zoom and containment (not OS browser zoom)';await page.screenshot({path:path.join(out,'zoom-200.png')});
 // Equivalent CSS viewport dimensions of native 200% browser zoom and landscape.
 // Horizontal containment alone missed an almost-zero-height conversation.
 results.shortViewports=[];
 for(const size of [{width:563,height:455},{width:320,height:450},{width:740,height:360}]){
  await page.setViewportSize(size);await page.goto(origin+'/');if(!await page.locator('#assistant').isVisible())await page.getByRole('button',{name:'Open MIRA chat',exact:true}).click();
  const log=await page.locator('.chat-log').boundingBox(),composer=await page.locator('.chat-composer').boundingBox();
  assert.ok(log.height>=120,`Readable answer area at ${size.width}x${size.height}: ${log.height}`);
  assert.ok(composer.y+composer.height<=size.height+1,'Composer stays reachable');
  await page.locator('.mira-tools-menu > summary').click();await page.locator('#load-sample-information').click();
  assert.match(await page.locator('#shared-mode-status').textContent(),/fictional|sample/i);
  results.shortViewports.push({...size,answerHeight:log.height,pass:true});
 }
 await page.setViewportSize({width:1440,height:1000});await page.goto(origin+'/pages/staff.html');assert.equal(await page.getByRole('button',{name:'Forgot password?'}).isVisible(),true);await page.screenshot({path:path.join(out,'staff-signed-out.png')});
 await page.goto(origin+'/pages/recover.html');assert.match(await page.locator('body').textContent(),/Reset your MIRA staff password/);results.recovery='Signed-out page rendered; no email sent';
 assert.deepEqual(errors,[]);assert.deepEqual(failed,[]);results.pageErrors=errors;results.failedRequests=failed;results.pass=true;
 }finally{await fs.writeFile(path.join(out,'acceptance.json'),JSON.stringify(results,null,2));await browser.close();}
 console.log('PASS: 14 knowledge questions, both MIRA entry points, 7 workspace actions, evidence, duplicate warning, retrospective, themes/profile/team, 4 widths, zoom containment, signed-out staff/recovery.');
}
main().catch(e=>{console.error(e);process.exitCode=1});
