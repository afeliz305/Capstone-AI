const test = require("node:test");
const assert = require("node:assert/strict");
const knowledge = require("../data/capstone-knowledge.json");
const { findKeywordLinks, isCapstoneUrl } = require("../server/lib/keyword-links");
const { searchKnowledge } = require("../server/lib/search");

test("keyword links point to reviewed pages and exact document URLs", () => {
  const cases = [
    ["sprint planning", "sprint-planning", "/static/templates/Sprint_Planning_Minutes_Template.docx"],
    ["daily scrum", "daily-scrum", "/static/templates/Daily_Scrum_Minutes_Template.docx"],
    ["showcase", "showcase-prep", "/resources"],
    ["tutorials", "tutorials", "/tutorials"],
    ["past projects", "projects-archive", "/projects"],
    ["logo", "brand-logo", "/portal"]
  ];
  for (const [question, id, pathname] of cases) {
    const [link] = findKeywordLinks(knowledge, question);
    assert.equal(link.id, id, question);
    assert.equal(link.url, "https://capstone.cs.fiu.edu" + pathname);
    assert.ok(link.keywords.length);
    assert.ok(["public", "authenticated"].includes(link.access));
  }
});

test("keywords ignore case and punctuation and accept reviewed plural and spelling variants", () => {
  for (const [question, id] of [
    ["TUTORIAL!", "tutorials"], ["stand-up?", "daily-scrum"],
    ["sprint-planning", "sprint-planning"], ["LOGOS", "brand-logo"],
    ["colours", "brand-colors"], ["poster", "showcase-materials"]
  ]) assert.equal(findKeywordLinks(knowledge, question)[0].id, id, question);
});

test("whole-word matching does not link substrings or generic help words", () => {
  for (const question of ["ghostwriter", "retrofitted", "reassignment", "help", "attendance", "parking", "What is the professor's favorite restaurant?"]) {
    assert.deepEqual(findKeywordLinks(knowledge, question), [], question);
  }
});

test("specific phrases take precedence over overlapping broad keywords", () => {
  assert.deepEqual(findKeywordLinks(knowledge, "showcase judge").map(link => link.id), ["judge-showcase"]);
  const entries = [
    { id: "broad", linkKeywords: ["sprint"], url: "https://capstone.cs.fiu.edu/portal" },
    { id: "specific", linkKeywords: ["sprint planning"], url: "https://capstone.cs.fiu.edu/resources" }
  ];
  assert.deepEqual(findKeywordLinks(entries, "sprint planning").map(link => link.id), ["specific"]);
});

test("multi-topic questions get independent links, without changing answer confidence", () => {
  const result = searchKnowledge(knowledge, "sprint planning and tutorials");
  assert.equal(result.status, "matched");
  assert.equal(result.matches[0].id, "sprint-planning");
  assert.deepEqual(result.links.map(link => link.id), ["sprint-planning", "tutorials"]);
  assert.deepEqual(searchKnowledge(knowledge, "Where can I park my car?").links, []);
});

test("repeated keywords are grouped and the number of navigation links stays bounded", () => {
  const links = findKeywordLinks(knowledge, "tutorial tutorial tutorials workspace tour zoom room logo colors projects sprint planning showcase");
  assert.equal(links.length, 4);
  assert.equal(links.filter(link => link.id === "tutorials").length, 1);
  assert.deepEqual(links[0].keywords, ["tutorials", "workspace tour", "zoom room"]);
});

test("keyword navigation rejects unsafe URLs, lookalike domains, and credentials", () => {
  const invalid = [
    "javascript:alert(1)", "data:text/html,hello", "http://capstone.cs.fiu.edu/resources",
    "https://capstone.cs.fiu.edu.evil.test/tutorials", "https://capstone.cs.fiu.edu@evil.test/",
    "https://user:pass@capstone.cs.fiu.edu/portal", "//capstone.cs.fiu.edu/portal", "/portal",
    "https://capstone.cs.fiu.edu:444/portal"
  ];
  for (const url of invalid) {
    assert.equal(isCapstoneUrl(url), false, url);
    assert.deepEqual(findKeywordLinks([{ id: "bad", url, linkKeywords: ["tutorial"] }], "tutorial"), []);
  }
  assert.equal(isCapstoneUrl("https://capstone.cs.fiu.edu/tutorials"), true);
});

test("all curated navigation entries reference existing knowledge sources and omit runtime data", () => {
  for (const entry of knowledge.filter(entry => entry.linkKeywords?.length)) {
    assert.ok(isCapstoneUrl(entry.url), entry.id);
    const link = findKeywordLinks([entry], entry.linkKeywords[0])[0];
    assert.equal(link.url, entry.url);
    assert.equal(link.access, entry.access);
    assert.equal(link.answer, undefined);
    assert.equal(link.content, undefined);
  }
});
