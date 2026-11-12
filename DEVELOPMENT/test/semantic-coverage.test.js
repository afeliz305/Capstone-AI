"use strict";

const assert = require("node:assert/strict");
const test = require("node:test");
const { reviewedKnowledge } = require("../server/lib/knowledge");
const { searchKnowledge } = require("../server/lib/search");

const knowledge = reviewedKnowledge(require("../data/capstone-knowledge.json"));
const search = (question, context = "") => searchKnowledge(knowledge, question, context);

// Each major owner-requested topic is exercised with official, natural,
// informal, typo-heavy, vague, authority/exception, and contextual follow-up
// wording. These are retrieval expectations, not generated answers.
const topics = [
  ["acceptance criteria","faro-board-acceptance-criteria",["What are acceptance criteria?","How do I know what the card has to satisfy?","whats the ac for this card","What are aceptance criteria?","What does this card need?"],"faro-board-acceptance-criteria"],
  ["evidence","faro-board-evidence",["What counts as evidence?","How do I prove my card works?","what proof do i add","What counts as evidance?","What should I attach?"],"faro-board-evidence"],
  ["Verify","faro-board-verify",["What does Verify mean?","Who can verify a card?","who checks my card","Who can varify a card?","What happens before Verify?"],"faro-board-verify"],
  ["Done","faro-board-review-decision",["What does Done mean for a card?","Who decides whether a card is accepted?","is my card done yet","What does Dnoe mean for a card?","Who decides after Verify?"],"faro-board-review-decision"],
  ["Sprint Review","sprint-review-template",["What is required for Sprint Review?","What goes in Sprint Review minutes?","what do we need for the demo meeting","What is required for Sprint Revieu?","What happens in the review meeting?"],"sprint-review-template"],
  ["Retrospective","sprint-retrospective-template",["What is required for Sprint Retrospective?","What goes in the retrospective?","what do we write in retro","What is required for the retrospectve?","How do we record process improvement?"],"sprint-retrospective-template"],
  ["standups","daily-scrum",["What goes in Daily Scrum minutes?","What should I put in my standup?","what goes in our status update","What goes in my standpu?","What do I write in the daily update?"],"daily-scrum"],
  ["attendance","syllabus-attendance",["What is the attendance policy?","How many classes can I miss?","what happens if i miss class","What is the attendence requirement?","Do I have to attend?"],"syllabus-attendance"],
  ["grading","syllabus-grading",["How are sprints graded?","How does the 60 40 split work?","how do points work","How does gradng work?","How is this scored?"],"syllabus-grading"],
  ["extensions","syllabus-late-work",["What is the extension policy?","Can I get extra time on an assignment?","what if im late","What is the extensoin policy?","What if I need more time?"],"syllabus-late-work"],
  ["deadlines","syllabus-deadlines",["What are the course deadlines?","Show the assignment schedule.","whats due this term","What are the deadlnes?","When is work due?"],"syllabus-deadlines"],
  ["submissions","canvas-assignments",["Where do I submit course work?","Should I upload my assignment to Canvas?","where do i turn the assignment in","Where is assignment submision?","Where do I post the assignment?"],"canvas-assignments"],
  ["sprint minutes","minutes-overview",["Where are the sprint minutes?","Where can I find the meeting-minutes templates?","need the scrum notes form","Where are the sprint minuts?","Where are the sprint records?"],"minutes-overview"],
  ["showcase","showcase-prep",["How should our team prepare for the showcase?","What is the showcase checklist?","what do we need for demo day","How should we prep for the showcas?","What materials do we need for showcase day?"],"showcase-prep"],
  ["brand/templates","brand-downloads",["Where are the brand templates?","Where can I get presentation templates?","need the official brand slide deck","Where are the brand templats?","Where are the downloads?"],"brand-downloads"],
  ["resources","portal-resources",["Open portal Resources","Where are the Capstone resources?","take me to resources","Open portal resorces","Open the reference section"],"portal-resources"],
  ["tutorials","portal-tutorials",["Open portal Tutorials","Where are the Capstone tutorials?","show me how-to videos","Open portal tutoral","Where can I learn the portal?"],"portal-tutorials"],
  ["Board","portal-board",["Open portal Board","Take me to my sprint board.","show my cards","Open my Bord","Take me to my card"],"portal-board"],
  ["My Work","portal-my-work",["Open portal My work","What am I working on?","show my open work","Open My worlk","What work is active?"],"portal-my-work"],
  ["Today","portal-overview",["Open portal Today","Open my dashboard.","show my overview","Open portal Todday","Where do I start today?"],"portal-overview"],
  ["Meetings","portal-meetings",["Open portal Meetings","Show upcoming ceremonies.","take me to team calls","Open my metings","Open Find a time"],"portal-meetings"],
  ["Inbox","portal-messages",["Open portal Inbox","Check my messages.","show my inbox","Open my inbxo","Any new messages?"],"portal-messages"],
  ["My Rhythm","portal-rhythm",["Open portal My rhythm","Open my rhythm.","show my routine","Open my rythm","Where is My rhythm?"],"portal-rhythm"],
  ["Team","portal-team",["Open portal Team","Who is on my team?","show my project group","Open my Teamm","What is my project?"],"portal-team"],
  ["Grade","portal-grade",["Open portal Grade","What is my grade?","show my score","Open portal Graed","Check my grades"],"portal-grade"],
  ["Standing","portal-standing",["Open portal Standing","What is my standing?","show my progress standing","Open portal standng","How am I doing?"],"portal-standing"],
  ["Product Owner","faro-board-review-decision",["What can the Product Owner do in Review?","Who decides whether a card is accepted?","what does the PO decide","What can the Prodcut Owner approve?","Who makes the acceptance decision?"],"faro-board-review-decision"],
  ["Team Leader","contact-help",["How do I contact my team leader?","Who should the team leader ask about coordination?","need help from our lead","How do I contact my team leder?","Who helps a team leader with a blocker?"],"contact-help"],
  ["AI Anchor","portal-ai-anchors",["Open portal AI Anchors","What are AI Anchors?","show the AI helper section","Open portal AI Ancor","Where is AI Anchor guidance?"],"portal-ai-anchors"],
  ["instructor","contact-help",["How do I contact the instructor?","How do I contact the professor?","need to ask the teacher","How do I contact the instrctor?","Who do I ask about the course?"],"contact-help"],
  ["help/escalation","contact-help",["I still need help.","Who should I ask when MIRA cannot answer?","i need a real person","I still need helpp","Where can I escalate this?"],"contact-help"]
];

function accepted(result, ids) {
  return result.status !== "unmatched" && result.matches.length > 0 && ids.includes(result.matches[0].id);
}

test("major-topic semantic matrix covers seven realistic wording classes per topic", () => {
  const failures = [];
  let total = 0;
  for (const [topic, primary, queries, context] of topics) {
    const directIds = [primary, ...(topic === "tutorials" ? ["tutorials"] : []), ...(topic === "Standing" ? ["dashboard-personal"] : [])];
    for (const question of queries) {
      total += 1;
      const result = search(question);
      if (!accepted(result, directIds)) failures.push({ topic, class: "direct", question, actual: result.matches[0]?.id || result.status });
    }

    total += 1;
    const authority = search("Can the professor make an exception to this requirement?", context);
    const authorityIds = primary.startsWith("portal-") ? ["contact-help"] : [primary, "faro-board-review-decision"];
    if (!accepted(authority, authorityIds) || authority.responseStatus !== "partial") failures.push({ topic, class: "authority", actual: authority.matches[0]?.id || authority.status });

    total += 1;
    const follow = search("Tell me more", context);
    if (!accepted(follow, [primary])) failures.push({ topic, class: "follow-up", actual: follow.matches[0]?.id || follow.status });
  }
  assert.equal(total, topics.length * 7);
  assert.deepEqual(failures, []);
});

test("bounded fuzzy vocabulary repairs safe domain typos but not names, IDs, dates, grades or tickets", () => {
  for (const [question, id] of [
    ["What are aceptance criteria?", "faro-board-acceptance-criteria"],
    ["What counts as evidance?", "faro-board-evidence"],
    ["Who can varify a card?", "faro-board-verify"],
    ["What is the attendence policy?", "syllabus-attendance"],
    ["Open portal resorces", "portal-resources"]
  ]) assert.equal(search(question).matches[0]?.id, id, question);

  for (const value of ["Sadjadi", "CAP-1002", "December 4 2026", "93.5", "afeli016"]) {
    const result = search(`Correct or guess ${value}`);
    assert.notEqual(result.scopeNote, "fuzzy-corrected-sensitive-value", value);
  }
});

test("coverage inventory is complete and contains exactly the owner-requested major topics", () => {
  assert.equal(topics.length, 31);
  assert.equal(new Set(topics.map(topic => topic[0])).size, 31);
  assert.equal(topics.reduce((count, topic) => count + topic[2].length + 2, 0), 217);
});
