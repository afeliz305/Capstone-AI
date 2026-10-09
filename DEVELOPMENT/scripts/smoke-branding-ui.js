// Real browser checks, isolated package/profile; no external requests or ticket writes.
const { chromium } = require("playwright-core");
const assert = require("node:assert/strict");
const fs = require("node:fs/promises");
const path = require("node:path");
const { createOcelotPackage } = require("./package-ocelot");
const { createPreview, basePath } = require("./preview-ocelot");

async function main() {
  const root = path.resolve(__dirname, "..");
  const existingPackage = process.env.MIRA_SMOKE_EXISTING_PACKAGE;
  const release = existingPackage
    ? { uploadDirectory:path.resolve(existingPackage), manifest:[] }
    : await createOcelotPackage({ root, outputRoot: path.join(root, "dist/staging"), transport: "browser" });
  if (!existingPackage) assert.ok(release.manifest.every(item => !/roary/i.test(item.file)));
  const server = createPreview({ root: release.uploadDirectory });
  await new Promise((resolve, reject) => { server.once("error", reject); server.listen(0, "127.0.0.1", resolve); });
  let browser;
  try {
    browser = await chromium.launch({ channel: process.env.CAPSTONE_BROWSER_CHANNEL || "msedge", headless: true });
    const context = await browser.newContext({ reducedMotion:"reduce" });
    context.setDefaultTimeout(15000);
    const origin = "http://127.0.0.1:" + server.address().port;
    await context.route("**/*", route => new URL(route.request().url()).origin === origin ? route.continue() : route.abort());
    const page = await context.newPage();
    const errors = [];
    page.on("pageerror", error => errors.push(error.message));
    const qa = path.join(root, "dist/staging/branding-ui");
    await fs.mkdir(qa, { recursive: true });
    for (const viewport of [{ width: 1280, height: 900 }, { width: 768, height: 1024 }, { width: 390, height: 844 }, { width: 320, height: 568 }]) {
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
      assert.equal(await page.locator("#open-check-work").getAttribute("aria-controls"), "check-work-dialog");
      assert.equal(await page.locator("#open-check-work").getAttribute("aria-haspopup"), "dialog");
      assert.ok(["quick","guide","step"].includes(await page.locator("#response-depth").inputValue()));
      await page.locator(".mira-tools-menu > summary").click();
      assert.equal(await page.locator(".mira-tools-menu").evaluate(menu => menu.open), true);
      assert.equal(await page.locator(".tool-menu-action").count(), 4);
      await page.keyboard.press("Escape");
      assert.equal(await page.locator(".mira-tools-menu").evaluate(menu => menu.open), false);
      assert.equal(await page.locator("#assistant").isVisible(), true, "Escape closes More tools before the chat");
      await page.evaluate(() => window.MiraTheme.set("system"));
      await page.locator("#assistant [data-theme-toggle]").click();
      assert.equal(await page.locator("html").getAttribute("data-theme"), "dark");
      assert.equal(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), true);
      if (viewport.width === 1280) await page.screenshot({ path: path.join(qa, "chat-dark-1280.png"), fullPage: true });
      await page.evaluate(() => window.MiraTheme.set("system"));
      assert.equal(await page.evaluate(() => { const dots=document.createElement("div"),span=document.createElement("span");dots.className="typing-dots";dots.append(span);document.body.append(dots);const reduced=parseFloat(getComputedStyle(span).animationDuration)<.1;dots.remove();return reduced; }), true);
      const panel = await page.locator("#assistant").boundingBox();
      assert.ok(panel.x >= 0 && panel.y >= 0 && panel.x + panel.width <= viewport.width && panel.y + panel.height <= viewport.height);
      await page.locator("#chat-input").fill("Fictional unsent test draft");
      await page.locator("#open-check-work").click();
      await page.locator("#check-work-dialog").waitFor({ state:"visible" });
      assert.equal(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), true);
      await page.keyboard.press("Escape");
      assert.equal(await page.locator("#check-work-dialog").evaluate(dialog => dialog.open), false);
      assert.equal(await page.locator("#open-check-work").evaluate(button => button === document.activeElement), true);
      await page.locator("#open-check-work").click();
      await page.locator("#check-work-dialog textarea[name='workText']").fill("Fictional evidence: the prototype includes a reviewed source and a passing local test.");
      await page.getByRole("button", { name:"Review safely", exact:true }).click();
      await page.locator(".guidance-review").last().waitFor({ state:"visible" });
      assert.equal(await page.locator(".guidance-review").last().locator(".guidance-review-section").count(), 5);
      if (viewport.width === 1280) {
        await page.locator('[data-question="Show my Capstone snapshot"]').last().click();
        await page.locator(".capstone-summary").last().waitFor({ state:"visible" });
        assert.equal(await page.locator(".capstone-summary").last().locator(".capstone-summary-card").count(), 7);
        assert.equal(await page.locator(".capstone-summary").last().getByText("Unavailable in this session").count(), 7);
      }
      await page.locator("#chat-input").fill("Fictional unsent test draft");
      await page.screenshot({ path: path.join(qa, "chat-" + viewport.width + ".png"), fullPage: true });
      await page.locator("#minimize-chat").click();
      await launcher.waitFor({ state: "visible" });
      assert.equal(await launcher.evaluate(button => button.classList.contains("hint-dismissed")), true);
      assert.equal(await launcher.evaluate(button => button === document.activeElement), true);
      await page.keyboard.press("Enter");
      assert.equal(await page.locator("#chat-input").inputValue(), "Fictional unsent test draft");
      await page.locator("#chat-input").press("Escape");
      await launcher.waitFor({ state: "visible" });
      assert.equal(await launcher.getAttribute("aria-expanded"), "false");
      await page.evaluate(() => document.querySelector("#support-dialog").showModal());
      await page.locator("#support-dialog").waitFor({ state: "visible" });
      assert.equal(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), true);
      const support = await page.locator("#support-dialog").boundingBox();
      assert.ok(support.x >= 0 && support.x + support.width <= viewport.width);
      const email = page.locator("#request-email");
      await email.fill("invalid@email");
      await email.blur();
      assert.equal(await email.getAttribute("aria-invalid"), "true");
      assert.match(await page.locator("#request-email-error").textContent(), /valid requester email/);
      await email.fill("fictional.student@example.edu");
      assert.equal(await email.getAttribute("aria-invalid"), "false");
      await page.locator("#support-dialog").evaluate(dialog => dialog.close());
    }
    await page.setViewportSize({ width:1280, height:900 });
    await page.goto(origin + basePath);
    await page.evaluate(() => { document.documentElement.style.zoom="2"; });
    await page.getByRole("button", { name:"Open MIRA chat", exact:true }).click();
    await page.locator("#assistant").waitFor({ state:"visible" });
    assert.equal(await page.evaluate(() => document.documentElement.scrollWidth <= document.documentElement.clientWidth), true, "no page-level horizontal overflow at 200% zoom");
    const zoomPanel=await page.locator("#assistant").boundingBox();
    assert.ok(zoomPanel.x>=0&&zoomPanel.x+zoomPanel.width<=1280,"chat remains inside the viewport at 200% zoom");
    if (existingPackage) {
      await page.evaluate(() => { document.documentElement.style.zoom="1"; });
      const ask = async question => {
        const before=await page.locator(".assistant-message").count();
        await page.locator("#chat-input").fill(question);
        await page.locator("#chat-input").press("Enter");
        await page.waitForFunction(count => {
          const messages=[...document.querySelectorAll(".assistant-message")];
          return messages.length>count&&!messages.at(-1)?.classList.contains("typing-message")&&!document.querySelector("#chat-input")?.disabled;
        },before);
        return page.locator(".assistant-message").last();
      };
      for (const [question, expected] of [
        ["What are acceptance criteria?",/acceptance criteria/i],
        ["What counts as evidence?",/evidence/i],
        ["Who can verify a card?",/verify/i],
        ["Who decides whether a card is accepted?",/Product Owner/i],
        ["What goes in my daily scrum update?",/stand-?up|Daily Scrum/i]
      ]) {
        const answer=await ask(question);
        assert.match(await answer.textContent(),expected);
        assert.match(await answer.locator(".message-note").first().textContent(),/Source:/i);
      }
      for (const [question, suffix] of [
        ["Open portal Grade","/portal#mygrade"],
        ["Open portal Team","/portal#team"],
        ["Open portal Standing","/portal#compare"],
        ["Do I have any new messages?","/inbox"],
        ["Open my dashboard","/today"],
        ["Open my sprint board","/board"],
        ["Open My work","/my-work"],
        ["Open my meetings","/meetings"],
        ["Open my rhythm","/me/rhythm"],
        ["Open portal Resources","/portal#resources"]
      ]) {
        const answer=await ask(question);
        const href=await answer.locator("a.source-card").first().getAttribute("href");
        assert.ok(href?.endsWith(suffix),`${question} should offer ${suffix}`);
      }
      await page.locator("#response-depth").selectOption("guide");
      assert.match(await (await ask("What are acceptance criteria?")).textContent(),/WHY[\s\S]*NEXT STEP/);
      await page.locator("#response-depth").selectOption("step");
      assert.match(await (await ask("What counts as evidence?")).textContent(),/STEP BY STEP[\s\S]*NEXT STEP/);
      await page.locator("#response-depth").selectOption("quick");
      const person=await ask("Who should I ask for help with this?");
      assert.match(await person.textContent(),/Team|People|person|role/i);
      assert.match(await page.locator(".tool-menu-note").textContent(),/never sends/i);
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
    if (existingPackage) {
      assert.equal(await page.locator("#staff-password").isVisible(), true);
      assert.equal(await page.locator("#forgot-staff-password").isVisible(), true);
      await page.evaluate(() => window.MiraTheme.set("dark"));
      assert.equal(await page.locator("html").getAttribute("data-theme"), "dark");
      await page.reload();
      assert.equal(await page.locator("html").getAttribute("data-theme"), "dark", "saved theme survives a reload");
      await page.evaluate(() => window.MiraTheme.set("system"));
      await page.goto(origin + basePath + "pages/recover.html");
      assert.match(await page.title(), /MIRA/);
      assert.equal(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), true);
      assert.match(await page.locator("#recovery-status").textContent(), /recovery link|verifying/i);
      assert.deepEqual(errors, []);
      console.log("PASS: exact generated MIRA package themes, saved preference, launcher/chat workflows, More tools, Check My Work, My Capstone fallback, responsive/zoom layouts, signed-out Staff Queue, and recovery invalid-state presentation. No external request, login, cloud, email, password, or ticket write was allowed.");
      return;
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
    console.log("PASS: MIRA branding, light/dark/system themes, portal-aligned tokens and icons, polished launcher, keyboard tool menu, structured Check My Work, honest My Capstone unavailable states, reduced motion, 200% zoom, desktop/tablet/390px/320px layouts, support-form validation, Staff Queue focus flows, recovery layout, and retired asset exclusion. No cloud, email, password, or ticket writes.");
  } finally {
    if (browser) await browser.close();
    server.closeAllConnections();
    await new Promise(resolve => server.close(resolve));
  }
}
main().catch(error => { console.error(error); process.exitCode = 1; });
