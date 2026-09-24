const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const vm = require("node:vm");
const { randomUUID } = require("node:crypto");
const { requesterView } = require("../server/lib/ticket-work");
const helpers = require("../js/staff/staff-view");
const members = [{ name: "Alex Example", email: "alex@example.edu" }, { name: "Blair Example", email: "blair@example.edu" }];
const email = members[0].email;
const records = [
  { id: "new", assignedTo: null, status: "open" },
  { id: "mine-open", assignedTo: email, status: "open" },
  { id: "mine-done", assignedTo: email, status: "resolved", resolvedBy: members[1].email, resolution: "Example upload fixed" },
  { id: "theirs-done", assignedTo: members[1].email, status: "resolved", resolvedBy: email },
  { id: "theirs-review", assignedTo: members[1].email, status: "in-review" },
  { id: "legacy-unassigned", status: "in-review" },
  { id: "legacy-owner", assignedTo: "former@example.edu", status: "resolved" }
].map(ticket => ({ name: "Fictional Student", category: "Other", email: "student@example.edu", question: "Testing views", details: "Fictional only", createdAt: "2026-09-14T12:00:00Z", ...ticket }));
const ids = tickets => tickets.map(ticket => ticket.id);

test("the four queue views use current assignment and resolved status", () => {
  assert.equal(helpers.ticketsForView(records, "all", email).length, 7);
  assert.deepEqual(ids(helpers.ticketsForView(records, "mine", email)), ["mine-open", "mine-done"]);
  assert.deepEqual(ids(helpers.ticketsForView(records, "resolved", email)), ["mine-done", "theirs-done", "legacy-owner"]);
  assert.deepEqual(ids(helpers.ticketsForView(records, "mine-resolved", email)), ["mine-done"]);
  assert.deepEqual(helpers.ticketsForView(records, "mine", undefined), []);
  assert.deepEqual(helpers.ticketsForView(records, "mine-resolved", undefined), []);
});

test("view filters preserve resolved constraints and find new unassigned work", () => {
  assert.deepEqual(ids(helpers.ticketsForView(records, "all", email, { unassignedOnly: true, status: "open" })), ["new"]);
  assert.deepEqual(ids(helpers.ticketsForView(records, "resolved", email, { status: "open", search: "upload fixed" })), ["mine-done"]);
  assert.deepEqual(ids(helpers.ticketsForView(records, "mine-resolved", email, { unassignedOnly: true })), ["mine-done"]);
});

test("assignee grouping puts unassigned first, keeps legacy owners, and preserves records", () => {
  const before = structuredClone(records);
  const groups = helpers.groupTicketsByAssignee(records, [...members].reverse());
  assert.deepEqual(groups.map(group => group.name), ["Unassigned", "Alex Example", "Blair Example", "former@example.edu"]);
  assert.deepEqual(ids(groups[0].tickets), ["new", "legacy-unassigned"]);
  assert.equal(groups.reduce((total, group) => total + group.tickets.length, 0), records.length);
  assert.deepEqual(records, before);
  assert.deepEqual(helpers.groupTicketsByAssignee([], members), []);
});

const html = fs.readFileSync(path.join(__dirname, "../pages/staff.html"), "utf8");
const script = fs.readFileSync(path.join(__dirname, "../js/staff/staff.js"), "utf8");
const workspaceScript = fs.readFileSync(path.join(__dirname, "../js/staff/ticket-workspace.js"), "utf8");
const flush = () => new Promise(resolve => setImmediate(resolve));

// Exercise the real staff event handlers against a DOM double, not a browser.
async function mount({ createResponse, workspaceResponse, authResponse, localStorage, baseUrl = "http://localhost/", readFile = (reader, file) => { reader.result = "data:text/plain;base64," + file.data; reader.onload(); }, confirm = () => false, redirectFactory = helpers.createIdleRedirect, initialTickets = records } = {}) {
  class Element {
    constructor(tag = "div") { this.tag = tag; this.children = []; this.listeners = {}; this.attributes = {}; this.dataset = {}; this.value = ""; this.textContent = ""; this.checked = false; this.disabled = false; }
    append(...nodes) { this.children.push(...nodes); }
    replaceChildren(...nodes) { this.children = nodes; }
    setAttribute(name, value) { this.attributes[name] = value; }
    setCustomValidity(message) { this.validationMessage = message; }
    addEventListener(type, handler) { this.listeners[type] = handler; }
    emit(type, event = {}) { return this.listeners[type]?.({ preventDefault() {}, ...event }); }
    focus() { this.focused = true; }
    showModal() { this.open = true; }
    close() { this.open = false; this.emit("close"); }
    reportValidity() { return this.valid !== false; }
    querySelectorAll(selector) {
      const matches = node => selector === "[data-view-count]" ? node.dataset.viewCount !== undefined : selector === "button[type='submit']" ? node.tag === "button" && node.attributes.type === "submit" : selector.split(",").map(item => item.trim()).includes(node.tag);
      return this.children.flatMap(node => [...(matches(node) ? [node] : []), ...node.querySelectorAll(selector)]);
    }
    querySelector(selector) { return this.querySelectorAll(selector)[0]; }
  }
  const elements = new Map([...html.matchAll(/id="([^"]+)"/g)].map(match => ["#" + match[1], new Element()]));
  const loginSubmit = new Element("button"); loginSubmit.setAttribute("type", "submit");
  elements.get("#staff-login-form").append(loginSubmit);
  elements.get("#staff-ticket-form").reset = () => {
    ["creator", "question", "details", "assignee"].forEach(field => { elements.get("#staff-ticket-" + field).value = ""; });
    elements.get("#staff-ticket-topic").value = "Workflow and improvements";
  };
  const topicSelect = html.match(/<select id="staff-ticket-topic"[^>]*>([\s\S]*?)<\/select>/)[1];
  for (const match of topicSelect.matchAll(/<option>([^<]+)<\/option>/g)) {
    const option = new Element("option"); option.value = option.textContent = match[1];
    elements.get("#staff-ticket-topic").append(option);
  }
  const buttons = [...html.matchAll(/data-view="([^"]+)"/g)].map(match => {
    const button = new Element("button"); button.dataset.view = match[1];
    const count = new Element("span"); count.dataset.viewCount = match[1]; button.append(count);
    return button;
  });
  assert.deepEqual(buttons.map(button => button.dataset.view), Object.keys(helpers.QUEUE_VIEWS));
  const document = { querySelector: selector => elements.get(selector), querySelectorAll: selector => selector === "[data-view]" ? buttons : [], createElement: tag => new Element(tag), createTextNode: text => Object.assign(new Element("text"), { textContent: text }) };
  let tickets = structuredClone(initialTickets);
  const requests = [];
  const creations = [];
  const workRequests = [];
  const fetch = async (url, options = {}) => {
    requests.push(url);
    if (authResponse && url.startsWith("/api/staff/")) {
      const intercepted = await authResponse(url, options);
      if (intercepted) return intercepted;
    }
    if (workspaceResponse && url.startsWith("/api/tickets/")) {
      const intercepted = await workspaceResponse(url, options);
      if (intercepted) return intercepted;
    }
    let data;
    if (url === "/api/staff/session") data = { staff: members[0], members };
    else if (url === "/api/tickets") data = structuredClone(tickets);
    else if (url === "/api/staff/logout") data = {};
    else if (url === "/api/staff/tickets" && options.method === "POST") {
      const input = JSON.parse(options.body);
      creations.push(input);
      if (createResponse) return createResponse(input);
      data = { ...input, attachments: (input.attachments || []).map(({ name, size }) => ({ id: randomUUID(), name, size, type: "text/plain" })), contact: require("../js/shared/contact-policy").normalizeContact(input, email), id: "CAP-" + (9000 + creations.length), name: members[0].name, email, createdBy: email, identitySource: "staff-session", status: "open", createdAt: "2026-09-14T12:00:00Z" };
      tickets.unshift(structuredClone(data));
    }
    else if (url.startsWith("/api/tickets/") && url.endsWith("/work") && options.method === "PATCH") {
      const ticket = tickets.find(ticket => ticket.id === url.split("/").at(-2));
      const input = JSON.parse(options.body); workRequests.push(input);
      const additions = [];
      if (input.workNote) additions.push({ type: "work-note", body: input.workNote });
      if (input.additionalComment) additions.push({ type: "additional-comment", body: input.additionalComment });
      ticket.activity = [...(ticket.activity || []), ...additions.map(entry => ({ ...entry, id: randomUUID(), createdAt: "2026-09-14T12:00:00Z", author: members[0] }))];
      for (const field of ["status", "priority", "category", "question", "details", "assignedTo", "resolution", "projectOwnerTicket"]) ticket[field] = input[field];
      ticket.revision = (ticket.revision || 0) + 1;
      data = structuredClone(ticket);
    }
    else if (url.startsWith("/api/tickets/") && !options.method) {
      const isPreview = url.endsWith("/requester-preview");
      const ticket = tickets.find(ticket => ticket.id === url.split("/").at(isPreview ? -2 : -1));
      data = structuredClone(isPreview ? requesterView(ticket) : ticket);
    }
    else if (url.startsWith("/api/tickets/") && options.method === "PATCH") {
      const ticket = tickets.find(ticket => ticket.id === url.split("/").at(-1));
      const changes = JSON.parse(options.body);
      if ("assignedTo" in changes) assert.equal(changes.expectedAssignee, ticket.assignedTo || null);
      Object.assign(ticket, changes); data = structuredClone(ticket);
    } else throw new Error("Unexpected test request: " + url);
    return { ok: true, status: 200, json: async () => data };
  };
  const api = require("../js/shared/api-client").createApiClient({ baseUrl, fetchImpl: async (url, options) => {
    const prefix = new URL(baseUrl).pathname.replace(/\/$/, "");
    const response = await fetch(new URL(url).pathname.slice(prefix.length), options);
    return { headers: { get: () => "application/json" }, ...response };
  } });
  const context = vm.createContext({ document, URL, FileReader: class { readAsDataURL(file) { readFile(this, file); } }, window: { CapstoneApi: api, get localStorage() { return typeof localStorage === "function" ? localStorage() : localStorage; }, CapstoneAttachmentPolicy: require("../js/shared/attachment-policy"), CapstoneContactPolicy: require("../js/shared/contact-policy"), CapstoneStaffView: { ...helpers, createIdleRedirect: redirectFactory }, crypto: { randomUUID }, confirm, addEventListener() {}, setInterval() {} } });
  vm.runInContext(workspaceScript, context);
  vm.runInContext(script, context);
  await flush();
  const find = predicate => {
    const visit = node => [...(predicate(node) ? [node] : []), ...node.children.flatMap(visit)];
    return visit(elements.get("#ticket-grid"));
  };
  return { elements, buttons, find, requests, creations, workRequests, button: view => buttons.find(button => button.dataset.view === view), visible: () => find(node => node.className === "ticket-id").map(node => node.textContent), count: view => Number(buttons.find(button => button.dataset.view === view).querySelector("[data-view-count]").textContent) };
}

function memoryEmailStorage(value) {
  const key = "capstone-ai-chat:last-staff-email";
  const saved = new Map(value === undefined ? [] : [[key, value]]);
  return { saved, getItem: key => saved.get(key) ?? null, setItem: (key, value) => saved.set(key, String(value)) };
}

const authResult = (status, data) => ({ ok: status === 200, status, json: async () => data });
const signedOutSession = url => url === "/api/staff/session" ? authResult(401, { error: "Sign in required" }) : null;

test("email-only mode hides password, warns before and after sign-in, and remembers the selected email", async () => {
  const localStorage = memoryEmailStorage();
  const ui = await mount({ localStorage, authResponse: (url, options) => {
    if (url === "/api/staff/session") return authResult(401, { error: "Sign in required", loginMode: "email-demo" });
    if (url === "/api/staff/login") {
      assert.deepEqual(JSON.parse(options.body), { email });
      return authResult(200, { staff: members[0], members, loginMode: "email-demo" });
    }
  } });
  assert.equal(ui.elements.get("#staff-password").hidden, true);
  assert.equal(ui.elements.get("#staff-password").disabled, true);
  assert.equal(ui.elements.get("#staff-password").required, false);
  assert.equal(ui.elements.get("#staff-login-demo-warning").hidden, false);
  ui.elements.get("#staff-email").value = email;
  ui.elements.get("#staff-password").value = "must-not-be-submitted";
  await ui.elements.get("#staff-login-form").emit("submit");
  assert.equal(ui.elements.get("#staff-workspace").hidden, false);
  assert.equal(ui.elements.get("#staff-queue-demo-warning").hidden, false);
  assert.match(ui.elements.get("#staff-identity").textContent, /not verified/);
  assert.equal(localStorage.getItem("capstone-ai-chat:last-staff-email"), email);
  await ui.elements.get("#staff-logout").emit("click");
  assert.equal(ui.elements.get("#staff-password").hidden, true);
  assert.equal(ui.elements.get("#staff-email").value, email);
});

test("server password mode restores the required field and removes demo warnings", async () => {
  const ui = await mount({ authResponse: url => url === "/api/staff/session" ? authResult(401, { error: "Sign in required", loginMode: "password" }) : null });
  assert.equal(ui.elements.get("#staff-password").hidden, false);
  assert.equal(ui.elements.get("#staff-password").disabled, false);
  assert.equal(ui.elements.get("#staff-password").required, true);
  assert.equal(ui.elements.get("#staff-password-setup").hidden, false);
  assert.equal(ui.elements.get("#staff-login-demo-warning").hidden, true);
});

test("last successful staff email survives logout and reload without saving passwords or granting access", async () => {
  const localStorage = memoryEmailStorage();
  const ui = await mount({ localStorage, authResponse: (url, options) => {
    if (url !== "/api/staff/login") return signedOutSession(url);
    assert.equal(JSON.parse(options.body).email, "ALEX@example.edu");
    return authResult(200, { staff: members[0], members });
  } });
  assert.equal(ui.elements.get("#staff-email").value, "");
  ui.elements.get("#staff-email").value = "ALEX@example.edu";
  ui.elements.get("#staff-password").value = "fictional-login-secret";
  await ui.elements.get("#staff-login-form").emit("submit");
  assert.equal(ui.elements.get("#staff-workspace").hidden, false);
  assert.equal(ui.elements.get("#staff-password").value, "");
  assert.deepEqual([...localStorage.saved], [["capstone-ai-chat:last-staff-email", email]]);
  await ui.elements.get("#staff-logout").emit("click");
  assert.equal(ui.elements.get("#staff-email").value, email);
  assert.equal(ui.elements.get("#staff-password").value, "");
  const reloaded = await mount({ localStorage, authResponse: signedOutSession });
  assert.equal(reloaded.elements.get("#staff-email").value, email);
  assert.equal(reloaded.elements.get("#staff-password").value, "");
  assert.equal(reloaded.elements.get("#staff-workspace").hidden, true);
  assert.deepEqual(reloaded.requests, ["/api/staff/session"]);
});

test("a valid existing session and a different successful login replace the remembered email", async () => {
  const localStorage = memoryEmailStorage("old@example.edu");
  const ui = await mount({ localStorage });
  assert.equal(localStorage.getItem("capstone-ai-chat:last-staff-email"), email);
  await ui.elements.get("#staff-logout").emit("click");
  const next = await mount({ localStorage, authResponse: url => url === "/api/staff/login"
    ? authResult(200, { staff: members[1], members }) : signedOutSession(url) });
  next.elements.get("#staff-email").value = members[1].email;
  next.elements.get("#staff-password").value = "another-fictional-secret";
  await next.elements.get("#staff-login-form").emit("submit");
  assert.deepEqual([...localStorage.saved], [["capstone-ai-chat:last-staff-email", members[1].email]]);
});

test("failed login preserves the remembered email and keeps the attempted email editable on retry", async () => {
  const localStorage = memoryEmailStorage(email);
  const ui = await mount({ localStorage, redirectFactory: () => ({ start() {}, stop() {}, respond() {} }),
    authResponse: url => url === "/api/staff/login" ? authResult(401, { error: "Unauthorized access" }) : signedOutSession(url) });
  ui.elements.get("#staff-email").value = "mistyped@example.edu";
  ui.elements.get("#staff-password").value = "fictional-wrong-secret";
  await ui.elements.get("#staff-login-form").emit("submit");
  assert.equal(ui.elements.get("#staff-denied").hidden, false);
  assert.equal(ui.elements.get("#staff-password").value, "");
  ui.elements.get("#staff-retry").emit("click");
  assert.equal(ui.elements.get("#staff-email").value, "mistyped@example.edu");
  assert.equal(localStorage.getItem("capstone-ai-chat:last-staff-email"), email);
});

test("unavailable storage and malformed saved values do not break staff sign-in", async () => {
  for (const localStorage of [undefined, () => { throw new Error("Blocked storage"); },
    { getItem() { throw new Error("Read blocked"); }, setItem() { throw new Error("Write blocked"); } },
    memoryEmailStorage("<not-an-email>"), memoryEmailStorage("a".repeat(255) + "@example.edu")]) {
    const ui = await mount({ localStorage, authResponse: url => url === "/api/staff/login"
      ? authResult(200, { staff: members[0], members }) : signedOutSession(url) });
    assert.equal(ui.elements.get("#staff-email").value, "");
    ui.elements.get("#staff-email").value = email;
    ui.elements.get("#staff-password").value = "fictional-login-secret";
    await ui.elements.get("#staff-login-form").emit("submit");
    assert.equal(ui.elements.get("#staff-workspace").hidden, false);
    await ui.elements.get("#staff-logout").emit("click");
    assert.equal(ui.elements.get("#staff-email").value, email);
    assert.equal(ui.elements.get("#staff-password").value, "");
  }
});

test("HTML from static hosting produces actionable login guidance and preserves the saved email", async () => {
  const localStorage = memoryEmailStorage(email);
  const htmlResponse = () => ({ ok: false, status: 404, headers: { get: () => "text/html" }, json: async () => { throw new Error("Unexpected token '<'"); } });
  const ui = await mount({ localStorage, authResponse: htmlResponse });
  assert.match(ui.elements.get("#staff-login-status").textContent, /backend is not available/);
  assert.equal(ui.elements.get("#staff-email").value, email);
  ui.elements.get("#staff-password").value = "fictional-secret";
  await ui.elements.get("#staff-login-form").emit("submit");
  assert.match(ui.elements.get("#staff-login-status").textContent, /backend is not available/);
  assert.equal(ui.elements.get("#staff-password").value, "");
  assert.equal(ui.elements.get("#staff-workspace").hidden, true);
  assert.equal(localStorage.getItem("capstone-ai-chat:last-staff-email"), email);
});

test("remembered staff email is isolated by app folder and warns about blocked storage", async () => {
  const storage = memoryEmailStorage();
  const baseUrl = "https://example.edu/~student/Capstone%20-%20AI/";
  await mount({ baseUrl, localStorage: storage });
  const reloaded = await mount({ baseUrl, localStorage: storage, authResponse: signedOutSession });
  assert.equal(reloaded.elements.get("#staff-email").value, email);
  assert.equal(storage.getItem("capstone-ai-chat:last-staff-email"), null);
  const other = await mount({ baseUrl: "https://example.edu/other-app/", localStorage: storage, authResponse: signedOutSession });
  assert.equal(other.elements.get("#staff-email").value, "");
  const blocked = await mount({ localStorage: () => { throw new Error("blocked"); }, authResponse: signedOutSession });
  assert.match(blocked.elements.get("#staff-remember-email-note").textContent, /blocking saved preferences/);
});

test("visible view buttons render groups, reset filters, and lock resolved views", async () => {
  const ui = await mount();
  assert.equal(ui.find(node => node.className === "assignee-group").length, 4);
  assert.equal(ui.count("all"), 7); assert.equal(ui.count("mine"), 2);
  assert.equal(ui.count("resolved"), 3); assert.equal(ui.count("mine-resolved"), 1);
  ui.elements.get("#unassigned-filter").checked = true;
  ui.elements.get("#unassigned-filter").emit("change");
  assert.deepEqual(ui.visible(), ["new", "legacy-unassigned"]);
  ui.elements.get("#ticket-search").value = "no match";
  ui.elements.get("#ticket-search").emit("input");
  assert.deepEqual(ui.visible(), []);
  ui.button("mine").emit("click");
  assert.deepEqual(ui.visible(), ["mine-open", "mine-done"]);
  assert.equal(ui.elements.get("#ticket-search").value, "");
  assert.equal(ui.elements.get("#unassigned-filter").checked, false);
  assert.equal(ui.elements.get("#unassigned-filter-label").hidden, true);
  ui.button("resolved").emit("click");
  assert.equal(ui.elements.get("#status-filter").disabled, true);
  assert.equal(ui.visible().length, 3);
  ui.button("mine-resolved").emit("click");
  assert.deepEqual(ui.visible(), ["mine-done"]);
  assert.equal(ui.button("mine-resolved").attributes["aria-pressed"], "true");
  ui.button("all").emit("click");
  assert.equal(ui.elements.get("#status-filter").disabled, false);
  assert.equal(ui.elements.get("#status-filter").value, "all");
  assert.equal(ui.visible().length, 7);
});

test("claiming, reassignment, reopening, and logout keep views and counts in sync", async () => {
  const ui = await mount();
  ui.find(node => node.tag === "button" && node.textContent === "Claim ticket")[0].emit("click");
  await flush();
  assert.equal(ui.count("mine"), 3);
  ui.button("mine").emit("click");
  const assignment = ui.find(node => node.attributes["aria-label"] === "Assignment for new")[0];
  assignment.value = members[1].email; assignment.emit("change");
  await flush();
  assert.equal(ui.count("mine"), 2);
  assert.ok(!ui.visible().includes("new"));
  ui.button("mine-resolved").emit("click");
  const status = ui.find(node => node.attributes["aria-label"] === "Status for mine-done")[0];
  status.value = "open"; status.emit("change");
  await flush();
  assert.deepEqual(ui.visible(), []);
  assert.equal(ui.count("mine-resolved"), 0);
  assert.equal(ui.count("resolved"), 2);
  await ui.elements.get("#staff-logout").emit("click");
  assert.equal(ui.elements.get("#staff-workspace").hidden, true);
  assert.deepEqual(ui.visible(), []);
  assert.ok(ui.buttons.every(button => ui.count(button.dataset.view) === 0));
});

test("top search updates visible results and result count on input without extra requests", async () => {
  assert.equal([...html.matchAll(/id="ticket-search"/g)].length, 1);
  assert.equal([...html.matchAll(/id="queue-status"/g)].length, 1);
  assert.ok(html.indexOf('class="queue-search"') < html.indexOf('class="queue-heading"'));
  assert.match(html, /id="ticket-search"[^>]*aria-controls="ticket-grid"/);
  const ui = await mount();
  const search = ui.elements.get("#ticket-search");
  const beforeRequests = ui.requests.length;
  search.value = "mine-"; search.emit("input");
  assert.deepEqual(ui.visible(), ["mine-open", "mine-done"]);
  assert.match(ui.elements.get("#queue-status").textContent, /2 of 7 tickets shown/);
  search.value = "mine-d"; search.emit("input");
  assert.deepEqual(ui.visible(), ["mine-done"]);
  search.value = "no matching ticket"; search.emit("input");
  assert.deepEqual(ui.visible(), []);
  assert.match(ui.elements.get("#queue-status").textContent, /0 of 7 tickets shown/);
  assert.equal(ui.elements.get("#clear-ticket-search").disabled, false);
  assert.equal(ui.requests.length, beforeRequests);
});

test("clearing live search retains view filters and Escape returns focus to the search", async () => {
  const ui = await mount();
  const search = ui.elements.get("#ticket-search");
  const clear = ui.elements.get("#clear-ticket-search");
  ui.elements.get("#unassigned-filter").checked = true;
  ui.elements.get("#status-filter").value = "open";
  search.value = "not found"; search.emit("input");
  clear.emit("click");
  assert.equal(search.value, "");
  assert.equal(search.focused, true);
  assert.deepEqual(ui.visible(), ["new"]);
  assert.equal(ui.elements.get("#unassigned-filter").checked, true);
  assert.equal(ui.elements.get("#status-filter").value, "open");
  assert.equal(clear.disabled, true);
  ui.button("mine-resolved").emit("click");
  search.value = "UPLOAD FIXED"; search.emit("input");
  assert.deepEqual(ui.visible(), ["mine-done"]);
  search.value = "theirs-done"; search.emit("input");
  assert.deepEqual(ui.visible(), []);
  search.emit("keydown", { key: "Escape" });
  assert.equal(search.value, "");
  assert.deepEqual(ui.visible(), ["mine-done"]);
  assert.equal(ui.elements.get("#status-filter").value, "resolved");
  assert.equal(clear.disabled, true);
});

function fillStaffTicket(ui) {
  ui.elements.get("#create-staff-ticket").emit("click");
  ui.elements.get("#staff-ticket-question").value = "  Fictional improvement  ";
  ui.elements.get("#staff-ticket-details").value = "  Test steps and expected result.  ";
}

const staffDocument = (name = "fictional-notes.txt") => {
  const bytes = Buffer.from("Fictional staff attachment only.");
  return { name, size: bytes.length, data: bytes.toString("base64") };
};
function selectStaffDocuments(ui, files) {
  const picker = ui.elements.get("#staff-ticket-attachments");
  picker.files = files;
  picker.emit("change");
}

test("staff document picker adds and removes files, submits bytes, and exposes saved downloads", async () => {
  assert.match(html, /id="staff-ticket-attachments"[^>]*type="file"[^>]*accept="\.pdf,\.docx,\.txt"[^>]*multiple/);
  assert.ok(html.indexOf('../js/shared/attachment-policy.js') < html.indexOf('../js/staff/staff.js'));
  const ui = await mount(); fillStaffTicket(ui);
  const list = ui.elements.get("#staff-attachment-list");
  const first = staffDocument(); const second = staffDocument("second.txt");
  selectStaffDocuments(ui, [first]); selectStaffDocuments(ui, [second]);
  assert.equal(list.hidden, false);
  assert.equal(list.children.length, 2);
  assert.equal(list.children[0].children[0].textContent, first.name + " (1 KB)");
  list.querySelector("button").emit("click");
  assert.equal(list.children.length, 1);
  assert.equal(ui.elements.get("#staff-ticket-attachments").focused, true);
  await ui.elements.get("#staff-ticket-form").emit("submit");
  assert.deepEqual(ui.creations[0].attachments, [second]);
  assert.equal(list.hidden, true);
  assert.equal(list.children.length, 0);
  const links = ui.find(node => node.tag === "a" && node.href?.includes("/attachments/"));
  assert.equal(links.length, 1);
  assert.match(links[0].textContent, /second\.txt/);
  assert.match(links[0].href, /^http:\/\/localhost\/api\/tickets\/CAP-9001\/attachments\/[0-9a-f-]{36}$/);
  ui.find(node => node.id === "open-ticket-CAP-9001")[0].emit("click");
  await flush();
  assert.equal(ui.elements.get("#work-documents").querySelector("a").href, links[0].href);
});

test("invalid staff selections preserve valid files and cancellation clears the attachment draft", async () => {
  const ui = await mount(); fillStaffTicket(ui);
  const list = ui.elements.get("#staff-attachment-list");
  selectStaffDocuments(ui, [staffDocument()]);
  for (const files of [[staffDocument("run.exe")], [{ ...staffDocument(), size: 0 }],
    [{ ...staffDocument(), size: 5 * 1024 * 1024 + 1 }],
    [staffDocument(), staffDocument(), staffDocument()]]) {
    selectStaffDocuments(ui, files);
    assert.ok(ui.elements.get("#staff-attachment-status").textContent);
    assert.equal(list.children.length, 1);
    assert.equal(ui.elements.get("#staff-ticket-attachments").value, "");
  }
  ui.elements.get("#cancel-staff-ticket").emit("click");
  assert.equal(list.children.length, 0);
  assert.equal(ui.elements.get("#staff-attachment-status").textContent, "");
  fillStaffTicket(ui);
  assert.equal(list.hidden, true);
  await ui.elements.get("#staff-ticket-form").emit("submit");
  assert.deepEqual(ui.creations[0].attachments, []);
});

test("staff attachment read and server errors preserve selections and re-enable removal for retry", async () => {
  let readFails = true;
  const ui = await mount({ readFile: (reader, file) => {
    if (readFails) reader.onerror();
    else { reader.result = "data:text/plain;base64," + file.data; reader.onload(); }
  }, createResponse: async () => ({ ok: false, status: 400, json: async () => ({ error: "Test invalid file header" }) }) });
  fillStaffTicket(ui); selectStaffDocuments(ui, [staffDocument()]);
  const list = ui.elements.get("#staff-attachment-list");
  await ui.elements.get("#staff-ticket-form").emit("submit");
  assert.equal(ui.creations.length, 0);
  assert.match(ui.elements.get("#staff-ticket-status").textContent, /Could not read.*draft is still here/);
  assert.equal(list.children.length, 1);
  assert.equal(list.querySelector("button").disabled, false);
  assert.equal(ui.elements.get("#staff-ticket-attachments").disabled, false);
  readFails = false;
  await ui.elements.get("#staff-ticket-form").emit("submit");
  assert.equal(ui.creations.length, 1);
  assert.match(ui.elements.get("#staff-ticket-status").textContent, /Test invalid file header.*draft is still here/);
  assert.equal(ui.elements.get("#staff-ticket-dialog").open, true);
  assert.equal(list.children.length, 1);
  list.querySelector("button").emit("click");
  assert.equal(list.hidden, true);
});

test("logout during document reading prevents a late upload, and session expiry clears attachments", async () => {
  let finishRead;
  const ui = await mount({ readFile: (reader, file) => {
    finishRead = () => { reader.result = "data:text/plain;base64," + file.data; reader.onload(); };
  } });
  fillStaffTicket(ui); selectStaffDocuments(ui, [staffDocument()]);
  const form = ui.elements.get("#staff-ticket-form");
  const pending = form.emit("submit");
  await form.emit("submit");
  assert.equal(ui.creations.length, 0);
  assert.equal(ui.elements.get("#staff-ticket-attachments").disabled, true);
  const remove = ui.elements.get("#staff-attachment-list").querySelector("button");
  assert.equal(remove.disabled, true);
  remove.emit("click");
  assert.equal(ui.elements.get("#staff-attachment-list").children.length, 1);
  ui.elements.get("#cancel-staff-ticket").emit("click");
  assert.equal(ui.elements.get("#staff-ticket-dialog").open, true);
  await ui.elements.get("#staff-logout").emit("click");
  finishRead(); await pending;
  assert.equal(ui.creations.length, 0);
  assert.equal(ui.elements.get("#staff-attachment-list").children.length, 0);
  assert.equal(ui.elements.get("#staff-workspace").hidden, true);
  const expired = await mount({ redirectFactory: () => ({ start() {}, stop() {}, respond() {} }),
    createResponse: async () => ({ ok: false, status: 401, json: async () => ({ error: "Session expired" }) }) });
  fillStaffTicket(expired); selectStaffDocuments(expired, [staffDocument()]);
  await expired.elements.get("#staff-ticket-form").emit("submit");
  assert.equal(expired.elements.get("#staff-ticket-dialog").open, false);
  assert.equal(expired.elements.get("#staff-attachment-list").children.length, 0);
});

test("staff form uses signed-in identity, supports assignments, and reveals saved tickets from resolved views", async () => {
  for (const assignedTo of [null, email, members[1].email]) {
    const ui = await mount();
    ui.button("mine-resolved").emit("click");
    ui.elements.get("#ticket-search").value = "no match";
    fillStaffTicket(ui);
    assert.equal(ui.elements.get("#staff-ticket-dialog").open, true);
    assert.equal(ui.elements.get("#staff-ticket-creator").value, "Alex Example (alex@example.edu)");
    const assignees = ui.elements.get("#staff-ticket-assignee");
    assert.deepEqual(assignees.children.map(option => option.value), ["", email, members[1].email]);
    assert.equal(assignees.value, "");
    assignees.value = assignedTo || "";
    await ui.elements.get("#staff-ticket-form").emit("submit");
    assert.deepEqual(ui.creations, [{ category: "Workflow and improvements", question: "Fictional improvement", details: "Test steps and expected result.", assignedTo, preferredContactMethod: "email", projectOwnerTicket: false, attachments: [] }]);
    assert.equal(ui.elements.get("#staff-ticket-dialog").open, false);
    assert.equal(ui.elements.get("#staff-ticket-question").value, "");
    assert.equal(ui.button("all").attributes["aria-pressed"], "true");
    assert.equal(ui.elements.get("#ticket-search").value, "");
    assert.equal(ui.elements.get("#status-filter").value, "all");
    assert.ok(ui.visible().includes("CAP-9001"));
    assert.equal(ui.count("all"), 8);
    assert.equal(ui.count("mine"), assignedTo === email ? 3 : 2);
    assert.equal(ui.count("resolved"), 3);
    assert.match(ui.elements.get("#queue-status").textContent, /CAP-9001 created/);
    assert.ok(ui.find(node => node.textContent === "Created by signed-in staff").length);
  }
});

test("staff form validates required text and clears cancelled drafts without saving", async () => {
  const ui = await mount();
  fillStaffTicket(ui);
  ui.elements.get("#staff-ticket-question").value = "  ";
  await ui.elements.get("#staff-ticket-form").emit("submit");
  assert.equal(ui.creations.length, 0);
  assert.match(ui.elements.get("#staff-ticket-status").textContent, /not just spaces/);
  assert.match(html, /id="staff-ticket-question"[^>]*maxlength="500"[^>]*required/);
  assert.match(html, /id="staff-ticket-details"[^>]*maxlength="3000"[^>]*required/);
  ui.elements.get("#cancel-staff-ticket").emit("click");
  assert.equal(ui.elements.get("#staff-ticket-dialog").open, false);
  assert.equal(ui.elements.get("#staff-ticket-details").value, "");
  assert.equal(ui.elements.get("#create-staff-ticket").focused, true);
  assert.equal(ui.creations.length, 0);
});

test("staff creation preserves draft and re-enables controls after failed save", async () => {
  const ui = await mount({ createResponse: async () => ({ ok: false, status: 500, json: async () => ({ error: "Test storage unavailable" }) }) });
  fillStaffTicket(ui);
  await ui.elements.get("#staff-ticket-form").emit("submit");
  assert.equal(ui.elements.get("#staff-ticket-dialog").open, true);
  assert.equal(ui.elements.get("#staff-ticket-details").value, "  Test steps and expected result.  ");
  assert.match(ui.elements.get("#staff-ticket-status").textContent, /Test storage unavailable.*draft is still here/);
  assert.equal(ui.elements.get("#save-staff-ticket").disabled, false);
  assert.equal(ui.elements.get("#staff-ticket-fields").disabled, false);
  assert.equal(ui.count("all"), 7);
});

test("staff creation blocks repeated submits and pending dismissal; logout clears draft and ignores late success", async () => {
  let finish;
  const ui = await mount({ createResponse: () => new Promise(resolve => { finish = resolve; }) });
  fillStaffTicket(ui);
  const pending = ui.elements.get("#staff-ticket-form").emit("submit");
  await ui.elements.get("#staff-ticket-form").emit("submit");
  assert.equal(ui.creations.length, 1);
  assert.equal(ui.elements.get("#save-staff-ticket").disabled, true);
  ui.elements.get("#cancel-staff-ticket").emit("click");
  assert.equal(ui.elements.get("#staff-ticket-dialog").open, true);
  let prevented = false;
  ui.elements.get("#staff-ticket-dialog").emit("cancel", { preventDefault() { prevented = true; } });
  assert.equal(prevented, true);
  await ui.elements.get("#staff-logout").emit("click");
  assert.equal(ui.elements.get("#staff-ticket-dialog").open, false);
  assert.equal(ui.elements.get("#staff-ticket-details").value, "");
  finish({ ok: true, status: 201, json: async () => ({ id: "CAP-9999", status: "open" }) });
  await pending;
  assert.equal(ui.elements.get("#staff-workspace").hidden, true);
  assert.deepEqual(ui.visible(), []);
  assert.equal(ui.count("all"), 0);
});

test("expired session during staff creation closes and clears the form", async () => {
  const ui = await mount({
    redirectFactory: () => ({ start() {}, stop() {}, respond() {} }),
    createResponse: async () => ({ ok: false, status: 401, json: async () => ({ error: "Session expired" }) })
  });
  fillStaffTicket(ui);
  await ui.elements.get("#staff-ticket-form").emit("submit");
  assert.equal(ui.elements.get("#staff-ticket-dialog").open, false);
  assert.equal(ui.elements.get("#staff-ticket-details").value, "");
  assert.equal(ui.elements.get("#staff-denied").hidden, false);
  assert.match(ui.elements.get("#staff-denied-message").textContent, /Session expired/);
  assert.equal(ui.count("all"), 0);
});

test("category tags cover all topics and safely fall back for legacy or custom categories", () => {
  const select = html.match(/<select id="staff-ticket-topic"[^>]*>([\s\S]*?)<\/select>/)[1];
  const topics = [...select.matchAll(/<option>([^<]+)<\/option>/g)].map(match => match[1]);
  for (const label of topics) {
    const tag = helpers.categoryTag(label);
    assert.equal(tag.label, label);
    assert.ok(["gold", "blue", "navy", "neutral"].includes(tag.tone));
    if (label !== "Other") assert.notEqual(tag.tone, "neutral");
  }
  assert.deepEqual(helpers.categoryTag(" ATTENDANCE "), { label: "ATTENDANCE", tone: "gold" });
  for (const category of [null, undefined, "", "  ", {}]) {
    assert.deepEqual(helpers.categoryTag(category), { label: "Other", tone: "neutral" });
  }
  assert.deepEqual(helpers.categoryTag("<img src=x onerror=alert(1)>"), { label: "<img src=x onerror=alert(1)>", tone: "neutral" });
});

test("existing and newly created tickets show searchable category tags in every queue view", async () => {
  const fixtures = records.map((ticket, index) => ({ ...ticket, category: index === 0 ? "Attendance" : index === 1 ? null : ticket.category }));
  fixtures[2].category = "<img src=x onerror=alert(1)>";
  const ui = await mount({ initialTickets: fixtures });
  const tags = () => ui.find(node => node.className?.startsWith("ticket-category-tag "));
  for (const view of Object.keys(helpers.QUEUE_VIEWS)) {
    ui.button(view).emit("click");
    assert.equal(tags().length, ui.visible().length);
    assert.ok(tags().every(tag => tag.textContent.startsWith("Category: ")));
  }
  assert.equal(tags()[0].textContent, "Category: <img src=x onerror=alert(1)>");
  assert.equal(tags()[0].className, "ticket-category-tag category-neutral");
  assert.equal(tags()[0].children.length, 0); // Literal text, never injected markup.
  ui.button("all").emit("click");
  ui.elements.get("#ticket-search").value = "attendance";
  ui.elements.get("#ticket-search").emit("input");
  assert.deepEqual(ui.visible(), ["new"]);
  assert.equal(tags()[0].textContent, "Category: Attendance");
  ui.elements.get("#ticket-search").value = "other";
  ui.elements.get("#ticket-search").emit("input");
  assert.ok(ui.visible().includes("mine-open")); // Missing category displays/searches as Other.
  fillStaffTicket(ui);
  ui.elements.get("#staff-ticket-topic").value = "Implementation and testing";
  await ui.elements.get("#staff-ticket-form").emit("submit");
  assert.ok(tags().some(tag => tag.textContent === "Category: Implementation and testing" && tag.className.endsWith("category-navy")));
  assert.ok(ui.find(node => node.className === "status-pill status-open").length);
  assert.deepEqual(records[1].category, "Other");
});

async function openWork(ui, id = "mine-open") {
  const button = ui.find(node => node.className === "ticket-id" && node.textContent === id)[0];
  assert.equal(button.tag, "button");
  button.emit("click"); await flush();
}
const nestedText = node => [node.textContent, ...node.children.map(nestedText)].join(" ");

test("tickets open into populated workspaces, save fields/journals, and preview only requester comments", async () => {
  const ui = await mount();
  ui.button("mine").emit("click");
  await openWork(ui);
  assert.equal(ui.elements.get("#ticket-workspace-dialog").open, true);
  assert.equal(ui.elements.get("#work-number").value, "mine-open");
  assert.equal(ui.elements.get("#work-requester").value, "Fictional Student");
  assert.equal(ui.elements.get("#work-category").value, "Other");
  assert.equal(ui.elements.get("#work-priority").value, "normal");
  assert.match(html, /id="work-requester" readonly/);
  ui.elements.get("#work-category").value = "Testing and updates";
  ui.elements.get("#work-state").value = "resolved";
  ui.elements.get("#work-priority").value = "high";
  ui.elements.get("#work-note").value = "<b>INTERNAL TEST NOTE</b>";
  ui.elements.get("#work-comment").value = "REQUESTER TEST UPDATE";
  ui.elements.get("#work-resolution").value = "INTERNAL RESOLUTION";
  await ui.elements.get("#ticket-workspace-form").emit("submit");
  assert.equal(ui.workRequests.length, 1);
  assert.equal(ui.workRequests[0].expectedRevision, 0);
  assert.equal(ui.elements.get("#work-note").value, "");
  assert.equal(ui.elements.get("#work-comment").value, "");
  assert.equal(ui.count("mine-resolved"), 2);
  assert.equal(ui.button("mine").attributes["aria-pressed"], "true");
  const history = nestedText(ui.elements.get("#work-activity"));
  assert.match(history, /INTERNAL TEST NOTE/); assert.match(history, /REQUESTER TEST UPDATE/);
  assert.match(history, /Alex Example/);
  const internalBody = ui.elements.get("#work-activity").children[1].children.at(-1);
  assert.equal(internalBody.textContent, "<b>INTERNAL TEST NOTE</b>"); assert.equal(internalBody.children.length, 0);
  await ui.elements.get("#load-requester-preview").emit("click");
  const preview = nestedText(ui.elements.get("#requester-preview-content"));
  assert.match(preview, /REQUESTER TEST UPDATE/); assert.doesNotMatch(preview, /INTERNAL/);
  ui.elements.get("#close-ticket-workspace").emit("click");
  assert.equal(ui.elements.get("#ticket-workspace-dialog").open, false);
  await openWork(ui);
  assert.equal(ui.elements.get("#work-priority").value, "high");
  assert.match(nestedText(ui.elements.get("#work-activity")), /INTERNAL TEST NOTE/);
});

test("workspace errors preserve drafts, retry uses the same identifier, and close warns before discarding", async () => {
  let discard = false;
  const attempts = [];
  const ui = await mount({ confirm: () => discard, workspaceResponse: async (url, options) => {
    if (!url.endsWith("/work")) return;
    attempts.push(JSON.parse(options.body));
    return { ok: false, status: attempts.length === 1 ? 500 : 409, json: async () => ({ error: "Test save failure" }) };
  } });
  await openWork(ui);
  ui.elements.get("#work-note").value = "Keep this draft";
  await ui.elements.get("#ticket-workspace-form").emit("submit");
  assert.match(ui.elements.get("#ticket-workspace-status").textContent, /draft is still here/);
  assert.equal(ui.elements.get("#work-note").value, "Keep this draft");
  assert.equal(ui.elements.get("#save-ticket-workspace").disabled, false);
  await ui.elements.get("#ticket-workspace-form").emit("submit");
  assert.equal(attempts[0].requestId, attempts[1].requestId);
  ui.elements.get("#close-ticket-workspace").emit("click");
  assert.equal(ui.elements.get("#ticket-workspace-dialog").open, true);
  discard = true;
  ui.elements.get("#ticket-workspace-dialog").emit("cancel");
  assert.equal(ui.elements.get("#ticket-workspace-dialog").open, false);
  assert.equal(ui.elements.get("#work-note").value, "");
});

test("workspace blocks duplicate saves and clears private drafts on logout despite a late response", async () => {
  let finish; let saves = 0;
  const ui = await mount({ workspaceResponse: (url) => {
    if (!url.endsWith("/work")) return;
    saves++; return new Promise(resolve => { finish = resolve; });
  } });
  await openWork(ui);
  ui.elements.get("#work-note").value = "Sensitive fictional internal draft";
  const pending = ui.elements.get("#ticket-workspace-form").emit("submit");
  await ui.elements.get("#ticket-workspace-form").emit("submit");
  assert.equal(saves, 1);
  assert.equal(ui.elements.get("#close-ticket-workspace").disabled, true);
  await ui.elements.get("#staff-logout").emit("click");
  assert.equal(ui.elements.get("#ticket-workspace-dialog").open, false);
  assert.equal(ui.elements.get("#work-note").value, "");
  finish({ ok: true, status: 200, json: async () => ({ ...records[1], revision: 1 }) });
  await pending;
  assert.equal(ui.elements.get("#staff-workspace").hidden, true);
  assert.equal(ui.elements.get("#work-activity").children.length, 0);
  assert.equal(ui.count("all"), 0);
});

test("workspace authorization loss clears the detail view and its internal draft", async () => {
  const ui = await mount({
    redirectFactory: () => ({ start() {}, stop() {}, respond() {} }),
    workspaceResponse: async (url) => url.endsWith("/work") ? { ok: false, status: 401, json: async () => ({ error: "Staff session expired" }) } : undefined
  });
  await openWork(ui);
  ui.elements.get("#work-note").value = "Fictional internal draft";
  await ui.elements.get("#ticket-workspace-form").emit("submit");
  assert.equal(ui.elements.get("#ticket-workspace-dialog").open, false);
  assert.equal(ui.elements.get("#work-note").value, "");
  assert.equal(ui.elements.get("#work-requester").value, "");
  assert.equal(ui.elements.get("#staff-denied").hidden, false);
});

test("staff creation toggles validated phone contact and owner tags remain editable and searchable", async () => {
  const ui = await mount();
  fillStaffTicket(ui);
  const method = ui.elements.get("#staff-contact-method");
  const phone = ui.elements.get("#staff-contact-phone");
  assert.equal(method.value, "email");
  assert.equal(ui.elements.get("#staff-phone-field").hidden, true);
  method.value = "phone"; method.emit("change");
  assert.equal(phone.required, true); assert.equal(phone.disabled, false);
  phone.value = "123";
  await ui.elements.get("#staff-ticket-form").emit("submit");
  assert.equal(ui.creations.length, 0);
  assert.match(ui.elements.get("#staff-ticket-status").textContent, /valid phone format/);
  phone.value = "3055550123"; phone.emit("input");
  ui.elements.get("#staff-ticket-owner").value = "project-owner";
  await ui.elements.get("#staff-ticket-form").emit("submit");
  assert.equal(ui.creations[0].contactPhone, "3055550123");
  assert.equal(ui.creations[0].projectOwnerTicket, true);
  assert.equal(ui.find(node => node.className === "project-owner-tag").length, 1);
  assert.ok(ui.find(node => node.className === "ticket-contact" && node.textContent.includes("+13055550123")).length);
  assert.equal(phone.value, ""); assert.equal(phone.required, false); assert.equal(phone.disabled, true);
  ui.elements.get("#ticket-search").value = "project owner"; ui.elements.get("#ticket-search").emit("input");
  assert.deepEqual(ui.visible(), ["CAP-9001"]);
  await openWork(ui, "CAP-9001");
  assert.equal(ui.elements.get("#work-contact").value, "Phone · +13055550123");
  assert.equal(ui.elements.get("#work-owner").value, "project-owner");
  ui.elements.get("#work-owner").value = "standard";
  await ui.elements.get("#ticket-workspace-form").emit("submit");
  assert.equal(ui.workRequests[0].projectOwnerTicket, false);
  assert.equal(ui.find(node => node.className === "project-owner-tag").length, 0);
});
