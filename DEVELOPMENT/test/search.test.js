const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const { searchKnowledge, tokenize } = require("../server/lib/search");
const { reviewedKnowledge } = require("../server/lib/knowledge");

const knowledge = JSON.parse(
  fs.readFileSync(path.join(__dirname, "..", "data", "capstone-knowledge.json"), "utf8")
);

test("returns a reviewed answer for a known question", () => {
  const result = searchKnowledge(knowledge, "Where can I find the sprint meeting minutes templates?");
  assert.equal(result.status, "matched");
  assert.equal(result.matches[0].id, "minutes-overview");
  assert.match(result.matches[0].url, /^https:\/\/capstone\.cs\.fiu\.edu\//);
});

test("routes sprint-minutes button text and reasonable paraphrases to the reviewed public guide", () => {
  for (const question of [
    "Where are the sprint minutes?",
    "Where are the sprint meeting minutes?",
    "Where can I find our sprint meeting records?"
  ]) {
    const result = searchKnowledge(knowledge, question);
    assert.equal(result.status, "matched", question);
    assert.equal(result.matches[0].id, "minutes-overview", question);
    assert.equal(result.matches[0].access, "public", question);
    assert.match(result.matches[0].url, /How_To_Use_Capstone_Minutes_Templates\.docx$/);
    assert.doesNotMatch(result.matches[0].answer, /Backlog Grooming/);
  }
});

test("answers public brand facts separately from authenticated Brand & templates navigation", () => {
  const entries=reviewedKnowledge(knowledge);
  const cases=[
    ["Where are the brand templates?","brand-downloads","https://brand.fiu.edu/downloads/"],
    ["Show me the branding templates.","brand-downloads","https://brand.fiu.edu/downloads/"],
    ["What are the official FIU colors?","brand-colors","https://brand.fiu.edu/visual-styles/colors/"],
    ["Where can I find the FIU logo?","brand-logo","https://brand.fiu.edu/logos/"]
  ];
  for(const [question,id,url] of cases){
    const result=searchKnowledge(entries,question,null,{schemaVersion:1,pages:[]});
    assert.equal(result.status,"matched",question);
    assert.equal(result.matches[0].id,id,question);
    assert.equal(result.matches[0].url,url,question);
    assert.equal(result.matches[0].access,"public",question);
  }
  const colors=searchKnowledge(entries,"What are FIU official colors?",null,{schemaVersion:1,pages:[]});
  assert.equal(colors.answerStatus,"answered");
  assert.equal(colors.matches[0].id,"brand-colors");
  const presentation=searchKnowledge(entries,"Where can I get presentation templates?",null,{schemaVersion:1,pages:[]});
  assert.equal(presentation.answerStatus,"answered");
  assert.equal(presentation.matches[0].id,"brand-downloads");
  const navigation=searchKnowledge(entries,"Open Brand & templates.");
  assert.equal(navigation.matches[0].id,"portal-brand");
  assert.equal(navigation.matches[0].url,"https://capstone.cs.fiu.edu/portal#brandhub");
  assert.equal(navigation.matches[0].sourceKind,"portal-navigation");
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
