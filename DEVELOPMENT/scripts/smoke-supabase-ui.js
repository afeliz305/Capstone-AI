// Isolated headless browser. No staff account/password and no hosted writes.
const {chromium}=require("playwright-core");
const assert=require("node:assert/strict");
const fs=require("node:fs/promises");
const path=require("node:path");
async function main() {
  const browser=await chromium.launch({channel:process.env.CAPSTONE_BROWSER_CHANNEL||"msedge",headless:true});
  try {
    const context=await browser.newContext({viewport:{width:1280,height:900}});
    // Refuse all external requests: these UI checks cannot create real accounts/tickets.
    await context.route("**/*",route=>new URL(route.request().url()).hostname==="127.0.0.1" ? route.continue() : route.fulfill({status:503,contentType:"application/json",body:'{"message":"Isolated UI test: external network blocked"}'}));
    const page=await context.newPage(),errors=[];
    page.on("pageerror",error=>errors.push(error.message));
    const base="http://127.0.0.1:3004/Capstone%20-%20AI/";
    await page.goto(base);
    await page.locator("#chat-launcher").waitFor({state:"visible"});
    assert.equal(await page.evaluate(()=>window.CapstoneApi.storageMode),"supabase");
    assert.equal(await page.locator(".chat-launcher-art").evaluate(img=>img.complete&&img.naturalWidth>0),true);
    await page.locator("#chat-launcher").click();
    await page.locator("#chat-input").fill("sprint planning");
    await page.locator("#chat-form button[type=submit]").click();
    await page.locator(".chat-log a[href*='capstone.cs.fiu.edu']").first().waitFor();
    if (await page.locator(".result-choice").first().isVisible()) await page.locator(".result-choice").first().click();
    await page.getByRole("button",{name:"I still need help",exact:true}).last().click();
    await page.locator("#support-dialog").waitFor({state:"visible"});
    await page.locator('#support-form input[name="name"]').fill("Fictional UI Tester");
    await page.locator('#support-form input[name="email"]').fill("fictional@example.test");
    await page.locator('#support-form textarea[name="question"]').fill("TEST blocked cloud request");
    await page.locator('#support-form textarea[name="details"]').fill("Fictional failure-path test only.");
    await page.locator('#support-form button[type="submit"]').click();
    await page.waitForFunction(()=>document.querySelector("#support-status").textContent.includes("Requester sign-in is unavailable"));
    assert.equal(await page.locator('#support-form textarea[name="details"]').inputValue(),"Fictional failure-path test only.");
    assert.equal(await page.locator('#support-dialog').isVisible(),true);
    await page.goto(base+"pages/staff.html");
    await page.locator("#staff-login").waitFor({state:"visible"});
    assert.equal(await page.locator("#staff-password").isVisible(),true);
    assert.equal(await page.locator("#staff-password").isEnabled(),true);
    assert.equal(await page.locator("#staff-password-label").textContent(),"Password");
    assert.match(await page.locator("#staff-password-setup").textContent(),/Supabase staff account/);
    const qa=path.resolve(__dirname,"../dist/staging/supabase-ui");await fs.mkdir(qa,{recursive:true});
    await page.screenshot({path:path.join(qa,"staff-desktop.png"),fullPage:true});
    await page.setViewportSize({width:390,height:844});
    assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),true);
    await page.screenshot({path:path.join(qa,"staff-mobile.png"),fullPage:true});
    assert.deepEqual(errors,[]);
    console.log("PASS: real headless browser, local Supabase bundle/chat/generic icon/password UI, failed-save draft retention, mobile width; all external requests blocked. Not a live cloud save.");
  } finally {await browser.close();}
}
main().catch(error=>{console.error(error.message);process.exitCode=1;});
