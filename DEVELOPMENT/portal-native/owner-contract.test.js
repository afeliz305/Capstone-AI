const test = require("node:test");
const assert = require("node:assert/strict");
const { REQUIRED_METHODS, validateHostAdapter } = require("./host-adapter");
const { applyOwnerDestination, buildOwnerContinuation, validateOwnerContinuation } = require("./navigation-continuation");
const { createSyntheticHostAdapter } = require("./examples/synthetic-host-adapter");

test("synthetic owner adapter implements all six required hooks", async () => {
  const fixture = createSyntheticHostAdapter();
  validateHostAdapter(fixture.adapter);
  assert.deepEqual(REQUIRED_METHODS.filter(name => typeof fixture.adapter[name] !== "function"), []);
  const session = await fixture.adapter.getVerifiedSession();
  const sources = await fixture.adapter.listAccessibleSources({ binding:session.binding });
  const grade = sources.find(source => source.section === "Grade");
  const loaded = await fixture.adapter.readAuthorizedSection({ sourceId:grade.id, section:grade.section, messageContent:false, purpose:"owner-review" });
  assert.equal(loaded.sessionBinding, session.binding);
  assert.match(loaded.records[0].text,/^Synthetic /);
});

test("owner continuation is relative, allowlisted, and reuses the observed Grade view", async () => {
  assert.equal(buildOwnerContinuation("grade", { assistant:true }), "/portal?section=grade&assistant=1#mygrade");
  assert.equal(validateOwnerContinuation("https://attacker.example/portal?section=grade"), null);
  assert.equal(validateOwnerContinuation("/portal?section=unknown"), null);
  const fixture = createSyntheticHostAdapter();
  const result = await applyOwnerDestination(fixture.adapter, "https://capstone.cs.fiu.edu/portal?section=grade&assistant=1#mygrade");
  assert.equal(result.state, "opened");
  assert.equal(result.section, "Grade");
  assert.equal(result.destination.url, "https://capstone.cs.fiu.edu/portal#mygrade");
});

test("signed-out fixture returns a validated continuation without collecting a code", async () => {
  const fixture = createSyntheticHostAdapter();
  fixture.signOut();
  const result = await applyOwnerDestination(fixture.adapter, "https://capstone.cs.fiu.edu/portal#mygrade");
  assert.deepEqual(result, { state:"sign-in-required", continuation:"/portal?section=grade#mygrade" });
});
