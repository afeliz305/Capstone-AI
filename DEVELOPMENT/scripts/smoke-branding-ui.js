// Real browser checks, isolated package/profile; no external requests or ticket writes.
const { chromium } = require("playwright-core");
const assert = require("node:assert/strict");
const fs = require("node:fs/promises");
const path = require("node:path");
const { createOcelotPackage } = require("./package-ocelot");
const { createPreview, basePath } = require("./preview-ocelot");

async function main() {
  const root = path.resolve(__dirname, "..");
  const release = await createOcelotPackage({ root, outputRoot: path.join(root, "dist/staging"), transport: "browser" });
  assert.ok(release.manifest.every(item => !/roary/i.test(item.file)));
  const server = createPreview({ root: release.uploadDirectory });
  await new Promise((resolve, reject) => { server.once("error", reject); server.listen(0, "127.0.0.1", resolve); });
  let browser;
  try {
    browser = await chromium.launch({ channel: process.env.CAPSTONE_BROWSER_CHANNEL || "msedge", headless: true });
    const context = await browser.newContext();
    context.setDefaultTimeout(15000);
    const origin = "http://127.0.0.1:" + server.address().port;
    await context.route("**/*", route => new URL(route.request().url()).origin === origin ? route.continue() : route.abort());
    const page = await context.newPage();
    const errors = [];
    page.on("pageerror", error => errors.push(error.message));
    const qa = path.join(root, "dist/staging/branding-ui");
    await fs.mkdir(qa, { recursive: true });
    for (const viewport of [{ width: 1280, height: 900 }, { width: 390, height: 844 }, { width: 320, height: 568 }]) {
      await page.setViewportSize(viewport);
      await page.goto(origin + basePath);
      const launcher = page.locator("#chat-launcher");
      await page.getByRole("button", { name: "Open MIRA chat", exact: true }).waitFor({ state: "visible" });
      assert.match(await page.title(), /^MIRA/);
      assert.equal(await page.locator("#assistant").isVisible(), false);
      assert.equal(await page.locator(".chat-launcher-art").evaluate(img => img.complete && img.naturalWidth === 64), true);
      assert.equal(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), true);
      const rect = await launcher.boundingBox();
      assert.ok(rect.x >= 0 && rect.y >= 0 && rect.x + rect.width <= viewport.width && rect.y + rect.height <= viewport.height);
      assert.ok(rect.height >= 44 && rect.height <= 80, "compact, usable target without mascot-sized space");
      await page.screenshot({ path: path.join(qa, "launcher-" + viewport.width + ".png"), fullPage: true });
      await launcher.focus();
      await page.keyboard.press("Enter");
      await page.locator("#assistant").waitFor({ state: "visible" });
      assert.equal(await launcher.getAttribute("aria-expanded"), "true");
      assert.equal(await page.locator("#chat-title").textContent(), "MIRA");
      const panel = await page.locator("#assistant").boundingBox();
      assert.ok(panel.x >= 0 && panel.y >= 0 && panel.x + panel.width <= viewport.width && panel.y + panel.height <= viewport.height);
      await page.locator("#chat-input").fill("Fictional unsent test draft");
      await page.screenshot({ path: path.join(qa, "chat-" + viewport.width + ".png"), fullPage: true });
      await page.locator("#minimize-chat").click();
      await launcher.waitFor({ state: "visible" });
      assert.equal(await launcher.evaluate(button => button === document.activeElement), true);
      await page.keyboard.press("Enter");
      assert.equal(await page.locator("#chat-input").inputValue(), "Fictional unsent test draft");
      await page.locator("#chat-input").press("Escape");
      await launcher.waitFor({ state: "visible" });
      assert.equal(await launcher.getAttribute("aria-expanded"), "false");
    }
    await page.goto(origin + basePath + "pages/staff.html");
    await page.locator("#staff-login").waitFor({ state: "visible" });
    assert.match(await page.title(), /MIRA/);
    for (const viewport of [{ width: 1280, height: 900 }, { width: 390, height: 844 }]) {
      await page.setViewportSize(viewport);
      await page.evaluate(() => { const dialog=document.querySelector("#forgot-password-dialog"); dialog.showModal(); });
      assert.equal(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), true);
      const dialog=await page.locator("#forgot-password-dialog").boundingBox();
      assert.ok(dialog.x >= 0 && dialog.x + dialog.width <= viewport.width);
      await page.evaluate(() => document.querySelector("#forgot-password-dialog").close());
    }
    await page.locator("#staff-email").fill("afeli016@fiu.edu");
    await page.locator("#staff-login-form button[type='submit']").click();
    await page.locator("#staff-workspace").waitFor({ state: "visible" });
    assert.equal(await page.locator("#staff-profile").isVisible(), true);
    assert.equal(await page.locator("#change-staff-password").isVisible(), false, "browser demo has no password control");
    for (const viewport of [{ width: 1280, height: 900 }, { width: 390, height: 844 }, { width: 320, height: 568 }]) {
      await page.setViewportSize(viewport);
      const profileTrigger = page.locator("#staff-profile-trigger");
      await profileTrigger.click();
      await page.locator("#staff-profile-menu").waitFor({ state: "visible" });
      assert.equal(await profileTrigger.getAttribute("aria-expanded"), "true");
      assert.equal(await page.locator("#staff-profile-name").textContent(), "Anthony Feliz");
      assert.equal(await page.locator("#staff-profile-email").textContent(), "afeli016@fiu.edu");
      assert.equal(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), true);
      const menu = await page.locator("#staff-profile-menu").boundingBox();
      assert.ok(menu.x >= 0 && menu.x + menu.width <= viewport.width);
      await page.locator("#staff-settings").click();
      await page.locator("#staff-settings-dialog").waitFor({ state: "visible" });
      assert.equal(await page.locator("#staff-settings-name").inputValue(), "Anthony Feliz");
      assert.equal(await page.locator("#staff-settings-email").inputValue(), "afeli016@fiu.edu");
      assert.equal(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), true);
      const settings = await page.locator("#staff-settings-dialog").boundingBox();
      assert.ok(settings.x >= 0 && settings.x + settings.width <= viewport.width);
      await page.locator("#close-staff-settings").click();
      assert.equal(await page.locator("#staff-settings-dialog").evaluate(dialog => dialog.open), false);
      assert.equal(await page.locator("#staff-profile-menu").isVisible(), false);
      assert.equal(await profileTrigger.evaluate(button => button === document.activeElement), true);

      await profileTrigger.click();
      await page.locator("#staff-profile-menu").waitFor({ state: "visible" });
      await page.keyboard.press("Escape");
      assert.equal(await page.locator("#staff-profile-menu").isVisible(), false);
      assert.equal(await profileTrigger.evaluate(button => button === document.activeElement), true);

      await profileTrigger.click();
      await page.locator("#staff-settings").click();
      await page.locator("#staff-settings-dialog").waitFor({ state: "visible" });
      await page.keyboard.press("Escape");
      assert.equal(await page.locator("#staff-settings-dialog").evaluate(dialog => dialog.open), false);
      assert.equal(await page.locator("#staff-profile-menu").isVisible(), false);
      assert.equal(await profileTrigger.evaluate(button => button === document.activeElement), true);
    }
    await page.locator("#staff-profile-trigger").click();
    await page.locator("#staff-logout").click();
    await page.locator("#staff-login").waitFor({ state: "visible" });
    assert.equal(await page.locator("#staff-profile").isVisible(), false);
    await page.goto(origin + basePath + "pages/recover.html");
    assert.match(await page.title(), /MIRA/);
    assert.equal(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), true);
    assert.equal((await page.request.get(origin + basePath + "css/images/ask-roary-transparent.png")).status(), 404);
    assert.deepEqual(errors, []);
    console.log("PASS: MIRA branding, generic SVG, keyboard chat controls, desktop/390px/320px layouts, Staff Queue profile/menu/Settings/sign-out focus, reset dialog/recovery layout, retired asset excluded. No cloud, email, password, or ticket writes.");
  } finally {
    if (browser) await browser.close();
    server.closeAllConnections();
    await new Promise(resolve => server.close(resolve));
  }
}
main().catch(error => { console.error(error); process.exitCode = 1; });
