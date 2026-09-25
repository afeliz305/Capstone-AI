const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const portal = require("../js/shared/portal-data");
const {reviewedKnowledge} = require("../server/lib/knowledge");
const {searchKnowledge} = require("../server/lib/search");
const entries = reviewedKnowledge(require("../data/capstone-knowledge.json"));
const search = (q, context) => searchKnowledge(entries,q,context);
function answer(q, id, context) {
  const result = search(q,context);
  assert.equal(result.status,"matched",q);
  assert.equal(result.matches[0].id,id,q);
  return result.matches[0];
}

test("all 19 reviewed sidebar sections have safe navigation-only results",()=>{
  assert.equal(portal.entries.length,19);
  assert.equal(new Set(entries.map(e=>e.id)).size,entries.length);
  for(const entry of portal.entries) {
    assert.equal(entry.url,"https://capstone.cs.fiu.edu/portal");
    assert.equal(entry.sourceKind,"portal-navigation");
    assert.equal(entry.access,"authenticated");
    for(const intent of entry.intents) {
      const result=answer(intent,entry.id);
      assert.equal(result.portalSection,entry.portalSection);
      assert.equal(result.liveDataConnected,false);
      assert.match(result.answer,/NOT connected/);
    }
    for(const followUp of entry.followUps) assert.notEqual(search(followUp,entry.id).status,"unmatched",followUp);
  }
});

test("new/unread messages never imply an inbox was checked",()=>{
  for(const q of ["Any new messages?","Do I have unread messages?","Can you read my messages?","Check for new messages","Check my notifications","Check again","Read them"]) {
    const result=answer(q,"portal-messages","portal-messages");
    assert.match(result.answer,/cannot check for new or unread messages/);
    assert.match(result.answer,/No messages have been read, marked as read, sent or changed/);
    assert.doesNotMatch(result.answer,/you have \d|no new messages|no unread messages/i);
  }
  assert.equal(search("Open my dashboard and messages").status,"choices");
  assert.equal(search("When is it due?","portal-messages").status,"unmatched");
  assert.ok(!search("I see an error message").matches.some(m=>m.id==="portal-messages"));
});

test("portal and Canvas messaging are separate and course facts remain searchable",()=>{
  for(const q of ["Check my Canvas messages","Open Canvas Inbox","Do I have unread Canvas notifications?"]) answer(q,"portal-canvas");
  answer("Open my dashboard","portal-overview");
  answer("What is my grade?","portal-grade");
  answer("Who is on my team?","portal-team");
  answer("What is my project?","portal-team");
  answer("Open my team contacts","portal-team-contacts");
  answer("How is my grade calculated?","syllabus-grading");
  answer("What is the attendance policy?","syllabus-attendance");
  answer("How should our team prepare for the showcase?","showcase-prep");
  answer("When is Sprint 2 due?","syllabus-sprint-2");
  assert.equal(search("When is Sprint 2 due in Spring 2027?").status,"unmatched");
});

test("portal shortcuts make no Auth, dashboard or paid model calls in Supabase mode",async()=>{
  const {createSupabaseApi}=require("../js/shared/supabase-api");
  const forbidden=new Proxy({}, {get(){throw new Error("Navigation must not access live account data");}});
  const api=createSupabaseApi({baseUrl:"https://example.test/Capstone/",knowledge:entries,staffClient:forbidden,guestClient:forbidden});
  for(const q of ["Any new messages?","Check my dashboard","What is my grade?"]) {
    const response=await api.fetch("/api/search?q="+encodeURIComponent(q));
    assert.equal(response.status,200);
    assert.deepEqual(await response.json(),{question:q,...search(q)});
  }
});

test("homepage exposes every section and explains the live-data boundary",()=>{
  const html=fs.readFileSync(path.join(__dirname,"../index.html"),"utf8");
  const markup=html.match(/<section class="topic-grid portal-shortcuts"[\s\S]*?<\/section>/)[0];
  assert.match(markup,/Live messages, unread counts and personal records are not connected/);
  const questions=[...markup.matchAll(/data-question="([^"]+)"/g)].map(m=>m[1].replaceAll("&amp;","&"));
  assert.equal(questions.length,19);
  const matches=questions.map(q=>search(q).matches[0].id);
  assert.deepEqual(new Set(matches),new Set(portal.entries.map(e=>e.id)));
  assert.doesNotMatch(JSON.stringify(portal),/sb_secret_|pwd=|https?:\/\/[^\s"]+:[^\s"]+@|afeli016@/);
});
