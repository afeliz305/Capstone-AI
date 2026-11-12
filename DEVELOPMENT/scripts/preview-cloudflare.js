const http = require("node:http");
const fs = require("node:fs/promises");
const path = require("node:path");
const { verify } = require("./package-cloudflare");
const root = path.resolve(__dirname, "../dist/cloudflare/MIRA");
const types = { ".html": "text/html; charset=utf-8", ".js": "text/javascript; charset=utf-8", ".css": "text/css; charset=utf-8", ".svg": "image/svg+xml", ".pdf": "application/pdf", ".woff2": "font/woff2", ".txt": "text/plain; charset=utf-8" };
const guidance = { "explain-criteria": "Treat each criterion as a testable outcome.", "summarize-work": "Separate completed, planned, and blocked work.", "prepare-standup": "Use the three portal stand-up fields and require human review.", "review-evidence": "Map concrete evidence to each criterion.", "draft-review": "Describe the demonstration, evidence, and unfinished work.", "draft-retro": "Prepare Keep, Change, and one team experiment.", "next-steps": "Confirm ownership, do the smallest verifiable step, collect evidence, and request review." };
async function start() {
  const manifest = await verify(root);
  const allowed = new Set(manifest.map((item) => "/" + item.file));
  const server = http.createServer(async (request, response) => {
    const url = new URL(request.url, "http://127.0.0.1");
    if (request.method === "POST" && url.pathname === "/api/ai") {
      let raw = ""; request.setEncoding("utf8"); request.on("data", (chunk) => { raw += chunk; if (raw.length > 12000) request.destroy(); });
      request.on("end", () => { let body; try { body = JSON.parse(raw); } catch (_) { response.writeHead(400, { "content-type": "application/json" }); response.end('{"error":"Valid JSON is required."}'); return; } if (!guidance[body.task] || body.privatePortalData || body.source === "private-portal") { response.writeHead(403, { "content-type": "application/json" }); response.end('{"error":"Request is not approved for mock AI processing."}'); return; } response.writeHead(200, { "content-type": "application/json", "cache-control": "no-store" }); response.end(JSON.stringify({ provider: "mock", state: "draft", text: `[Mock AI] ${guidance[body.task]} No portal change was made.` })); }); return;
    }
    const requested = url.pathname === "/" ? "/index.html" : url.pathname;
    if (request.method !== "GET" || !allowed.has(requested) || requested === "/_headers") { response.writeHead(404); response.end("Not found"); return; }
    try { const bytes = await fs.readFile(path.join(root, requested.slice(1))); response.writeHead(200, { "content-type": types[path.extname(requested)] || "application/octet-stream", "cache-control": "no-store", "x-content-type-options": "nosniff" }); response.end(bytes); }
    catch (_) { response.writeHead(404); response.end("Not found"); }
  });
  const port = Number(process.env.PORT) || 3010;
  server.listen(port, "127.0.0.1", () => { console.log(`Cloudflare foundation preview: http://127.0.0.1:${port}/`); console.log("Mock AI only. No deployment or external AI request is made."); });
}
if (require.main === module) start().catch((error) => { console.error(error.message); process.exitCode = 1; });
module.exports = { start };
