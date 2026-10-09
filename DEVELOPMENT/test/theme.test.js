const assert = require("node:assert/strict");
const { readFileSync } = require("node:fs");
const path = require("node:path");
const test = require("node:test");
const vm = require("node:vm");

const root = path.join(__dirname, "..");
const themeScript = readFileSync(path.join(root, "js/shared/theme.js"), "utf8");

function themeFixture({ saved = null, darkSystem = false } = {}) {
  const values = new Map(saved ? [["mira-theme-preference", saved]] : []);
  const attributes = {};
  const label = { textContent: "" };
  const button = {
    dataset: {},
    title: "",
    setAttribute(name, value) { attributes[name] = value; },
    querySelector(selector) { return selector === "[data-theme-label]" ? label : null; }
  };
  let clickHandler;
  let mediaHandler;
  const documentElement = { dataset: {}, style: {} };
  const document = {
    documentElement,
    querySelectorAll(selector) { return selector === "[data-theme-toggle]" ? [button] : []; },
    addEventListener(type, handler) { if (type === "click") clickHandler = handler; }
  };
  const events = [];
  const media = {
    matches: darkSystem,
    addEventListener(type, handler) { if (type === "change") mediaHandler = handler; }
  };
  const window = {
    localStorage: {
      getItem(key) { return values.get(key) ?? null; },
      setItem(key, value) { values.set(key, value); },
      removeItem(key) { values.delete(key); }
    },
    matchMedia() { return media; },
    dispatchEvent(event) { events.push(event); }
  };
  class CustomEvent {
    constructor(type, options) { this.type = type; this.detail = options?.detail; }
  }
  vm.runInNewContext(themeScript, { document, window, CustomEvent });
  return {
    documentElement, button, label, attributes, values, events, media,
    click() { clickHandler({ target: { closest: () => button } }); },
    systemChanged(matches) { media.matches = matches; mediaHandler?.(); },
    api: window.MiraTheme
  };
}

test("theme control cycles system, dark and light without treating system as a stored override", () => {
  const ui = themeFixture();
  assert.equal(ui.api.preference, "system");
  assert.equal(ui.api.resolved, "light");
  assert.equal(ui.documentElement.dataset.theme, undefined);
  assert.equal(ui.attributes["aria-pressed"], "false");

  ui.click();
  assert.equal(ui.api.preference, "dark");
  assert.equal(ui.documentElement.dataset.theme, "dark");
  assert.equal(ui.values.get("mira-theme-preference"), "dark");
  assert.equal(ui.label.textContent, "Dark");

  ui.click();
  assert.equal(ui.api.preference, "light");
  assert.equal(ui.documentElement.dataset.theme, "light");
  assert.equal(ui.values.get("mira-theme-preference"), "light");

  ui.click();
  assert.equal(ui.api.preference, "system");
  assert.equal(ui.documentElement.dataset.theme, undefined);
  assert.equal(ui.values.has("mira-theme-preference"), false);
});

test("system theme follows a changed OS preference and explicit themes do not", () => {
  const ui = themeFixture({ darkSystem: false });
  ui.systemChanged(true);
  assert.equal(ui.api.resolved, "dark");
  assert.equal(ui.documentElement.style.colorScheme, "dark");
  ui.api.set("light");
  ui.systemChanged(true);
  assert.equal(ui.api.resolved, "light");
  assert.equal(ui.documentElement.style.colorScheme, "light");
});

test("public pages expose the shared theme controller and accessible controls", () => {
  for (const file of ["index.html", "pages/staff.html", "pages/recover.html", "pages/syllabus.html"]) {
    const html = readFileSync(path.join(root, file), "utf8");
    const prefix = file === "index.html" ? "" : "../";
    assert.match(html, new RegExp(`src="${prefix}js/shared/theme\\.js"`), `${file} should load the theme controller`);
    assert.match(html, /data-theme-toggle/, `${file} should expose a theme control`);
  }
});

test("MIRA keeps the two core actions visible and places secondary tools in a disclosed menu", () => {
  const html = readFileSync(path.join(root, "index.html"), "utf8");
  assert.match(html, /class="primary-tool-row"[\s\S]*Show my Capstone snapshot[\s\S]*id="open-check-work"/);
  assert.match(html, /<details class="mira-tools-menu">[\s\S]*Ask a person[\s\S]*Use information I share[\s\S]*Load fictional sample[\s\S]*nothing is sent automatically/i);
  assert.match(html, /class="escalation-disclosure"[\s\S]*Only the fields and attachments you submit here are shared/);
});

test("dark theme tokens and reduced-motion behavior are defined", () => {
  const styles = readFileSync(path.join(root, "css/styles.css"), "utf8");
  const chat = readFileSync(path.join(root, "css/capstone-chat.css"), "utf8");
  assert.match(styles, /:root\[data-theme="dark"\]/);
  assert.match(styles, /prefers-color-scheme:\s*dark/);
  assert.match(chat, /prefers-reduced-motion:\s*reduce/);
});
