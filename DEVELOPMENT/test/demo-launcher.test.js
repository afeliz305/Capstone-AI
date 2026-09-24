const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs/promises");
const os = require("node:os");
const path = require("node:path");
const { startDemo, probePreview } = require("../scripts/start-demo");

test("demo probe distinguishes absent, own, unknown, redirected and unresponsive listeners", async () => {
  const absent = await probePreview(3003, async () => { throw Object.assign(new Error(), { cause: { code: "ECONNREFUSED" } }); });
  assert.equal(absent.occupied, false);
  for (const response of [new Response("<html>Other app</html>"), new Response("bad", { headers: { "content-type": "application/json" } }), new Response("{}", { status: 503, headers: { "content-type": "application/json" } })]) {
    assert.deepEqual(await probePreview(3003, async () => response), { occupied: true });
  }
  assert.deepEqual(await probePreview(3003, async () => { throw new Error("timeout"); }), { occupied: true });
  const result = await probePreview(3003, async (url, options) => {
    assert.equal(url, "http://127.0.0.1:3003/__capstone_demo"); assert.equal(options.redirect, "error");
    return new Response('{"application":"Capstone - AI"}', { headers: { "content-type": "application/json" } });
  });
  assert.equal(result.identity.application, "Capstone - AI");
});

test("demo refuses conflicting projects before rebuilding or starting a listener", async () => {
  for (const identity of [undefined, { application: "HelpDesk INC" }, { application: "Capstone - AI", mode: "static-preview", rootId: "another-folder" }]) {
    let built = false;
    await assert.rejects(startDemo({ probe: async () => ({ occupied: true, identity }), build: async () => { built = true; }, log() {} }), /already in use/);
    assert.equal(built, false);
  }
});

test("one-command demo builds, serves public assets, and reuses its own fixed address without overwriting old releases", async t => {
  const workspace = await fs.mkdtemp(path.join(os.tmpdir(), "capstone-demo-launcher-"));
  let server;
  t.after(async () => {
    if (server) { server.closeAllConnections(); await new Promise(resolve => server.close(resolve)); }
    assert.equal(path.dirname(workspace), os.tmpdir()); assert.ok(path.basename(workspace).startsWith("capstone-demo-launcher-"));
    await fs.rm(workspace, { recursive: true, force: true });
  });
  const first = await startDemo({ workspace, port: 0, log() {} });
  server = first.server;
  assert.equal(server.address().address, "127.0.0.1");
  const html = await (await fetch(first.url)).text();
  assert.match(html, /data-api-transport="browser"/);
  assert.equal((await fetch(first.url + "css/images/capstone-chat.svg")).status, 200);
  assert.equal((await fetch(first.url + "js/shared/browser-demo.bundle.js")).status, 200);
  assert.equal((await fetch(first.url + "pages/staff.html")).status, 200);
  const legacyUrl = new URL("/Capstone%20AI%20Chat/", first.url).href;
  const legacy = await fetch(legacyUrl, { redirect: "manual" });
  assert.equal(legacy.status, 200, "old address stays usable for exporting its own browser queue");
  assert.equal(legacy.headers.get("location"), null);
  assert.equal((await fetch(legacyUrl + "css/images/capstone-chat.svg")).status, 200);
  assert.equal((await fetch(legacyUrl + "data/tickets.json")).status, 404);
  for (const privateFile of ["data/tickets.json", "scripts/start-demo.js", "api/index.php", "../DEVELOPMENT/package.json"]) assert.equal((await fetch(first.url + privateFile)).status, 404);
  await fs.writeFile(path.join(first.release.uploadDirectory, "preserve.txt"), "fictional release marker");
  const second = await startDemo({ workspace, port: server.address().port, log() {} });
  assert.equal(second.reused, true); assert.equal(second.server, null); assert.equal(second.url, first.url);
  assert.equal(await fs.readFile(path.join(second.release.archivedDirectory, "preserve.txt"), "utf8"), "fictional release marker");
  assert.equal((await fetch(first.url)).status, 200);
});

test("demo build failures stop before starting a server and Windows launcher locates DEVELOPMENT itself", async () => {
  await assert.rejects(startDemo({ port: 0, build: async () => { throw new Error("fixture build failure"); }, log() {} }), /fixture build failure/);
  const script = await fs.readFile(path.join(__dirname, "../scripts/Start Capstone Demo.cmd"), "utf8");
  assert.match(script, /cd \/d "%~dp0\.\."/);
  assert.match(script, /node scripts\\start-demo\.js/);
  assert.doesNotMatch(script, /npm\.ps1|Set-ExecutionPolicy|taskkill|Stop-Process|777/);
});
