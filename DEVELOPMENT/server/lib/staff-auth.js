const fs = require("node:fs/promises");
const path = require("node:path");
const { randomBytes, scrypt: scryptCallback, timingSafeEqual, createHash } = require("node:crypto");
const { promisify } = require("node:util");
const scrypt = promisify(scryptCallback);

const STAFF = Object.freeze([
  { name: "Zavier Richardson", email: "zrich010@fiu.edu" },
  { name: "Christopher Hernandez", email: "chern563@fiu.edu" },
  { name: "Michael Alvarez", email: "malva517@fiu.edu" },
  { name: "Romelin Charnel", email: "rchar044@fiu.edu" },
  { name: "Anthony Feliz", email: "afeli016@fiu.edu" }
].map(Object.freeze));
const credentialsFile = process.env.CAPSTONE_STAFF_CREDENTIALS_FILE
  ? path.resolve(process.env.CAPSTONE_STAFF_CREDENTIALS_FILE)
  : path.join(__dirname, "../../data/staff-credentials.json");
const COOKIE = "capstone_staff_session";
const SESSION_MS = 60 * 60 * 1000;
const LOGIN_WINDOW_MS = 15 * 60 * 1000;
const normalizeEmail = (email) => typeof email === "string" ? email.trim().toLowerCase() : "";
const memberFor = (email) => STAFF.find((member) => member.email === normalizeEmail(email));
const fail = (message, statusCode) => Object.assign(new Error(message), { statusCode });

function isLocalTestRequest(request) {
  if (process.env.NODE_ENV === "production" || request.capstoneHosted) return false;
  const address = request.socket.remoteAddress;
  if (!["127.0.0.1", "::1", "::ffff:127.0.0.1"].includes(address)) return false;
  try {
    const hostname = new URL(`http://${request.headers.host || ""}`).hostname;
    return ["localhost", "127.0.0.1", "[::1]"].includes(hostname);
  } catch { return false; }
}

async function readCredentials(file) {
  try {
    const data = JSON.parse(await fs.readFile(file, "utf8"));
    if (data.version !== 1 || !data.accounts || typeof data.accounts !== "object" || Array.isArray(data.accounts)) throw new Error();
    return data.accounts;
  } catch (error) {
    if (error.code === "ENOENT") return {};
    throw fail("Staff sign-in is temporarily unavailable. Contact the project owner.", 503);
  }
}

async function setStaffPassword(email, password, { file = credentialsFile, localTestOnly = false } = {}) {
  const member = memberFor(email);
  if (!member) throw new Error("That email is not on the staff list.");
  localTestOnly = localTestOnly === true;
  if (localTestOnly && process.env.NODE_ENV === "production") throw new Error("Local test passwords are disabled in production.");
  const minimum = localTestOnly ? 8 : 12;
  if (typeof password !== "string" || password.length < minimum || password.length > 128) {
    throw new Error(`Use a separate prototype password of ${minimum} to 128 characters.`);
  }
  const accounts = await readCredentials(file);
  const salt = randomBytes(16).toString("hex");
  const hash = (await scrypt(password, salt, 64)).toString("hex");
  accounts[member.email] = { salt, hash, changedAt: new Date().toISOString(), ...(localTestOnly ? { localTestOnly: true } : {}) };
  await fs.mkdir(path.dirname(file), { recursive: true, mode: 0o700 });
  await fs.writeFile(`${file}.tmp`, JSON.stringify({ version: 1, accounts }, null, 2), { mode: 0o600 });
  await fs.rename(`${file}.tmp`, file);
  return member;
}

function createStaffAuth({ file = credentialsFile, now = Date.now, sessionMs = SESSION_MS, mode = "password" } = {}) {
  if (!["password", "email-demo"].includes(mode)) throw new Error("Staff login mode must be password or email-demo.");
  const sessions = new Map();
  const attempts = new Map();
  const tokenFor = (request) => String(request.headers.cookie || "").split(";").map((part) => part.trim())
    .find((part) => part.startsWith(`${COOKIE}=`))?.slice(COOKIE.length + 1);
  const versionFor = (record) => createHash("sha256").update(`${record.salt}:${record.hash}:${record.localTestOnly === true}`).digest("hex");
  const validRecord = (record) => record && /^[0-9a-f]{32}$/.test(record.salt) && /^[0-9a-f]{128}$/.test(record.hash);
  function setCookie(request, response, token, maxAge) {
    response.setHeader("Set-Cookie", `${COOKIE}=${token}; HttpOnly; SameSite=Strict; Path=${request.capstoneCookiePath || "/api"}; Max-Age=${maxAge}${request.capstoneSecure || request.socket.encrypted ? "; Secure" : ""}`);
  }
  function logout(request, response) {
    sessions.delete(tokenFor(request));
    setCookie(request, response, "", 0);
  }
  async function login(request, response, input) {
    logout(request, response);
    const instant = now();
    for (const [key, entry] of attempts) if (entry.until <= instant) attempts.delete(key);
    for (const [key, entry] of sessions) if (entry.expiresAt <= instant) sessions.delete(key);
    const address = request.socket.remoteAddress || "unknown";
    const attempt = attempts.get(address) || { count: 0, until: instant + LOGIN_WINDOW_MS };
    if (attempt.count >= 10 || attempts.size >= 1000) throw fail("Too many sign-in attempts. Try again in 15 minutes.", 429);
    attempt.count++;
    attempts.set(address, attempt);
    const member = memberFor(input.email);
    let version = "email-demo";
    if (mode === "email-demo") {
      // Explicit server configuration only. This selects a demo identity; it
      // does not verify email ownership. Never enable from request input.
      if (!member) throw fail("Unauthorized access. This email is not on the approved staff list.", 401);
    } else {
      const accounts = await readCredentials(file);
      const record = member && accounts[member.email];
      const localTestOnly = record?.localTestOnly === true;
      const usable = validRecord(record) && (!localTestOnly || isLocalTestRequest(request));
      const password = typeof input.password === "string" && input.password.length <= 128 ? input.password : "";
      const actual = await scrypt(password, usable ? record.salt : "0".repeat(32), 64);
      const expected = usable ? Buffer.from(record.hash, "hex") : Buffer.alloc(64);
      if (!timingSafeEqual(actual, expected) || !usable || password.length < (localTestOnly ? 8 : 12)) {
        throw fail("Unauthorized access. The email or password is not authorized for the staff queue.", 401);
      }
      version = versionFor(record);
    }
    if (sessions.size >= 100) throw fail("Too many staff sessions. Please try again later.", 429);
    attempts.delete(address);
    const token = randomBytes(32).toString("hex");
    const expiresAt = instant + sessionMs;
    sessions.set(token, { email: member.email, expiresAt, version });
    setCookie(request, response, token, Math.ceil(sessionMs / 1000));
    return { staff: member, expiresAt, members: STAFF, loginMode: mode };
  }
  async function current(request) {
    const token = tokenFor(request);
    const session = sessions.get(token);
    if (!session || session.expiresAt <= now() || !memberFor(session.email)) {
      sessions.delete(token);
      throw fail("Unauthorized access. Sign in to the staff queue.", 401);
    }
    if (mode === "password") {
      const record = (await readCredentials(file))[session.email];
      if (!validRecord(record) || versionFor(record) !== session.version || (record.localTestOnly === true && !isLocalTestRequest(request))) {
        sessions.delete(token);
        throw fail("Unauthorized access. Your staff session has ended. Sign in again.", 401);
      }
    }
    return { staff: memberFor(session.email), expiresAt: session.expiresAt, members: STAFF, loginMode: mode };
  }
  return { login, logout, current, mode };
}

module.exports = { STAFF, memberFor, normalizeEmail, credentialsFile, setStaffPassword, createStaffAuth };
