const { chromium } = require("playwright-core");
const assert = require("node:assert/strict");
const fs = require("node:fs/promises");
const path = require("node:path");
const { createOcelotPackage } = require("./package-ocelot");
const { createPreview, basePath } = require("./preview-ocelot");

async function main() {
  const root = path.resolve(__dirname, "..");
  const release = await createOcelotPackage({ root, outputRoot: path.join(root, "dist", "staging"), transport: "browser" });
  const server = createPreview({ root: release.uploadDirectory });
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
    await page.setViewportSize({ width: 1440, height: 1000 });
    await page.goto(origin + basePath);
    const workspace = page.locator("#team-workspace");
    await workspace.scrollIntoViewIfNeeded();
    assert.match(await workspace.textContent(), /Snapshot, not live portal state/);
    await workspace.getByRole("button", { name: /CAP-1316/ }).click();
    assert.match(await page.locator("#selected-work-card").textContent(), /Anthony Feliz/);
    assert.equal(await page.locator("#selected-work-card textarea").count(), 5);
    await page.locator("#selected-work-card textarea").first().fill("Fictional test output reviewed by a teammate.");
    await workspace.getByRole("button", { name: "Check draft evidence" }).click();
    assert.match(await page.locator(".evidence-result").textContent(), /1 of 5/);
    await workspace.getByRole("button", { name: "Show actionable steps" }).click();
    assert.equal(await page.locator(".workspace-draft-output li").count(), 5);
    await workspace.getByRole("button", { name: "Draft teammate handoff" }).click();
    assert.match(await page.locator(".workspace-draft-output").textContent(), /confirm current portal state first/i);
    await workspace.getByRole("button", { name: "Prepare from selected card" }).click();
    assert.match(await page.locator("#standup-draft-status").textContent(), /Duplicate warning/);
    assert.match(await page.locator("#standup-draft-form textarea").first().inputValue(), /CAP-1316/);
    await workspace.getByRole("tab", { name: "Retrospective" }).click();
    assert.match(await page.locator("#ceremony-prompts").textContent(), /Keep:/);
    const qa = path.join(root, "dist", "staging", "team-workspace-review");
    await fs.mkdir(qa, { recursive: true });
    await workspace.screenshot({ path: path.join(qa, "workspace-desktop.png") });
    await page.setViewportSize({ width: 390, height: 844 });
    await page.reload();
    await workspace.scrollIntoViewIfNeeded();
    const contained = await workspace.evaluate((element) => { const rect = element.getBoundingClientRect(); return rect.left >= -1 && rect.right <= innerWidth + 1 && document.documentElement.scrollWidth <= document.documentElement.clientWidth; });
    assert.equal(contained, true);
    await workspace.screenshot({ path: path.join(qa, "workspace-mobile-390.png") });
    assert.deepEqual(errors, []);
    console.log("PASS: sourced team cards, evidence drafts, actionable steps, handoff draft, duplicate-aware stand-up, retrospective prompts, and 390px containment.");
    console.log("Screenshots: " + qa);
  } finally {
    await browser?.close();
    await new Promise((resolve) => server.close(resolve));
    await fs.rm(release.destination, { recursive: true, force: true });
  }
}

if (require.main === module) main().catch((error) => { console.error(error); process.exitCode = 1; });
