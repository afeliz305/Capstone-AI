const http = require("http");
const fs = require("fs/promises");
const path = require("path");
const { searchKnowledge } = require("./lib/search");
const { createSessionService } = require("./lib/session");

const root = __dirname;
const publicDirectory = path.join(root, "public");
const knowledgeFile = path.join(root, "data", "capstone-knowledge.json");
const ticketFile = process.env.CAPSTONE_DATA_FILE
  ? path.resolve(process.env.CAPSTONE_DATA_FILE)
  : path.join(root, "data", "tickets.json");
const port = Number(process.env.PORT) || 3000;
const allowedStatuses = new Set(["open", "in-review", "resolved"]);
let mutationQueue = Promise.resolve();

const mimeTypes = {
  ".css": "text/css; charset=utf-8",
  ".html": "text/html; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".svg": "image/svg+xml",
  ".woff2": "font/woff2"
};

function cleanText(value, maxLength = 4000) {
  return String(value || "").trim().slice(0, maxLength);
}

function sendJson(response, status, value) {
  response.writeHead(status, {
    "Content-Type": "application/json; charset=utf-8",
    "Cache-Control": "no-store",
    "X-Content-Type-Options": "nosniff"
  });
  response.end(JSON.stringify(value));
}

function requestError(message, statusCode = 400) {
  const error = new Error(message);
  error.statusCode = statusCode;
  return error;
}

async function readJson(request) {
  let body = "";
  for await (const chunk of request) {
    body += chunk;
    if (Buffer.byteLength(body) > 128 * 1024) {
      throw requestError("Request is too large.", 413);
    }
  }
  try {
    const parsed = JSON.parse(body || "{}");
    if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) throw new Error();
    return parsed;
  } catch {
    throw requestError("Request body must be valid JSON.");
  }
}

async function readKnowledge() {
  const entries = JSON.parse(await fs.readFile(knowledgeFile, "utf8"));
  return Array.isArray(entries) ? entries : [];
}

async function readTickets() {
  try {
    const tickets = JSON.parse(await fs.readFile(ticketFile, "utf8"));
    return Array.isArray(tickets) ? tickets : [];
  } catch (error) {
    if (error.code !== "ENOENT") throw error;
    return [];
  }
}

async function writeTickets(tickets) {
  await fs.mkdir(path.dirname(ticketFile), { recursive: true });
  const temporaryFile = `${ticketFile}.tmp`;
  await fs.writeFile(temporaryFile, JSON.stringify(tickets, null, 2), "utf8");
  await fs.rename(temporaryFile, ticketFile);
}

function mutateTickets(change) {
  const operation = mutationQueue.then(async () => {
    const tickets = await readTickets();
    const result = await change(tickets);
    await writeTickets(tickets);
    return result;
  });
  mutationQueue = operation.catch(() => {});
  return operation;
}

function nextTicketId(tickets) {
  const highest = tickets.reduce((max, ticket) => {
    const value = Number(String(ticket.id || "").replace("CAP-", ""));
    return Number.isFinite(value) ? Math.max(max, value) : max;
  }, 1000);
  return `CAP-${highest + 1}`;
}

function normalizeNewTicket(input, tickets, session = null) {
  const account = session?.account;
  const name = cleanText(account ? account.name : input.name, 120);
  const email = cleanText(account ? account.email : input.email, 254).toLowerCase();
  const category = cleanText(input.category, 80) || "Other";
  const question = cleanText(input.question, 500);
  const details = cleanText(input.details, 3000);
  const transcript = input.includeTranscript ? cleanText(input.transcript, 5000) : "";
  if (!name || !email || !question || !details) {
    throw requestError("Name, email, question, and requested help are required.");
  }
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    throw requestError("Enter a valid email address.");
  }

  return {
    id: nextTicketId(tickets),
    name,
    email,
    accountId: account?.id || null,
    identitySource: account ? (session.status === "demo" ? "demo-session" : "portal-session") : "manual",
    category,
    question,
    details,
    transcript,
    privateToInstructor: Boolean(input.privateToInstructor),
    status: "open",
    source: "Capstone AI Chat prototype",
    createdAt: new Date().toISOString()
  };
}

async function handleApi(request, response, url, sessions) {
  if (request.method === "GET" && url.pathname === "/api/session") {
    return sendJson(response, 200, await sessions.current(request));
  }

  if (request.method === "POST" && url.pathname === "/api/demo-session") {
    const input = await readJson(request);
    sessions.changeDemo(request, response, input.action);
    return sendJson(response, 200, { ok: true });
  }
  if (request.method === "GET" && url.pathname === "/api/health") {
    return sendJson(response, 200, { status: "ok", mode: "zero-token" });
  }

  if (request.method === "GET" && url.pathname === "/api/search") {
    const question = cleanText(url.searchParams.get("q"), 500);
    if (!question) return sendJson(response, 400, { error: "A question is required." });
    const result = searchKnowledge(await readKnowledge(), question);
    return sendJson(response, 200, { question, ...result });
  }

  if (request.method === "GET" && url.pathname === "/api/tickets") {
    return sendJson(response, 200, await readTickets());
  }

  if (request.method === "POST" && url.pathname === "/api/tickets") {
    const input = await readJson(request);
    const session = await sessions.forTicket(request, input);
    const ticket = await mutateTickets(async (tickets) => {
      const created = normalizeNewTicket(input, tickets, session);
      tickets.unshift(created);
      return created;
    });
    return sendJson(response, 201, ticket);
  }

  const ticketMatch = url.pathname.match(/^\/api\/tickets\/(CAP-\d+)$/);
  if (request.method === "PATCH" && ticketMatch) {
    const input = await readJson(request);
    if (!allowedStatuses.has(input.status)) {
      return sendJson(response, 400, { error: "Invalid ticket status." });
    }
    const updated = await mutateTickets(async (tickets) => {
      const ticket = tickets.find((item) => item.id === ticketMatch[1]);
      if (!ticket) return null;
      ticket.status = input.status;
      ticket.updatedAt = new Date().toISOString();
      return ticket;
    });
    return sendJson(response, updated ? 200 : 404, updated || { error: "Ticket not found." });
  }

  return sendJson(response, 404, { error: "API endpoint not found." });
}

async function serveStatic(response, pathname) {
  const requestedPath = pathname === "/" ? "/index.html" : pathname;
  const filePath = path.resolve(publicDirectory, `.${requestedPath}`);
  if (!filePath.startsWith(`${publicDirectory}${path.sep}`)) {
    response.writeHead(403);
    response.end("Forbidden");
    return;
  }

  try {
    const content = await fs.readFile(filePath);
    response.writeHead(200, {
      "Content-Type": mimeTypes[path.extname(filePath)] || "application/octet-stream",
      "Cache-Control": "no-store",
      "X-Content-Type-Options": "nosniff",
      "Content-Security-Policy": "default-src 'self'; style-src 'self'; script-src 'self'; connect-src 'self'; img-src 'self' data:; base-uri 'none'; frame-ancestors 'none'; form-action 'self'"
    });
    response.end(content);
  } catch (error) {
    if (error.code !== "ENOENT") throw error;
    response.writeHead(404, { "Content-Type": "text/plain; charset=utf-8" });
    response.end("Not found");
  }
}

function createServer({ sessions = createSessionService() } = {}) {
  return http.createServer(async (request, response) => {
    try {
      const url = new URL(request.url, `http://${request.headers.host || "localhost"}`);
      if (url.pathname.startsWith("/api/")) {
        if (["POST", "PATCH", "DELETE"].includes(request.method)) {
          if (request.headers["sec-fetch-site"] === "cross-site" ||
              (request.headers.origin && request.headers.origin !== url.origin)) {
            throw requestError("Submit this request from the assistant page.", 403);
          }
          if (request.headers["content-type"]?.split(";")[0].trim() !== "application/json") {
            throw requestError("Request body must use application/json.", 415);
          }
        }
        return await handleApi(request, response, url, sessions);
      }
      if (request.method !== "GET") return sendJson(response, 405, { error: "Method not allowed." });
      await serveStatic(response, url.pathname);
    } catch (error) {
      const status = error.statusCode || 500;
      if (status >= 500) console.error(error);
      sendJson(response, status, { error: error.message || "Server error." });
    }
  });
}

const server = createServer();

if (require.main === module) {
  const resolveAccount = process.env.CAPSTONE_SESSION_ADAPTER
    ? require(path.resolve(process.env.CAPSTONE_SESSION_ADAPTER))
    : null;
  const app = createServer({ sessions: createSessionService({ resolveAccount, enableDemo: true }) });
  app.listen(port, "127.0.0.1", () => {
    console.log(`Capstone AI Chat is running at http://localhost:${port}`);
  });
}

module.exports = { cleanText, normalizeNewTicket, createServer, server };
