const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const test = require("node:test");

const root = path.resolve(__dirname, "..");
const html = fs.readFileSync(path.join(root, "index.html"), "utf8");
const css = fs.readFileSync(path.join(root, "css/styles.css"), "utf8");
const icons = fs.readFileSync(path.join(root, "css/images/icons.svg"), "utf8");
const script = fs.readFileSync(path.join(root, "js/chat/capstone-chat.js"), "utf8");

test("homepage presents the premium My Capstone hierarchy without invented personal values", () => {
  assert.match(html, /<main class="dashboard-workspace"[^>]*id="dashboard-top"/);
  assert.match(html, /<h1>My Capstone<\/h1>/);
  assert.match(html, /class="next-step-hero"[\s\S]*data-state="unavailable"/);
  assert.match(html, /Connect to your signed-in Capstone portal/);
  assert.match(html, /class="metric-grid"[\s\S]*In progress[\s\S]*Blocked[\s\S]*Verify \/ review[\s\S]*Current sprint/);
  assert.equal((html.match(/class="metric-tile"/g) || []).length, 4);
  assert.doesNotMatch(html.match(/class="metric-grid"[\s\S]*?<\/section>/)[0], />\s*0\s*</);
  assert.match(html, /id="dashboard-mira-form"/);
  assert.match(html, /data-dashboard-depth="quick"[\s\S]*data-dashboard-depth="guide"[\s\S]*data-dashboard-depth="step"/);
});

test("dashboard exposes required destinations, tools, and privacy-safe fallback copy", () => {
  for (const destination of ["/today", "/board", "/my-work", "/meetings", "/inbox", "/me/rhythm", "/portal#mygrade", "/portal#compare", "/portal#team"]) {
    assert.ok(html.includes(`https://capstone.cs.fiu.edu${destination}`), destination);
  }
  for (const label of ["Check my work", "Ask a person", "Product Owner", "AI Anchor", "Instructor", "Brand &amp; templates"]) assert.match(html, new RegExp(label));
  assert.match(html, /Unknown personal values are labeled unavailable—not shown as zero/);
  assert.match(script, /#dashboard-mira-form/);
  assert.match(script, /\[data-open-check-work\]/);
});

test("dashboard icon family and responsive layouts cover the requested experience", () => {
  for (const id of ["dashboard", "chat", "check-work", "today", "board", "work", "meetings", "inbox", "rhythm", "grade", "standing", "team", "syllabus", "resources", "tutorials", "help", "theme", "settings", "external", "profile", "info"]) {
    assert.match(icons, new RegExp(`<symbol id="${id}"`), id);
  }
  assert.match(css, /\.dashboard-primary-grid/);
  assert.match(css, /@media \(max-width: 920px\)/);
  assert.match(css, /@media \(max-width: 760px\)/);
  assert.match(css, /@media \(max-width: 420px\)/);
  assert.match(css, /prefers-reduced-motion: reduce/);
  assert.match(css, /\.state-loading \.skeleton/);
});

test("dashboard profile remains neutral and exposes compact account, theme, and help controls", () => {
  assert.match(html, /id="dashboard-profile-trigger"[^>]+aria-haspopup="menu"[^>]+aria-expanded="false"/);
  assert.match(html, /id="dashboard-profile-menu"[^>]+role="menu"[^>]+hidden/);
  assert.match(html, /MIRA user[\s\S]*Standalone mode/);
  assert.match(html, /Personal context unavailable/);
  for (const mode of ["portal", "light", "dark", "system"]) assert.match(html, new RegExp(`data-theme-choice="${mode}"`));
  assert.match(html, /Portal theme unavailable; Follow portal uses Auto/);
  assert.match(script, /mira-portal-profile/);
  assert.match(script, /event\.key==="Escape"/);
});
