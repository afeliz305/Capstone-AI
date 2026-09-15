const assert = require("node:assert/strict");
const { readFileSync } = require("node:fs");
const path = require("node:path");
const test = require("node:test");
const vm = require("node:vm");

const html = readFileSync(path.join(__dirname, "../public/index.html"), "utf8");
const script = readFileSync(path.join(__dirname, "../public/widget/capstone-chat.js"), "utf8");

// A small DOM double exercises the real widget event handlers without adding
// browser dependencies. Responsive layout is checked separately in Chrome.
function mount(fetchResult = async () => ({ ok: true, json: async () => ({ status: "unmatched", matches: [] }) })) {
  const document = { activeElement: null };
  class Element {
    constructor() {
      this.listeners = {};
      this.attributes = {};
      this.children = [];
      this.value = "";
      this.hidden = false;
      this.disabled = false;
      this.open = false;
      this.scrollTop = 0;
      this.scrollHeight = 0;
      this.dataset = {};
    }
    addEventListener(type, handler) { this.listeners[type] = handler; }
    emit(type, event = {}) {
      return this.listeners[type]?.({ preventDefault() {}, stopPropagation() {}, ...event });
    }
    setAttribute(name, value) { this.attributes[name] = value; }
    setCustomValidity(message) { this.validationMessage = message; }
    showModal() { this.open = true; }
    close() { this.open = false; }
    focus() { document.activeElement = this; }
    append(...children) {
      children.forEach((child) => { child.parent = this; this.children.push(child); });
    }
    contains(element) { return element === this || this.children.some((child) => child.contains(element)); }
    remove() { this.parent.children = this.parent.children.filter((child) => child !== this); }
    replaceChildren(...children) { this.children = []; this.append(...children); }
    querySelector() { return this.submitButton; }
    querySelectorAll() { return []; }
  }
  const selectors = new Map();
  document.querySelector = (selector) => {
    if (!selectors.has(selector)) selectors.set(selector, new Element());
    return selectors.get(selector);
  };
  const panel = document.querySelector("#assistant");
  const launcher = document.querySelector("#chat-launcher");
  const input = document.querySelector("#chat-input");
  const log = document.querySelector(".chat-log");
  const sidebar = new Element();
  const topic = new Element();
  topic.dataset.question = "Where are the Capstone tutorials?";
  panel.hidden = /<section\b[^>]*id="assistant"[^>]*\bhidden[\s>]/.test(html);
  launcher.setAttribute("aria-expanded", "false");
  sidebar.setAttribute("aria-expanded", "false");
  panel.append(input, log);
  log.append(new Element()); // The initial welcome message.
  document.querySelector("#chat-form").submitButton = new Element();
  const supportForm = document.querySelector("#support-form");
  supportForm.submitButton = new Element();
  supportForm.elements = Object.fromEntries(["name", "email", "category", "question", "details", "includeTranscript", "privateToInstructor"].map(name => [name, new Element()]));
  supportForm.elements.preferredContactMethod = document.querySelector("#request-contact-method");
  supportForm.elements.preferredContactMethod.value = "email";
  supportForm.elements.contactPhone = document.querySelector("#request-contact-phone");
  supportForm.reset = () => { Object.values(supportForm.elements).forEach(field => { field.value = ""; }); };
  class TestFormData {
    constructor(form) { this.fields = form.elements; }
    get(name) { return this.fields[name]?.disabled ? null : this.fields[name]?.value ?? null; }
    has(name) { return Boolean(this.fields[name]?.checked); }
  }
  document.querySelectorAll = (selector) => ({
    "[data-open-chat]": [sidebar],
    "[data-question]": [topic]
  }[selector] || []);
  document.createElement = () => new Element();
  vm.runInNewContext(script, { document, FormData: TestFormData, fetch: fetchResult, window: { setTimeout: callback => callback(), CapstoneContactPolicy: require("../public/contact-policy"), CapstoneAttachmentPolicy: require("../public/widget/attachment-policy") } });
  return {
    panel, launcher, input, log, sidebar, topic, document,
    minimize: document.querySelector("#minimize-chat"),
    supportDialog: document.querySelector("#support-dialog"),
    attachmentInput: document.querySelector("#ticket-attachments"),
    attachmentList: document.querySelector("#attachment-list"),
    attachmentStatus: document.querySelector("#attachment-status")
  };
}

test("chat starts hidden in HTML and opens only when requested", () => {
  const ui = mount();
  assert.equal(ui.panel.hidden, true);
  assert.equal(ui.launcher.hidden, false);
  assert.equal(ui.document.activeElement, null);
  ui.launcher.emit("click");
  assert.equal(ui.panel.hidden, false);
  assert.equal(ui.launcher.hidden, true);
  assert.equal(ui.launcher.attributes["aria-expanded"], "true");
  assert.equal(ui.sidebar.attributes["aria-expanded"], "true");
  assert.equal(ui.document.activeElement, ui.input);
});

test("minimize and sidebar reopen preserve messages, draft, and scroll position", async () => {
  const ui = mount();
  await ui.topic.emit("click");
  ui.input.value = "A question I have not sent";
  ui.log.scrollTop = 42;
  const messages = [...ui.log.children];
  ui.minimize.emit("click");
  assert.equal(ui.panel.hidden, true);
  assert.equal(ui.launcher.hidden, false);
  assert.equal(ui.sidebar.attributes["aria-expanded"], "false");
  assert.equal(ui.document.activeElement, ui.launcher);
  ui.sidebar.emit("click");
  assert.equal(ui.panel.hidden, false);
  assert.equal(ui.input.value, "A question I have not sent");
  assert.deepEqual(ui.log.children, messages);
  assert.equal(ui.log.scrollTop, 42);
});

test("a quick topic opens the minimized chat and shows its response", async () => {
  const ui = mount();
  await ui.topic.emit("click");
  assert.equal(ui.panel.hidden, false);
  assert.equal(ui.log.children.length, 3); // Welcome, question, answer.
  assert.equal(ui.log.children[1].children[1].textContent, ui.topic.dataset.question);
  assert.equal(ui.input.disabled, false);
  assert.equal(ui.document.activeElement, ui.input);
});

test("Escape minimizes the chat but does not handle Escape for the support dialog", () => {
  const ui = mount();
  ui.launcher.emit("click");
  ui.supportDialog.open = true;
  ui.panel.emit("keydown", { key: "Escape" });
  assert.equal(ui.panel.hidden, false);
  ui.supportDialog.open = false;
  ui.panel.emit("keydown", { key: "Escape" });
  assert.equal(ui.panel.hidden, true);
  assert.equal(ui.document.activeElement, ui.launcher);
});

test("a late answer stays minimized and does not steal focus", async () => {
  let resolveFetch;
  const ui = mount(() => new Promise((resolve) => { resolveFetch = resolve; }));
  const pending = ui.topic.emit("click");
  assert.equal(ui.input.disabled, true);
  ui.minimize.emit("click");
  resolveFetch({ ok: true, json: async () => ({ status: "unmatched", matches: [] }) });
  await pending;
  assert.equal(ui.panel.hidden, true);
  assert.equal(ui.document.activeElement, ui.launcher);
  assert.equal(ui.log.children.length, 3);
  ui.launcher.emit("click");
  assert.equal(ui.panel.hidden, false);
  assert.equal(ui.log.children.length, 3);
});

test("a response does not steal focus from the surrounding page", async () => {
  let resolveFetch;
  const ui = mount(() => new Promise((resolve) => { resolveFetch = resolve; }));
  const pending = ui.topic.emit("click");
  ui.topic.focus();
  resolveFetch({ ok: true, json: async () => ({ status: "unmatched", matches: [] }) });
  await pending;
  assert.equal(ui.panel.hidden, false);
  assert.equal(ui.document.activeElement, ui.topic);
});

test("document picker shows selected files and allows removing one before submission", () => {
  const ui = mount();
  ui.attachmentInput.files = [{ name: "attendance.txt", size: 50 }];
  ui.attachmentInput.emit("change");
  assert.equal(ui.attachmentList.hidden, false);
  assert.match(ui.attachmentList.children[0].children[0].textContent, /attendance.txt/);
  ui.attachmentList.children[0].children[1].emit("click");
  assert.equal(ui.attachmentList.hidden, true);
  assert.equal(ui.document.activeElement, ui.attachmentInput);
});

test("invalid document selection shows an error while preserving valid selected files", () => {
  const ui = mount();
  ui.attachmentInput.files = [{ name: "attendance.txt", size: 50 }];
  ui.attachmentInput.emit("change");
  ui.attachmentInput.files = [{ name: "run.exe", size: 50 }];
  ui.attachmentInput.emit("change");
  assert.match(ui.attachmentStatus.textContent, /Only PDF/);
  assert.equal(ui.attachmentList.children.length, 1);
  assert.match(ui.attachmentList.children[0].children[0].textContent, /attendance.txt/);
});

test("student form shows the phone field only when preferred and blocks invalid contact before submitting", async () => {
  const posts = [];
  const ui = mount(async (url, options) => {
    if (url === "/api/session") return { ok: true, json: async () => ({ status: "guest", identityContext: "fictional-test-context" }) };
    assert.equal(url, "/api/tickets"); posts.push(JSON.parse(options.body));
    return { ok: true, json: async () => ({ id: "CAP-9000" }) };
  });
  await ui.document.querySelector("#account-retry").emit("click");
  await new Promise(resolve => setImmediate(resolve));
  const form = ui.document.querySelector("#support-form");
  form.elements.name.value = "Fictional Student";
  form.elements.email.value = "fictional@example.edu";
  form.elements.question.value = "Fictional contact test";
  form.elements.details.value = "No real contact needed.";
  const method = form.elements.preferredContactMethod;
  const phone = form.elements.contactPhone;
  assert.equal(ui.document.querySelector("#request-phone-field").hidden, true);
  method.value = "phone"; method.emit("change");
  assert.equal(ui.document.querySelector("#request-phone-field").hidden, false);
  assert.equal(phone.required, true);
  phone.value = "123";
  await form.emit("submit");
  assert.equal(posts.length, 0);
  assert.match(ui.document.querySelector("#support-status").textContent, /valid phone format/);
  phone.value = "3055550123";
  form.elements.email.value = "invalid@email";
  await form.emit("submit");
  assert.equal(posts.length, 0);
  assert.match(ui.document.querySelector("#support-status").textContent, /valid requester email/);
  form.elements.email.value = "fictional@example.edu";
  await form.emit("submit");
  assert.equal(posts.length, 1);
  assert.equal(posts[0].preferredContactMethod, "phone");
  assert.equal(posts[0].contactPhone, "3055550123");
  assert.equal(method.value, "email"); assert.equal(phone.value, "");
  assert.equal(phone.disabled, true); assert.equal(phone.required, false);
});
