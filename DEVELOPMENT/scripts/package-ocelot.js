const fs = require("node:fs/promises");
const path = require("node:path");
const { createHash } = require("node:crypto");
const publicFiles = require("../server/lib/public-files");
const { browserBundle } = require("./browser-bundle");
const { supabaseBundle } = require("./supabase-bundle");
const { reviewedKnowledge } = require("../server/lib/knowledge");
const { loadPublicIndex } = require("../server/website-index/store");

async function createOcelotPackage({ root = path.resolve(__dirname, ".."), outputRoot = path.join(root, "dist"), transport = "php", supabaseConfig, siteIndex } = {}) {
  if (!["php", "browser", "supabase"].includes(transport)) throw new Error("Choose php, browser or supabase packaging.");
  root = await fs.realpath(root);
  if (siteIndex === undefined) siteIndex = await loadPublicIndex(root);
  await fs.mkdir(outputRoot, { recursive: true });
  const destination = await fs.mkdtemp(path.join(outputRoot, "ocelot-upload-"));
  // The user-requested project name is also the remote application folder name.
  const uploadDirectory = path.join(destination, "Capstone - AI");
  const manifest = [];
  async function source(file) {
    const resolved = await fs.realpath(path.join(root, file));
    const relative = path.relative(root, resolved);
    if (relative.startsWith(".." + path.sep) || path.isAbsolute(relative)) throw new Error("Package source escaped the project.");
    return fs.readFile(resolved);
  }
  async function write(file, bytes) {
    const target = path.join(uploadDirectory, file);
    await fs.mkdir(path.dirname(target), { recursive: true });
    await fs.writeFile(target, bytes, { flag: "wx" });
    manifest.push({ file, bytes: Buffer.byteLength(bytes), sha256: createHash("sha256").update(bytes).digest("hex") });
  }
  for (const file of publicFiles) {
    let bytes = await source(file);
    if (file.endsWith(".html") && file !== "pages/syllabus.html") {
      let html = bytes.toString("utf8");
      if (!/src="(?:\.\.\/)?js\/shared\/api-client\.js"/.test(html)) throw new Error("API script missing from " + file);
      html = html.replace(/(src="(?:\.\.\/)?js\/shared\/api-client\.js")/, '$1 data-api-transport="' + transport + '"');
      if (transport === "browser") {
        const prefix = file.startsWith("pages/") ? "../" : "";
        html = html.replace(/(<script src="(?:\.\.\/)?js\/shared\/api-client\.js")/, '<script src="' + prefix + 'js/shared/browser-demo.bundle.js" defer></script>\n    $1');
        html = html.replace(/(<body[^>]*>)/, '$1\n    <p class="hosting-test-notice" role="note"><strong>Browser-only test queue.</strong> Tickets and documents stay in this browser at this site address, not on Ocelot and not shared with teammates. Clearing site data or private browsing can erase them. Fictional data only; sign-in is a demo, not secure access. No professor email is sent.</p>');
        html = html.replace('>Local prototype<', '>Browser-only demo<');
        html = html.replaceAll("on this app's server", "only in this browser, not on Ocelot");
        if (file === "pages/staff.html") html = html.replace('<button class="refresh-button"', '<button class="refresh-button" id="browser-backup" type="button">Export browser tickets</button>\n        <button class="refresh-button"');
      } else if (transport === "supabase") {
        const prefix = file.startsWith("pages/") ? "../" : "";
        html = html.replace(/(<script src="(?:\.\.\/)?js\/shared\/api-client\.js")/, '<script src="' + prefix + 'js/shared/supabase.bundle.js" defer></script>\n    $1');
        html = html.replace(/(<body[^>]*>)/, '$1\n    <p class="hosting-test-notice" role="note"><strong>Supabase shared test queue.</strong> Tickets and documents are saved online after confirmation. Fictional data only. Staff require a provisioned Supabase account. No professor email is sent. Shared storage is not a separate backup.</p>');
        html = html.replace('>Local prototype<', '>Supabase test prototype<');
        html = html.replaceAll("on this app's server", "in the shared Supabase test project");
        html = html.replace('hidden>Prototype password</label>', 'hidden>Password</label>');
        html = html.replace(/(<p class="staff-setup-note" id="staff-password-setup" hidden>)[\s\S]*?<\/p>/,
          '$1Use the separate password for your provisioned Supabase staff account, not your FIU password. Ask the project owner if your account has not been set up. The old demo password does not create an account.</p>');
      } else {
      if (siteIndex) {
        const prefix = file.startsWith("pages/") ? "../" : "";
        html = html.replace(/(<script src="(?:\.\.\/)?js\/shared\/api-client\.js")/, '<script src="' + prefix + 'js/shared/php-search.bundle.js" defer></script>\n    $1');
      }
      html = html.replace(/(<body[^>]*>)/, '$1\n    <p class="hosting-test-notice" role="note">Group testing only — use fictional names, contact details, and documents. Staff access is email-only and does not verify identity. No professor email is sent.</p>');
      html = html.replace('>Local prototype<', '>Ocelot test prototype<');
      }
      bytes = Buffer.from(html);
    }
    if (file === "css/styles.css") bytes = Buffer.concat([bytes, Buffer.from('\n.hosting-test-notice { margin: 0; padding: .75rem 1.5rem; background: #fff4d1; color: #172b4d; border-bottom: 1px solid #d9a836; font-size: .95rem; line-height: 1.5; }\n')]);
    await write(file, bytes);
  }
  if (transport === "browser") {
    await write("js/shared/browser-demo.bundle.js", await browserBundle(root, source, siteIndex));
  } else if (transport === "supabase") {
    await write("js/shared/supabase.bundle.js", await supabaseBundle(root, supabaseConfig, siteIndex));
  } else {
  if (siteIndex) {
    const { build } = require("esbuild");
    const result = await build({ absWorkingDir:root,entryPoints:[path.join(root,"js","shared","php-search-entry.js")],bundle:true,platform:"browser",format:"iife",target:["es2020"],write:false,minify:true,define:{CAPSTONE_WEBSITE_INDEX:JSON.stringify(siteIndex)} });
    await write("js/shared/php-search.bundle.js",result.outputFiles[0].contents);
  }
  for (const file of ["index.php", "storage.php", "tickets.php", "search.php"]) await write("api/" + file, await source("server/php/" + file));
  const knowledge = JSON.stringify(reviewedKnowledge(JSON.parse(await source("data/capstone-knowledge.json"))));
  await write("api/knowledge.php", "<?php\nif (!defined('CAPSTONE_API')) { http_response_code(404); exit; }\nreturn json_decode(base64_decode('" + Buffer.from(knowledge).toString("base64") + "'), true);\n");
  // CGI/FastCGI may honor this per-directory request limit. No handlers or broad permissions are changed.
  await write("api/.user.ini", "post_max_size=20M\nmemory_limit=128M\ndisplay_errors=Off\n");
  // Defense in depth only. Private data is physically outside public_html.
  await write("api/.htaccess", '<IfModule mod_authz_core.c>\n  <FilesMatch "^(?:\\.user\\.ini|storage\\.php|tickets\\.php|search\\.php|knowledge\\.php)$">\n    Require all denied\n  </FilesMatch>\n</IfModule>\n');
  }
  await write("css/fonts/OFL.txt", await source("docs/licenses/Mulish-OFL.txt"));
  await fs.writeFile(path.join(destination, "UPLOAD-INSTRUCTIONS.md"), await source("docs/OCELOT_UPLOAD_GUIDE.md"), { flag: "wx" });
  await fs.writeFile(path.join(destination, "manifest.json"), JSON.stringify(manifest, null, 2) + "\n", { flag: "wx" });
  return { destination, uploadDirectory, manifest, transport };
}
// Only the CLI publishes to the stable upload location. The low-level builder
// remains isolated for tests; generated releases never contain runtime data.
async function prepareOcelotUpload({ root = path.resolve(__dirname, ".."), workspace = path.dirname(root), transport = "browser" } = {}) {
  workspace = await fs.realpath(workspace);
  async function ensureDirectory(parts) {
    let directory = workspace;
    for (const part of parts) {
      directory = path.join(directory, part);
      try { await fs.mkdir(directory); } catch (error) { if (error.code !== "EEXIST") throw error; }
      const info = await fs.lstat(directory);
      if (!info.isDirectory() || info.isSymbolicLink() || await fs.realpath(directory) !== directory) {
        throw new Error("Package output must use real directories inside the project: " + directory);
      }
    }
    return directory;
  }
  async function checkMoveTarget(target, mustExist) {
    const relative = path.relative(workspace, path.resolve(target));
    if (!relative || relative === ".." || relative.startsWith(".." + path.sep) || path.isAbsolute(relative)) throw new Error("Unsafe package move target.");
    let current = workspace;
    const parts = relative.split(path.sep);
    for (let index = 0; index < parts.length; index++) {
      current = path.join(current, parts[index]);
      try {
        const info = await fs.lstat(current);
        if (!info.isDirectory() || info.isSymbolicLink() || await fs.realpath(current) !== current) throw new Error("Refusing a linked or non-directory package path: " + current);
      } catch (error) {
        if (error.code === "ENOENT" && !mustExist && index === parts.length - 1) return false;
        throw error;
      }
    }
    return true;
  }
  const dist = await ensureDirectory(["DEVELOPMENT", "dist"]);
  const staging = await ensureDirectory(["DEVELOPMENT", "dist", "staging"]);
  const archives = await ensureDirectory(["DEVELOPMENT", "dist", "archive", "ocelot"]);
  const records = await ensureDirectory(["DEVELOPMENT", "dist", "release-records"]);
  const lock = path.join(dist, ".ocelot-package.lock");
  try { await fs.mkdir(lock); }
  catch (error) {
    if (error.code === "EEXIST") throw new Error("An Ocelot package build is already running, or its lock remains after an interruption. Check dist/.ocelot-package.lock before retrying.");
    throw error;
  }
  const destination = path.join(workspace, "Capstone - AI");
  let archivedDirectory = null;
  try {
    // Validate the current release before building; never follow an output link.
    const hasPrevious = await checkMoveTarget(destination, false);
    const built = await createOcelotPackage({ root, outputRoot: staging, transport });
    await checkMoveTarget(built.destination, true);
    // Guides and checksums stay with development records, outside the upload.
    const recordDirectory = path.join(records, path.basename(built.destination));
    if (await checkMoveTarget(recordDirectory, false)) throw new Error("Release record already exists; refusing to overwrite it.");
    await fs.rename(built.destination, recordDirectory);
    const stagedApp = path.join(recordDirectory, "Capstone - AI");
    await checkMoveTarget(stagedApp, true);
    if (hasPrevious) {
      const archive = await fs.mkdtemp(path.join(archives, new Date().toISOString().replace(/[:.]/g, "-") + "-"));
      archivedDirectory = path.join(archive, "release");
      await checkMoveTarget(destination, true);
      await checkMoveTarget(archivedDirectory, false);
      await fs.rename(destination, archivedDirectory);
    }
    try {
      if (await checkMoveTarget(destination, false)) throw new Error("Upload destination changed during packaging; refusing to overwrite it.");
      await fs.rename(stagedApp, destination);
    } catch (error) {
      if (archivedDirectory && !(await checkMoveTarget(destination, false))) {
        await checkMoveTarget(archivedDirectory, true);
        await fs.rename(archivedDirectory, destination);
      }
      throw error;
    }
    return { ...built, destination, uploadDirectory: destination, archivedDirectory, recordDirectory };
  } finally {
    // Remove only our empty build lock, never a release tree.
    await fs.rmdir(lock);
  }
}
if (require.main === module) prepareOcelotUpload({ transport: process.argv.includes("--supabase") ? "supabase" : process.argv.includes("--php") ? "php" : "browser" }).then(result => {
  console.log("Upload this ONE folder into public_html: " + result.uploadDirectory);
  console.log("Instructions and checksum record (do not upload): " + result.recordDirectory);
  if (result.archivedDirectory) console.log("Previous upload preserved: " + result.archivedDirectory);
  console.log(result.transport === "supabase" ? "Supabase shared mode: complete SQL/Auth setup and verify ticket saving before uploading. This build is not proof of a working backend."
    : result.transport === "browser" ? "Browser-only demo: no PHP/SSH setup. Tickets stay in each browser; they are NOT shared. Fictional test data only." : "PHP shared mode: private-write permissions must be verified on Ocelot. Fictional test data only.");
}).catch(error => { console.error(error.message); process.exitCode = 1; });
module.exports = { createOcelotPackage, prepareOcelotUpload };
