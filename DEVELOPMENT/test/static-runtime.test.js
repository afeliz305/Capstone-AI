const test=require("node:test");
const assert=require("node:assert/strict");
const fs=require("node:fs/promises");
const os=require("node:os");
const path=require("node:path");
const {chromium}=require("playwright-core");
const {createOcelotPackage}=require("../scripts/package-ocelot");
const {createPreview,basePath}=require("../scripts/preview-ocelot");

test("generated Supabase/Ocelot package answers through embedded and floating MIRA without a Node API",{timeout:30000},async t=>{
  const root=path.resolve(__dirname,".."),output=await fs.mkdtemp(path.join(os.tmpdir(),"mira-static-runtime-"));
  t.after(async()=>{assert.equal(path.dirname(output),path.resolve(os.tmpdir()));assert.match(path.basename(output),/^mira-static-runtime-/);await fs.rm(output,{recursive:true,force:true});});
  const release=await createOcelotPackage({root,outputRoot:output,transport:"supabase",supabaseConfig:{url:"https://abcdefghijklmnopqrst.supabase.co",publishableKey:"sb_publishable_runtime_fixture"}});
  const server=createPreview({root:release.uploadDirectory});
  await new Promise((resolve,reject)=>{server.once("error",reject);server.listen(0,"127.0.0.1",resolve);});
  t.after(()=>new Promise(resolve=>{server.closeAllConnections();server.close(resolve);}));
  const browser=await chromium.launch({channel:process.env.CAPSTONE_BROWSER_CHANNEL||"msedge",headless:true});
  t.after(()=>browser.close());
  const context=await browser.newContext({reducedMotion:"reduce"});
  const origin="http://127.0.0.1:"+server.address().port;
  await context.route("**/*",route=>new URL(route.request().url()).origin===origin?route.continue():route.abort());
  const page=await context.newPage(),errors=[],failed=[];
  page.on("pageerror",error=>errors.push(error.message));
  page.on("requestfailed",request=>{if(new URL(request.url()).origin===origin)failed.push(request.url());});
  await page.goto(origin+basePath);
  await page.waitForFunction(()=>window.CapstoneApi);
  const runtime=await page.evaluate(async()=>{
    const script=[...document.scripts].find(item=>/api-client\.js/.test(item.src));
    const bundle=[...document.scripts].find(item=>/supabase\.bundle\.js/.test(item.src));
    const response=await window.CapstoneApi.fetch("/api/search?q="+encodeURIComponent("What are acceptance criteria?"));
    const answer=await window.CapstoneApi.readJson(response);
    return{mode:window.CapstoneApi.storageMode,baseUrl:window.CapstoneApi.baseUrl,declared:script?.dataset.apiTransport,bundleBefore:Boolean(bundle&&script&&[...document.scripts].indexOf(bundle)<[...document.scripts].indexOf(script)),ok:response.ok,status:answer.status};
  });
  assert.deepEqual(runtime,{mode:"supabase",baseUrl:origin+basePath,declared:"supabase",bundleBefore:true,ok:true,status:"matched"});

  const waitForAnswer=async before=>page.waitForFunction(count=>{const messages=[...document.querySelectorAll(".assistant-message")];return messages.length>count&&!messages.at(-1)?.classList.contains("typing-message")&&!document.querySelector("#chat-input")?.disabled;},before);
  let before=await page.locator(".assistant-message").count();
  await page.locator("#dashboard-mira-input").fill("What are acceptance criteria?");
  await page.locator("#dashboard-mira-form").getByRole("button",{name:"Ask MIRA"}).click();
  await waitForAnswer(before);
  assert.match(await page.locator(".assistant-message").last().textContent(),/acceptance criteria/i);
  assert.match(await page.locator(".assistant-message").last().locator(".message-note").first().textContent(),/Source:/i);

  await page.locator("#minimize-chat").click();
  await page.getByRole("button",{name:"Open MIRA chat",exact:true}).click();
  before=await page.locator(".assistant-message").count();
  await page.locator("#chat-input").fill("What counts as evidence?");
  await page.locator("#chat-input").press("Enter");
  await waitForAnswer(before);
  assert.match(await page.locator(".assistant-message").last().textContent(),/evidence/i);
  assert.doesNotMatch(await page.locator(".assistant-message").last().textContent(),/backend is not available|temporarily unavailable/i);
  assert.deepEqual(errors,[]);
  assert.deepEqual(failed,[]);
});
