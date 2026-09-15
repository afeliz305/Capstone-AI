const { createHash, randomUUID } = require("node:crypto");
const { memberFor, normalizeEmail } = require("./staff-auth");

const TICKET_TOPICS = Object.freeze([
  "Workflow and improvements", "Testing and updates", "Implementation and testing",
  "Website navigation", "Coursework", "Attendance", "Scrum and sprints",
  "Showcase", "Templates and branding", "Other"
]);
const statuses = new Set(["open", "in-review", "resolved"]);
const priorities = new Set(["low", "normal", "high", "urgent"]);
const fail = (message, statusCode = 400) => Object.assign(new Error(message), { statusCode });
const revisionOf = (ticket) => Number.isSafeInteger(ticket.revision) && ticket.revision >= 0 ? ticket.revision : 0;

function textField(input, field, limit, required = false) {
  const value = input[field] ?? "";
  if (typeof value !== "string" || value.length > limit || (required && !value.trim())) {
    const label = { question: "Title", details: "Description", resolution: "Resolution notes", workNote: "Work notes", additionalComment: "Additional comments" }[field] || field;
    throw fail(`${label} must ${required ? "contain text and " : ""}be no longer than ${limit} characters.`);
  }
  return value.trim();
}

function applyTicketWork(ticket, input, staff) {
  if (!Number.isSafeInteger(input.expectedRevision) || input.expectedRevision < 0) throw fail("Reload the ticket before saving.");
  if (typeof input.requestId !== "string" || !/^[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}$/i.test(input.requestId)) throw fail("A valid save identifier is required.");
  const fingerprint = createHash("sha256").update(JSON.stringify(input)).digest("hex");
  const previous = (ticket.workSaves || []).find(save => save.requestId === input.requestId);
  if (previous) {
    if (previous.author !== staff.email || previous.fingerprint !== fingerprint) throw fail("This save identifier has already been used. Reload the ticket.", 409);
    return ticket; // Retrying an uncertain response must not append the same note twice.
  }
  if (revisionOf(ticket) !== input.expectedRevision) throw fail("This ticket changed while you were working. Reload the latest ticket before saving; your unsaved draft has not been applied.", 409);
  if (!statuses.has(input.status)) throw fail("Choose a valid status.");
  if (!priorities.has(input.priority)) throw fail("Choose a valid priority.");
  if (input.projectOwnerTicket !== undefined && typeof input.projectOwnerTicket !== "boolean") throw fail("Project-owner classification must be true or false.");
  if (!TICKET_TOPICS.includes(input.category) && input.category !== ticket.category) throw fail("Choose a category from the list.");
  const assignedTo = input.assignedTo === null ? null : normalizeEmail(input.assignedTo);
  if (assignedTo !== null && !memberFor(assignedTo) && assignedTo !== ticket.assignedTo) throw fail("Choose an approved staff member or Unassigned.");
  const fields = {
    status: input.status, priority: input.priority, category: input.category, assignedTo,
    question: textField(input, "question", 500, true), details: textField(input, "details", 3000, true),
    resolution: textField(input, "resolution", 3000)
  };
  // A staff-applied classification, never a requester-controlled role or access grant.
  if (input.projectOwnerTicket !== undefined) fields.projectOwnerTicket = input.projectOwnerTicket;
  const workNote = textField(input, "workNote", 4000);
  const additionalComment = textField(input, "additionalComment", 4000);
  const changed = Object.keys(fields).filter(key => fields[key] !== (ticket[key] ?? (key === "assignedTo" ? null : key === "priority" ? "normal" : key === "projectOwnerTicket" ? false : "")));
  if (!changed.length && !workNote && !additionalComment) throw fail("Change a field or enter a note before saving.");
  const createdAt = new Date().toISOString();
  const activity = [...(ticket.activity || [])];
  const add = (type, body) => activity.push({ id: randomUUID(), type, body, author: { name: staff.name, email: staff.email }, createdAt });
  if (changed.length) add("update", "Updated: " + changed.map(key => ({ question: "title", assignedTo: "assignee", projectOwnerTicket: "project-owner tag" })[key] || key).join(", ") + ".");
  if (workNote) add("work-note", workNote);
  if (additionalComment) add("additional-comment", additionalComment);
  if (fields.assignedTo !== (ticket.assignedTo || null)) Object.assign(ticket, { assignedBy: staff.email, assignedAt: createdAt });
  if (fields.status === "resolved" && ticket.status !== "resolved") Object.assign(ticket, { resolvedBy: staff.email, resolvedAt: createdAt });
  if (changed.includes("projectOwnerTicket")) Object.assign(ticket, { projectOwnerMarkedBy: staff.email, projectOwnerMarkedAt: createdAt });
  Object.assign(ticket, fields, {
    activity, updatedAt: createdAt, updatedBy: staff.email, revision: revisionOf(ticket) + 1,
    workSaves: [...(ticket.workSaves || []), { requestId: input.requestId, fingerprint, author: staff.email }].slice(-50)
  });
  return ticket;
}

function requesterView(ticket) {
  // Explicit allowlist: never spread the staff record into a requester response.
  return {
    id: ticket.id, category: ticket.category || "Other", status: ticket.status,
    question: ticket.question, details: ticket.details, createdAt: ticket.createdAt,
    updatedAt: ticket.updatedAt || ticket.createdAt,
    comments: (ticket.activity || []).filter(entry => entry.type === "additional-comment").map(entry => ({
      id: entry.id, body: entry.body, authorName: entry.author.name, createdAt: entry.createdAt
    }))
  };
}

module.exports = { TICKET_TOPICS, revisionOf, applyTicketWork, requesterView };
