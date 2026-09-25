"use strict";
const { createBrowserStore } = require("./browser-store");
const { STAFF, memberFor, normalizeEmail } = require("./staff-auth");
const { TICKET_TOPICS, revisionOf, applyTicketWork, requesterView } = require("./ticket-work");
const { searchKnowledge } = require("./search");
const { normalizeContact } = require("./contact-policy");
const attachmentPolicy = require("./attachment-policy");

const fail = (message, statusCode = 400) => Object.assign(new Error(message), { statusCode });
const reply = (data, status = 200) => new Response(JSON.stringify(data), { status, headers: { "Content-Type": "application/json" } });

function createBrowserApi({ baseUrl, knowledge, indexedDB, sessionStorage, store, now = Date.now, uuid = () => crypto.randomUUID() }) {
  const base = new URL(baseUrl);
  const scope = base.origin + base.pathname;
  store = store || createBrowserStore({ indexedDB, scope });
  const sessionKey = "capstone-browser-staff-v1:" + scope;
  function saveSession(session) {
    try {
      if (session === null) sessionStorage.removeItem(sessionKey);
      else sessionStorage.setItem(sessionKey, JSON.stringify(session));
    } catch { throw fail("Browser session storage is unavailable. Allow site storage and sign in again.", 503); }
  }
  function current() {
    let session;
    try { session = JSON.parse(sessionStorage.getItem(sessionKey) || "null"); }
    catch { throw fail("Browser session storage is unavailable. Allow site storage and sign in again.", 503); }
    const staff = session && memberFor(session.email);
    if (!staff || !Number.isFinite(session.expiresAt) || session.expiresAt <= now()) throw fail("Unauthorized access. Sign in to the browser-demo staff queue.", 401);
    return { staff, members: STAFF, expiresAt: session.expiresAt, loginMode: "email-demo" };
  }
  function routeUrl(route) {
    if (!/^\/api\//.test(route)) throw fail("Invalid browser-demo route.");
    const url = new URL(route.slice(1), base);
    if (url.origin !== base.origin || !url.pathname.startsWith(base.pathname + "api/")) throw fail("Invalid browser-demo route.");
    return url;
  }
  function documents(input) {
    const files = input === undefined ? [] : input;
    const message = attachmentPolicy.validate(files);
    if (message) throw fail(message);
    return files.map(file => {
      if (typeof file.data !== "string" || file.data.length !== Math.ceil(file.size / 3) * 4 ||
          /[^A-Za-z0-9+/=]/.test(file.data)) throw fail("A document could not be read. Select the file again.");
      let decoded;
      try { decoded = atob(file.data); } catch { throw fail("Invalid document encoding."); }
      if (decoded.length !== file.size || btoa(decoded) !== file.data) throw fail("Document size does not match its contents.");
      const extension = attachmentPolicy.extension(file.name);
      if (extension === "pdf" && !decoded.startsWith("%PDF-")) throw fail("The PDF document has an invalid file header.");
      if (extension === "docx" && (!decoded.startsWith("PK\u0003\u0004") || !decoded.includes("[Content_Types].xml") || !decoded.includes("word/document.xml"))) throw fail("The Word document must be a valid .docx file.");
      if (extension === "txt") {
        try {
          if (decoded.includes("\u0000")) throw new Error();
          new TextDecoder("utf-8", { fatal: true }).decode(Uint8Array.from(decoded, character => character.charCodeAt(0)));
        } catch { throw fail("Text documents must contain UTF-8 text, not binary data."); }
      }
      return { id: uuid(), name: file.name, size: file.size, type: attachmentPolicy.types[extension], data: file.data };
    });
  }
  function text(input, field, limit, required = false) {
    const value = input[field] ?? "";
    if (typeof value !== "string" || value.length > limit || (required && !value.trim())) throw fail(field + " is required or exceeds its allowed length (" + limit + ").");
    return value.trim();
  }
  function newTicket(input, state, staff, files) {
    if (state.tickets.length >= 1000) throw fail("This test queue has reached its 1,000-ticket limit. Export a backup and contact the project owner.", 413);
    if ([...Object.values(state.documents), ...files].reduce((total, file) => total + file.size, 0) > 100 * 1024 * 1024) throw fail("This test queue has reached its 100 MB document limit. Export a backup and contact the project owner.", 413);
    const name = staff ? staff.name : text(input, "name", 120, true);
    const email = staff ? staff.email : text(input, "email", 254, true).toLowerCase();
    const category = text(input, "category", 80) || "Other";
    if (!TICKET_TOPICS.includes(category)) throw fail("Choose a ticket topic from the list.");
    if (staff && input.projectOwnerTicket !== undefined && typeof input.projectOwnerTicket !== "boolean") throw fail("Invalid project-owner classification.");
    const assignedTo = staff && input.assignedTo != null ? normalizeEmail(input.assignedTo) : null;
    if (assignedTo !== null && !memberFor(assignedTo)) throw fail("Choose an approved staff member.");
    let contact;
    try { contact = normalizeContact(input, email); } catch (error) { throw fail(error.message); }
    const highest = state.tickets.reduce((max, ticket) => Math.max(max, Number(ticket.id.slice(4))), 1000);
    const createdAt = new Date(now()).toISOString();
    const ticket = {
      id: "CAP-" + (highest + 1), name, email, contact, category,
      question: text(input, "question", 500, true), details: text(input, "details", 3000, true),
      transcript: !staff && input.includeTranscript ? text(input, "transcript", 5000) : "",
      privateToInstructor: !staff && Boolean(input.privateToInstructor), accountId: null,
      identitySource: staff ? "staff-email-demo" : "manual", source: "Capstone browser-only demo",
      status: "open", priority: "normal", revision: 0, assignedTo, createdAt,
      attachments: files.map(({ data, ...metadata }) => metadata)
    };
    if (staff) ticket.createdBy = staff.email;
    if (assignedTo) Object.assign(ticket, { assignedBy: staff.email, assignedAt: createdAt });
    if (staff && input.projectOwnerTicket === true) Object.assign(ticket, { projectOwnerTicket: true, projectOwnerMarkedBy: staff.email, projectOwnerMarkedAt: createdAt });
    for (const file of files) state.documents[file.id] = file;
    state.tickets.unshift(ticket);
    return ticket;
  }
  async function request(route, options = {}) {
    try {
      if (!["http:", "https:"].includes(base.protocol)) throw fail("Open this demo through the Ocelot link or a local web server, not by double-clicking index.html.", 503);
      const url = routeUrl(route);
      const pathname = "/" + url.pathname.slice(base.pathname.length);
      const method = options.method || "GET";
      let input = {};
      if (options.body) {
        try { input = JSON.parse(options.body); } catch { throw fail("Invalid request data."); }
        if (!input || typeof input !== "object" || Array.isArray(input)) throw fail("Invalid request data.");
      }
      if (method === "GET" && pathname === "/api/health") return reply({ status: "ok", backend: "browser-demo", storage: "indexeddb", shared: false });
      if (method === "GET" && pathname === "/api/search") {
        const question = (url.searchParams.get("q") || "").trim().slice(0, 500);
        if (!question) throw fail("A question is required.");
        return reply({ question, ...searchKnowledge(knowledge, question, url.searchParams.get("context")) });
      }
      if (method === "GET" && pathname === "/api/session") return reply({ status: "guest", account: null, identityContext: "browser-demo-guest-v1", demoAvailable: false });
      if (method === "POST" && pathname === "/api/staff/login") {
        saveSession(null);
        const staff = memberFor(input.email);
        if (!staff) throw fail("Unauthorized access. This email is not on the approved staff list.", 401);
        // Verify availability without replacing, seeding, or resetting a queue.
        await store.transact(false, () => true);
        saveSession({ email: staff.email, expiresAt: now() + 3600000 });
        return reply(current());
      }
      if (method === "POST" && pathname === "/api/staff/logout") { saveSession(null); return reply({ ok: true }); }
      if (method === "GET" && pathname === "/api/staff/session") return reply(current());
      if (method === "POST" && ["/api/tickets", "/api/staff/tickets"].includes(pathname)) {
        const staff = pathname.includes("/staff/") ? current().staff : null;
        if (!staff && input.identityContext !== "browser-demo-guest-v1") throw fail("Reopen the support form before submitting.", 409);
        const files = documents(input.attachments);
        return reply(await store.transact(true, state => newTicket(input, state, staff, files)), 201);
      }
      const { staff } = current();
      if (method === "GET" && pathname === "/api/tickets") return reply(await store.transact(false, state => state.tickets));
      if (method === "GET" && pathname === "/api/browser-backup") return reply(await store.transact(false, state => ({ format: "capstone-browser-backup", exportedAt: new Date(now()).toISOString(), ...state })));
      const match = pathname.match(/^\/api\/tickets\/(CAP-\d+)(?:\/(work|requester-preview|attachments\/([a-f0-9-]{36})))?$/);
      if (!match) throw fail("Browser-demo endpoint not found.", 404);
      const result = await store.transact(method === "PATCH", state => {
        const ticket = state.tickets.find(item => item.id === match[1]);
        if (!ticket) throw fail("Ticket not found in this browser.", 404);
        if (method === "GET") {
          if (match[3]) {
            if (!ticket.attachments.some(file => file.id === match[3]) || !state.documents[match[3]]) throw fail("Document not found in this browser.", 404);
            return state.documents[match[3]];
          }
          if (match[2] === "requester-preview") return requesterView(ticket);
          if (!match[2]) return ticket;
        }
        if (method === "PATCH" && match[2] === "work") return applyTicketWork(ticket, input, staff);
        if (method === "PATCH" && !match[2]) {
          const changingStatus = Object.hasOwn(input, "status"), changingAssignee = Object.hasOwn(input, "assignedTo");
          if (!changingStatus && !changingAssignee) throw fail("Choose a status or assignment to update.");
          if (changingStatus && !["open", "in-review", "resolved"].includes(input.status)) throw fail("Invalid ticket status.");
          if (changingAssignee) {
            const assignee = input.assignedTo === null ? null : normalizeEmail(input.assignedTo);
            if (assignee !== null && !memberFor(assignee)) throw fail("Choose an approved staff member.");
            if (!Object.hasOwn(input, "expectedAssignee") || (ticket.assignedTo || null) !== input.expectedAssignee) throw fail("Assignment changed. Refresh the queue and try again.", 409);
            Object.assign(ticket, { assignedTo: assignee, assignedBy: staff.email, assignedAt: new Date(now()).toISOString() });
          }
          if (changingStatus) {
            if (input.status === "resolved" && ticket.status !== "resolved") Object.assign(ticket, { resolvedBy: staff.email, resolvedAt: new Date(now()).toISOString() });
            ticket.status = input.status;
          }
          Object.assign(ticket, { revision: revisionOf(ticket) + 1, updatedAt: new Date(now()).toISOString(), updatedBy: staff.email });
          return ticket;
        }
        throw fail("Unsupported browser-demo operation.", 405);
      });
      if (match[3] && method === "GET") return new Response(Uint8Array.from(atob(result.data), c => c.charCodeAt(0)), { headers: { "Content-Type": "application/octet-stream" } });
      return reply(result);
    } catch (error) {
      return reply({ error: error.statusCode ? error.message : "Browser operation failed. " + error.message, loginMode: "email-demo" }, error.statusCode || 503);
    }
  }
  async function download(route, filename) {
    const response = await request(route);
    if (!response.ok) throw new Error((await response.json()).error);
    const blob = await response.blob();
    const objectUrl = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = objectUrl; link.download = filename; document.body.append(link); link.click(); link.remove();
    setTimeout(() => URL.revokeObjectURL(objectUrl), 60000);
  }
  return { baseUrl: base.href, storageMode: "browser", url: route => { routeUrl(route); return "#browser-document"; }, fetch: request, readJson: response => response.json(), download };
}
module.exports = { createBrowserApi };
