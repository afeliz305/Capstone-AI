"use strict";

const assert = require("node:assert/strict");
const test = require("node:test");
const { reviewedKnowledge } = require("../server/lib/knowledge");
const { searchKnowledge } = require("../server/lib/search");

const knowledge = reviewedKnowledge(require("../data/capstone-knowledge.json"));
const search = (question, context = "") => searchKnowledge(knowledge, question, context);

function assertSafeDecision(question, expectedId, context = "") {
  const result = search(question, context);
  assert.equal(result.status, "matched", question);
  assert.equal(result.responseStatus, "partial", question);
  assert.equal(result.matches[0].id, expectedId, question);
  assert.match(result.matches[0].answer, /MIRA cannot grant, promise, submit, or predict an individual exception/i, question);
  assert.match(result.matches[0].answer, /human with the appropriate course or workflow authority must decide/i, question);
  assert.match(result.matches[0].answer, /No request is sent automatically/i, question);
  assert.ok(result.supportingSourceIds.includes("contact-help"), question);
  return result;
}

test("reported grading and attendance exception questions use reviewed policy plus a human route", () => {
  const grading = assertSafeDecision("Can Professor Sadjadi approve a grading exception for me?", "syllabus-grading");
  assert.match(grading.matches[0].answer, /1,000 points|1,000-point/i);

  const attendance = assertSafeDecision("Can you waive the attendance requirement for me?", "syllabus-attendance");
  assert.match(attendance.matches[0].answer, /no regular class sessions|two stand-ups per week/i);
  assert.notEqual(attendance.matches[0].id, "dashboard-personal");
});

test("exception family covers natural authority, waiver, exemption and inability phrasings", () => {
  const cases = [
    ["Can my instructor make an attendance exception?", "syllabus-attendance"],
    ["can the professor excuse my absence", "syllabus-attendance"],
    ["can i be exempt from the attendance rule", "syllabus-attendance"],
    ["Can someone override my grading requirement?", "syllabus-grading"],
    ["What if I cannot meet the assignment deadline?", "syllabus-late-work"],
    ["Can the submission deadline be waived?", "syllabus-late-work"],
    ["Can the Product Owner make an exception for this card?", "faro-board-review-decision"],
    ["Can you approve this card?", "faro-board-review-decision"],
    ["Do I still have to do this?", "syllabus-attendance", "syllabus-attendance"]
  ];
  for (const [question, id, context] of cases) assertSafeDecision(question, id, context);
});

test("MIRA never turns authority wording into an approval or account action", () => {
  for (const question of [
    "Can MIRA waive my grade requirement?",
    "Can you excuse my attendance?",
    "Can you approve this card?",
    "Can you override the submission rule?"
  ]) {
    const result = search(question);
    assert.equal(result.responseStatus, "partial", question);
    const serialized = JSON.stringify(result);
    assert.doesNotMatch(serialized, /exception (?:is|was|has been) approved|waiver (?:is|was|has been) granted/i, question);
    assert.match(result.matches[0].answer, /cannot grant/i, question);
  }
});
