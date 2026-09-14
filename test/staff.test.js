const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");
const { once } = require("node:events");
const { STAFF, setStaffPassword, createStaffAuth } = require("../lib/staff-auth");
const { filterTickets, createIdleRedirect } = require("../public/staff-view");
const directory = fs.mkdtempSync(path.join(os.tmpdir(), "capstone-staff-test-"));
const ticketFile = path.join(directory, "tickets.json");
const staffFile = path.join(directory, "staff-credentials.json");
process.env.CAPSTONE_DATA_FILE = ticketFile;
const { createServer } = require("../server");
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
