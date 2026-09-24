const { randomBytes, createHmac } = require("node:crypto");

const DEMO_ACCOUNT = Object.freeze({
  id: "sample-student",
  name: "Demo Student",
  email: "demo.student@example.edu"
});
const COOKIE_NAME = "capstone_demo_session";
const SESSION_MS = 60 * 60 * 1000;

function sessionError(message, statusCode) {
  return Object.assign(new Error(message), { statusCode });
}

function accountFields(value) {
  // Only an adapter on the server supplies this value, never request JSON.
  const account = {};
  for (const [key, limit] of [["id", 200], ["name", 120], ["email", 254]]) {
    if (typeof value[key] !== "string" || !value[key].trim() || value[key].length > limit) {
      throw sessionError("Account details are unavailable. Please try again.", 503);
    }
    account[key] = value[key].trim();
  }
  account.email = account.email.toLowerCase();
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(account.email)) {
    throw sessionError("Account email is unavailable. Please try again.", 503);
  }
  return account;
}

function createSessionService({ resolveAccount = null, enableDemo = false } = {}) {
  if (resolveAccount !== null && typeof resolveAccount !== "function") {
    throw new Error("The session adapter must export an async function.");
  }
  const demoSessions = new Map();
  const contextKey = randomBytes(32);

  function demoAllowed(request) {
    // The sample session must never substitute for a connected portal login.
    if (!enableDemo || resolveAccount || process.env.NODE_ENV === "production" || request.capstoneHosted) return false;
    const loopback = ["127.0.0.1", "::1", "::ffff:127.0.0.1"];
    if (!loopback.includes(request.socket.remoteAddress)) return false;
    const host = new URL(`http://${request.headers.host}`).hostname;
    return ["localhost", "127.0.0.1", "[::1]"].includes(host);
  }

  function cookieToken(request) {
    return String(request.headers.cookie || "").split(";").map((part) => part.trim())
      .find((part) => part.startsWith(`${COOKIE_NAME}=`))?.slice(COOKIE_NAME.length + 1);
  }

  async function current(request) {
    let account = null;
    let status = resolveAccount ? "sign-in-required" : "guest";
    if (resolveAccount) {
      try {
        const resolved = await resolveAccount(request);
        if (resolved !== null) {
          account = accountFields(resolved);
          status = "signed-in";
        }
      } catch {
        // An adapter failure must not silently downgrade to editable identity.
        throw sessionError("We could not check your account. Please try again.", 503);
      }
    } else if (demoAllowed(request)) {
      const token = cookieToken(request);
      const expires = demoSessions.get(token);
      if (expires > Date.now()) {
        account = { ...DEMO_ACCOUNT };
        status = "demo";
      } else if (token) {
        demoSessions.delete(token);
      }
    }
    // This token detects a different account between opening and submitting.
    // It is not a login credential; every submission resolves the session again.
    const identityContext = createHmac("sha256", contextKey)
      .update(JSON.stringify({ status, account })).digest("hex");
    return { status, account, identityContext, demoAvailable: demoAllowed(request) };
  }

  function changeDemo(request, response, action) {
    if (!demoAllowed(request)) throw sessionError("Sample account is unavailable.", 404);
    const previous = cookieToken(request);
    if (action === "end") {
      demoSessions.delete(previous);
      response.setHeader("Set-Cookie", `${COOKIE_NAME}=; HttpOnly; SameSite=Strict; Path=${request.capstoneCookiePath || "/api"}; Max-Age=0${request.capstoneSecure ? "; Secure" : ""}`);
      return;
    }
    if (action !== "start") throw sessionError("Unknown sample account action.", 400);
    for (const [token, expires] of demoSessions) {
      if (expires <= Date.now()) demoSessions.delete(token);
    }
    if (demoSessions.size >= 100) throw sessionError("Too many sample sessions. Try again later.", 429);
    demoSessions.delete(previous);
    const token = randomBytes(32).toString("hex");
    demoSessions.set(token, Date.now() + SESSION_MS);
    response.setHeader("Set-Cookie", `${COOKIE_NAME}=${token}; HttpOnly; SameSite=Strict; Path=${request.capstoneCookiePath || "/api"}; Max-Age=3600${request.capstoneSecure ? "; Secure" : ""}`);
  }

  async function forTicket(request, input) {
    const session = await current(request);
    if (session.status === "sign-in-required") {
      throw sessionError("Please sign in to the Capstone portal before submitting.", 401);
    }
    if (input.identityContext !== session.identityContext) {
      throw sessionError("Your account changed or expired. Review the refreshed details and submit again.", 409);
    }
    return session;
  }

  return { current, changeDemo, forTicket };
}

module.exports = { createSessionService };
