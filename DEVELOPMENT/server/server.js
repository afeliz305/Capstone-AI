const http = require("http");
const fs = require("fs/promises");
const path = require("path");
const { searchKnowledge } = require("./lib/search");
const { createSessionService } = require("./lib/session");
const { prepareAttachments, createAttachmentStore } = require("./lib/attachments");
const { createStaffAuth, memberFor, normalizeEmail } = require("./lib/staff-auth");
const { TICKET_TOPICS, revisionOf, applyTicketWork, requesterView } = require("./lib/ticket-work");
const { normalizeContact } = require("../js/shared/contact-policy");
const { normalizeBasePath, normalizePublicOrigin } = require("./lib/hosting");

const root = path.resolve(__dirname, "..");
// The homepage lives at the repository root. Never serve that directory broadly:
// backend source, documentation, credentials, and local data must stay private.
const publicFiles = require("./lib/public-files");
const knowledgeFile = path.join(root, "data", "capstone-knowledge.json");
const ticketFile = process.env.CAPSTONE_DATA_FILE
  ? path.resolve(process.env.CAPSTONE_DATA_FILE)
  : path.join(root, "data", "tickets.json");
const port = Number(process.env.PORT) || 3000;
const allowedStatuses = new Set(["open", "in-review", "resolved"]);
const staffTicketTopics = new Set(TICKET_TOPICS);
const attachmentStore = createAttachmentStore(path.join(path.dirname(ticketFile), "attachments"));
let mutationQueue = Promise.resolve();

const mimeTypes = {
  ".css": "text/css; charset=utf-8",
  ".html": "text/html; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".svg": "image/svg+xml",
  ".png": "image/png",
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

async function readJson(request, limit = 128 * 1024) {
  const chunks = [];
  let size = 0;
  for await (const chunk of request) {
    size += chunk.length;
    if (size > limit) {
      throw requestError("Request is too large.", 413);
    }
    chunks.push(chunk);
  }
  try {
    const body = Buffer.concat(chunks).toString("utf8");
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
  await fs.mkdir(path.dirname(ticketFile), { recursive: true, mode: 0o700 });
  const temporaryFile = `${ticketFile}.tmp`;
  await fs.writeFile(temporaryFile, JSON.stringify(tickets, null, 2), { encoding: "utf8", mode: 0o600 });
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
  let contact;
  try { contact = normalizeContact(input, email); }
  catch (error) { throw requestError(error.message); }

  return {
    id: nextTicketId(tickets),
    name,
    email,
    contact,
    accountId: account?.id || null,
    identitySource: account ? (session.status === "demo" ? "demo-session" : "portal-session") : "manual",
    category,
    question,
    details,
    transcript,
    privateToInstructor: Boolean(input.privateToInstructor),
    status: "open",
    assignedTo: null,
    source: "Capstone - AI prototype",
    createdAt: new Date().toISOString()
  };
}

async function handleApi(request, response, url, sessions, staffAuth) {
  if (request.method === "POST" && url.pathname === "/api/staff/login") {
    return sendJson(response, 200, await staffAuth.login(request, response, await readJson(request)));
  }
  if (request.method === "GET" && url.pathname === "/api/staff/session") {
    try { return sendJson(response, 200, await staffAuth.current(request)); }
    catch (error) {
      if (error.statusCode !== 401) throw error;
      return sendJson(response, 401, { error: error.message, loginMode: staffAuth.mode });
    }
  }
  if (request.method === "POST" && url.pathname === "/api/staff/logout") {
    staffAuth.logout(request, response);
    return sendJson(response, 200, { ok: true });
  }
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
    await staffAuth.current(request);
    return sendJson(response, 200, await readTickets());
  }

  if (request.method === "POST" && url.pathname === "/api/staff/tickets") {
    const { staff } = await staffAuth.current(request);
    const input = await readJson(request, 14 * 1024 * 1024);
    if (input.projectOwnerTicket !== undefined && typeof input.projectOwnerTicket !== "boolean") throw requestError("Project-owner classification must be true or false.");
    if (!staffTicketTopics.has(input.category)) throw requestError("Choose a ticket topic from the list.");
    for (const [field, label, limit] of [["question", "Title", 500], ["details", "Details", 3000]]) {
      if (typeof input[field] !== "string" || !input[field].trim() || input[field].length > limit) {
        throw requestError(`${label} is required and must be no longer than ${limit} characters.`);
      }
    }
    const assignee = input.assignedTo == null ? null : normalizeEmail(input.assignedTo);
    if (assignee !== null && !memberFor(assignee)) throw requestError("Choose a staff member from the approved list.");
    const documents = prepareAttachments(input.attachments);
    let savedAttachments = [];
    let ticket;
    try {
      ticket = await mutateTickets(async (tickets) => {
        // Staff identity and audit fields always come from the validated session.
        const created = normalizeNewTicket({
          name: staff.name, email: staff.email, category: input.category,
          question: input.question, details: input.details,
          preferredContactMethod: input.preferredContactMethod, contactPhone: input.contactPhone
        }, tickets);
        savedAttachments = await attachmentStore.save(documents);
        Object.assign(created, {
          identitySource: staffAuth.mode === "email-demo" ? "staff-email-demo" : "staff-session", source: "Capstone staff queue",
          createdBy: staff.email, assignedTo: assignee, attachments: savedAttachments
        });
        if (assignee) Object.assign(created, { assignedBy: staff.email, assignedAt: created.createdAt });
        if (input.projectOwnerTicket === true) Object.assign(created, {
          projectOwnerTicket: true, projectOwnerMarkedBy: staff.email, projectOwnerMarkedAt: created.createdAt
        });
        tickets.unshift(created);
        return created;
      });
    } catch (error) {
      // Roll back this request's new files only; never remove existing documents.
      await attachmentStore.remove(savedAttachments.map(file => file.id));
      throw error;
    }
    return sendJson(response, 201, ticket);
  }

  if (request.method === "POST" && url.pathname === "/api/tickets") {
    // Both creation APIs allow base64 documents; other APIs keep the 128 KB limit.
    const input = await readJson(request, 14 * 1024 * 1024);
    const session = await sessions.forTicket(request, input);
    const documents = prepareAttachments(input.attachments);
    let savedAttachments = [];
    let ticket;
    try {
      ticket = await mutateTickets(async (tickets) => {
        const created = normalizeNewTicket(input, tickets, session);
        savedAttachments = await attachmentStore.save(documents);
        created.attachments = savedAttachments;
        tickets.unshift(created);
        return created;
      });
    } catch (error) {
      // Only remove newly saved files if this ticket could not be committed.
      await attachmentStore.remove(savedAttachments.map((file) => file.id));
      throw error;
    }
    return sendJson(response, 201, ticket);
  }

  const attachmentMatch = url.pathname.match(/^\/api\/tickets\/(CAP-\d+)\/attachments\/([0-9a-f-]{36})$/);
  if (request.method === "GET" && attachmentMatch) {
    await staffAuth.current(request);
    if (request.headers["sec-fetch-site"] === "cross-site") throw requestError("Download documents from the local staff queue.", 403);
    const ticket = (await readTickets()).find((item) => item.id === attachmentMatch[1]);
    const attachment = ticket?.attachments?.find((file) => file.id === attachmentMatch[2]);
    if (!attachment) return sendJson(response, 404, { error: "Attachment not found." });
    let bytes;
    try { bytes = await attachmentStore.read(attachment.id); }
    catch (error) {
      if (error.code === "ENOENT") return sendJson(response, 404, { error: "Attachment file is missing from local storage." });
      throw error;
    }
    const encodedName = encodeURIComponent(attachment.name).replace(/['()*]/g, (character) => `%${character.charCodeAt(0).toString(16)}`);
    response.writeHead(200, {
      "Content-Type": "application/octet-stream",
      "Content-Disposition": `attachment; filename="document.${path.extname(attachment.name).slice(1).toLowerCase()}"; filename*=UTF-8''${encodedName}`,
      "Content-Length": bytes.length,
      "Cache-Control": "no-store",
      "X-Content-Type-Options": "nosniff",
      "Content-Security-Policy": "sandbox; default-src 'none'",
      "Cross-Origin-Resource-Policy": "same-origin"
    });
    return response.end(bytes);
  }

  const ticketMatch = url.pathname.match(/^\/api\/tickets\/(CAP-\d+)$/);
  const workMatch = url.pathname.match(/^\/api\/tickets\/(CAP-\d+)\/work$/);
  const previewMatch = url.pathname.match(/^\/api\/tickets\/(CAP-\d+)\/requester-preview$/);
  if (request.method === "GET" && (ticketMatch || previewMatch)) {
    await staffAuth.current(request);
    const id = (ticketMatch || previewMatch)[1];
    const ticket = (await readTickets()).find(item => item.id === id);
    if (!ticket) return sendJson(response, 404, { error: "Ticket not found." });
    return sendJson(response, 200, previewMatch ? requesterView(ticket) : ticket);
  }
  if (request.method === "PATCH" && workMatch) {
    const { staff } = await staffAuth.current(request);
    const input = await readJson(request);
    const updated = await mutateTickets((tickets) => {
      const ticket = tickets.find(item => item.id === workMatch[1]);
      return ticket ? applyTicketWork(ticket, input, staff) : null;
    });
    return sendJson(response, updated ? 200 : 404, updated || { error: "Ticket not found." });
  }
  if (request.method === "PATCH" && ticketMatch) {
    const { staff } = await staffAuth.current(request);
    const input = await readJson(request);
    const changingStatus = Object.hasOwn(input, "status");
    const changingAssignee = Object.hasOwn(input, "assignedTo");
    if (!changingStatus && !changingAssignee) return sendJson(response, 400, { error: "Choose a status or staff assignment to update." });
    if (changingStatus && !allowedStatuses.has(input.status)) {
      return sendJson(response, 400, { error: "Invalid ticket status." });
    }
    const assignee = input.assignedTo === null ? null : normalizeEmail(input.assignedTo);
    if (changingAssignee && (assignee !== null && !memberFor(assignee))) return sendJson(response, 400, { error: "Choose a staff member from the approved list." });
    if (changingAssignee && !Object.hasOwn(input, "expectedAssignee")) return sendJson(response, 400, { error: "Refresh the ticket before changing its assignment." });
    const expectedAssignee = input.expectedAssignee === null ? null : normalizeEmail(input.expectedAssignee);
    const updated = await mutateTickets(async (tickets) => {
      const ticket = tickets.find((item) => item.id === ticketMatch[1]);
      if (!ticket) return null;
      if (changingAssignee) {
        if ((ticket.assignedTo || null) !== expectedAssignee) throw requestError("Another staff member changed this assignment. Refresh the queue and try again.", 409);
        ticket.assignedTo = assignee;
        ticket.assignedBy = staff.email;
        ticket.assignedAt = new Date().toISOString();
      }
      if (changingStatus) ticket.status = input.status;
      ticket.revision = revisionOf(ticket) + 1;
      ticket.updatedAt = new Date().toISOString();
      ticket.updatedBy = staff.email;
      return ticket;
    });
    return sendJson(response, updated ? 200 : 404, updated || { error: "Ticket not found." });
  }

  return sendJson(response, 404, { error: "API endpoint not found." });
}

async function serveStatic(response, pathname, basePath = "") {
  if (pathname === "/staff.html") {
    // Preserve existing bookmarks while using the new page/asset locations.
    response.writeHead(302, { Location: basePath + "/pages/staff.html", "Cache-Control": "no-store" });
    response.end();
    return;
  }
  const requestedPath = pathname === "/" ? "index.html" : pathname.slice(1);
  if (!publicFiles.has(requestedPath)) {
    response.writeHead(404, { "Content-Type": "text/plain; charset=utf-8", "X-Content-Type-Options": "nosniff" });
    response.end("Not found");
    return;
  }
  const filePath = path.join(root, requestedPath);

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

function createServer({ sessions = createSessionService(), staffAuth = createStaffAuth(), basePath = "", publicOrigin = null } = {}) {
  basePath = normalizeBasePath(basePath);
  publicOrigin = normalizePublicOrigin(publicOrigin);
  return http.createServer(async (request, response) => {
    try {
      const url = new URL(request.url, publicOrigin || `http://${request.headers.host || "localhost"}`);
      if (publicOrigin && url.origin !== publicOrigin) throw requestError("Invalid request origin.", 400);
      if (basePath && url.pathname === basePath) {
        response.writeHead(302, { Location: basePath + "/" + url.search, "Cache-Control": "no-store" });
        response.end();
        return;
      }
      if (basePath && !url.pathname.startsWith(basePath + "/")) return sendJson(response, 404, { error: "Not found." });
      request.capstoneCookiePath = basePath + "/api";
      request.capstoneHosted = Boolean(publicOrigin);
      request.capstoneSecure = Boolean(publicOrigin || request.socket.encrypted);
      url.pathname = url.pathname.slice(basePath.length) || "/";
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
        return await handleApi(request, response, url, sessions, staffAuth);
      }
      if (request.method !== "GET") return sendJson(response, 405, { error: "Method not allowed." });
      await serveStatic(response, url.pathname, basePath);
    } catch (error) {
      const status = error.statusCode || 500;
      if (status >= 500) console.error(error);
      sendJson(response, status, { error: error.message || "Server error." });
    }
  });
}

const server = createServer();

function createRuntimeServer() {
  const resolveAccount = process.env.CAPSTONE_SESSION_ADAPTER
    ? require(path.resolve(process.env.CAPSTONE_SESSION_ADAPTER))
    : null;
  return createServer({
    sessions: createSessionService({ resolveAccount, enableDemo: true }),
    staffAuth: createStaffAuth({ mode: process.env.CAPSTONE_STAFF_LOGIN_MODE ?? require("./config.json").staffLoginMode }),
    basePath: process.env.CAPSTONE_BASE_PATH || "",
    publicOrigin: process.env.CAPSTONE_PUBLIC_ORIGIN || null
  });
}

if (require.main === module) {
  const app = createRuntimeServer();
  app.listen(port, "127.0.0.1", () => {
    console.log(`Capstone - AI is running at http://localhost:${port}${normalizeBasePath(process.env.CAPSTONE_BASE_PATH || "")}/`);
    if ((process.env.CAPSTONE_STAFF_LOGIN_MODE ?? require("./config.json").staffLoginMode) === "email-demo") {
      console.warn("TEST ONLY: Staff password checks are disabled. Anyone with an approved email can access the queue. Use fictional data only.");
    }
  });
}

module.exports = { cleanText, normalizeNewTicket, createServer, createRuntimeServer, server };
