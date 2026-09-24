const fs = require("node:fs");
const path = require("node:path");
const { spawnSync } = require("node:child_process");
const { createInterface } = require("node:readline/promises");

const host = "ocelot.aul.fiu.edu";
const defaultAccount = "afeli016";
const supportMessage = "If private storage still fails, ask request@cs.fiu.edu to check the PHP web-process identity, access restrictions, and private-folder ownership. Do not use 777 or move tickets into public_html.";

function validateAccount(account) {
  if (!/^[a-z][a-z0-9_]{0,31}$/.test(account)) {
    throw new Error("Enter only your Ocelot username (for example afeli016), not an email, SSH command, or path.");
  }
  return account;
}

function healthUrl(account) {
  return `https://${host}/~${validateAccount(account)}/Capstone%20-%20AI/api/index.php?route=%2Fhealth`;
}

async function checkHealth(account, fetchImpl = fetch) {
  const url = healthUrl(account);
  try {
    const response = await fetchImpl(url, { signal: AbortSignal.timeout(15000), redirect: "error", headers: { Accept: "application/json" } });
    const type = response.headers.get("content-type") || "";
    if (!type.includes("application/json")) {
      return { ok: false, reason: "routing", message: `HTTP ${response.status}: expected JSON, not an HTML page/download. Check the uploaded folder and PHP configuration.` };
    }
    const body = await response.json();
    if (response.ok && body?.status === "ok" && body.backend === "php" && body.storage === "private-files") {
      return { ok: true, reason: "healthy", message: "PASS: PHP and private ticket storage are responding. No SSH setup is needed for this upload." };
    }
    if (response.status === 503 && typeof body?.error === "string" && /private (ticket )?storage/i.test(body.error)) {
      return { ok: false, reason: "storage", message: "PHP is running, but private ticket storage is unavailable. One-time host setup is still needed." };
    }
    return { ok: false, reason: "backend", message: `HTTP ${response.status}: the backend has not passed its health check. See the upload guide.` };
  } catch (error) {
    return { ok: false, reason: "connection", message: "Could not read valid health JSON. Check connectivity, the upload URL, and the upload guide; no SSH changes were attempted." };
  }
}

function sshArguments(account) {
  validateAccount(account);
  // Base64 avoids multiline quoting differences in Ocelot's login shell.
  // The payload is the local reviewed script, never a password or user input.
  const script = fs.readFileSync(path.join(__dirname, "ocelot-private-setup.sh"), "utf8").replace(/\r\n/g, "\n");
  const payload = Buffer.from(script).toString("base64");
  return ["-o", "ConnectTimeout=15", "-o", "StrictHostKeyChecking=ask",
    "-o", "ServerAliveInterval=15", "-o", "ServerAliveCountMax=2",
    `${account}@${host}`, `printf %s '${payload}' | base64 -d | sh`];
}

async function run({ checkOnly = false, account = defaultAccount, ask, log = console.log, fetchImpl = fetch, spawn = spawnSync } = {}) {
  validateAccount(account);
  log(`Checking ${healthUrl(account)}`);
  log("This calls the app health endpoint; it may initialize an empty private store, but never resets existing tickets.");
  let result = await checkHealth(account, fetchImpl);
  log(result.message);
  if (result.ok) {
    log("Keep uploading to the same Capstone - AI folder. Leave .capstone-chat-private untouched. Verify shared tickets in two browsers before declaring the site ready.");
    return 0;
  }
  if (checkOnly || result.reason !== "storage") {
    if (result.reason === "storage") log("Run npm.cmd run ocelot:setup from DEVELOPMENT on Windows for guided preparation.");
    log(supportMessage);
    return 1;
  }
  log("One-time preparation: connect through SSH and create ONLY a missing .capstone-chat-private base folder beside public_html, with mode 700. Existing data, permissions, and website files are not changed.");
  log("The helper cannot fix a different PHP runtime user or hosting restrictions. It never saves your password; enter it only in SSH's prompt (typing is hidden). Verify any new host-key fingerprint with FIU before accepting it.");
  const answer = await ask("Connect and prepare that private folder? Type yes to continue (any capitalization), or press Enter to cancel: ");
  if (answer.trim().toLowerCase() !== "yes") {
    log("Cancelled. No SSH command was run.");
    return 1;
  }
  const child = spawn(process.platform === "win32" ? "ssh.exe" : "ssh", sshArguments(account), { stdio: "inherit", shell: false });
  if (child.error || child.status !== 0) {
    log(child.error?.code === "ENOENT" ? "SSH was not found. Enable the Windows OpenSSH Client, then retry." : "SSH preparation did not complete. Review the message above; the helper will not retry passwords or reset storage.");
    log(supportMessage);
    return 1;
  }
  result = await checkHealth(account, fetchImpl);
  log(result.message);
  if (!result.ok) log(supportMessage);
  else log("Storage check passed. Now test sign-in and confirm a fictional ticket is visible from a second browser. Future uploads need only the health check, not SSH setup.");
  return result.ok ? 0 : 1;
}

async function main() {
  const args = process.argv.slice(2);
  const checkOnly = args[0] === "--check";
  if (checkOnly) args.shift();
  if (args.length > 1) throw new Error("Usage: node scripts/ocelot-setup.js [--check] [ocelotUsername]");
  const account = validateAccount(args[0] || defaultAccount);
  return run({ checkOnly, account, ask: async question => {
    const input = createInterface({ input: process.stdin, output: process.stdout });
    try { return await input.question(question); }
    finally { input.close(); }
  } });
}

if (require.main === module) main().then(code => { process.exitCode = code; }).catch(error => {
  console.error(error.message);
  process.exitCode = 1;
});

module.exports = { validateAccount, healthUrl, checkHealth, sshArguments, run };
