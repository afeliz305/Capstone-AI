const http = require("node:http");
const fs = require("node:fs/promises");
const path = require("node:path");
const { createHash } = require("node:crypto");
const publicFiles = require("../server/lib/public-files");
const allowed = new Set([...publicFiles, "js/shared/browser-demo.bundle.js", "js/shared/supabase.bundle.js", "js/shared/php-search.bundle.js", "css/fonts/OFL.txt"]);
const basePath = "/Capstone%20-%20AI/";
// Serve, do not redirect: browser-demo IndexedDB is scoped to the original URL.
// This permits exporting old demo records after a branding/folder rename.
const legacyBasePath = "/Capstone%20AI%20Chat/";
const previewIdentity = root => createHash("sha256").update(path.resolve(root)).digest("hex").slice(0, 24);
const types = { ".html": "text/html; charset=utf-8", ".js": "text/javascript; charset=utf-8", ".css": "text/css; charset=utf-8", ".svg": "image/svg+xml", ".png": "image/png", ".woff2": "font/woff2", ".txt": "text/plain; charset=utf-8" };
function createPreview({ root = path.resolve(__dirname, "../../Capstone - AI") } = {}) {
  return http.createServer(async (req, res) => {
    const pathname = new URL(req.url, "http://localhost").pathname;
    // Loopback-only launcher identity; contains no tickets or filesystem paths.
    if (req.method === "GET" && pathname === "/__capstone_demo") {
      res.writeHead(200, { "Content-Type": "application/json", "Cache-Control": "no-store" });
      res.end(JSON.stringify({ application: "Capstone - AI", mode: "static-preview", rootId: previewIdentity(root) }));
      return;
    }
    if (req.method === "GET" && pathname === "/") { res.writeHead(302, { Location: basePath }); res.end(); return; }
    const matchedBase = [basePath, legacyBasePath].find(prefix => pathname.startsWith(prefix));
    const file = matchedBase ? pathname.slice(matchedBase.length) || "index.html" : "";
    if (req.method !== "GET" || !allowed.has(file)) { res.writeHead(404); res.end("Not found"); return; }
    try {
      const bytes = await fs.readFile(path.join(root, file));
      res.writeHead(200, { "Content-Type": types[path.extname(file)], "Cache-Control": "no-store", "X-Content-Type-Options": "nosniff" }); res.end(bytes);
    } catch { res.writeHead(404); res.end("Rebuild the browser demo with npm.cmd run package:ocelot."); }
  });
}
if (require.main === module) createPreview().listen(Number(process.env.PORT) || 3003, "127.0.0.1", () => {
  console.log("Capstone browser-only preview: http://127.0.0.1:" + (Number(process.env.PORT) || 3003) + basePath);
  console.log("No ticket backend here. Browser data is separate from localhost:3000 and Ocelot.");
});
module.exports = { createPreview, previewIdentity, basePath };
