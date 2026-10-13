// Real-browser responsive and interaction checks against an isolated public package.
const { chromium } = require("playwright-core");
const assert = require("node:assert/strict");
const fs = require("node:fs/promises");
const path = require("node:path");
const { createOcelotPackage } = require("./package-ocelot");
const { createPreview, basePath } = require("./preview-ocelot");

const mobileWidths = [440, 390, 375, 360, 320];

async function main() {
  const root = path.resolve(__dirname, "..");
  const existingPackage = process.env.MIRA_SMOKE_EXISTING_PACKAGE;
  const release = existingPackage
    ? { uploadDirectory: path.resolve(existingPackage) }
    : await createOcelotPackage({ root, outputRoot: path.join(root, "dist/staging"), transport: "browser" });
  const server = createPreview({ root: release.uploadDirectory });
  await new Promise((resolve, reject) => { server.once("error", reject); server.listen(0, "127.0.0.1", resolve); });
  let browser;
  try {
    browser = await chromium.launch({ channel: process.env.CAPSTONE_BROWSER_CHANNEL || "msedge", headless: true });
    const context = await browser.newContext({ reducedMotion: "reduce" });
    context.setDefaultTimeout(15000);
    const origin = `http://127.0.0.1:${server.address().port}`;
    await context.route("**/*", route => new URL(route.request().url()).origin === origin ? route.continue() : route.abort());
    const page = await context.newPage();
    const runtimeErrors = [];
    const unexpectedNetworkFailures = [];
    page.on("pageerror", error => runtimeErrors.push(error.message));
    page.on("console", message => { if (message.type() === "error") runtimeErrors.push(message.text()); });
    page.on("requestfailed", request => { if (new URL(request.url()).origin === origin) unexpectedNetworkFailures.push(request.url()); });
    const qa = path.join(root, "dist/staging/mobile-ui-review");
    await fs.mkdir(qa, { recursive: true });

    const assertContained = async (selector, width, label = selector) => {
      const value = await page.locator(selector).evaluate(element => {
        const rect = element.getBoundingClientRect();
        return { left: rect.left, right: rect.right, client: element.clientWidth, scroll: element.scrollWidth };
      });
      assert.ok(value.left >= -1 && value.right <= width + 1, `${label} must fit ${width}px: ${JSON.stringify(value)}`);
      assert.ok(value.scroll <= value.client + 1, `${label} must not hide horizontal overflow: ${JSON.stringify(value)}`);
    };
    const ask = async question => {
      const before = await page.locator(".assistant-message").count();
      await page.locator("#chat-input").fill(question);
      await page.locator("#chat-input").press("Enter");
      await page.waitForFunction(count => {
        const messages = [...document.querySelectorAll(".assistant-message")];
        return messages.length > count && !messages.at(-1)?.classList.contains("typing-message") && !document.querySelector("#chat-input")?.disabled;
      }, before);
      return page.locator(".assistant-message").last();
    };

    for (const width of mobileWidths) {
      const height = width === 320 ? 568 : 844;
      await page.setViewportSize({ width, height });
      await page.goto(origin + basePath);
      await page.evaluate(() => window.MiraTheme.set("light"));
      await page.locator(".next-step-hero").waitFor({ state: "visible" });
      assert.equal(await page.evaluate(() => document.documentElement.scrollWidth <= document.documentElement.clientWidth + 1 && document.body.scrollWidth <= document.body.clientWidth + 1), true);
      for (const selector of [".dashboard-shell", ".primary-rail", ".dashboard-workspace", ".next-step-hero", ".mira-dashboard-assistant"]) await assertContained(selector, width);
      assert.equal(await page.locator(".primary-rail > :is(a,button):visible").count(), 5, "mobile rail has five intentional destinations");

      const secondaryTrigger = page.locator("#secondary-nav-trigger");
      await secondaryTrigger.click();
      await page.locator("#secondary-navigation").waitFor({ state: "visible" });
      assert.equal(await page.locator("#secondary-navigation").getAttribute("role"), "dialog");
      assert.equal(await page.locator("#secondary-navigation").getAttribute("aria-modal"), "true");
      assert.equal(await page.locator("#secondary-nav-backdrop").isVisible(), true);
      assert.equal(await page.locator("#secondary-nav-close").evaluate(node => node === document.activeElement), true);
      await assertContained("#secondary-navigation", width, "secondary navigation sheet");
      if (width === 390) await page.screenshot({ path: path.join(qa, "secondary-nav-mobile-390.png") });
      await page.keyboard.press("Shift+Tab");
      assert.equal(await page.locator("#secondary-navigation").evaluate(node => node.contains(document.activeElement)), true, "focus remains trapped in the mobile navigation sheet");
      await page.keyboard.press("Escape");
      assert.equal(await page.locator("#secondary-navigation").isVisible(), false);
      assert.equal(await secondaryTrigger.evaluate(node => node === document.activeElement), true);
      if (width === 390 || width === 320) {
        await page.evaluate(() => {
          window.__miraMobileDestination = "";
          document.addEventListener("click", event => {
            const link = event.target.closest?.(".mobile-primary-destinations a");
            if (!link) return;
            event.preventDefault();
            window.__miraMobileDestination = link.href;
          }, true);
        });
        await secondaryTrigger.click();
        await page.locator(".mobile-primary-destinations a").first().click();
        assert.match(await page.evaluate(() => window.__miraMobileDestination), /capstone\.cs\.fiu\.edu\/board$/);
        assert.equal(await page.locator("#secondary-navigation").isVisible(), false, "choosing a mobile destination closes the sheet");
      }

      const profileTrigger = page.locator("#dashboard-profile-trigger");
      await profileTrigger.click();
      await page.locator("#dashboard-profile-menu").waitFor({ state: "visible" });
      await assertContained("#dashboard-profile-menu", width, "profile menu");
      if (width === 390) await page.screenshot({ path: path.join(qa, "profile-mobile-390.png") });
      await page.locator('[data-theme-choice="dark"]').click();
      assert.equal(await page.locator("html").getAttribute("data-theme"), "dark");
      await page.waitForTimeout(350);
      const darkRail = await page.locator(".primary-rail").evaluate(rail => {
        const active = getComputedStyle(rail.querySelector(".active"));
        const inactive = getComputedStyle(rail.querySelector('a[title="Today"]'));
        return { activeBg: active.backgroundColor, activeColor: active.color, inactiveBg: inactive.backgroundColor, inactiveColor: inactive.color };
      });
      assert.notEqual(darkRail.activeBg, darkRail.inactiveBg);
      assert.notEqual(darkRail.activeColor, darkRail.inactiveColor);
      if (width === 390) await page.screenshot({ path: path.join(qa, "mobile-dark-390.png") });
      await profileTrigger.click();
      await page.locator('[data-theme-choice="light"]').click();
      assert.equal(await page.locator("html").getAttribute("data-theme"), "light");
      await page.waitForTimeout(350);
      if (width === 390) await page.screenshot({ path: path.join(qa, "mobile-light-390.png") });

      const presenceTrigger = page.locator("#dashboard-presence-trigger");
      await presenceTrigger.click();
      await page.locator("#dashboard-presence-drawer").waitFor({ state: "visible" });
      await assertContained("#dashboard-presence-drawer", width, "team drawer");
      await page.locator("#presence-tab-team").click();
      assert.equal(await page.locator("#presence-panel-team").isVisible(), true);
      if (width === 390) await page.screenshot({ path: path.join(qa, "team-drawer-mobile-390.png") });
      await page.locator("#presence-close").click();
      assert.equal(await presenceTrigger.evaluate(node => node === document.activeElement), true);

      const launcher = page.locator("#chat-launcher");
      if (width === 320) await page.screenshot({ path: path.join(qa, "mobile-narrow-320.png") });
      await launcher.click();
      await page.locator("#assistant").waitFor({ state: "visible" });
      for (const selector of ["#assistant", ".chat-header", ".mira-context-actions", ".chat-composer"]) await assertContained(selector, width);
      await page.locator("#minimize-chat").click();
      assert.equal(await launcher.evaluate(node => node === document.activeElement), true);
      await launcher.click();
      await page.locator("#assistant").waitFor({ state: "visible" });
      await page.locator("#response-depth").selectOption("guide");
      const answer = await ask("What are acceptance criteria?");
      assert.match(await answer.textContent(), /acceptance criteria/i);
      assert.match(await answer.locator(".message-note").first().textContent(), /Source:/i);
      assert.doesNotMatch(await answer.textContent(), /backend is not available|temporarily unavailable/i);
      await page.locator("#open-check-work").click();
      await page.locator("#check-work-dialog").waitFor({ state: "visible" });
      await page.keyboard.press("Escape");
      assert.equal(await page.locator("#open-check-work").evaluate(node => node === document.activeElement), true);
      if (width === 390) await page.screenshot({ path: path.join(qa, "mobile-popup-390.png") });
      await page.locator("#minimize-chat").click();
      assert.equal(await launcher.evaluate(node => node === document.activeElement), true);
    }

    await page.setViewportSize({ width: 1440, height: 900 });
    await page.goto(origin + basePath);
    await page.evaluate(() => window.MiraTheme.set("light"));
    await page.waitForTimeout(350);
    await page.screenshot({ path: path.join(qa, "desktop-light-1440.png") });
    await page.evaluate(() => window.MiraTheme.set("dark"));
    await page.waitForTimeout(350);
    await page.screenshot({ path: path.join(qa, "desktop-dark-1440.png") });
    assert.deepEqual(runtimeErrors, []);
    assert.deepEqual(unexpectedNetworkFailures, []);
    console.log(`PASS: mobile responsive containment, rail architecture, modal navigation focus, profile/theme, team drawer, popup/composer, grounded answer, and dialog focus at ${mobileWidths.join(", ")}px.`);
    console.log(`Screenshots: ${qa}`);
  } finally {
    if (browser) await browser.close();
    server.closeAllConnections();
    await new Promise(resolve => server.close(resolve));
  }
}

main().catch(error => { console.error(error); process.exitCode = 1; });
