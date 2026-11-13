const fs = require("node:fs/promises");
const path = require("node:path");
const { createHash } = require("node:crypto");
const { createOcelotPackage } = require("./package-ocelot");
const { loadReleaseIndex } = require("./release-index");

async function walk(directory, base = directory) {
  const values = [];
  for (const entry of await fs.readdir(directory, { withFileTypes: true })) {
    const resolved = path.join(directory, entry.name);
    if (entry.isDirectory()) values.push(...await walk(resolved, base));
    else if (entry.isFile()) values.push(path.relative(base, resolved).split(path.sep).join("/"));
    else throw new Error("Cloudflare package cannot contain links or special files.");
  }
  return values.sort();
}
async function manifestFor(directory) {
  const manifest = [];
  for (const file of await walk(directory)) {
    const bytes = await fs.readFile(path.join(directory, file));
    manifest.push({ file, bytes: bytes.length, sha256: createHash("sha256").update(bytes).digest("hex") });
  }
  return manifest;
}
async function assertPublicPackage(directory) {
  const files = await walk(directory);
  const required = ["index.html", "pages/staff.html", "pages/recover.html", "js/shared/supabase.bundle.js", "js/shared/team-workspace.js", "js/shared/ai-gateway.js", "js/chat/team-workspace-ui.js"];
  for (const file of required) if (!files.includes(file)) throw new Error("Cloudflare package is missing " + file);
  const forbidden = [".git", "node_modules", "test/", "server/", "functions/", "data/", "DEVELOPMENT", "supabase.local", "tickets.json", "staff-credentials", "portal-native", "portal-extension"];
  for (const file of files) if (forbidden.some((part) => file.toLowerCase().includes(part.toLowerCase()))) throw new Error("Cloudflare package contains a local/private path: " + file);
  const secretPattern = /(?:sb_secret_[A-Za-z0-9_-]{16,}|eyJ[A-Za-z0-9_-]{40,}\.[A-Za-z0-9_-]{20,}|BEGIN (?:RSA |EC |OPENSSH )?PRIVATE KEY|recovery[_-]?token\s*[=:][\s"']*[A-Za-z0-9._-]{16,})/i;
  for (const file of files.filter((name) => /\.(?:html|js|css|json|txt|md|ini|htaccess)$/i.test(name))) {
    const text = await fs.readFile(path.join(directory, file), "utf8");
    if (secretPattern.test(text)) throw new Error("Suspected private credential category found in generated file: " + file);
  }
  return files;
}
async function loadSupabaseConfig(root) {
  const local = process.env.MIRA_SUPABASE_URL && process.env.MIRA_SUPABASE_PUBLISHABLE_KEY
    ? { url: process.env.MIRA_SUPABASE_URL, publishableKey: process.env.MIRA_SUPABASE_PUBLISHABLE_KEY }
    : JSON.parse(await fs.readFile(path.join(root, "server", "supabase.local.json"), "utf8"));
  const originValue = process.env.MIRA_PUBLIC_ORIGIN;
  if (!originValue) throw new Error("Set MIRA_PUBLIC_ORIGIN to the reviewed HTTPS Cloudflare preview origin before packaging. No package was published.");
  const origin = new URL(originValue);
  if (origin.protocol !== "https:" || origin.username || origin.password || origin.search || origin.hash || origin.pathname !== "/") throw new Error("MIRA_PUBLIC_ORIGIN must be an HTTPS origin with no path, credentials, query, or fragment.");
  return { ...local, recoveryUrl: new URL("pages/recover.html", origin).href };
}
async function buildCloudflarePackage({ root = path.resolve(__dirname, ".."), outputRoot = path.join(root, "dist", "cloudflare"), publish = false, supabaseConfig } = {}) {
  root = await fs.realpath(root);
  await fs.mkdir(outputRoot, { recursive: true });
  const stagingRoot = await fs.mkdtemp(path.join(outputRoot, ".staging-"));
  try {
    const config = supabaseConfig || await loadSupabaseConfig(root);
    const siteIndex = await loadReleaseIndex(root);
    if (!siteIndex) throw new Error("Cloudflare release requires the reviewed public website index. Refusing to silently omit indexed knowledge from a clean checkout.");
    const built = await createOcelotPackage({ root, outputRoot: stagingRoot, transport: "supabase", supabaseConfig: config, siteIndex });
    const homePath = path.join(built.uploadDirectory, "index.html");
    await fs.writeFile(homePath, (await fs.readFile(homePath, "utf8")).replace('<html', '<html data-public-information="enabled"'));
    const supabaseOrigin = new URL(config.url).origin;
    const notFound = '<!doctype html>\n<html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta name="robots" content="noindex"><title>Page not found | MIRA</title></head><body><main><h1>Page not found</h1><p>The requested MIRA page does not exist.</p><p><a href="/">Return to MIRA</a></p></main></body></html>\n';
    await fs.writeFile(path.join(built.uploadDirectory, "404.html"), notFound, { flag: "wx" });
    const headers = `/*\n  X-Content-Type-Options: nosniff\n  Referrer-Policy: strict-origin-when-cross-origin\n  Permissions-Policy: camera=(), microphone=(), geolocation=()\n  Content-Security-Policy: default-src 'self'; script-src 'self'; style-src 'self'; font-src 'self'; img-src 'self' data:; connect-src 'self' ${supabaseOrigin}; object-src 'none'; base-uri 'self'; frame-ancestors 'none'; form-action 'self'\n\n/pages/recover.html\n  Cache-Control: no-store\n`;
    await fs.writeFile(path.join(built.uploadDirectory, "_headers"), headers + "\n/pages/recover\n  Cache-Control: no-store\n", { flag: "wx" });
    const files = await assertPublicPackage(built.uploadDirectory);
    for (const file of files.filter(name => /\.(?:html|js|css|svg|txt|json)$/i.test(name))) {
      const target = path.join(built.uploadDirectory, file);
      const text = await fs.readFile(target, 'utf8');
      await fs.writeFile(target, text.replace(/\r\n/g, '\n'));
    }
    const manifest = await manifestFor(built.uploadDirectory);
    if (!publish) return { directory: built.uploadDirectory, manifest, files, stagingRoot };
    const stable = path.join(outputRoot, "MIRA");
    let archive = null;
    try {
      const info = await fs.lstat(stable);
      if (!info.isDirectory() || info.isSymbolicLink()) throw new Error("Refusing to replace a linked or non-directory Cloudflare output.");
      const archiveRoot = path.join(outputRoot, "archive");
      await fs.mkdir(archiveRoot, { recursive: true });
      archive = path.join(archiveRoot, new Date().toISOString().replace(/[:.]/g, "-") + "-MIRA");
      await fs.rename(stable, archive);
    } catch (error) { if (error.code !== "ENOENT") throw error; }
    await fs.rename(built.uploadDirectory, stable);
    await fs.writeFile(path.join(outputRoot, "manifest.json"), JSON.stringify(manifest, null, 2) + "\n");
    return { directory: stable, manifest, files, archive, stagingRoot };
  } finally {
    if (publish) try { await fs.rm(stagingRoot, { recursive: true }); } catch (_) {}
  }
}
async function verify(directory = path.resolve(__dirname, "../dist/cloudflare/MIRA")) {
  const expected = JSON.parse(await fs.readFile(path.join(path.dirname(directory), "manifest.json"), "utf8"));
  await assertPublicPackage(directory);
  const actual = await manifestFor(directory);
  if (JSON.stringify(actual) !== JSON.stringify(expected)) throw new Error("Cloudflare package hash verification failed.");
  return actual;
}
if (require.main === module) {
  const verifyOnly = process.argv.includes("--verify");
  (verifyOnly ? verify() : buildCloudflarePackage({ publish: true })).then((result) => {
    const manifest = Array.isArray(result) ? result : result.manifest;
    console.log(`${verifyOnly ? "Verified" : "Prepared"} Cloudflare preview package: ${manifest.length} files, ${manifest.reduce((sum, item) => sum + item.bytes, 0)} bytes.`);
    if (!verifyOnly) console.log("No deployment was performed. Ocelot rollback package was not changed.");
  }).catch((error) => { console.error(error.message); process.exitCode = 1; });
}
module.exports = { buildCloudflarePackage, verify, manifestFor, assertPublicPackage, loadSupabaseConfig };
