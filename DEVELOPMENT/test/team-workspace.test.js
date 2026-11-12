const test = require("node:test");
const assert = require("node:assert/strict");
const workspace = require("../js/shared/team-workspace");

test("workspace exposes a sourced read-only snapshot without claiming live portal state", () => {
  const value = workspace.snapshot();
  assert.equal(value.source.state, "snapshot");
  assert.equal(value.source.permission, "read-only");
  assert.equal(value.source.current, false);
  assert.equal(value.sprint.cards, 10);
  assert.equal(value.cards.length, 10);
  assert.equal(value.cards.filter((card) => card.status === "done").length, 5);
  assert.ok(value.cards.every((card) => card.source.label === "Capstone portal audit snapshot"));
});

test("selected cards support preparation, evidence review, and handoffs without completion claims", () => {
  const card = workspace.getCard("CAP-1316");
  assert.equal(card.owner, "Anthony Feliz");
  assert.equal(workspace.actionSteps(card).length, 5);
  const assessment = workspace.assessEvidence(card, ["test output", "", "", "", ""]);
  assert.equal(assessment.state, "incomplete");
  assert.equal(assessment.supported, 1);
  assert.equal(assessment.results[0].state, "draft");
  assert.equal(assessment.results[1].state, "missing");
  assert.match(workspace.handoffDraft(card), /draft; confirm current portal state first/i);
});

test("stand-up assistant uses exact portal fields and warns about a possible duplicate", () => {
  const draft = workspace.standupDraft(workspace.getCard("CAP-1316"));
  assert.equal(draft.state, "draft");
  assert.equal(draft.duplicateWarning, true);
  assert.match(draft.did, /Reviewed CAP-1316/);
  assert.match(draft.blockers, /Confirm whether it is an actual blocker/);
  assert.deepEqual(workspace.ceremonyPrompts("retro"), [
    "Keep: What helped the team deliver?",
    "Change: What slowed or confused the team?",
    "One thing about the team: What specific experiment should happen next sprint?"
  ]);
});
