const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs/promises");
const os = require("node:os");
const path = require("node:path");
const { STAFF } = require("../server/lib/staff-auth");
const { planSampleTickets, seedSampleTickets } = require("../server/lib/sample-tickets");
const { filterTickets } = require("../js/staff/staff-view");

test("adds twelve resolved examples and five open unassigned tickets with unique IDs", () => {
  const existing = [{ id: "CAP-1007", status: "in-review", details: "Preserve this ticket", attachments: [{ id: "original-document" }] }];
  const before = structuredClone(existing);
  const { added, tickets } = planSampleTickets(existing);
  assert.equal(added.length, 17);
  assert.equal(tickets.length, 18);
  assert.deepEqual(existing, before);
  assert.deepEqual(tickets.at(-1), before[0]);
  assert.equal(new Set(tickets.map((ticket) => ticket.id)).size, 18);
  const resolved = added.filter((ticket) => ticket.status === "resolved");
  const open = added.filter((ticket) => ticket.status === "open");
  assert.equal(resolved.length, 12);
  assert.equal(open.length, 5);
  assert.ok(open.every((ticket) => ticket.assignedTo === null && !ticket.resolution));
  assert.ok(resolved.every((ticket) => ticket.resolution.length > 40 && ticket.resolvedBy === ticket.assignedTo && ticket.resolvedAt >= ticket.createdAt));
  const counts = STAFF.map(member => resolved.filter(ticket => ticket.assignedTo === member.email).length);
  assert.equal(counts.reduce((sum, count) => sum + count, 0), resolved.length);
  assert.ok(counts.every(count => count >= Math.floor(resolved.length / STAFF.length) && count <= Math.ceil(resolved.length / STAFF.length)));
  assert.ok(added.every(ticket => ticket.assignedTo !== 'ralva037@fiu.edu'));
  assert.ok(added.every((ticket) => ticket.isSample && ticket.email.endsWith("@example.edu")));
  assert.ok(new Set(added.map((ticket) => ticket.category)).size >= 6);
});

test("repeating the seed preserves staff edits and does not create duplicates", () => {
  const first = planSampleTickets([]).tickets;
  first[0].status = "in-review";
  first[0].assignedTo = STAFF[0].email;
  const again = planSampleTickets(first);
  assert.equal(again.added.length, 0);
  assert.deepEqual(again.tickets, first);
  assert.throws(() => planSampleTickets({}), /must contain a list/);
});

test("sample import backs up existing bytes and is idempotent on disk", async () => {
  const directory = await fs.mkdtemp(path.join(os.tmpdir(), "capstone-seed-test-"));
  const file = path.join(directory, "tickets.json");
  let backup;
  try {
    const original = '[{"id":"CAP-1010","status":"open","customField":"keep me"}]\n';
    await fs.writeFile(file, original);
    const result = await seedSampleTickets(file);
    backup = result.backup;
    assert.equal(result.added, 17);
    assert.equal(await fs.readFile(backup, "utf8"), original);
    const data = JSON.parse(await fs.readFile(file, "utf8"));
    assert.deepEqual(data.at(-1), JSON.parse(original)[0]);
    assert.equal((await seedSampleTickets(file)).added, 0);
    assert.deepEqual(JSON.parse(await fs.readFile(file, "utf8")), data);
    await fs.writeFile(file, "not valid json");
    await assert.rejects(seedSampleTickets(file), SyntaxError);
    assert.equal(await fs.readFile(file, "utf8"), "not valid json");
  } finally {
    if (backup) await fs.unlink(backup);
    await fs.unlink(file);
    await fs.rmdir(directory);
  }
});

test("staff can search the example resolution notes", () => {
  const { tickets } = planSampleTickets([]);
  const result = filterTickets(tickets, { assignment: "all", status: "resolved", search: "UTF-8 filename" });
  assert.equal(result.length, 1);
  assert.ok(result[0].resolution.includes("UTF-8 filename"));
});
