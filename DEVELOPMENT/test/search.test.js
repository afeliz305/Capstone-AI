const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const { searchKnowledge, tokenize } = require("../server/lib/search");

const knowledge = JSON.parse(
  fs.readFileSync(path.join(__dirname, "..", "data", "capstone-knowledge.json"), "utf8")
);

test("returns a reviewed answer for a known question", () => {
  const result = searchKnowledge(knowledge, "Where can I find the sprint meeting minutes templates?");
  assert.equal(result.status, "matched");
  assert.equal(result.matches[0].id, "minutes-overview");
  assert.match(result.matches[0].url, /^https:\/\/capstone\.cs\.fiu\.edu\//);
});

test("offers reviewed choices when a question spans two topics", () => {
  const result = searchKnowledge(knowledge, "Which FIU logo and colors should I use?");
  assert.equal(result.status, "choices");
  assert.deepEqual(result.matches.slice(0, 2).map((match) => match.id), ["brand-logo", "brand-colors"]);
});

test("does not invent an answer for an unsupported question", () => {
  const result = searchKnowledge(knowledge, "What is the professor's favorite restaurant?");
  assert.equal(result.status, "unmatched");
  assert.deepEqual(result.matches, []);
});

test("routes private student questions to the privacy boundary", () => {
  const result = searchKnowledge(knowledge, "What is my grade?");
  assert.equal(result.status, "matched");
  assert.equal(result.matches[0].id, "grades-privacy");
});

test("normalizes common Scrum phrasing", () => {
  assert.deepEqual(tokenize("What goes in our retro?"), ["goes", "retrospective"]);
});
