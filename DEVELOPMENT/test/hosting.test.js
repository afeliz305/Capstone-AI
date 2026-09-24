const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs/promises");
const os = require("node:os");
const path = require("node:path");
const { once } = require("node:events");
const vm = require("node:vm");
const { createHash } = require("node:crypto");
const { createApiClient } = require("../js/shared/api-client");
const { normalizeBasePath, normalizePublicOrigin } = require("../server/lib/hosting");
const { createStaffAuth, setStaffPassword, STAFF } = require("../server/lib/staff-auth");
const { createSessionService } = require("../server/lib/session");
const { createUploadPackage } = require("../scripts/package-upload");
const publicFiles = require("../server/lib/public-files");

async function removeTestDirectory(directory, prefix) {
  // Delete only the uniquely created fixture folder, never its parent.
  assert.equal(path.dirname(path.resolve(directory)), path.resolve(os.tmpdir()));
  assert.ok(path.basename(directory).startsWith(prefix));
  await fs.rm(directory, { recursive: true, force: true });
}

test("browser bootstrap discovers the app folder from its own script URL on either page", async () => {
  const source = await fs.readFile(path.join(__dirname, "../js/shared/api-client.js"), "utf8");
  for (const base of ["http://localhost:3000/", "https://example.edu/~student/Capstone%20-%20AI/"]) {
    for (const page of ["index.html", "pages/staff.html"]) {
      const window = { fetch: async () => {} };
      vm.runInNewContext(source, { window, URL, document: { currentScript: { src: base + "js/shared/api-client.js" }, baseURI: base + page } });
      assert.equal(window.CapstoneApi.baseUrl, base);
      assert.equal(window.CapstoneApi.url("/api/staff/session"), base + "api/staff/session");
    }
  }
});

test("API URLs work at the site root and inside an encoded hosting folder", async () => {
  for (const baseUrl of ["http://localhost:3000/", "https://example.edu/~student/Capstone%20-%20AI/"]) {
    const requests = [];
    const api = createApiClient({ baseUrl, fetchImpl: async (...args) => { requests.push(args); return new Response('{"ok":true}', { headers: { "Content-Type": "application/json" } }); } });
    const response = await api.fetch("/api/staff/login", { method: "POST", headers: { "Content-Type": "application/json" }, body: '{}' });
    assert.deepEqual(await api.readJson(response), { ok: true });
    assert.equal(requests[0][0], baseUrl + "api/staff/login");
    assert.equal(requests[0][1].credentials, "same-origin");
    assert.equal(requests[0][1].redirect, "error");
    assert.equal(requests[0][1].headers.Accept, "application/json");
    assert.equal(api.url("/api/tickets/CAP-1/attachments/file"), baseUrl + "api/tickets/CAP-1/attachments/file");
    for (const route of ["https://example.org/login", "//example.org/api/", "/api/../data/tickets.json"]) assert.throws(() => api.url(route));
  }
});

test("HTML failures give hosting guidance and never parse or display the HTML", async () => {
  const api = createApiClient({ baseUrl: "https://example.edu/app/", fetchImpl: fetch });
  for (const status of [200, 404, 500]) {
    const response = new Response("<!DOCTYPE html><h1>Not found</h1>", { status, headers: { "Content-Type": "text/html" } });
    await assert.rejects(() => api.readJson(response), /backend is not available/);
    assert.equal(response.bodyUsed, false);
  }
  await assert.rejects(() => api.readJson(new Response("bad", { headers: { "Content-Type": "application/json" } })), /invalid response/);
  const unauth = new Response('{"error":"Unauthorized access"}', { status: 401, headers: { "Content-Type": "application/json; charset=utf-8" } });
  assert.equal((await api.readJson(unauth)).error, "Unauthorized access");
});

test("network and file-page failures fail closed without displaying secrets", async () => {
  const api = createApiClient({ baseUrl: "https://example.edu/app/", fetchImpl: async () => { throw new Error("sensitive transport detail"); } });
  await assert.rejects(() => api.fetch("/api/staff/session"), error => /Cannot reach/.test(error.message) && !/sensitive/.test(error.message));
  const fileApi = createApiClient({ baseUrl: "file:///C:/project/", fetchImpl: () => { throw new Error("should not fetch"); } });
  await assert.rejects(() => fileApi.fetch("/api/staff/login"), /backend is not available/);
});

test("hosting configuration rejects unsafe paths and untrusted public origins", () => {
  assert.equal(normalizeBasePath("/~student/Capstone - AI/"), "/~student/Capstone%20-%20AI");
  assert.equal(normalizeBasePath("/~student/Capstone%20-%20AI"), "/~student/Capstone%20-%20AI");
  for (const value of ["https://example.edu", "/../app", "/a/%2fapi", "/x; Secure", "/x?y", "/x#y", "/x\\y", "/a//b"]) assert.throws(() => normalizeBasePath(value));
  assert.equal(normalizePublicOrigin("https://example.edu"), "https://example.edu");
  for (const value of ["http://example.edu", "https://example.edu/app", "https://user:pass@example.edu", "https://example.edu/?x=1"]) assert.throws(() => normalizePublicOrigin(value));
});

test("mounted backend serves assets, authenticates staff, scopes cookies, and rejects foreign origins", async (t) => {
  const temp = await fs.mkdtemp(path.join(os.tmpdir(), "capstone-hosting-test-"));
  t.after(() => removeTestDirectory(temp, "capstone-hosting-test-"));
  // The server resolves storage when loaded. Never use the user's real queue.
  const previousDataFile = process.env.CAPSTONE_DATA_FILE;
  process.env.CAPSTONE_DATA_FILE = path.join(temp, "tickets.json");
  const { createServer } = require("../server/server");
  if (previousDataFile === undefined) delete process.env.CAPSTONE_DATA_FILE;
  else process.env.CAPSTONE_DATA_FILE = previousDataFile;
  const file = path.join(temp, "staff.json");
  const password = "Fictional-hosting-test-824";
  await setStaffPassword(STAFF[0].email, password, { file });
  await setStaffPassword(STAFF[1].email, password, { file });
  await setStaffPassword(STAFF[2].email, "demo1234", { file, localTestOnly: true });
  const prefix = "/~student/Capstone%20-%20AI";
  const server = createServer({ staffAuth: createStaffAuth({ file }), sessions: createSessionService({ enableDemo: true }), basePath: prefix, publicOrigin: "https://example.edu" });
  server.listen(0, "127.0.0.1");
  await once(server, "listening");
  t.after(() => new Promise(resolve => { server.close(resolve); server.closeAllConnections(); }));
  const origin = "http://127.0.0.1:" + server.address().port;
  const folderRedirect = await fetch(origin + prefix, { redirect: "manual" });
  assert.equal(folderRedirect.headers.get("location"), prefix + "/");
  assert.equal((await fetch(origin + prefix + "/")).status, 200);
  assert.equal((await fetch(origin + prefix + "/pages/staff.html")).status, 200);
  assert.equal((await fetch(origin + prefix + "/js/shared/api-client.js")).status, 200);
  assert.equal((await fetch(origin + "/api/health")).status, 404);
  for (const privatePath of ["data/staff-credentials.json", "data/tickets.json", ".git/config", ".env", "server/server.js"]) {
    assert.equal((await fetch(origin + prefix + "/" + privatePath)).status, 404, privatePath);
  }
  assert.equal((await (await fetch(origin + prefix + "/api/health")).json()).status, "ok");
  assert.equal((await (await fetch(origin + prefix + "/api/session")).json()).demoAvailable, false);
  const search = await (await fetch(origin + prefix + "/api/search?q=sprint%20planning")).json();
  assert.equal(search.links[0].id, "sprint-planning");
  const redirect = await fetch(origin + prefix + "/staff.html", { redirect: "manual" });
  assert.equal(redirect.headers.get("location"), prefix + "/pages/staff.html");
  assert.equal((await fetch(origin + prefix + "/api/staff/session")).status, 401);
  const options = { method: "POST", headers: { "Content-Type": "application/json", Origin: "https://example.edu" }, body: JSON.stringify({ email: STAFF[0].email, password }) };
  const login = await fetch(origin + prefix + "/api/staff/login", options);
  assert.equal(login.status, 200);
  const cookie = login.headers.get("set-cookie");
  assert.ok(cookie.includes("Path=" + prefix + "/api;"));
  assert.match(cookie, /; Secure/);
  assert.match(cookie, /HttpOnly; SameSite=Strict/);
  const session = await fetch(origin + prefix + "/api/staff/session", { headers: { Cookie: cookie.split(";")[0] } });
  assert.equal((await session.json()).staff.email, STAFF[0].email);
  const rejected = await fetch(origin + prefix + "/api/staff/login", { ...options, headers: { ...options.headers, Origin: "https://evil.example" } });
  assert.equal(rejected.status, 403);
  // A loopback reverse proxy must not accidentally enable weak local test auth.
  const localOnly = await fetch(origin + prefix + "/api/staff/login", { ...options, body: JSON.stringify({ email: STAFF[2].email, password: "demo1234" }) });
  assert.equal(localOnly.status, 401);
  const demo = await fetch(origin + prefix + "/api/demo-session", { ...options, body: JSON.stringify({ action: "start" }) });
  assert.equal(demo.status, 404);

  const headers = { ...options.headers, Cookie: cookie.split(";")[0] };
  const bytes = Buffer.from("Fictional hosted attachment test.\n");
  const created = await fetch(origin + prefix + "/api/staff/tickets", {
    method: "POST", headers, body: JSON.stringify({ category: "Testing and updates", question: "Fictional hosted queue test", details: "Verify shared access to one backend only.", attachments: [{ name: "sample.txt", size: bytes.length, data: bytes.toString("base64") }] })
  });
  assert.equal(created.status, 201);
  const ticket = await created.json();
  const secondLogin = await fetch(origin + prefix + "/api/staff/login", { ...options, body: JSON.stringify({ email: STAFF[1].email, password }) });
  assert.equal(secondLogin.status, 200);
  const secondHeaders = { ...headers, Cookie: secondLogin.headers.get("set-cookie").split(";")[0] };
  const queue = await (await fetch(origin + prefix + "/api/tickets", { headers: secondHeaders })).json();
  assert.ok(queue.some(item => item.id === ticket.id));
  const assigned = await fetch(origin + prefix + "/api/tickets/" + ticket.id, { method: "PATCH", headers: secondHeaders, body: JSON.stringify({ assignedTo: STAFF[1].email, expectedAssignee: null }) });
  assert.equal(assigned.status, 200);
  const firstView = await (await fetch(origin + prefix + "/api/tickets/" + ticket.id, { headers })).json();
  assert.equal(firstView.assignedTo, STAFF[1].email);
  const downloadUrl = origin + prefix + "/api/tickets/" + ticket.id + "/attachments/" + ticket.attachments[0].id;
  assert.equal((await fetch(downloadUrl)).status, 401);
  const download = await fetch(downloadUrl, { headers: secondHeaders });
  assert.equal(download.status, 200);
  assert.deepEqual(Buffer.from(await download.arrayBuffer()), bytes);
  const persisted = JSON.parse(await fs.readFile(path.join(temp, "tickets.json"), "utf8"));
  assert.ok(persisted.some(item => item.id === ticket.id && item.assignedTo === STAFF[1].email));
  const logout = await fetch(origin + prefix + "/api/staff/logout", { method: "POST", headers: secondHeaders, body: "{}" });
  assert.equal(logout.status, 200);
  assert.ok(logout.headers.get("set-cookie").includes("Path=" + prefix + "/api; Max-Age=0; Secure"));
  assert.equal((await fetch(downloadUrl, { headers: secondHeaders })).status, 401);
});

test("upload package contains only allowed public files and clean backend source", async (t) => {
  const outputRoot = await fs.mkdtemp(path.join(os.tmpdir(), "capstone-package-test-"));
  t.after(() => removeTestDirectory(outputRoot, "capstone-package-test-"));
  const result = await createUploadPackage({ outputRoot });
  assert.deepEqual(result.manifest.filter(item => item.file.startsWith("public/")).map(item => item.file.slice(7)).sort(), [...publicFiles, ".htaccess"].sort());
  for (const item of result.manifest) {
    assert.doesNotMatch(item.file, /(?:^|\/)(?:\.git|\.env|node_modules)(?:\/|$)|staff-credentials|data\/tickets|data\/attachments|seed-backup/);
    assert.match(item.sha256, /^[0-9a-f]{64}$/);
    const bytes = await fs.readFile(path.join(result.destination, item.file));
    assert.equal(bytes.length, item.bytes);
    assert.equal(createHash("sha256").update(bytes).digest("hex"), item.sha256);
  }
  assert.ok(result.manifest.some(item => item.file === "private-app/server/server.js"));
  assert.ok(result.manifest.some(item => item.file === "private-app/data/capstone-knowledge.json"));
  const second = await createUploadPackage({ outputRoot });
  assert.notEqual(second.destination, result.destination);
});
