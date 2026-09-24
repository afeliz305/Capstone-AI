const fs = require("node:fs/promises");
const path = require("node:path");
const { createHash } = require("node:crypto");
const publicFiles = require("../server/lib/public-files");

const privateFiles = [
  ...publicFiles, "package.json", "package-lock.json", "data/capstone-knowledge.json",
  "server/server.js", "server/config.json", "server/lib/attachments.js", "server/lib/hosting.js",
  "server/lib/keyword-links.js", "server/lib/public-files.js", "server/lib/sample-tickets.js",
  "server/lib/search.js", "server/lib/session.js", "server/lib/staff-auth.js", "server/lib/ticket-work.js",
  "scripts/set-staff-password.js", "scripts/seed-tickets.js", "docs/HOSTING.md", "docs/licenses/Mulish-OFL.txt"
];

async function createUploadPackage({ root = path.resolve(__dirname, ".."), outputRoot = path.join(root, "dist", "node") } = {}) {
  root = await fs.realpath(root);
  await fs.mkdir(outputRoot, { recursive: true });
  // Every run gets a fresh folder. Never merge over an older upload or copy the
  // repository recursively; runtime data and secrets are not in these lists.
  const destination = await fs.mkdtemp(path.join(outputRoot, "capstone-hosting-"));
  const manifest = [];
  async function copy(file, area) {
    const source = await fs.realpath(path.join(root, file));
    const relative = path.relative(root, source);
    if (relative.startsWith(".." + path.sep) || path.isAbsolute(relative)) throw new Error("Package source escaped the project.");
    const bytes = await fs.readFile(source);
    const target = path.join(destination, area, file);
    await fs.mkdir(path.dirname(target), { recursive: true });
    await fs.writeFile(target, bytes, { flag: "wx" });
    manifest.push({ file: area + "/" + file, bytes: bytes.length, sha256: createHash("sha256").update(bytes).digest("hex") });
  }
  for (const file of [...publicFiles, ".htaccess"]) await copy(file, "public");
  for (const file of privateFiles) await copy(file, "private-app");
  await fs.copyFile(path.join(root, "docs/HOSTING.md"), path.join(destination, "READ-BEFORE-UPLOADING.md"));
  await fs.writeFile(path.join(destination, "manifest.json"), JSON.stringify(manifest, null, 2) + "\n", { flag: "wx" });
  return { destination, publicDirectory: path.join(destination, "public"), privateDirectory: path.join(destination, "private-app"), manifest };
}

if (require.main === module) {
  createUploadPackage().then(result => {
    console.log("Hosting package: " + result.destination);
    console.log("Public files only: " + result.publicDirectory);
    console.log("Keep outside public_html: " + result.privateDirectory);
    console.log("A running Node backend and HTTPS proxy are still required for hosted login and tickets. Read READ-BEFORE-UPLOADING.md first.");
  }).catch(error => { console.error(error.message); process.exitCode = 1; });
}
module.exports = { createUploadPackage, privateFiles };
