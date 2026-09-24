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
      await page.getByRole("button", { name: "Open Capstone - AI chat", exact: true }).waitFor({ state: "visible" });
      assert.match(await page.title(), /^Capstone - AI/);
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
      assert.equal(await page.locator("#chat-title").textContent(), "Capstone - AI");
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
    assert.match(await page.title(), /Capstone - AI/);
    assert.equal((await page.request.get(origin + basePath + "css/images/ask-roary-transparent.png")).status(), 404);
    assert.deepEqual(errors, []);
    console.log("PASS: generic SVG, renamed branding, keyboard open/minimize/Escape, focus/draft retention, desktop/390px/320px layout, staff title, retired asset excluded. No cloud or ticket writes.");
  } finally {
    if (browser) await browser.close();
    server.closeAllConnections();
    await new Promise(resolve => server.close(resolve));
  }
}
main().catch(error => { console.error(error); process.exitCode = 1; });
