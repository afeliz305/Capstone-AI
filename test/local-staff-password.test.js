const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs/promises");
const os = require("node:os");
const path = require("node:path");
const { STAFF, setStaffPassword, createStaffAuth } = require("../lib/staff-auth");
const shortPassword = "demo1234";
const regularPassword = "Fictional strong test 2026";

async function fixture(t) {
  const directory = await fs.mkdtemp(path.join(os.tmpdir(), "capstone-local-password-"));
  const file = path.join(directory, "credentials.json");
  t.after(async () => {
    for (const target of [file, `${file}.tmp`]) {
      try { await fs.unlink(target); } catch (error) { if (error.code !== "ENOENT") throw error; }
    }
    await fs.rmdir(directory);
  });
  await setStaffPassword(STAFF[0].email, regularPassword, { file });
  return { file, auth: createStaffAuth({ file }) };
}

function request(extra = {}) {
  return { headers: { host: "localhost:3000", ...extra.headers }, socket: { remoteAddress: "127.0.0.1", ...extra.socket } };
}

async function login(auth, req = request(), email = STAFF[5].email, password = shortPassword) {
  let cookie;
  const result = await auth.login(req, { setHeader(name, value) { if (name === "Set-Cookie") cookie = value.split(";")[0]; } }, { email, password });
  return { result, cookie };
}

test("short staff passwords require explicit local-only setup and preserve other accounts", async (t) => {
  const { file } = await fixture(t);
  const before = JSON.parse(await fs.readFile(file, "utf8")).accounts[STAFF[0].email];
  await assert.rejects(setStaffPassword(STAFF[5].email, shortPassword, { file }), /12 to 128/);
  await assert.rejects(setStaffPassword(STAFF[5].email, "short", { file, localTestOnly: true }), /8 to 128/);
  await setStaffPassword(STAFF[5].email, shortPassword, { file, localTestOnly: true });
  const text = await fs.readFile(file, "utf8");
  assert.ok(!text.includes(shortPassword));
  const accounts = JSON.parse(text).accounts;
  assert.deepEqual(accounts[STAFF[0].email], before);
  assert.equal(accounts[STAFF[5].email].localTestOnly, true);
  assert.match(await fs.readFile(path.join(__dirname, "../public/staff.html"), "utf8"), /id="staff-password"[^>]*minlength="8"/);
});

test("local-only passwords and sessions reject remote or non-localhost requests", async (t) => {
  const { file, auth } = await fixture(t);
  await setStaffPassword(STAFF[5].email, shortPassword, { file, localTestOnly: true });
  const signedIn = await login(auth);
  assert.equal(signedIn.result.staff.email, STAFF[5].email);
  assert.equal((await auth.current(request({ headers: { cookie: signedIn.cookie } }))).staff.email, STAFF[5].email);
  await assert.rejects(login(auth, request(), STAFF[5].email, "incorrect"), { statusCode: 401 });
  for (const denied of [request({ socket: { remoteAddress: "192.0.2.10" }, headers: { "x-forwarded-for": "127.0.0.1" } }), request({ headers: { host: "example.com" } })]) {
    await assert.rejects(login(auth, denied), { statusCode: 401 });
    const session = await login(auth);
    denied.headers.cookie = session.cookie;
    await assert.rejects(auth.current(denied), { statusCode: 401 });
  }
  assert.equal((await login(auth, request({ socket: { remoteAddress: "::1" }, headers: { host: "[::1]:3000" } }))).result.staff.email, STAFF[5].email);
});

test("production rejects local test setup, login, and previously issued sessions", async (t) => {
  const { file, auth } = await fixture(t);
  await setStaffPassword(STAFF[5].email, shortPassword, { file, localTestOnly: true });
  const session = await login(auth);
  const before = await fs.readFile(file, "utf8");
  const previous = process.env.NODE_ENV;
  try {
    process.env.NODE_ENV = "production";
    await assert.rejects(setStaffPassword(STAFF[5].email, shortPassword, { file, localTestOnly: true }), /disabled in production/);
    assert.equal(await fs.readFile(file, "utf8"), before);
    await assert.rejects(login(auth), { statusCode: 401 });
    await assert.rejects(auth.current(request({ headers: { cookie: session.cookie } })), { statusCode: 401 });
    assert.equal((await login(auth, request(), STAFF[0].email, regularPassword)).result.staff.email, STAFF[0].email);
  } finally {
    if (previous === undefined) delete process.env.NODE_ENV; else process.env.NODE_ENV = previous;
  }
});

test("normal password reset removes the local-only exception and revokes old sessions", async (t) => {
  const { file, auth } = await fixture(t);
  await setStaffPassword(STAFF[5].email, shortPassword, { file, localTestOnly: true });
  const session = await login(auth);
  await setStaffPassword(STAFF[5].email, regularPassword, { file });
  assert.equal(JSON.parse(await fs.readFile(file, "utf8")).accounts[STAFF[5].email].localTestOnly, undefined);
  await assert.rejects(auth.current(request({ headers: { cookie: session.cookie } })), { statusCode: 401 });
  await assert.rejects(login(auth), { statusCode: 401 });
  assert.equal((await login(auth, request(), STAFF[5].email, regularPassword)).result.staff.email, STAFF[5].email);
});
