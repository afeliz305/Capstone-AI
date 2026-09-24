const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const { once } = require("node:events");
const { createServer } = require("../server/server");

const root = path.resolve(__dirname, "..");
let server;
let base;
test.before(async () => {
  server = createServer();
  server.listen(0, "127.0.0.1");
  await once(server, "listening");
  base = `http://127.0.0.1:${server.address().port}`;
});
test.after(() => new Promise((resolve, reject) => {
  server.close(error => error ? reject(error) : resolve());
  server.closeAllConnections();
}));

test("root homepage and staff page serve with all referenced local assets in their new folders", async () => {
  const checked = new Set();
  const expectedTypes = { ".html": "text/html", ".css": "text/css", ".js": "text/javascript", ".svg": "image/svg+xml", ".png": "image/png", ".woff2": "font/woff2" };
  async function checkFile(url) {
    url.hash = "";
    if (url.origin !== base || checked.has(url.href)) return;
    checked.add(url.href);
    const response = await fetch(url);
    assert.equal(response.status, 200, url.pathname);
    const extension = path.extname(url.pathname) || ".html";
    assert.ok(response.headers.get("content-type").startsWith(expectedTypes[extension]), url.pathname);
    assert.equal(response.headers.get("x-content-type-options"), "nosniff");
    const bytes = Buffer.from(await response.arrayBuffer());
    const localPath = url.pathname === "/" ? "index.html" : url.pathname.slice(1);
    assert.deepEqual(bytes, fs.readFileSync(path.join(root, localPath)), url.pathname);
    const content = bytes.toString("utf8");
    if (extension === ".html") {
      for (const [, reference] of content.matchAll(/(?:src|href)="([^"]+)"/g)) {
        if (!reference.startsWith("#")) await checkFile(new URL(reference, url));
      }
    } else if (extension === ".css") {
      for (const [, reference] of content.matchAll(/url\(["']?([^"')]+)["']?\)/g)) await checkFile(new URL(reference, url));
    }
  }
  await checkFile(new URL("/", base));
  await checkFile(new URL("/index.html", base));
  await checkFile(new URL("/pages/staff.html", base));
  for (const asset of ["css/fonts/mulish-var.woff2", "css/images/FIU_mark_white.svg", "css/images/icons.svg", "css/images/capstone-chat.svg", "js/chat/capstone-chat.js", "js/staff/staff.js", "js/shared/contact-policy.js"]) assert.ok(checked.has(`${base}/${asset}`), asset);
  assert.equal((await (await fetch(base + "/api/health")).json()).status, "ok");
});

test("generic chat launcher is accessible, self-contained, and excludes the retired mascot", async () => {
  const html = await (await fetch(base + "/")).text();
  assert.match(html, /<title>Capstone - AI · Site support<\/title>/);
  assert.match(html, /id="chat-launcher" aria-label="Open Capstone - AI chat"[^>]+aria-expanded="false"/);
  assert.match(html, /class="chat-launcher-art"[^>]+src="css\/images\/capstone-chat\.svg"[^>]+alt=""/);
  assert.match(html, /<span>Let's chat<\/span>/);
  assert.doesNotMatch(html, /roary|ask-roary/i);
  const icon = fs.readFileSync(path.join(root, "css/images/capstone-chat.svg"), "utf8");
  assert.match(icon, /viewBox="0 0 64 64"/);
  assert.doesNotMatch(icon, /<script|<image|<foreignObject|href=|on\w+=|roary|fiu/i);
  assert.equal((await fetch(base + "/css/images/ask-roary-transparent.png")).status, 404);
});

test("old staff bookmarks redirect to the canonical page and its relative assets", async () => {
  const response = await fetch(base + "/staff.html", { redirect: "manual" });
  assert.equal(response.status, 302);
  assert.equal(response.headers.get("location"), "/pages/staff.html");
  const followed = await fetch(base + "/staff.html");
  assert.equal(followed.status, 200);
  assert.equal(new URL(followed.url).pathname, "/pages/staff.html");
});

test("search API includes approved multi-topic keyword destinations without exposing the knowledge file", async () => {
  const response = await fetch(base + "/api/search?q=" + encodeURIComponent("sprint planning and tutorials"));
  assert.equal(response.status, 200);
  const result = await response.json();
  assert.deepEqual(result.links.map(link => link.id), ["sprint-planning", "tutorials"]);
  assert.equal(result.links[0].access, "authenticated");
  assert.equal(result.links[1].url, "https://capstone.cs.fiu.edu/tutorials");
  assert.equal((await fetch(base + "/server/lib/keyword-links.js")).status, 404);
});

test("root-level serving never exposes backend code, guides, credentials, data, or arbitrary files", async () => {
  for (const route of [
    "/server/server.js", "/server/config.json", "/server/lib/staff-auth.js", "/data/capstone-knowledge.json",
    "/data/tickets.json", "/data/staff-credentials.json", "/data/attachments/example.txt",
    "/data/tickets.json.seed-backup-example", "/.env", "/.git/config", "/package.json",
    "/README.md", "/AGENTS.md", "/docs/TEAM_SETUP_GUIDE.md", "/docs/licenses/Mulish-OFL.txt",
    "/test/static-files.test.js", "/scripts/set-staff-password.js", "/scripts/ocelot-setup.js",
    "/scripts/ocelot-private-setup.sh", "/scripts/Ocelot%20Setup.cmd", "/css/", "/js/",
    "/css/../data/tickets.json", "/css/%2e%2e/server/server.js", "/css/%2e%2e%2fdata%2ftickets.json",
    "/css/images/..%5c..%5cdata%5ctickets.json", "/css/unlisted.txt", "/public/index.html"
  ]) {
    const response = await fetch(base + route);
    assert.equal(response.status, 404, route);
    assert.equal(await response.text(), "Not found", route);
  }
});

test("reorganized documentation links resolve and startup and private data locations remain correct", () => {
  const manifest = JSON.parse(fs.readFileSync(path.join(root, "package.json"), "utf8"));
  assert.equal(manifest.scripts.start, "node server/server.js");
  assert.ok(fs.existsSync(path.join(root, "index.html")));
  assert.ok(fs.existsSync(path.join(root, "docs/licenses/Mulish-OFL.txt")));
  if (!process.env.CAPSTONE_STAFF_CREDENTIALS_FILE) {
    assert.equal(require("../server/lib/staff-auth").credentialsFile, path.join(root, "data/staff-credentials.json"));
  }
  const documents = ["README.md", "AGENTS.md", "../README.md", "../AGENTS.md", ...fs.readdirSync(path.join(root, "docs")).filter(file => file.endsWith(".md")).map(file => "docs/" + file)];
  for (const document of documents) {
    const content = fs.readFileSync(path.join(root, document), "utf8");
    for (const [, reference] of content.matchAll(/\]\(([^)]+)\)/g)) {
      if (/^(https?:|#)/.test(reference)) continue;
      const target = reference.split("#")[0];
      assert.ok(fs.existsSync(path.resolve(root, path.dirname(document), target)), `${document}: ${reference}`);
    }
  }
});
