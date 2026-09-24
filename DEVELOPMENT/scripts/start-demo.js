const path = require("node:path");
const fs = require("node:fs/promises");
const { prepareOcelotUpload } = require("./package-ocelot");
const { createPreview, previewIdentity, basePath } = require("./preview-ocelot");

async function probePreview(port, fetchImpl = fetch) {
  try {
    const response = await fetchImpl(`http://127.0.0.1:${port}/__capstone_demo`, {
      redirect: "error", signal: AbortSignal.timeout(1500)
    });
    if (!response.ok || !response.headers.get("content-type")?.includes("application/json")) return { occupied: true };
    return { occupied: true, identity: await response.json() };
  } catch (error) {
    if (error.cause?.code === "ECONNREFUSED") return { occupied: false };
    // Timeout/HTML/redirect is not permission to stop another application.
    return { occupied: true };
  }
}

async function startDemo({ root = path.resolve(__dirname, ".."), workspace = path.dirname(root), port = 3003,
  probe = probePreview, build = prepareOcelotUpload, log = console.log } = {}) {
  if (!Number.isInteger(port) || port < 0 || port > 65535) throw new Error("Invalid demo port.");
  root = await fs.realpath(root);
  workspace = await fs.realpath(workspace);
  const uploadDirectory = path.join(workspace, "Capstone - AI");
  const running = port === 0 ? { occupied: false } : await probe(port);
  const ours = running.identity?.application === "Capstone - AI" && running.identity?.mode === "static-preview" &&
    running.identity?.rootId === previewIdentity(uploadDirectory);
  if (running.occupied && !ours) throw new Error(`Port ${port} is already in use by another or older preview. Nothing was stopped or rebuilt. Close that preview's own terminal if appropriate, then retry. Do not stop HelpDesk INC.`);

  log("Preparing the current Capstone browser demo (no PHP setup)...");
  const release = await build({ root, workspace, transport: "browser" });
  let server = null;
  if (!ours) {
    server = createPreview({ root: release.uploadDirectory });
    await new Promise((resolve, reject) => {
      server.once("error", error => reject(new Error(error.code === "EADDRINUSE"
        ? `Port ${port} became busy. No process was stopped; retry after checking the other preview.`
        : "The local demo could not start: " + error.message)));
      server.listen(port, "127.0.0.1", resolve);
    });
    port = server.address().port;
  }
  const url = `http://127.0.0.1:${port}${basePath}`;
  log(ours ? "Capstone is already running; its public demo files were refreshed." : "Capstone - AI demo is running. Keep this terminal open; Ctrl+C stops it.");
  log("Student assistant: " + url);
  log("Staff queue: " + url + "pages/staff.html");
  log("Demo staff email: afeli016@fiu.edu (no password). Fictional data only.");
  log("Tickets stay in this browser at this address, not in a shared queue. Export browser tickets before clearing site data.");
  log("Use this exact address each time. The Node app at localhost:3000 and Ocelot use separate storage.");
  if (release.archivedDirectory) log("Previous upload preserved: " + release.archivedDirectory);
  return { server, url, reused: ours, release };
}
if (require.main === module) startDemo().catch(error => { console.error(error.message); process.exitCode = 1; });
module.exports = { startDemo, probePreview };
