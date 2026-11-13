const { chromium } = require("playwright-core");
const assert = require("node:assert/strict");
const fs = require("node:fs/promises");
const os = require("node:os");
const path = require("node:path");
const { buildCloudflarePackage } = require("./package-cloudflare");
const { createPreview, basePath } = require("./preview-ocelot");

async function main() {
  const output = await fs.mkdtemp(path.join(os.tmpdir(), "mira-cloudflare-ui-"));
  const review = path.resolve(__dirname, "../dist/staging/cloudflare-preview-review");
  await fs.rm(review, { recursive: true, force: true });
  await fs.mkdir(review, { recursive: true });
  const release = await buildCloudflarePackage({ outputRoot: output, supabaseConfig: { url: "https://abcdefghijklmnopqrst.supabase.co", publishableKey: "sb_publishable_browser_test", recoveryUrl: "https://mira-owner-review.pages.dev/pages/recover.html" } });
  const server = createPreview({ root: release.directory });
  await new Promise((resolve, reject) => { server.once("error", reject); server.listen(0, "127.0.0.1", resolve); });
  let browser;
  try {
    browser = await chromium.launch({ channel: process.env.CAPSTONE_BROWSER_CHANNEL || "msedge", headless: true });
    const context = await browser.newContext({ reducedMotion: "reduce" });
    const origin = `http://127.0.0.1:${server.address().port}`;
    await context.route("**/*", (route) => new URL(route.request().url()).origin === origin ? route.continue() : route.abort());
    const page = await context.newPage();
    const errors = [];
    page.on("pageerror", (error) => errors.push(error.message));
    await page.goto(origin + basePath);
    assert.equal(await page.locator("#mira-demo-code").count(),0);
    let publicCalls=0, publicFault=false;
    const reviewed=require('../server/lib/knowledge').reviewedKnowledge(require('../data/capstone-knowledge.json'));
    await context.route('**/api/public-ai',async route=>{
      publicCalls++;const b=route.request().postDataJSON();assert.deepEqual(Object.keys(b).sort(),['action','requestId','sourceIds']);
      if(publicFault)return route.fulfill({status:503,json:{fallback:true}});
      const source=reviewed.find(e=>e.id===b.sourceIds[0]);assert.ok(source);
      return route.fulfill({json:{provider:'openai',text:'Fictional mocked public answer [1].',citations:[{id:source.id,title:source.title,url:source.url}]}});
    });
    await page.reload();
    await page.locator('#dashboard-mira-input').fill('What counts as evidence?');await page.locator('#dashboard-mira-form button').click();
    await page.waitForFunction(()=>!document.querySelector('#chat-input').disabled);
    assert.match(await page.locator('.assistant-message').last().textContent(),/Live AI/);
    await page.locator('#minimize-chat').click();await page.getByRole('button',{name:'Open MIRA chat',exact:true}).click();
    await page.locator('#chat-input').fill('Tell me more');await page.locator('#chat-input').press('Enter');await page.waitForFunction(()=>!document.querySelector('#chat-input').disabled);
    assert.equal(publicCalls,2);assert.match(await page.locator('.assistant-message').last().textContent(),/Live AI/);
    publicFault=true;
    await page.locator('#chat-input').fill('What counts as evidence?');await page.locator('#chat-input').press('Enter');await page.waitForFunction(()=>!document.querySelector('#chat-input').disabled);
    assert.equal(publicCalls,3);assert.doesNotMatch(await page.locator('.assistant-message').last().textContent(),/Live AI/);
    assert.match(await page.locator('[data-ai-mode]').first().textContent(),/Course Knowledge/);
    await page.locator('#minimize-chat').click();
    await context.unroute('**/api/public-ai');

    await page.locator("#dashboard-mira-input").fill("What counts as evidence?");
    await page.locator("#dashboard-mira-form").getByRole("button", { name: "Ask MIRA" }).click();
    await page.waitForFunction(() => !document.querySelector("#chat-input")?.disabled && document.querySelectorAll(".assistant-message").length > 0);
    assert.match(await page.locator(".assistant-message").last().textContent(), /evidence/i);
    assert.doesNotMatch(await page.locator(".assistant-message").last().textContent(), /backend is not available|temporarily unavailable/i);
    await page.locator("#minimize-chat").click();
    await page.getByRole("button", { name: "Open MIRA chat", exact: true }).click();
    await page.locator("#chat-input").fill("What are acceptance criteria?");
    await page.locator("#chat-input").press("Enter");
    await page.waitForFunction(() => !document.querySelector("#chat-input")?.disabled && document.querySelectorAll(".assistant-message").length > 1);
    assert.match(await page.locator(".assistant-message").last().textContent(), /acceptance criteria/i);
    await page.screenshot({ path: path.join(review, "mira-cloudflare-desktop.png"), fullPage: true });
    const mock = await page.evaluate(() => window.MiraAiGateway.request({ task: "next-steps", context: "Fictional card" }));
    assert.equal(mock.provider, "mock");
    assert.match(mock.text, /No portal change was made/);
    await page.goto(origin + basePath + "pages/staff.html");
    assert.equal(await page.getByRole("button", { name: "Forgot password?" }).isVisible(), true);
    await page.goto(origin + basePath + "pages/recover.html");
    assert.match(await page.locator("body").textContent(), /Reset your MIRA staff password/);
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto(origin + basePath);
    assert.equal(await page.evaluate(() => document.documentElement.scrollWidth <= document.documentElement.clientWidth), true);
    await page.screenshot({ path: path.join(review, "mira-cloudflare-mobile-390.png"), fullPage: true });
    assert.deepEqual(errors, []);
    console.log(`PASS: exact ${release.manifest.length}-file Cloudflare candidate supports public/FARO search, both MIRA entry points, mock AI, Staff Queue recovery UI, and 390px containment.`);
    console.log("No deployment, Supabase request, portal request, ticket write, email, or external AI call was made.");
    console.log(`Screenshots: ${review}`);
  } finally {
    await browser?.close();
    await new Promise((resolve) => server.close(resolve));
    await fs.rm(output, { recursive: true, force: true });
  }
}

if (require.main === module) main().catch((error) => { console.error(error); process.exitCode = 1; });
