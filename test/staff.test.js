const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");
const { once } = require("node:events");
const { randomUUID } = require("node:crypto");
const { STAFF, setStaffPassword, createStaffAuth } = require("../server/lib/staff-auth");
const { filterTickets, createIdleRedirect } = require("../js/staff/staff-view");
const directory = fs.mkdtempSync(path.join(os.tmpdir(), "capstone-staff-test-"));
const ticketFile = path.join(directory, "tickets.json");
const staffFile = path.join(directory, "staff-credentials.json");
process.env.CAPSTONE_DATA_FILE = ticketFile;
const { createServer } = require("../server/server");
const password = "Fictional test password only 2026";
test.before(async () => { for (const member of STAFF) await setStaffPassword(member.email, password, { file: staffFile }); });
test.after(() => {
  for (const file of [ticketFile, `${ticketFile}.tmp`, staffFile, `${staffFile}.tmp`]) {
    if (fs.existsSync(file)) fs.unlinkSync(file);
  }
  fs.rmdirSync(directory);
});

async function app(t, options = {}) {
  const server = createServer({ staffAuth: createStaffAuth({ file: staffFile, ...options }) });
  server.listen(0, "127.0.0.1");
  await once(server, "listening");
  t.after(() => new Promise((resolve, reject) => { server.close((error) => error ? reject(error) : resolve()); server.closeAllConnections(); }));
  const base = `http://127.0.0.1:${server.address().port}`;
  async function call(route, { body, cookie, method = body ? "POST" : "GET", headers } = {}) {
    const response = await fetch(base + route, { method, headers: { ...(body ? { "Content-Type": "application/json" } : {}), ...(cookie ? { Cookie: cookie } : {}), ...headers }, ...(body ? { body: JSON.stringify(body) } : {}) });
    return { status: response.status, headers: response.headers, data: await response.json() };
  }
  async function signIn(email = STAFF[0].email, pass = password) {
    const result = await call("/api/staff/login", { body: { email, password: pass } });
    return { ...result, cookie: result.headers.get("set-cookie")?.split(";")[0] };
  }
  async function createTicket(extra = {}) {
    const session = await call("/api/session");
    return call("/api/tickets", { body: { name: "Fictional Student", email: "fictional@example.edu", question: "Test assignment request", details: "Test only; no follow-up needed.", identityContext: session.data.identityContext, ...extra } });
  }
  return { call, signIn, createTicket };
}

test("all six staff accounts require passwords and display server-owned names", async (t) => {
  const { signIn } = await app(t);
  for (const member of STAFF) {
    const result = await signIn(" " + member.email.toUpperCase() + " ");
    assert.equal(result.status, 200);
    assert.deepEqual(result.data.staff, member);
    assert.match(result.headers.get("set-cookie"), /HttpOnly; SameSite=Strict; Path=\/api; Max-Age=3600/);
    assert.equal(result.data.members.length, 6);
  }
  const persisted = fs.readFileSync(staffFile, "utf8");
  assert.ok(!persisted.includes(password));
  const accounts = JSON.parse(persisted).accounts;
  assert.notEqual(accounts[STAFF[0].email].hash, accounts[STAFF[1].email].hash);
});

test("incorrect, missing, or unlisted credentials get unauthorized access; repeated guesses are limited", async (t) => {
  const { signIn, call } = await app(t);
  for (const [email, pass] of [[STAFF[0].email, "wrong password 2026"], ["outsider@fiu.edu", password], [STAFF[0].email, ""]]) {
    const denied = await signIn(email, pass);
    assert.equal(denied.status, 401);
    assert.match(denied.data.error, /Unauthorized access/);
  }
  const forged = await call("/api/staff/session", { cookie: "capstone_staff_session=forged" });
  assert.equal(forged.status, 401);
  for (let i = 0; i < 7; i++) await signIn(STAFF[0].email, "wrong password 2026");
  assert.equal((await signIn()).status, 429);
});

test("anonymous visitors cannot list, modify, or download staff ticket data", async (t) => {
  const { call, createTicket } = await app(t);
  const ticket = await createTicket();
  assert.equal(ticket.status, 201);
  assert.equal((await call("/api/tickets")).status, 401);
  assert.equal((await call(`/api/tickets/${ticket.data.id}`, { method: "PATCH", body: { status: "resolved" } })).status, 401);
  assert.equal((await call(`/api/tickets/${ticket.data.id}/attachments/00000000-0000-4000-8000-000000000000`)).status, 401);
});

test("logout, expiry, and password resets invalidate existing staff sessions", async (t) => {
  let instant = Date.now();
  const { call, signIn } = await app(t, { now: () => instant, sessionMs: 1000 });
  const first = await signIn();
  assert.equal((await call("/api/staff/session", { cookie: first.cookie })).status, 200);
  await call("/api/staff/logout", { cookie: first.cookie, body: {} });
  assert.equal((await call("/api/staff/session", { cookie: first.cookie })).status, 401);
  const second = await signIn();
  instant += 1001;
  assert.equal((await call("/api/tickets", { cookie: second.cookie })).status, 401);
  const third = await signIn();
  await setStaffPassword(STAFF[0].email, password, { file: staffFile });
  assert.equal((await call("/api/staff/session", { cookie: third.cookie })).status, 401);
});

test("staff can claim, reassign, and unassign tickets with persisted server-checked assignments", async (t) => {
  const { call, signIn, createTicket } = await app(t);
  const user = await signIn();
  const created = await createTicket({ assignedTo: STAFF[1].email });
  assert.equal(created.data.assignedTo, null);
  const route = `/api/tickets/${created.data.id}`;
  const claimed = await call(route, { cookie: user.cookie, method: "PATCH", body: { assignedTo: STAFF[0].email, expectedAssignee: null } });
  assert.equal(claimed.status, 200);
  assert.equal(claimed.data.assignedBy, STAFF[0].email);
  const conflict = await call(route, { cookie: user.cookie, method: "PATCH", body: { assignedTo: STAFF[1].email, expectedAssignee: null } });
  assert.equal(conflict.status, 409);
  const reassigned = await call(route, { cookie: user.cookie, method: "PATCH", body: { assignedTo: STAFF[1].email, expectedAssignee: STAFF[0].email } });
  assert.equal(reassigned.data.assignedTo, STAFF[1].email);
  const secondServer = await app(t);
  const secondUser = await secondServer.signIn(STAFF[1].email);
  const persisted = await secondServer.call("/api/tickets", { cookie: secondUser.cookie });
  assert.equal(persisted.data.find((ticket) => ticket.id === created.data.id).assignedTo, STAFF[1].email);
  const released = await call(route, { cookie: user.cookie, method: "PATCH", body: { assignedTo: null, expectedAssignee: STAFF[1].email } });
  assert.equal(released.data.assignedTo, null);
});

test("invalid assignments and cross-origin staff mutations are rejected", async (t) => {
  const { call, signIn, createTicket } = await app(t);
  const user = await signIn();
  const created = await createTicket();
  const route = `/api/tickets/${created.data.id}`;
  assert.equal((await call(route, { cookie: user.cookie, method: "PATCH", body: { assignedTo: "outsider@fiu.edu", expectedAssignee: null } })).status, 400);
  assert.equal((await call(route, { cookie: user.cookie, method: "PATCH", body: { assignedTo: STAFF[0].email } })).status, 400);
  assert.equal((await call("/api/staff/login", { body: { email: STAFF[0].email, password }, headers: { Origin: "https://unrelated.example" } })).status, 403);
  assert.equal((await call("/api/staff/logout", { body: {}, cookie: user.cookie, headers: { "Sec-Fetch-Site": "cross-site" } })).status, 403);
});

test("the queue filters assignments, including legacy unassigned tickets", () => {
  const tickets = [{ id: "CAP-1", assignedTo: STAFF[0].email, status: "open" }, { id: "CAP-2", assignedTo: STAFF[1].email, status: "resolved" }, { id: "CAP-3", status: "open" }];
  assert.deepEqual(filterTickets(tickets, { email: STAFF[0].email }).map((ticket) => ticket.id), ["CAP-1"]);
  assert.deepEqual(filterTickets(tickets, { assignment: "unassigned" }).map((ticket) => ticket.id), ["CAP-3"]);
  assert.deepEqual(filterTickets(tickets, { assignment: "all", status: "resolved", search: "cap-2" }).map((ticket) => ticket.id), ["CAP-2"]);
});

test("staff creation supports every displayed topic, preserves records, and owns identity server-side", async (t) => {
  const { call, signIn } = await app(t);
  const user = await signIn();
  const before = (await call("/api/tickets", { cookie: user.cookie })).data;
  const html = fs.readFileSync(path.join(__dirname, "../pages/staff.html"), "utf8");
  const select = html.match(/<select id="staff-ticket-topic"[^>]*>([\s\S]*?)<\/select>/)[1];
  const topics = [...select.matchAll(/<option>([^<]+)<\/option>/g)].map(match => match[1]);
  assert.deepEqual(topics.slice(0, 3), ["Workflow and improvements", "Testing and updates", "Implementation and testing"]);
  assert.ok(topics.includes("Attendance"));
  const createdIds = [];
  for (const category of topics) {
    const result = await call("/api/staff/tickets", { cookie: user.cookie, body: {
      category, question: "  Fictional staff task  ", details: "  Test-only proposed steps.  ",
      name: "Forged name", email: "forged@example.edu", createdBy: STAFF[1].email,
      status: "resolved", identitySource: "portal-session", accountId: "forged",
      privateToInstructor: true, resolution: "Forged resolution"
    } });
    assert.equal(result.status, 201);
    assert.equal(result.data.category, category);
    assert.equal(result.data.name, STAFF[0].name);
    assert.equal(result.data.email, STAFF[0].email);
    assert.equal(result.data.createdBy, STAFF[0].email);
    assert.equal(result.data.identitySource, "staff-session");
    assert.equal(result.data.accountId, null);
    assert.equal(result.data.status, "open");
    assert.equal(result.data.assignedTo, null);
    assert.equal(result.data.privateToInstructor, false);
    assert.equal(result.data.question, "Fictional staff task");
    assert.equal(result.data.details, "Test-only proposed steps.");
    assert.equal(result.data.resolution, undefined);
    assert.deepEqual(result.data.attachments, []);
    createdIds.push(result.data.id);
  }
  assert.equal(new Set(createdIds).size, topics.length);
  const secondApp = await app(t);
  const secondUser = await secondApp.signIn();
  const persisted = (await secondApp.call("/api/tickets", { cookie: secondUser.cookie })).data;
  assert.equal(persisted.length, before.length + topics.length);
  assert.deepEqual(persisted.filter(ticket => !createdIds.includes(ticket.id)), before);
});

test("staff can create unassigned, self-assigned, or teammate tickets with audited assignments", async (t) => {
  const { call, signIn } = await app(t);
  const user = await signIn();
  const before = (await call("/api/tickets", { cookie: user.cookie })).data.length;
  const assignees = [null, STAFF[0].email, ...STAFF.slice(1).map(member => member.email)];
  const results = await Promise.all(assignees.map(assignedTo => call("/api/staff/tickets", { cookie: user.cookie, body: {
    category: "Testing and updates", question: "Fictional concurrent test", details: "No real issue; test only.",
    assignedTo: assignedTo ? " " + assignedTo.toUpperCase() + " " : null
  } })));
  results.forEach((result, index) => {
    assert.equal(result.status, 201);
    assert.equal(result.data.assignedTo, assignees[index]);
    assert.equal(result.data.assignedBy, index ? STAFF[0].email : undefined);
    if (index) assert.equal(result.data.assignedAt, result.data.createdAt);
  });
  assert.equal(new Set(results.map(result => result.data.id)).size, assignees.length);
  assert.equal((await call("/api/tickets", { cookie: user.cookie })).data.length, before + assignees.length);
});

test("invalid staff ticket fields, assignment, or origin never save a ticket", async (t) => {
  const { call, signIn } = await app(t);
  const user = await signIn();
  const before = fs.readFileSync(ticketFile, "utf8");
  const valid = { category: "Implementation and testing", question: "Test-only title", details: "Test-only details" };
  for (const invalid of [
    { category: "" }, { category: "Unknown topic" }, { category: {} },
    { question: " " }, { question: 123 }, { question: "a".repeat(501) },
    { details: "" }, { details: [] }, { details: "a".repeat(3001) },
    { assignedTo: "outsider@example.edu" }, { assignedTo: {} }, { assignedTo: "" },
    { attachments: [{ id: "forged" }] }
  ]) {
    const result = await call("/api/staff/tickets", { cookie: user.cookie, body: { ...valid, ...invalid } });
    assert.equal(result.status, 400);
    assert.ok(result.data.error);
  }
  assert.equal((await call("/api/staff/tickets", { cookie: user.cookie, body: valid, headers: { Origin: "https://unrelated.example" } })).status, 403);
  assert.equal((await call("/api/staff/tickets", { cookie: user.cookie, body: valid, headers: { "Sec-Fetch-Site": "cross-site" } })).status, 403);
  assert.equal(fs.readFileSync(ticketFile, "utf8"), before);
});

test("staff creation rejects missing, forged, expired, and signed-out sessions", async (t) => {
  let instant = Date.now();
  const { call, signIn } = await app(t, { now: () => instant, sessionMs: 1000 });
  const body = { category: "Workflow and improvements", question: "Test only", details: "Should not be stored." };
  const before = fs.readFileSync(ticketFile, "utf8");
  assert.equal((await call("/api/staff/tickets", { body })).status, 401);
  assert.equal((await call("/api/staff/tickets", { body, cookie: "capstone_staff_session=forged" })).status, 401);
  const user = await signIn();
  instant += 1001;
  assert.equal((await call("/api/staff/tickets", { body, cookie: user.cookie })).status, 401);
  const signedIn = await signIn();
  await call("/api/staff/logout", { cookie: signedIn.cookie, body: {} });
  assert.equal((await call("/api/staff/tickets", { body, cookie: signedIn.cookie })).status, 401);
  assert.equal(fs.readFileSync(ticketFile, "utf8"), before);
});

test("unauthorized redirect waits 15 idle seconds, resets on response, and cancels on retry", () => {
  let instant = 0;
  let tick;
  let remaining;
  let redirects = 0;
  const timer = createIdleRedirect({ now: () => instant, schedule: (callback) => { tick = callback; return 1; }, cancel: () => { tick = null; }, onTick: (value) => { remaining = value; }, onTimeout: () => { redirects++; } });
  timer.start();
  assert.equal(remaining, 15);
  instant = 14000; tick();
  assert.equal(redirects, 0);
  timer.respond();
  assert.equal(remaining, 15);
  instant = 15000; tick();
  assert.equal(redirects, 0);
  instant = 29000; tick();
  assert.equal(redirects, 1);
  assert.equal(tick, null);
  timer.start();
  timer.stop();
  assert.equal(tick, null);
  assert.equal(redirects, 1);
});

function workInput(ticket, extra = {}) {
  return {
    expectedRevision: ticket.revision || 0, requestId: randomUUID(),
    status: ticket.status, assignedTo: ticket.assignedTo || null,
    category: ticket.category, priority: ticket.priority || "normal",
    question: ticket.question, details: ticket.details, resolution: ticket.resolution || "",
    workNote: "", additionalComment: "", ...extra
  };
}

test("ticket workspace persists fields and append-only journals with server-owned staff authors", async (t) => {
  const { call, signIn, createTicket } = await app(t);
  const user = await signIn();
  const created = (await createTicket({ category: "Attendance" })).data;
  const route = `/api/tickets/${created.id}`;
  assert.equal((await call(route)).status, 401);
  assert.equal((await call(route, { cookie: user.cookie })).data.id, created.id);
  const input = workInput(created, {
    status: "in-review", assignedTo: STAFF[1].email, priority: "high", category: "Testing and updates",
    question: "Fictional revised title", details: "Fictional revised description",
    workNote: "INTERNAL-NOTE-ONLY", additionalComment: "REQUESTER-UPDATE",
    resolution: "INTERNAL-RESOLUTION-ONLY", author: { name: "Forged", email: "forged@example.edu" }, activity: []
  });
  const saved = await call(route + "/work", { method: "PATCH", cookie: user.cookie, body: input });
  assert.equal(saved.status, 200);
  assert.equal(saved.data.revision, 1);
  assert.equal(saved.data.status, "in-review");
  assert.equal(saved.data.priority, "high");
  assert.equal(saved.data.category, "Testing and updates");
  assert.equal(saved.data.question, "Fictional revised title");
  assert.equal(saved.data.assignedTo, STAFF[1].email);
  assert.equal(saved.data.assignedBy, STAFF[0].email);
  assert.equal(saved.data.name, created.name);
  assert.deepEqual(saved.data.activity.map(entry => entry.type), ["update", "work-note", "additional-comment"]);
  assert.ok(saved.data.activity.every(entry => entry.author.email === STAFF[0].email && entry.author.name === STAFF[0].name && entry.createdAt));
  const next = await call(route + "/work", { method: "PATCH", cookie: user.cookie, body: workInput(saved.data, { workNote: "Second internal note", status: "resolved" }) });
  assert.equal(next.status, 200);
  assert.deepEqual(next.data.activity.slice(0, 3), saved.data.activity);
  assert.equal(next.data.resolvedBy, STAFF[0].email);
  assert.ok(next.data.resolvedAt);
  const otherApp = await app(t);
  const otherUser = await otherApp.signIn(STAFF[1].email);
  assert.deepEqual((await otherApp.call(route, { cookie: otherUser.cookie })).data, next.data);
  const preview = await call(route + "/requester-preview", { cookie: user.cookie });
  assert.equal(preview.status, 200);
  assert.equal(preview.data.comments.length, 1);
  assert.equal(preview.data.comments[0].body, "REQUESTER-UPDATE");
  const serialized = JSON.stringify(preview.data);
  for (const excluded of ["INTERNAL-NOTE-ONLY", "INTERNAL-RESOLUTION-ONLY", "Second internal note", STAFF[0].email, "workSaves", "activity", "assignedBy", "identitySource", "transcript"]) assert.ok(!serialized.includes(excluded));
  assert.equal((await call(route + "/requester-preview")).status, 401);
});

test("workspace stale saves cannot overwrite quick updates and retries do not duplicate notes", async (t) => {
  const { call, signIn, createTicket } = await app(t);
  const user = await signIn();
  const created = (await createTicket({ category: "Other" })).data;
  const route = `/api/tickets/${created.id}`;
  const stale = workInput(created, { workNote: "Should not save over teammate" });
  await call(route, { method: "PATCH", cookie: user.cookie, body: { status: "in-review" } });
  assert.equal((await call(route + "/work", { method: "PATCH", cookie: user.cookie, body: stale })).status, 409);
  const current = (await call(route, { cookie: user.cookie })).data;
  assert.equal(current.activity, undefined);
  const input = workInput(current, { additionalComment: "Only once" });
  const first = await call(route + "/work", { method: "PATCH", cookie: user.cookie, body: input });
  const second = await call(route + "/work", { method: "PATCH", cookie: user.cookie, body: input });
  assert.deepEqual(second.data, first.data);
  assert.equal(second.data.activity.filter(entry => entry.type === "additional-comment").length, 1);
  assert.equal((await call(route + "/work", { method: "PATCH", cookie: user.cookie, body: { ...input, additionalComment: "Changed retry" } })).status, 409);
});

test("workspace rejects invalid fields, notes, sessions, origins and missing tickets without mutations", async (t) => {
  const { call, signIn, createTicket } = await app(t);
  const user = await signIn();
  const created = (await createTicket()).data;
  const route = `/api/tickets/${created.id}/work`;
  const before = fs.readFileSync(ticketFile, "utf8");
  for (const invalid of [
    { category: "Unknown new category" }, { priority: "critical" }, { status: "closed" },
    { assignedTo: "outsider@example.edu" }, { question: " " }, { details: "a".repeat(3001) },
    { workNote: {} }, { workNote: "a".repeat(4001) }, { additionalComment: "a".repeat(4001) },
    { resolution: "a".repeat(3001) }, { expectedRevision: -1 }, { requestId: "bad" }
  ]) assert.equal((await call(route, { method: "PATCH", cookie: user.cookie, body: workInput(created, invalid) })).status, 400);
  const valid = workInput(created, { workNote: "A fictional test note" });
  assert.equal((await call(route, { method: "PATCH", body: valid })).status, 401);
  assert.equal((await call(route, { method: "PATCH", cookie: user.cookie, body: valid, headers: { Origin: "https://unrelated.example" } })).status, 403);
  assert.equal((await call("/api/tickets/CAP-999999/work", { method: "PATCH", cookie: user.cookie, body: valid })).status, 404);
  assert.equal((await call("/api/tickets/CAP-999999", { cookie: user.cookie })).status, 404);
  await call("/api/staff/logout", { cookie: user.cookie, body: {} });
  assert.equal((await call(route, { method: "PATCH", cookie: user.cookie, body: valid })).status, 401);
  assert.deepEqual(JSON.parse(fs.readFileSync(ticketFile, "utf8")), JSON.parse(before));
});

test("student and staff ticket APIs validate and persist preferred contact", async (t) => {
  const { call, signIn, createTicket } = await app(t);
  const user = await signIn();
  const student = await createTicket({ preferredContactMethod: "phone", contactPhone: "(305) 555-0123" });
  assert.equal(student.status, 201);
  assert.deepEqual(student.data.contact, { method: "phone", value: "+13055550123" });
  const staffBody = { category: "Other", question: "Contact test", details: "Fictional data only.", preferredContactMethod: "phone", contactPhone: "+44 20 7946 0958" };
  const staffTicket = await call("/api/staff/tickets", { cookie: user.cookie, body: staffBody });
  assert.equal(staffTicket.status, 201);
  assert.deepEqual(staffTicket.data.contact, { method: "phone", value: "+442079460958" });
  const emailTicket = await createTicket({ preferredContactMethod: "email", contactPhone: "invalid and unused" });
  assert.equal(emailTicket.status, 201);
  assert.deepEqual(emailTicket.data.contact, { method: "email", value: "fictional@example.edu" });
  const before = fs.readFileSync(ticketFile, "utf8");
  for (const invalid of [{ contactPhone: "123" }, { contactPhone: "" }, { contactPhone: {} }, { preferredContactMethod: "sms" }]) {
    assert.equal((await call("/api/staff/tickets", { cookie: user.cookie, body: { ...staffBody, ...invalid } })).status, 400);
    assert.equal((await createTicket({ preferredContactMethod: "phone", contactPhone: "3055550123", ...invalid })).status, 400);
  }
  assert.equal((await createTicket({ email: "a..b@example.edu" })).status, 400);
  assert.equal(fs.readFileSync(ticketFile, "utf8"), before);
  const persisted = (await call(`/api/tickets/${student.data.id}`, { cookie: user.cookie })).data;
  assert.deepEqual(persisted.contact, student.data.contact);
  const preview = (await call(`/api/tickets/${student.data.id}/requester-preview`, { cookie: user.cookie })).data;
  assert.equal(preview.contact, undefined);
});

test("only staff can apply or remove the project-owner tag and marking does not change creator identity", async (t) => {
  const { call, signIn, createTicket } = await app(t);
  const user = await signIn();
  const student = await createTicket({ projectOwnerTicket: true, projectOwnerMarkedBy: STAFF[0].email });
  assert.equal(student.status, 201);
  assert.equal(student.data.projectOwnerTicket, undefined);
  const marked = await call("/api/staff/tickets", { cookie: user.cookie, body: { category: "Other", question: "Fictional owner request", details: "Staff-classified test only.", projectOwnerTicket: true, projectOwnerMarkedBy: "forged@example.edu" } });
  assert.equal(marked.status, 201);
  assert.equal(marked.data.projectOwnerTicket, true);
  assert.equal(marked.data.projectOwnerMarkedBy, STAFF[0].email);
  assert.equal(marked.data.createdBy, STAFF[0].email);
  assert.ok(marked.data.projectOwnerMarkedAt);
  const route = `/api/tickets/${student.data.id}/work`;
  assert.equal((await call(route, { method: "PATCH", body: workInput(student.data, { projectOwnerTicket: true }) })).status, 401);
  const classified = await call(route, { cookie: user.cookie, method: "PATCH", body: workInput(student.data, { projectOwnerTicket: true }) });
  assert.equal(classified.status, 200);
  assert.equal(classified.data.name, student.data.name);
  assert.equal(classified.data.email, student.data.email);
  assert.equal(classified.data.identitySource, student.data.identitySource);
  assert.equal(classified.data.projectOwnerMarkedBy, STAFF[0].email);
  assert.match(classified.data.activity.at(-1).body, /project-owner tag/);
  const removed = await call(route, { cookie: user.cookie, method: "PATCH", body: workInput(classified.data, { projectOwnerTicket: false }) });
  assert.equal(removed.status, 200);
  assert.equal(removed.data.projectOwnerTicket, false);
  assert.equal((await call(route, { cookie: user.cookie, method: "PATCH", body: workInput(removed.data, { projectOwnerTicket: "yes" }) })).status, 400);
});
