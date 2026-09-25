const test = require("node:test");
const assert = require("node:assert/strict");
const vm = require("node:vm");
const fs = require("node:fs/promises");
const path = require("node:path");
const os = require("node:os");
const { once } = require("node:events");
const { browserBundle } = require("../scripts/browser-bundle");
const { createOcelotPackage } = require("../scripts/package-ocelot");
const { createPreview } = require("../scripts/preview-ocelot");
const { searchKnowledge } = require("../server/lib/search");
const root = path.resolve(__dirname, "..");
const baseUrl = "https://example.edu/~student/Capstone%20-%20AI/";
const fixture = { name: "Fictional Tester", email: "fictional@example.edu", category: "Attendance", question: "TEST attendance", details: "Fictional browser test", identityContext: "browser-demo-guest-v1" };
function memoryStore() {
  let state = { version: 1, tickets: [], documents: {} }, queue = Promise.resolve();
  const store = { failWrites: false, transact(write, change) {
    const op = queue.then(() => {
      const draft = structuredClone(state);
      const result = change(draft);
      if (write && store.failWrites) throw new Error("Quota exceeded; no changes committed.");
      if (write) state = draft;
      return structuredClone(result);
    });
    queue = op.catch(() => {}); return op;
  } };
  return store;
}
async function harness(store = memoryStore()) {
  const session = new Map();
  const window = { sessionStorage: { getItem: key => session.get(key) || null, setItem: (key, value) => session.set(key, value), removeItem: key => session.delete(key) } };
  let networkCalls = 0;
  const context = { window, URL, Response, Uint8Array, TextDecoder, atob, btoa, crypto, setTimeout, fetch: () => { networkCalls++; throw new Error("No network allowed"); } };
  vm.runInNewContext(await browserBundle(root), context);
  const api = window.CapstoneBrowserDemo.create({ baseUrl, store });
  async function request(route, method = "GET", input) {
    const response = await api.fetch("/api" + route, { method, ...(input ? { body: JSON.stringify(input) } : {}) });
    return { response, status: response.status, data: await response.json() };
  }
  return { api, request, store, window, context, networkCalls: () => networkCalls };
}
test("browser mode uses no network, normalizes staff email, rejects unknown staff and expires sessions", async () => {
  const h = await harness();
  assert.equal((await h.request("/tickets")).status, 401);
  assert.equal((await h.request("/staff/login", "POST", { email: "outsider@example.edu" })).status, 401);
  const login = await h.request("/staff/login", "POST", { email: " AFELI016@fiu.edu " });
  assert.equal(login.data.staff.name, "Anthony Feliz");
  assert.equal(login.data.loginMode, "email-demo");
  assert.equal(login.data.members.length, 5);
  assert.equal(login.data.members.some(member => member.email === "ralva037@fiu.edu"), false);
  const reopened = h.window.CapstoneBrowserDemo.create({ baseUrl, store: h.store });
  assert.equal((await reopened.fetch("/api/staff/session")).status, 200);
  const expired = h.window.CapstoneBrowserDemo.create({ baseUrl, store: h.store, now: () => Date.now() + 3600001 });
  assert.equal((await expired.fetch("/api/staff/session")).status, 401);
  const anotherFolder = h.window.CapstoneBrowserDemo.create({ baseUrl: "https://example.edu/other/", store: h.store });
  assert.equal((await anotherFolder.fetch("/api/staff/session")).status, 401);
  await h.request("/staff/logout", "POST", {});
  assert.equal((await h.request("/tickets")).status, 401);
  assert.equal(h.networkCalls(), 0);
  assert.equal((await h.request("/staff/login", "POST", { email: "ralva037@fiu.edu" })).status, 401);
});
test("browser student/staff tickets persist through adapter recreation with documents and validated contact", async () => {
  const h = await harness();
  const attachment = { name: "sample.txt", size: 7, data: btoa("sample\n") };
  const created = await h.request("/tickets", "POST", { ...fixture, preferredContactMethod: "phone", contactPhone: "(305) 555-0123", projectOwnerTicket: true, assignedTo: "afeli016@fiu.edu", attachments: [attachment] });
  assert.equal(created.status, 201);
  assert.equal(created.data.contact.value, "+13055550123");
  assert.equal(created.data.projectOwnerTicket, undefined);
  assert.equal(created.data.assignedTo, null);
  assert.equal(created.data.attachments[0].data, undefined);
  const route = "/api/tickets/" + created.data.id + "/attachments/" + created.data.attachments[0].id;
  assert.equal((await h.api.fetch(route)).status, 401);
  await h.request("/staff/login", "POST", { email: "afeli016@fiu.edu" });
  const reopened = h.window.CapstoneBrowserDemo.create({ baseUrl, store: h.store });
  assert.equal(await (await reopened.fetch(route)).text(), "sample\n");
  const staff = await h.request("/staff/tickets", "POST", { ...fixture, assignedTo: "afeli016@fiu.edu", projectOwnerTicket: true, attachments: [attachment] });
  assert.equal(staff.status, 201); assert.equal(staff.data.createdBy, "afeli016@fiu.edu");
  assert.equal(staff.data.projectOwnerTicket, true);
  const backup = await h.request("/browser-backup");
  assert.equal(backup.data.format, "capstone-browser-backup");
  assert.equal(backup.data.tickets.length, 2); assert.equal(Object.keys(backup.data.documents).length, 2);
  const parallel = await Promise.all(Array.from({ length: 8 }, (_, i) => h.request("/tickets", "POST", { ...fixture, question: "TEST concurrent fixture " + i })));
  assert.ok(parallel.every(result => result.status === 201));
  assert.equal(new Set(parallel.map(result => result.data.id)).size, 8);
  assert.equal((await h.request("/tickets")).data.length, 10);
  assert.equal(h.networkCalls(), 0);
});
test("browser saves reject bad contacts/files and commit neither ticket nor document after storage failure", async () => {
  const h = await harness();
  for (const bad of [{ email: "not-email" }, { preferredContactMethod: "phone", contactPhone: "123" }, { attachments: [{ name: "../bad.txt", size: 1, data: "YQ==" }] }, { attachments: [{ name: "fake.pdf", size: 1, data: "YQ==" }] }, { attachments: [{ name: "bad.txt", size: 5, data: "YQ==" }] }, { question: "" }]) {
    assert.equal((await h.request("/tickets", "POST", { ...fixture, ...bad })).status, 400);
  }
  assert.equal((await h.request("/tickets", "POST", { ...fixture, identityContext: "wrong" })).status, 409);
  await h.request("/staff/login", "POST", { email: "afeli016@fiu.edu" });
  h.store.failWrites = true;
  const failed = await h.request("/tickets", "POST", { ...fixture, attachments: [{ name: "sample.txt", size: 1, data: "YQ==" }] });
  assert.equal(failed.status, 503); assert.match(failed.data.error, /Quota/);
  assert.equal((await h.request("/tickets")).data.length, 0);
  assert.equal(Object.keys((await h.request("/browser-backup")).data.documents).length, 0);
});
test("browser workspace preserves conflict checks, save deduplication and requester-note separation", async () => {
  const h = await harness();
  const created = await h.request("/tickets", "POST", fixture), id = created.data.id;
  await h.request("/staff/login", "POST", { email: "afeli016@fiu.edu" });
  const change = { expectedRevision: 0, requestId: crypto.randomUUID(), status: "resolved", priority: "high", category: "Attendance", assignedTo: "afeli016@fiu.edu", question: fixture.question, details: fixture.details, resolution: "Internal resolution", workNote: "Internal fictional work", additionalComment: "Visible fictional reply" };
  const worked = await h.request("/tickets/" + id + "/work", "PATCH", change);
  assert.equal(worked.status, 200); assert.equal(worked.data.revision, 1); assert.equal(worked.data.resolvedBy, "afeli016@fiu.edu");
  const retry = await h.request("/tickets/" + id + "/work", "PATCH", change);
  assert.equal(retry.data.activity.length, worked.data.activity.length);
  assert.equal((await h.request("/tickets/" + id + "/work", "PATCH", { ...change, requestId: crypto.randomUUID() })).status, 409);
  const preview = await h.request("/tickets/" + id + "/requester-preview");
  assert.equal(preview.data.comments[0].body, "Visible fictional reply");
  assert.doesNotMatch(JSON.stringify(preview.data), /Internal fictional|Internal resolution|workSaves/);
  assert.equal((await h.request("/tickets/" + id, "PATCH", { assignedTo: null, expectedAssignee: null })).status, 409);
  assert.equal((await h.request("/tickets/" + id, "PATCH", { assignedTo: null, expectedAssignee: "afeli016@fiu.edu" })).status, 200);
});
test("browser lookup matches the reviewed Node knowledge engine, including unknown topics", async () => {
  const h = await harness();
  const entries = require("../server/lib/knowledge").mergeKnowledge(JSON.parse(await fs.readFile(path.join(root, "data/capstone-knowledge.json"), "utf8")), require("../js/shared/syllabus-data").entries);
  for (const question of ["attendance", "showcase judge", "quantum pizza robot", ...entries.flatMap(entry => entry.intents || [])]) {
    assert.deepEqual((await h.request("/search?q=" + encodeURIComponent(question))).data, { question, ...searchKnowledge(entries, question) });
  }
  for (const question of ["When is it due?", "Where do I submit it?", "How is it graded?"]) {
    assert.deepEqual((await h.request("/search?q="+encodeURIComponent(question)+"&context=syllabus-sprint-2")).data, {question,...searchKnowledge(entries,question,"syllabus-sprint-2")});
  }
  assert.equal(h.networkCalls(), 0);
});
test("browser bundle bootstraps explicitly and package excludes all PHP and runtime data", async t => {
  const temp = await fs.mkdtemp(path.join(os.tmpdir(), "capstone-browser-test-"));
  t.after(async () => { assert.equal(path.dirname(temp), os.tmpdir()); assert.ok(path.basename(temp).startsWith("capstone-browser-test-")); await fs.rm(temp, { recursive: true, force: true }); });
  const built = await createOcelotPackage({ transport: "browser", outputRoot: temp });
  assert.ok(built.manifest.some(entry => entry.file === "js/shared/browser-demo.bundle.js"));
  for (const entry of built.manifest) assert.doesNotMatch(entry.file, /^(api|data|server|docs|scripts|test)\/|\.php$|package\.json|tickets\.json/);
  for (const file of ["index.html", "pages/staff.html"]) {
    const html = await fs.readFile(path.join(built.uploadDirectory, file), "utf8");
    assert.match(html, /data-api-transport="browser"/);
    assert.ok(html.indexOf("browser-demo.bundle.js") < html.indexOf("api-client.js"));
    assert.match(html, /not on Ocelot and not shared/);
    assert.doesNotMatch(html, /on this app's server/);
    assert.equal((html.match(/class="hosting-test-notice"/g) || []).length, 1);
  }
  const h = await harness();
  h.window.fetch = () => { throw new Error("Browser demo must not fetch a backend"); };
  h.context.document = { currentScript: { src: baseUrl + "js/shared/api-client.js", dataset: { apiTransport: "browser" } } };
  vm.runInNewContext(await fs.readFile(path.join(root, "js/shared/api-client.js"), "utf8"), h.context);
  assert.equal(h.window.CapstoneApi.storageMode, "browser");
  const server = createPreview({ root: built.uploadDirectory }).listen(0, "127.0.0.1");
  await once(server, "listening"); t.after(() => new Promise(resolve => server.close(resolve)));
  const origin = "http://127.0.0.1:" + server.address().port;
  for (const entry of built.manifest) assert.equal((await fetch(origin + "/Capstone%20-%20AI/" + entry.file)).status, 200, entry.file);
  for (const route of ["data/tickets.json", "api/tickets", "server/server.js", "../DEVELOPMENT/package.json"]) assert.equal((await fetch(origin + "/Capstone%20-%20AI/" + route)).status, 404);
});
