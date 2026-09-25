const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs/promises");
const path = require("node:path");
const os = require("node:os");
const { spawn } = require("node:child_process");
const { once } = require("node:events");
const { STAFF, createStaffAuth, setStaffPassword } = require("../server/lib/staff-auth");

async function directory(t) {
  const temp = await fs.mkdtemp(path.join(os.tmpdir(), "capstone-email-demo-"));
  t.after(async () => {
    assert.equal(path.dirname(path.resolve(temp)), path.resolve(os.tmpdir()));
    assert.ok(path.basename(temp).startsWith("capstone-email-demo-"));
    await fs.rm(temp, { recursive: true, force: true });
  });
  return temp;
}

function request(cookie) {
  return { socket: { remoteAddress: "127.0.0.1" }, headers: { host: "localhost", cookie } };
}
async function signIn(auth, input) {
  let cookie;
  const data = await auth.login(request(), { setHeader: (_, value) => { cookie = value.split(";")[0]; } }, input);
  return { data, cookie };
}

test("email-only demo admits the five roster accounts without reading or changing password records", async t => {
  const temp = await directory(t);
  const file = path.join(temp, "credentials.json");
  await fs.writeFile(file, "not a usable credential file");
  const auth = createStaffAuth({ file, mode: "email-demo" });
  for (const staff of STAFF) {
    const login = await signIn(auth, { email: " " + staff.email.toUpperCase() + " ", name: "Forged Name", password: "ignored" });
    assert.deepEqual(login.data.staff, staff);
    assert.equal(login.data.loginMode, "email-demo");
    assert.equal((await auth.current(request(login.cookie))).staff.email, staff.email);
  }
  assert.equal(await fs.readFile(file, "utf8"), "not a usable credential file");
  for (const email of ["ralva037@fiu.edu", "outsider@fiu.edu", "", null, "afeli016@fiu.edu.evil.example"]) {
    await assert.rejects(signIn(auth, { email }), { statusCode: 401 });
  }
  await assert.rejects(auth.current(request("capstone_staff_session=forged")), { statusCode: 401 });
});

test("email-only sessions expire, sign out, and cannot switch a password backend into demo mode", async t => {
  const temp = await directory(t);
  const file = path.join(temp, "credentials.json");
  let instant = Date.now();
  const auth = createStaffAuth({ file, mode: "email-demo", now: () => instant, sessionMs: 1000 });
  const first = await signIn(auth, { email: STAFF[0].email });
  auth.logout(request(first.cookie), { setHeader() {} });
  await assert.rejects(auth.current(request(first.cookie)), { statusCode: 401 });
  const second = await signIn(auth, { email: STAFF[0].email });
  instant += 1001;
  await assert.rejects(auth.current(request(second.cookie)), { statusCode: 401 });
  const fresh = await signIn(auth, { email: STAFF[0].email });
  const password = "Fictional restore-password test 2026";
  await setStaffPassword(STAFF[0].email, password, { file });
  const protectedAuth = createStaffAuth({ file, mode: "password" });
  await assert.rejects(protectedAuth.current(request(fresh.cookie)), { statusCode: 401 });
  await assert.rejects(signIn(protectedAuth, { email: STAFF[0].email, mode: "email-demo", loginMode: "email-demo" }), { statusCode: 401 });
  assert.equal((await signIn(protectedAuth, { email: STAFF[0].email, password })).data.loginMode, "password");
  assert.throws(() => createStaffAuth({ mode: "typo" }), /login mode/);
});

test("unlisted email attempts are still limited in email-only mode", async () => {
  const auth = createStaffAuth({ mode: "email-demo" });
  for (let i = 0; i < 10; i++) await assert.rejects(signIn(auth, { email: "outsider@example.edu" }), { statusCode: 401 });
  await assert.rejects(signIn(auth, { email: STAFF[0].email }), { statusCode: 429 });
});

async function startBackend(temp, mode) {
  const env = { ...process.env, CAPSTONE_DATA_FILE: path.join(temp, "tickets.json"), CAPSTONE_STAFF_CREDENTIALS_FILE: path.join(temp, "credentials.json"), CAPSTONE_BASE_PATH: "/~student/Capstone - AI", CAPSTONE_PUBLIC_ORIGIN: "https://example.edu", NODE_ENV: "production" };
  delete env.CAPSTONE_SESSION_ADAPTER;
  if (mode) env.CAPSTONE_STAFF_LOGIN_MODE = mode;
  else delete env.CAPSTONE_STAFF_LOGIN_MODE;
  const child = spawn(process.execPath, ["-e", "const app = require('./server/server').createRuntimeServer(); app.listen(0, '127.0.0.1', () => console.log(app.address().port));"], {
    cwd: path.resolve(__dirname, ".."), env, windowsHide: true, stdio: ["ignore", "pipe", "pipe"]
  });
  let errors = "";
  child.stderr.on("data", chunk => { errors += chunk; });
  let timer;
  try {
    const port = await new Promise((resolve, reject) => {
      timer = setTimeout(() => reject(new Error("Isolated backend startup timed out.")), 10000);
      child.once("error", reject);
      child.once("exit", () => reject(new Error("Isolated backend exited: " + errors)));
      child.stdout.once("data", chunk => resolve(Number(String(chunk).trim())));
    });
    assert.ok(Number.isInteger(port) && port > 0);
    return {
      base: "http://127.0.0.1:" + port + "/~student/Capstone%20-%20AI",
      async stop() {
        if (child.exitCode !== null || child.signalCode !== null) return;
        const exited = once(child, "exit");
        child.kill();
        await exited;
      }
    };
  } catch (error) { child.kill(); throw error; }
  finally { clearTimeout(timer); }
}

test("hosted-style demo saves student and staff tickets to server files across a process restart", async t => {
  const temp = await directory(t);
  let backend = await startBackend(temp);
  try {
    const call = async (route, { body, cookie, method = body ? "POST" : "GET" } = {}) => {
      const response = await fetch(backend.base + route, { method, headers: { Origin: "https://example.edu", ...(body ? { "Content-Type": "application/json" } : {}), ...(cookie ? { Cookie: cookie } : {}) }, ...(body ? { body: JSON.stringify(body) } : {}) });
      return { response, data: await response.json(), cookie: response.headers.get("set-cookie")?.split(";")[0] };
    };
    const anonymous = await call("/api/staff/session");
    assert.equal(anonymous.response.status, 401);
    assert.equal(anonymous.data.loginMode, "email-demo");
    const studentSession = await call("/api/session");
    const studentTicket = await call("/api/tickets", { body: { name: "Fictional Student", email: "fictional@example.edu", question: "Fictional site navigation issue", details: "Test shared storage only.", identityContext: studentSession.data.identityContext } });
    assert.equal(studentTicket.response.status, 201);
    const first = await call("/api/staff/login", { body: { email: STAFF[0].email } });
    assert.equal(first.response.status, 200);
    assert.match(first.response.headers.get("set-cookie"), /; Secure/);
    const bytes = Buffer.from("Fictional server persistence attachment.\n");
    const created = await call("/api/staff/tickets", { cookie: first.cookie, body: { category: "Attendance", question: "Fictional attendance issue", details: "Test persistence only.", assignedTo: STAFF[1].email, attachments: [{ name: "demo.txt", size: bytes.length, data: bytes.toString("base64") }] } });
    assert.equal(created.response.status, 201);
    assert.equal(created.data.identitySource, "staff-email-demo");
    const saved = JSON.parse(await fs.readFile(path.join(temp, "tickets.json"), "utf8"));
    assert.ok(saved.some(ticket => ticket.id === studentTicket.data.id));
    assert.ok(saved.some(ticket => ticket.id === created.data.id));
    const attachmentRoute = "/api/tickets/" + created.data.id + "/attachments/" + created.data.attachments[0].id;
    await backend.stop();
    backend = await startBackend(temp);
    assert.equal((await call("/api/tickets", { cookie: first.cookie })).response.status, 401);
    const teammate = await call("/api/staff/login", { body: { email: STAFF[1].email } });
    const queue = await call("/api/tickets", { cookie: teammate.cookie });
    assert.equal(queue.data.length, 2);
    assert.equal(queue.data.find(ticket => ticket.id === created.data.id).assignedTo, STAFF[1].email);
    const download = await fetch(backend.base + attachmentRoute, { headers: { Cookie: teammate.cookie } });
    assert.deepEqual(Buffer.from(await download.arrayBuffer()), bytes);
    assert.equal((await fetch(backend.base + attachmentRoute)).status, 401);
    assert.equal((await fetch(backend.base + "/data/tickets.json")).status, 404);
    await backend.stop();
    backend = await startBackend(temp, "password");
    assert.equal((await call("/api/staff/session")).data.loginMode, "password");
    assert.equal((await call("/api/staff/login", { body: { email: STAFF[1].email } })).response.status, 401);
    assert.deepEqual(JSON.parse(await fs.readFile(path.join(temp, "tickets.json"), "utf8")), saved);
  } finally { await backend.stop(); }
});
