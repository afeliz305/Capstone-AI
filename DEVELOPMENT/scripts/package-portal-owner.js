const fs = require("node:fs/promises");
const path = require("node:path");
const { createHash } = require("node:crypto");
const { buildPortalNative } = require("./build-portal-native");

const PACKAGE_NAME = "Capstone-AI-Portal-Owner-Review";

function crc32(bytes) {
  let value = 0xffffffff;
  for (const byte of bytes) {
    value ^= byte;
    for (let bit = 0; bit < 8; bit++) value = (value >>> 1) ^ ((value & 1) ? 0xedb88320 : 0);
  }
  return (value ^ 0xffffffff) >>> 0;
}

function dosTimestamp(date) {
  const year = Math.max(1980, date.getFullYear());
  return {
    time:(date.getHours() << 11) | (date.getMinutes() << 5) | Math.floor(date.getSeconds() / 2),
    date:((year - 1980) << 9) | ((date.getMonth() + 1) << 5) | date.getDate()
  };
}

function makeZip(entries, modified = new Date()) {
  const local = [], central = [];
  const stamp = dosTimestamp(modified);
  let offset = 0;
  for (const entry of entries) {
    const name = Buffer.from(entry.name.replaceAll("\\", "/"), "utf8");
    const bytes = entry.bytes;
    const checksum = crc32(bytes);
    const header = Buffer.alloc(30);
    header.writeUInt32LE(0x04034b50, 0);
    header.writeUInt16LE(20, 4);
    header.writeUInt16LE(0x0800, 6);
    header.writeUInt16LE(0, 8);
    header.writeUInt16LE(stamp.time, 10);
    header.writeUInt16LE(stamp.date, 12);
    header.writeUInt32LE(checksum, 14);
    header.writeUInt32LE(bytes.length, 18);
    header.writeUInt32LE(bytes.length, 22);
    header.writeUInt16LE(name.length, 26);
    header.writeUInt16LE(0, 28);
    local.push(header, name, bytes);

    const directory = Buffer.alloc(46);
    directory.writeUInt32LE(0x02014b50, 0);
    directory.writeUInt16LE(20, 4);
    directory.writeUInt16LE(20, 6);
    directory.writeUInt16LE(0x0800, 8);
    directory.writeUInt16LE(0, 10);
    directory.writeUInt16LE(stamp.time, 12);
    directory.writeUInt16LE(stamp.date, 14);
    directory.writeUInt32LE(checksum, 16);
    directory.writeUInt32LE(bytes.length, 20);
    directory.writeUInt32LE(bytes.length, 24);
    directory.writeUInt16LE(name.length, 28);
    directory.writeUInt16LE(0, 30);
    directory.writeUInt16LE(0, 32);
    directory.writeUInt16LE(0, 34);
    directory.writeUInt16LE(0, 36);
    directory.writeUInt32LE(0, 38);
    directory.writeUInt32LE(offset, 42);
    central.push(directory, name);
    offset += header.length + name.length + bytes.length;
  }
  const centralBytes = Buffer.concat(central);
  const end = Buffer.alloc(22);
  end.writeUInt32LE(0x06054b50, 0);
  end.writeUInt16LE(0, 4);
  end.writeUInt16LE(0, 6);
  end.writeUInt16LE(entries.length, 8);
  end.writeUInt16LE(entries.length, 10);
  end.writeUInt32LE(centralBytes.length, 12);
  end.writeUInt32LE(offset, 16);
  end.writeUInt16LE(0, 20);
  return Buffer.concat([...local, centralBytes, end]);
}

async function packagePortalOwner({ root = path.resolve(__dirname, ".."), outputRoot = path.join(root, "dist", "portal-owner-releases"), now = new Date() } = {}) {
  root = await fs.realpath(root);
  await fs.mkdir(outputRoot, { recursive:true });
  const releaseId = now.toISOString().replace(/[-:]/g, "").replace(/\.\d{3}Z$/, "Z");
  const releaseDirectory = path.join(outputRoot, releaseId);
  const packageDirectory = path.join(releaseDirectory, PACKAGE_NAME);
  await fs.mkdir(releaseDirectory, { recursive:false });
  await fs.mkdir(packageDirectory, { recursive:false });
  await buildPortalNative({ root, output:path.join(packageDirectory, "assets") });

  const copies = [
    ["docs/PORTAL_OWNER_HANDOFF.md", "README.md"],
    ["portal-native/host-adapter.js", "portal-native/host-adapter.js"],
    ["portal-native/navigation-continuation.js", "portal-native/navigation-continuation.js"],
    ["portal-native/examples/synthetic-host-adapter.js", "portal-native/examples/synthetic-host-adapter.js"],
    ["portal-native/owner-contract.test.js", "portal-native/owner-contract.test.js"],
    ["js/shared/portal-navigation.js", "js/shared/portal-navigation.js"]
  ];
  for (const [source, destination] of copies) {
    const target = path.join(packageDirectory, destination);
    await fs.mkdir(path.dirname(target), { recursive:true });
    await fs.copyFile(path.join(root, source), target);
  }

  const testing = [
    "# Review-package tests",
    "",
    "Run from this extracted folder with Node 22 or newer:",
    "",
    "```powershell",
    "node --test portal-native/owner-contract.test.js",
    "```",
    "",
    "These tests use fictional records only. They validate the six-hook adapter shape and the allowlisted navigation/login-continuation contract. They do not prove that the professor's portal has connected its real session, data, or router hooks.",
    ""
  ].join("\n");
  await fs.writeFile(path.join(packageDirectory, "TESTING.md"), testing, { flag:"wx" });

  const files = [];
  async function collect(directory, prefix="") {
    for (const item of await fs.readdir(directory, { withFileTypes:true })) {
      const relative = prefix ? prefix + "/" + item.name : item.name;
      const absolute = path.join(directory, item.name);
      if (item.isDirectory()) await collect(absolute, relative);
      else if (item.isFile()) files.push({ name:relative, bytes:await fs.readFile(absolute) });
      else throw new Error("Review package cannot contain links or special files: " + relative);
    }
  }
  await collect(packageDirectory);
  for (const file of files) {
    const text = file.name.endsWith(".js") || file.name.endsWith(".md") || file.name.endsWith(".css") ? file.bytes.toString("utf8") : "";
    if (/sb_secret_|service_role|-----BEGIN (?:RSA |EC |OPENSSH )?PRIVATE KEY-----/i.test(text)) throw new Error("Potential secret in owner package: " + file.name);
  }
  const manifest = files.map(file => ({ file:file.name, bytes:file.bytes.length, sha256:createHash("sha256").update(file.bytes).digest("hex") })).sort((a,b)=>a.file.localeCompare(b.file));
  const manifestBytes = Buffer.from(JSON.stringify({ package:PACKAGE_NAME, createdAt:now.toISOString(), files:manifest }, null, 2) + "\n");
  await fs.writeFile(path.join(packageDirectory, "manifest.json"), manifestBytes, { flag:"wx" });
  const sums = [...manifest, { file:"manifest.json", bytes:manifestBytes.length, sha256:createHash("sha256").update(manifestBytes).digest("hex") }]
    .sort((a,b)=>a.file.localeCompare(b.file)).map(item => item.sha256 + "  " + item.file).join("\n") + "\n";
  await fs.writeFile(path.join(packageDirectory, "SHA256SUMS.txt"), sums, { flag:"wx" });

  const archiveEntries = [];
  await collectArchive(packageDirectory, PACKAGE_NAME, archiveEntries);
  const archive = path.join(releaseDirectory, PACKAGE_NAME + ".zip");
  const archiveBytes = makeZip(archiveEntries, now);
  await fs.writeFile(archive, archiveBytes, { flag:"wx" });
  return { releaseDirectory, packageDirectory, archive, archiveSha256:createHash("sha256").update(archiveBytes).digest("hex"), manifest:[...manifest, { file:"manifest.json" }, { file:"SHA256SUMS.txt" }] };
}

async function collectArchive(directory, prefix, entries) {
  for (const item of await fs.readdir(directory, { withFileTypes:true })) {
    const absolute = path.join(directory, item.name);
    const name = prefix + "/" + item.name;
    if (item.isDirectory()) await collectArchive(absolute, name, entries);
    else if (item.isFile()) entries.push({ name, bytes:await fs.readFile(absolute) });
    else throw new Error("Review archive cannot contain links or special files: " + name);
  }
}

if (require.main === module) packagePortalOwner().then(result => {
  console.log("Portal-owner review folder: " + result.packageDirectory);
  console.log("Portal-owner review archive: " + result.archive);
  console.log("Archive SHA-256: " + result.archiveSha256);
  console.log("Pending: the portal owner must connect the real session, data, router, and email-code continuation hooks.");
}).catch(error => { console.error(error.message); process.exitCode=1; });

module.exports = { PACKAGE_NAME, makeZip, packagePortalOwner };
