const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");
const { once } = require("node:events");
const { createSessionService } = require("../lib/session");

// Tests never write to the user's local support queue.
const directory = fs.mkdtempSync(path.join(os.tmpdir(), "capstone-session-test-"));
const ticketFile = path.join(directory, "tickets.json");
process.env.CAPSTONE_DATA_FILE = ticketFile;
const { createServer } = require("../server");
test.after(() => {
  for (const file of [ticketFile, `${ticketFile}.tmp`]) {
    try { fs.unlinkSync(file); } catch (error) { if (error.code !== "ENOENT") throw error; }
  }
  fs.rmdirSync(directory);
});

const contact = { name: "Manual Student", email: "manual@example.edu" };
const account = { id: "student-42", name: "Account Student", email: "account@example.edu" };
const requestDetails = { question: "Where is the form?", details: "Please help locate the form." };

async function app(t, options = {}) {
  const server = createServer({ sessions: createSessionService(options) });
  server.listen(0, "127.0.0.1");
  await once(server, "listening");
  t.after(() => new Promise((resolve, reject) => {
    server.close((error) => error ? reject(error) : resolve());
    server.closeAllConnections();
  }));
  const base = `http://127.0.0.1:${server.address().port}`;
  return async (route, { body, cookie, headers, method } = {}) => {
    const response = await fetch(`${base}${route}`, {
      method: method || (body ? "POST" : "GET"),
      headers: { ...(body ? { "Content-Type": "application/json" } : {}), ...(cookie ? { Cookie: cookie } : {}), ...headers },
      ...(body ? { body: JSON.stringify(body) } : {})
    });
    return { status: response.status, headers: response.headers, data: await response.json() };
  };
}

test("standalone guest can still submit manually entered contact details", async (t) => {
  const call = await app(t);
  const session = await call("/api/session");
  assert.equal(session.data.status, "guest");
  assert.equal(session.data.account, null);
  assert.equal(session.headers.get("cache-control"), "no-store");
  const saved = await call("/api/tickets", { body: { ...contact, ...requestDetails, identityContext: session.data.identityContext } });
  assert.equal(saved.status, 201);
  assert.equal(saved.data.identitySource, "manual");
  assert.equal(saved.data.accountId, null);
});

test("sample identity is scoped to a browser cookie and cannot be overridden in ticket JSON", async (t) => {
  const call = await app(t, { enableDemo: true });
  const start = await call("/api/demo-session", { body: { action: "start" } });
  assert.equal(start.status, 200);
  const cookieHeader = start.headers.get("set-cookie");
  assert.match(cookieHeader, /HttpOnly; SameSite=Strict; Path=\/api/);
  const cookie = cookieHeader.split(";")[0];
  const session = (await call("/api/session", { cookie })).data;
  assert.equal(session.status, "demo");
  assert.equal(session.account.name, "Demo Student");
  assert.equal((await call("/api/session")).data.status, "guest");
  assert.equal((await call("/api/session", { cookie: "capstone_demo_session=forged" })).data.status, "guest");
  const saved = await call("/api/tickets", { cookie, body: {
    ...contact, ...requestDetails, accountId: "forged", identitySource: "portal-session", identityContext: session.identityContext
  } });
  assert.equal(saved.status, 201);
  assert.equal(saved.data.name, session.account.name);
  assert.equal(saved.data.email, session.account.email);
  assert.equal(saved.data.accountId, "sample-student");
  assert.equal(saved.data.identitySource, "demo-session");
  const persisted = JSON.parse(fs.readFileSync(ticketFile, "utf8")).find((ticket) => ticket.id === saved.data.id);
  assert.equal(persisted.email, session.account.email);
  assert.equal(persisted.identityContext, undefined);
});

test("ending a sample session rejects an open form's stale identity without creating a ticket", async (t) => {
  const call = await app(t, { enableDemo: true });
  const start = await call("/api/demo-session", { body: { action: "start" } });
  const cookie = start.headers.get("set-cookie").split(";")[0];
  const session = (await call("/api/session", { cookie })).data;
  const before = (await call("/api/tickets")).data.length;
  await call("/api/demo-session", { cookie, body: { action: "end" } });
  const saved = await call("/api/tickets", { cookie, body: { ...contact, ...requestDetails, identityContext: session.identityContext } });
  assert.equal(saved.status, 409);
  assert.equal((await call("/api/tickets")).data.length, before);
});

test("connected adapter supplies minimal account fields and is consulted again on submission", async (t) => {
  let reads = 0;
  const call = await app(t, { resolveAccount: async () => { reads++; return { ...account, secret: "do-not-return" }; } });
  const session = (await call("/api/session")).data;
  assert.equal(session.status, "signed-in");
  assert.deepEqual(session.account, account);
  assert.equal(session.demoAvailable, false);
  const saved = await call("/api/tickets", { body: { ...requestDetails, identityContext: session.identityContext } });
  assert.equal(saved.status, 201);
  assert.equal(saved.data.name, account.name);
  assert.equal(saved.data.email, account.email);
  assert.equal(saved.data.identitySource, "portal-session");
  assert.equal(reads, 2);
  assert.equal((await call("/api/demo-session", { body: { action: "start" } })).status, 404);
});

test("switching portal accounts while filling out a request requires reviewing refreshed details", async (t) => {
  let signedIn = account;
  const call = await app(t, { resolveAccount: async () => signedIn });
  const session = (await call("/api/session")).data;
  signedIn = { id: "student-43", name: "Another Student", email: "another@example.edu" };
  assert.equal((await call("/api/tickets", { body: { ...contact, ...requestDetails, identityContext: session.identityContext } })).status, 409);
  const refreshed = (await call("/api/session")).data;
  const saved = await call("/api/tickets", { body: { ...contact, ...requestDetails, identityContext: refreshed.identityContext } });
  assert.equal(saved.status, 201);
  assert.equal(saved.data.accountId, signedIn.id);
});

test("connected portal logout does not allow a manual or client-forged identity fallback", async (t) => {
  let signedIn = account;
  const call = await app(t, { resolveAccount: async () => signedIn });
  const session = (await call("/api/session")).data;
  signedIn = null;
  const guest = (await call("/api/session")).data;
  assert.equal(guest.status, "sign-in-required");
  for (const identityContext of [session.identityContext, guest.identityContext]) {
    const saved = await call("/api/tickets", { body: { ...contact, ...requestDetails, identityContext, account } });
    assert.equal(saved.status, 401);
  }
});

test("adapter failure or incomplete profile blocks submission without exposing underlying errors", async (t) => {
  for (const resolveAccount of [async () => { throw new Error("private upstream detail"); }, async () => ({ id: "missing-email" })]) {
    const call = await app(t, { resolveAccount });
    const session = await call("/api/session");
    assert.equal(session.status, 503);
    assert.doesNotMatch(JSON.stringify(session.data), /private upstream/);
    assert.equal((await call("/api/tickets", { body: { ...contact, ...requestDetails } })).status, 503);
  }
});

test("cross-origin writes and missing identity context are rejected", async (t) => {
  const call = await app(t, { enableDemo: true });
  const session = (await call("/api/session")).data;
  const body = { ...contact, ...requestDetails, identityContext: session.identityContext };
  assert.equal((await call("/api/tickets", { body, headers: { Origin: "https://unrelated.example" } })).status, 403);
  assert.equal((await call("/api/demo-session", { body: { action: "start" }, headers: { "Sec-Fetch-Site": "cross-site" } })).status, 403);
  assert.equal((await call("/api/tickets", { body, headers: { "Content-Type": "text/plain" } })).status, 415);
  assert.equal((await call("/api/tickets", { body: { ...contact, ...requestDetails } })).status, 409);
});

test("sample accounts are disabled on non-loopback requests and production servers", async () => {
  const sessions = createSessionService({ enableDemo: true });
  const request = { socket: { remoteAddress: "192.0.2.1" }, headers: { host: "localhost" } };
  assert.equal((await sessions.current(request)).demoAvailable, false);
  request.socket.remoteAddress = "127.0.0.1";
  request.headers.host = "capstone.example";
  assert.equal((await sessions.current(request)).demoAvailable, false);
  request.headers.host = "localhost";
  const originalEnvironment = process.env.NODE_ENV;
  try {
    process.env.NODE_ENV = "production";
    assert.equal((await sessions.current(request)).demoAvailable, false);
  } finally {
    if (originalEnvironment === undefined) delete process.env.NODE_ENV;
    else process.env.NODE_ENV = originalEnvironment;
  }
});
