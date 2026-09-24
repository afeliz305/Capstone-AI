const test = require("node:test");
const assert = require("node:assert/strict");
const { normalizeNewTicket } = require("../server/server");

test("creates a normalized local support ticket", () => {
  const ticket = normalizeNewTicket({
    name: "Demo Student",
    email: "DEMO@FIU.EDU",
    category: "Showcase",
    question: "Where is my required form?",
    details: "Please point me to the correct page.",
    includeTranscript: true,
    transcript: "User: Where is my required form?",
    privateToInstructor: true
  }, []);

  assert.equal(ticket.id, "CAP-1001");
  assert.equal(ticket.email, "demo@fiu.edu");
  assert.equal(ticket.status, "open");
  assert.equal(ticket.privateToInstructor, true);
  assert.match(ticket.transcript, /Where is my required form/);
});

test("rejects incomplete support requests", () => {
  assert.throws(() => normalizeNewTicket({ name: "Demo" }, []), /required/);
});
