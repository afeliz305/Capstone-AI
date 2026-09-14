const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");
const { once } = require("node:events");
const { prepareAttachments } = require("../lib/attachments");
const policy = require("../public/widget/attachment-policy");

const directory = fs.mkdtempSync(path.join(os.tmpdir(), "capstone-attachment-test-"));
const ticketFile = path.join(directory, "tickets.json");
const documentDirectory = path.join(directory, "attachments");
process.env.CAPSTONE_DATA_FILE = ticketFile;
const { createServer } = require("../server");
const { createStaffAuth, setStaffPassword } = require("../lib/staff-auth");
const staffFile = path.join(directory, "staff-credentials.json");
test.before(() => setStaffPassword("afeli016@fiu.edu", "Fixture password for tests only", { file: staffFile }));
test.after(() => {
  // Remove only files generated in this test's uniquely created directory.
  if (fs.existsSync(documentDirectory)) {
    for (const name of fs.readdirSync(documentDirectory)) {
      assert.match(name, /^[0-9a-f-]{36}$/);
      fs.unlinkSync(path.join(documentDirectory, name));
    }
    fs.rmdirSync(documentDirectory);
  }
  for (const name of [ticketFile, `${ticketFile}.tmp`, staffFile, `${staffFile}.tmp`]) {
    if (fs.existsSync(name)) fs.unlinkSync(name);
  }
  fs.rmdirSync(directory);
});

const documentInput = (name = "attendance-note.txt", bytes = Buffer.from("Fictional attendance test. No student data.\n")) => ({ name, size: bytes.length, data: bytes.toString("base64") });
const details = { name: "Demo Student", email: "demo@example.edu", category: "Attendance", question: "Please clarify the attendance process.", details: "Fictional test request only." };
async function app(t) {
  const server = createServer({ staffAuth: createStaffAuth({ file: staffFile }) });
  server.listen(0, "127.0.0.1");
  await once(server, "listening");
  t.after(() => new Promise((resolve, reject) => {
    server.close((error) => error ? reject(error) : resolve());
    server.closeAllConnections();
  }));
  const base = `http://127.0.0.1:${server.address().port}`;
  const staffLogin = await fetch(`${base}/api/staff/login`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ email: "afeli016@fiu.edu", password: "Fixture password for tests only" }) });
  assert.equal(staffLogin.status, 200);
  const staffCookie = staffLogin.headers.get("set-cookie").split(";")[0];
  const session = await (await fetch(`${base}/api/session`)).json();
  const post = (body, headers = {}) => fetch(`${base}/api/tickets`, {
    method: "POST", headers: { "Content-Type": "application/json", ...headers },
    body: JSON.stringify({ ...details, identityContext: session.identityContext, ...body })
  });
  return { base, post, fetch: (url, options = {}) => fetch(url, { ...options, headers: { ...options.headers, Cookie: staffCookie } }) };
}

test("accepts basic PDF, DOCX container, and UTF-8 text formats", () => {
  const pdf = documentInput("note.pdf", Buffer.from("%PDF-1.7\nfictional fixture"));
  // A signature fixture, not a complete Word document or malware-safety test.
  const docx = documentInput("note.docx", Buffer.from("PK\x03\x04[Content_Types].xml word/document.xml"));
  const prepared = prepareAttachments([pdf, docx, documentInput("note.txt", Buffer.from("Résumé — fictional test"))]);
  assert.equal(prepared.length, 3);
  assert.match(prepared[0].id, /^[0-9a-f-]{36}$/);
  assert.equal(prepared[1].type, policy.types.docx);
});

test("rejects disallowed names, extensions, empty documents, and malformed base64", () => {
  for (const name of ["../note.txt", "C:\\note.txt", "note.txt\r\nX-Header: value", "run.exe", "index.html", "macro.docm", "a".repeat(181) + ".txt", "bad\ud800.txt"]) {
    assert.throws(() => prepareAttachments([documentInput(name)]), { statusCode: 400 });
  }
  for (const file of [documentInput("empty.txt", Buffer.alloc(0)), { ...documentInput(), data: "%%%%" }, { ...documentInput(), size: 1 }, { ...documentInput(), data: "YQ= =" }]) {
    assert.throws(() => prepareAttachments([file]), { statusCode: 400 });
  }
  assert.throws(() => prepareAttachments({ name: "not-an-array.txt" }), { statusCode: 400 });
});

test("rejects disguised binary files and short or invalid document headers", () => {
  for (const [name, bytes] of [["fake.pdf", "MZ executable"], ["short.docx", "x"], ["fake.docx", "PK\x03\x04just-a-zip"], ["binary.txt", "hello\x00world"]]) {
    assert.throws(() => prepareAttachments([documentInput(name, Buffer.from(bytes))]), { statusCode: 400 });
  }
  assert.throws(() => prepareAttachments([documentInput("invalid.txt", Buffer.from([0xff]))]), /UTF-8/);
});

test("enforces document count, individual size, and total size limits", () => {
  assert.throws(() => prepareAttachments(Array.from({ length: 4 }, () => documentInput())), /up to 3/);
  assert.throws(() => prepareAttachments([{ ...documentInput(), size: policy.MAX_FILE_BYTES + 1 }]), /5 MB/);
  assert.throws(() => prepareAttachments(Array.from({ length: 3 }, () => ({ ...documentInput(), size: policy.MAX_FILE_BYTES }))), /10 MB/);
  assert.equal(policy.validate([{ name: "one.txt", size: policy.MAX_FILE_BYTES }, { name: "two.pdf", size: policy.MAX_FILE_BYTES }]), "");
});

test("attendance tickets persist documents outside public and download the same bytes", async (t) => {
  const { base, post, fetch } = await app(t);
  const file = documentInput("résumé-attendance.txt");
  const response = await post({ attachments: [file] });
  assert.equal(response.status, 201);
  const ticket = await response.json();
  assert.equal(ticket.category, "Attendance");
  assert.equal(ticket.attachments.length, 1);
  assert.equal(ticket.attachments[0].data, undefined);
  assert.equal(ticket.attachments[0].bytes, undefined);
  const attachment = ticket.attachments[0];
  assert.equal(fs.readFileSync(path.join(documentDirectory, attachment.id)).toString("base64"), file.data);
  assert.equal((await fetch(`${base}/data/attachments/${attachment.id}`)).status, 404);
  const download = await fetch(`${base}/api/tickets/${ticket.id}/attachments/${attachment.id}`);
  assert.equal(download.status, 200);
  assert.equal(download.headers.get("content-type"), "application/octet-stream");
  assert.match(download.headers.get("content-disposition"), /^attachment;.*filename\*=UTF-8''r%C3%A9sum%C3%A9-attendance.txt/);
  assert.equal(download.headers.get("x-content-type-options"), "nosniff");
  assert.equal(download.headers.get("cache-control"), "no-store");
  assert.deepEqual(Buffer.from(await download.arrayBuffer()), Buffer.from(file.data, "base64"));
  const secondApp = await app(t);
  const persisted = await (await secondApp.fetch(`${secondApp.base}/api/tickets`)).json();
  assert.deepEqual(persisted.find((item) => item.id === ticket.id).attachments, ticket.attachments);
});

test("tickets without documents still work and documents remain bound to their own ticket", async (t) => {
  const { base, post, fetch } = await app(t);
  const withDocuments = await (await post({ attachments: [documentInput()] })).json();
  const withoutDocuments = await (await post({})).json();
  assert.deepEqual(withoutDocuments.attachments, []);
  const id = withDocuments.attachments[0].id;
  assert.equal((await fetch(`${base}/api/tickets/${withoutDocuments.id}/attachments/${id}`)).status, 404);
  assert.equal((await fetch(`${base}/api/tickets/${withDocuments.id}/attachments/${id}`, { headers: { "Sec-Fetch-Site": "cross-site" } })).status, 403);
  const updated = await fetch(`${base}/api/tickets/${withDocuments.id}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ status: "in-review" }) });
  assert.deepEqual((await updated.json()).attachments, withDocuments.attachments);
});

test("invalid files and rejected identity/origin never create tickets or stored files", async (t) => {
  const { base, post, fetch } = await app(t);
  const before = await (await fetch(`${base}/api/tickets`)).json();
  const storedBefore = fs.readdirSync(documentDirectory);
  assert.equal((await post({ attachments: [documentInput("run.exe")] })).status, 400);
  assert.equal((await post({ attachments: [documentInput()], identityContext: "stale" })).status, 409);
  assert.equal((await post({ attachments: [documentInput()] }, { Origin: "https://unrelated.example" })).status, 403);
  assert.equal((await (await fetch(`${base}/api/tickets`)).json()).length, before.length);
  assert.deepEqual(fs.readdirSync(documentDirectory), storedBefore);
});

test("failed ticket persistence rolls back only the newly uploaded documents", async (t) => {
  const { base, post, fetch } = await app(t);
  const before = await (await fetch(`${base}/api/tickets`)).json();
  const storedBefore = fs.readdirSync(documentDirectory);
  fs.mkdirSync(`${ticketFile}.tmp`); // Deliberately block this test queue's atomic write.
  try { assert.equal((await post({ attachments: [documentInput()] })).status, 500); }
  finally { fs.rmdirSync(`${ticketFile}.tmp`); }
  assert.deepEqual(fs.readdirSync(documentDirectory), storedBefore);
  assert.deepEqual(await (await fetch(`${base}/api/tickets`)).json(), before);
});
