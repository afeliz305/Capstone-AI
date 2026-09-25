const assert = require("node:assert/strict");
const { readFileSync } = require("node:fs");
const path = require("node:path");
const test = require("node:test");
const vm = require("node:vm");

const html = readFileSync(path.join(__dirname, "../index.html"), "utf8");
const script = readFileSync(path.join(__dirname, "../js/chat/capstone-chat.js"), "utf8");

// A small DOM double exercises the real widget event handlers without adding
// browser dependencies. Responsive layout is checked separately in Chrome.
function mount(fetchResult = async () => ({ ok: true, json: async () => ({ status: "unmatched", matches: [] }) }), baseUrl = "http://localhost/", open = () => {}, portal = undefined) {
  const document = { activeElement: null };
  class Element {
    constructor(tag = "div") {
      this.tagName = tag.toUpperCase();
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
    querySelectorAll(selector) {
      return descendants(this).filter(node => selector.split(",").some(part => {
        part = part.trim();
        return part.startsWith(".") ? (node.className || "").split(" ").includes(part.slice(1)) : node.tagName === part.toUpperCase();
      }));
    }
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
  const welcome = new Element(); welcome.className = "message assistant-message";
  log.append(welcome);
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
  document.createElement = (tag) => new Element(tag);
  const api = require("../js/shared/api-client").createApiClient({ baseUrl, fetchImpl: async (url, options) => {
    const parsed = new URL(url);
    const response = await fetchResult(parsed.pathname + parsed.search, options);
    return { headers: { get: () => "application/json" }, ...response };
  } });
  const windowEvents={};
  vm.runInNewContext(script, { document, URL, FormData: TestFormData, window: { open, CapstonePortal:portal, addEventListener:(name,handler)=>{windowEvents[name]=handler;}, CapstoneApi: api, setTimeout: callback => callback(), CapstoneContactPolicy: require("../js/shared/contact-policy"), CapstoneAttachmentPolicy: require("../js/shared/attachment-policy") } });
  return {
    panel, launcher, input, log, sidebar, topic, document, windowEvents,
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

function descendants(element) {
  return element.children.flatMap(child => [child, ...descendants(child)]);
}

test("private portal answers use verified buttons, escape text and clear the interface on invalidation",async()=>{
  const id="private-"+"a".repeat(24),opened=[],resolved=[];
  const result={personal:true,status:"matched",answerStatus:"answered",answer:"Private excerpt",sources:[{id,url:"https://capstone.cs.fiu.edu/portal",sectionTitle:"My project",section:"Overview",excerpt:"Synthetic private project <script>do not execute</script>",retrievedAt:"2026-09-25T15:00:00Z",coverage:"Partial fixture"}],connection:{state:"connected",generation:1},matches:[],links:[]};
  const portal={accepts:()=>true,destination:async sourceId=>{resolved.push(sourceId);return{url:"https://capstone.cs.fiu.edu/portal"};}};
  const ui=mount(async()=>({ok:true,json:async()=>result}),"http://localhost/",(...args)=>opened.push(args),portal);
  await ui.topic.emit("click");assert.equal(opened.length,0);
  const quote=descendants(ui.log).find(n=>n.className==="indexed-excerpt");assert.match(quote.textContent,/Synthetic private/);assert.equal(quote.innerHTML,undefined);
  const button=descendants(ui.log).find(n=>n.textContent==="View in portal · Overview");assert.equal(button.tagName,"BUTTON");button.emit("click");await new Promise(r=>setImmediate(r));assert.deepEqual(resolved,[id]);assert.equal(opened.length,1);
  ui.input.value="private draft";ui.windowEvents["capstone-portal-clear"]();assert.equal(ui.log.children.length,0);assert.equal(ui.input.value,"");
});

test("private session invalidation rejects late UI answers and unverified personal sources",async()=>{
  let resolve;const deferred=new Promise(r=>{resolve=r;});
  const ui=mount(async()=>({ok:true,json:()=>deferred}),"http://localhost/",()=>{}, {accepts:()=>false});
  const pending=ui.topic.emit("click");ui.windowEvents["capstone-portal-clear"]();resolve({personal:true,status:"matched",answer:"STALE PRIVATE CONTENT",sources:[],matches:[]});await pending;
  assert.equal(ui.log.children.length,0);
});

test("indexed evidence renders plain text, validated source actions, saved navigation context and explicit-only opening",async()=>{
  const scope={allowedOrigins:["https://capstone.cs.fiu.edu"],allowedPaths:["/"],excludedPaths:["/portal"]};
  const source={id:"section-fixture",pageTitle:"Fictional source",sectionTitle:"Actual heading",url:"https://capstone.cs.fiu.edu/resources#actual-id",anchor:"actual-id",excerpt:"Only with approval. <script>never executed</script>",indexed_at:"2026-09-25T00:00:00Z"};
  const opened=[],requests=[];
  const ui=mount(async url=>{
    requests.push(url);const q=new URL(url,"http://localhost").searchParams.get("q");
    return {ok:true,json:async()=>({indexed:true,answerStatus:"answered",answer:"Source excerpt",status:"matched",matches:[],sources:[source,{...source,id:"evil",url:"javascript:alert(1)"}],navigationScope:scope,navigation:[{targetSourceId:source.id,label:"View this section",url:source.url}],navigationRequested:q==="Take me there"})};
  },"http://localhost/",(...args)=>opened.push(args));
  await ui.topic.emit("click");
  const citation=descendants(ui.log).find(n=>n.className==="source-card");
  assert.equal(citation.href,source.url);assert.equal(citation.target,"_blank");assert.equal(citation.rel,"noopener noreferrer");
  assert.equal(opened.length,0);assert.equal(descendants(ui.log).filter(n=>n.className==="source-card").length,1);
  const quote=descendants(ui.log).find(n=>n.className==="indexed-excerpt");assert.equal(quote.textContent,source.excerpt);assert.equal(quote.innerHTML,undefined);
  ui.input.value="Take me there";await ui.document.querySelector("#chat-form").emit("submit");
  await new Promise(resolve=>setImmediate(resolve));
  assert.ok(requests.at(-1).includes("context=section-fixture"));assert.equal(opened[0][0],source.url);
  assert.equal(ui.panel.hidden,false);assert.ok(descendants(ui.log).some(n=>n.textContent===source.excerpt));
});

test("ambiguous indexed navigation shows choices without opening a guessed source",async()=>{
  let opened=0;
  const ui=mount(async()=>({ok:true,json:async()=>({indexed:true,answerStatus:"clarification_needed",answer:"Which source?",status:"choices",sources:[],navigation:[],navigationRequested:true})}),"http://localhost/",()=>opened++);
  ui.input.value="Take me there";await ui.document.querySelector("#chat-form").emit("submit");
  await new Promise(resolve=>setImmediate(resolve));
  assert.equal(opened,0);assert.ok(descendants(ui.log).some(n=>n.textContent==="Which source?"));
});

test("chat renders clickable keyword links with source labels and safe new-tab behavior", async () => {
  const { searchKnowledge } = require("../server/lib/search");
  const result = searchKnowledge(require("../data/capstone-knowledge.json"), "tutorials");
  const ui = mount(async () => ({ ok: true, json: async () => result }));
  await ui.topic.emit("click");
  const links = descendants(ui.log).filter(node => node.className === "keyword-link");
  assert.equal(links.length, 1);
  assert.equal(links[0].tagName, "A");
  assert.equal(links[0].href, "https://capstone.cs.fiu.edu/tutorials");
  assert.equal(links[0].target, "_blank");
  assert.equal(links[0].rel, "noopener noreferrer");
  assert.match(links[0].children[0].textContent, /tutorials/);
  assert.match(links[0].children[2].textContent, /Public page/);
  assert.match(links[0].attributes["aria-label"], /Opens in a new tab/);
  assert.equal(descendants(ui.log).filter(node => node.className === "source-card").length, 0);
});

test("related choices include direct keyword links and keep them on the chosen answer", async () => {
  const { searchKnowledge } = require("../server/lib/search");
  const result = searchKnowledge(require("../data/capstone-knowledge.json"), "sprint planning");
  const ui = mount(async () => ({ ok: true, json: async () => result }));
  await ui.topic.emit("click");
  const before = descendants(ui.log).filter(node => node.className === "keyword-link");
  assert.equal(before.length, 1);
  assert.match(before[0].href, /Sprint_Planning_Minutes_Template\.docx$/);
  assert.match(before[0].children[2].textContent, /Sign-in required/);
  const choice = descendants(ui.log).find(node => node.className === "result-choice" && node.textContent === "Sprint Planning template");
  choice.emit("click");
  assert.equal(descendants(ui.log).filter(node => node.className === "keyword-link").length, 2);
  assert.equal(ui.document.activeElement, ui.input);
});

test("keyword labels are plain text and unsafe links are not rendered", async () => {
  const ui = mount(async () => ({ ok: true, json: async () => ({
    status: "unmatched", matches: [], links: [
      { id: "unsafe", url: "javascript:alert(1)", title: "Bad", keywords: ["bad"] },
      { id: "safe", url: "https://capstone.cs.fiu.edu/resources", title: "Resources", keywords: ["<img src=x onerror=alert(1)>"], access: "public" }
    ]
  }) }));
  await ui.topic.emit("click");
  const links = descendants(ui.log).filter(node => node.className === "keyword-link");
  assert.equal(links.length, 1);
  assert.match(links[0].children[0].textContent, /^<img/);
  assert.equal(links[0].children[0].innerHTML, undefined);
  assert.ok(descendants(ui.log).some(node => node.textContent === "Create support request"));
});

test("unsupported questions retain escalation without inventing keyword links", async () => {
  const ui = mount();
  await ui.topic.emit("click");
  assert.equal(descendants(ui.log).filter(node => node.className === "keyword-link").length, 0);
  assert.ok(descendants(ui.log).some(node => node.textContent === "Create support request"));
});

test("syllabus answers link to a safe nested-folder reference and support contextual follow-ups",async()=>{
  const {searchKnowledge}=require("../server/lib/search");
  const knowledge=require("../server/lib/knowledge").mergeKnowledge(require("../data/capstone-knowledge.json"),require("../js/shared/syllabus-data").entries);
  const requests=[];
  const ui=mount(async url=>{
    const parsed=new URL(url,"https://example.test"); requests.push(parsed);
    const result=searchKnowledge(knowledge,parsed.searchParams.get("q"),parsed.searchParams.get("context"));
    return {ok:true,json:async()=>result};
  },"https://example.test/~student/Capstone%20-%20AI/");
  ui.topic.dataset.question="What should I do for Sprint 2?";
  await ui.topic.emit("click");
  const source=descendants(ui.log).find(n=>n.className==="source-card");
  assert.equal(source.href,"https://example.test/~student/Capstone%20-%20AI/pages/syllabus.html#syllabus-sprint-2");
  assert.match(source.children[0].textContent,/SYLLABUS · pages 9, 13, 20/);
  const suggestions=descendants(ui.log).filter(n=>n.className==="follow-up-button");
  assert.equal(suggestions.length,3);
  ui.input.value="When is it due?";
  ui.document.querySelector("#chat-form").emit("submit");
  await new Promise(resolve=>setImmediate(resolve));
  assert.equal(requests.at(-1).searchParams.get("context"),"syllabus-sprint-2");
  assert.match(ui.log.children.at(-1).children[1].textContent,/October 2, 2026/);
  await suggestions.find(n=>n.textContent==="How are sprints graded?").emit("click");
  assert.match(ui.log.children.at(-1).children[1].textContent,/60% team artifact/);
});

test("portal messages show a safe opt-in link and an honest live-data boundary",async()=>{
  const {searchKnowledge}=require("../server/lib/search");
  const knowledge=require("../server/lib/knowledge").reviewedKnowledge(require("../data/capstone-knowledge.json"));
  const ui=mount(async()=>({ok:true,json:async()=>searchKnowledge(knowledge,"Do I have any new messages?")}));
  ui.topic.dataset.question="Do I have any new messages?";
  await ui.topic.emit("click");
  const source=descendants(ui.log).find(n=>n.className==="source-card");
  assert.equal(source.href,"https://capstone.cs.fiu.edu/portal");
  assert.equal(source.target,"_blank");
  assert.equal(source.rel,"noopener noreferrer");
  assert.match(source.children[0].textContent,/LIVE DATA NOT CONNECTED/);
  assert.equal(source.children[2].textContent,"Open in portal ↗ · then choose Messages");
  assert.match(ui.log.children.at(-1).children[1].textContent,/cannot check for new or unread messages/);
});

test("clear conversation cancels pending rendering and forgets the previous topic",async()=>{
  let resolveFetch; const requests=[];
  const ui=mount(url=>{requests.push(url);return new Promise(resolve=>{resolveFetch=resolve;});});
  const pending=ui.topic.emit("click");
  await ui.topic.emit("click");assert.equal(requests.length,1); // No overlapping searches.
  ui.document.querySelector("#clear-chat").emit("click");
  assert.equal(ui.log.children.length,1);assert.equal(ui.input.disabled,false);
  resolveFetch({ok:true,json:async()=>({status:"matched",matches:[{id:"old",answer:"Late stale result",url:"https://capstone.cs.fiu.edu/resources"}]})});
  await pending;
  assert.equal(ui.log.children.length,1);
  const next=ui.topic.emit("click");
  assert.ok(!requests.at(-1).includes("context="));
  resolveFetch({ok:true,json:async()=>({status:"unmatched",matches:[]})});await next;
});

test("source cards reject external, traversing and script URLs while text stays escaped",async()=>{
  for(const url of ["javascript:alert(1)","https://evil.test/pages/syllabus.html#syllabus-ai","pages/../private.html#syllabus-ai","//evil.test/pages/syllabus.html#syllabus-ai"]) {
    const ui=mount(async()=>({ok:true,json:async()=>({status:"matched",matches:[{id:"test",answer:"<script>not executed</script>",url}],links:[]})}));
    await ui.topic.emit("click");
    assert.equal(descendants(ui.log).filter(n=>n.className==="source-card").length,0);
    const answer=ui.log.children.at(-1).children[1];
    assert.equal(answer.textContent,"<script>not executed</script>");assert.equal(answer.innerHTML,undefined);
  }
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
