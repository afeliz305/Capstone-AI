const http = require("node:http");
const fs = require("node:fs/promises");
const path = require("node:path");
const { verify } = require("./package-cloudflare");

const types = { ".html": "text/html; charset=utf-8", ".js": "text/javascript; charset=utf-8", ".css": "text/css; charset=utf-8", ".svg": "image/svg+xml", ".pdf": "application/pdf", ".woff2": "font/woff2", ".txt": "text/plain; charset=utf-8" };
async function start(options = {}) {
  const root = options.root || path.resolve(__dirname, '../dist/cloudflare/MIRA');
  // Use the production Function's mock path, without secrets or live-provider flags.
  const functionSource = await fs.readFile(path.resolve(__dirname, '../functions/api/ai.js'), 'utf8');
  const { onRequestPost } = await import('data:text/javascript;base64,' + Buffer.from(functionSource).toString('base64'));
  const manifest = await verify(root);
  const allowed = new Set(manifest.map((item) => "/" + item.file));
  const server = http.createServer(async (request, response) => {
    const url = new URL(request.url, "http://127.0.0.1");
    if (request.method === "POST" && url.pathname === "/api/ai") {
      let raw = '', oversized = false;
      request.setEncoding('utf8');
      request.on('data', chunk => { if (oversized) return; raw += chunk; if (Buffer.byteLength(raw) > 12000) { oversized = true; raw = ''; response.writeHead(413, {'content-type':'application/json'}); response.end('{"error":"Request too large."}'); } });
      request.on('end', async () => {
        if (oversized) return;
        try { const result = await onRequestPost({env:{}, request:new Request('http://127.0.0.1/api/ai',{method:'POST',headers:{'content-type':'application/json'},body:raw})}); response.writeHead(result.status,Object.fromEntries(result.headers));response.end(await result.text()); }
        catch { response.writeHead(503,{'content-type':'application/json'}); response.end('{"error":"Local mock unavailable."}'); }
      }); return;
    }
    const requested = url.pathname === "/" ? "/index.html" : url.pathname;
    if (request.method !== "GET" || !allowed.has(requested) || requested === "/_headers") { response.writeHead(404); response.end("Not found"); return; }
    try { const bytes = await fs.readFile(path.join(root, requested.slice(1))); response.writeHead(200, { "content-type": types[path.extname(requested)] || "application/octet-stream", "cache-control": "no-store", "x-content-type-options": "nosniff" }); response.end(bytes); }
    catch (_) { response.writeHead(404); response.end("Not found"); }
  });
  const port = options.port ?? (Number(process.env.PORT) || 3010);
  await new Promise((resolve, reject) => { server.once('error',reject); server.listen(port,'127.0.0.1',resolve); });
  console.log(`Cloudflare foundation preview: http://127.0.0.1:${server.address().port}/`);
  console.log('Mock AI only. No deployment or external AI request is made.');
  return server;
}
if (require.main === module) start().catch((error) => { console.error(error.message); process.exitCode = 1; });
module.exports = { start };
