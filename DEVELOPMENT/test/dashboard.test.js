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
  assert.match(html, /class="work-fallback"[\s\S]*In progress[\s\S]*Blocked[\s\S]*Verify \/ review[\s\S]*Current sprint/);
  assert.equal((html.match(/class="work-destination-list"/g) || []).length, 1);
  assert.match(html,/Open your signed-in portal for personal work/);
  assert.doesNotMatch(html.match(/class="work-fallback"[\s\S]*?<\/section>/)[0], />\s*0\s*</);
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

test("portal-aligned navigation and presence controls stay verified and privacy safe", () => {
  assert.match(html, /class="side-nav dashboard-nav primary-rail"/);
  for (const label of ["Dashboard", "Today", "Board", "Meetings", "Inbox", "My Work", "Projects", "People", "My Rhythm", "Recognition", "Profile", "Ask MIRA", "More"]) {
    assert.match(html, new RegExp(`(?:title=\\"${label}|>${label}<)`), label);
  }
  for (const route of ["/this-term", "/people", "/recognition", "/me/privacy", "#orientation", "#netconn", "#netteam", "#aidir", "#caprecord", "#myshowcase", "#brandhub"]) {
    assert.ok(html.includes(route), route);
  }
  assert.doesNotMatch(html.match(/id="secondary-navigation"[\s\S]*?<main/)[0], /Alumni directory|Opportunities|Classmates/);
  assert.match(html, /id="dashboard-presence-trigger"[^>]+aria-controls="dashboard-presence-drawer"/);
  assert.match(html, /Live presence is not connected/);
  assert.match(html, /Standalone MIRA does not invent a count or availability/);
  assert.doesNotMatch(html.match(/id="dashboard-presence-drawer"[\s\S]*?<section class="next-step-hero"/)[0], /@fiu\.edu|Sign out/);
  assert.match(script, /mira-portal-presence/);
  assert.match(script, /event\.detail\?\.authorized!==true/);
  assert.match(script, /setSecondaryNavigation/);
  assert.match(script, /closePresence\(\{restore:true\}\)/);
  assert.match(css, /\.presence-drawer/);
  assert.match(css, /\.secondary-navigation/);
  assert.match(css, /bottom: 68px/);
});

test("mobile navigation uses five primary destinations, shared rail tokens, and an accessible secondary sheet", () => {
  const rail = html.match(/<aside class="side-nav dashboard-nav primary-rail"[\s\S]*?<\/aside>/)?.[0] || "";
  assert.equal((rail.match(/data-mobile-primary/g) || []).length, 5);
  for (const token of ["--rail-bg", "--rail-icon", "--rail-label", "--rail-hover-bg", "--rail-active-bg", "--rail-active-icon", "--rail-divider"]) {
    assert.match(css, new RegExp(token), token);
  }
  assert.match(html, /id="secondary-nav-backdrop"[^>]+hidden/);
  assert.match(html, /class="mobile-primary-destinations"/);
  assert.match(script, /secondary-navigation-open/);
  assert.match(script, /setAttribute\("aria-modal","true"\)/);
  assert.match(script, /event\.key!=="Tab"/);
  assert.match(css, /\.primary-rail > :is\(a,button\):not\(\[data-mobile-primary\]\)/);
});
