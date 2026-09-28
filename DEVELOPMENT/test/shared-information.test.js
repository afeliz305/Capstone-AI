const test=require("node:test");
const assert=require("node:assert/strict");
const fs=require("node:fs");
const path=require("node:path");
const {createSharedInformationStore,TTL_MS}=require("../js/chat/shared-information");
const navigation=require("../js/shared/portal-navigation");

function fixture(){
  let clock=Date.parse("2026-09-26T18:00:00Z"),id=0;
  const cryptoLike={randomUUID:()=>`00000000-0000-4000-8000-${String(++id).padStart(12,"0")}`};
  const store=createSharedInformationStore({now:()=>clock,cryptoLike,resolvePortalDestination:navigation.resolvePortalDestination});
  return{store,advance:amount=>{clock+=amount;}};
}

test("multiple user snippets retain honest temporary metadata without persistent storage",()=>{
  const f=fixture();
  const task=f.store.add({category:"Task",title:"Redacted task",term:"Fall 2026",sprint:"Sprint 2",text:"Acceptance criteria require testing invalid input and recording evidence."});
  const sprint=f.store.add({category:"Sprint",title:"Redacted sprint note",text:"The stated deadline in this copied note is October 2 at 5:00 PM."});
  const state=f.store.status();
  assert.equal(state.activeMode,"shared");assert.equal(state.shared.length,2);
  assert.match(task.id,/^shared-/);assert.notEqual(task.id,sprint.id);
  assert.equal(task.label,"User-provided, unverified text");
  assert.equal(Date.parse(task.addedAt)+TTL_MS,task.expiresAt);
  assert.equal(state.shared[0].text,undefined);
  const source=fs.readFileSync(path.join(__dirname,"../js/chat/shared-information.js"),"utf8");
  assert.doesNotMatch(source,/localStorage|sessionStorage|indexedDB|serviceWorker|caches\.open/);
});

test("shared retrieval supports paraphrases, multiple snippets, evidence and follow-ups",()=>{
  const f=fixture();
  f.store.add({category:"Task",title:"Testing task",text:"The acceptance criteria require automated testing for invalid input and a short evidence note."});
  f.store.add({category:"Sprint",title:"Sprint note",text:"The copied sprint deadline is October 2 at 5:00 PM. This copied note is not live."});
  const criteria=f.store.ask("Which acceptance criteria mention tests?");
  assert.equal(criteria.status,"matched");assert.match(criteria.answer,/Based on the information you shared/);assert.match(criteria.sources[0].excerpt,/automated testing/);
  const follow=f.store.ask("Where does it say that?");
  assert.equal(follow.status,"matched");assert.equal(follow.sources[0].sourceId,criteria.sources[0].sourceId);
  const deadline=f.store.ask("What due date is stated in this text?");
  assert.match(deadline.sources[0].excerpt,/October 2/);
  assert.equal(deadline.sources[0].destination.url,"https://capstone.cs.fiu.edu/portal#team");
  assert.equal(deadline.sources[0].destination.currentContentsChecked,false);
});

test("missing information and unclear copied tables fail closed",()=>{
  const f=fixture();
  f.store.add({category:"Grade",title:"Copied score rows",text:"Prototype Documentation\n18 40\n20 50"});
  const ambiguous=f.store.ask("What grade and component scores are posted?");
  assert.equal(ambiguous.status,"ambiguous");assert.match(ambiguous.answer,/columns are unclear/);assert.doesNotMatch(ambiguous.answer,/course total is/);
  f.store.newSession();
  f.store.add({category:"Task",title:"Task excerpt",text:"This task requires a short demonstration."});
  const missing=f.store.ask("What deadline is stated?");
  assert.equal(missing.status,"not_found");assert.match(missing.answer,/does not support an answer/);assert.match(missing.answer,/does not mean.*absent from your real account/i);
});

test("samples are distinct and never silently replace user-shared sources",()=>{
  const f=fixture();
  f.store.add({category:"Team",title:"Redacted team note",text:"The copied note lists a weekly team review."});
  f.store.loadSample();
  let state=f.store.status();assert.equal(state.activeMode,"sample");assert.equal(state.shared.length,1);assert.equal(state.sample.length,3);
  assert.ok(state.sample.every(source=>source.label==="Sample data — not your account"));
  f.store.activate("shared");state=f.store.status();assert.equal(state.activeMode,"shared");
  assert.match(f.store.ask("What review is listed?").sources[0].excerpt,/weekly team review/);
});

test("expiration, removal and new sessions invalidate old evidence",()=>{
  const f=fixture();
  const source=f.store.add({category:"Grade",title:"Redacted grade",text:"The copied component score is 18 out of 20."});
  assert.equal(f.store.ask("What score is shown?").status,"matched");
  assert.equal(f.store.remove(source.id),true);assert.equal(f.store.ask("Where does it say that?").status,"inactive");
  f.store.add({category:"Sprint",title:"Temporary sprint",text:"The copied deadline is tomorrow at noon."});
  f.advance(TTL_MS+1);const expired=f.store.status();assert.equal(expired.expiredCount,1);assert.equal(expired.activeMode,null);
  f.store.loadSample();f.store.newSession();assert.equal(f.store.status().activeMode,null);assert.equal(f.store.status().sample.length,0);
});

test("credential-like text is rejected and markup remains inert text",()=>{
  const f=fixture();
  assert.throws(()=>f.store.add({category:"Other",title:"Unsafe",text:"My verification code is 123456 and should be used."}),/Remove login codes/);
  f.store.add({category:"Task",title:"Literal markup",text:"The task says <img src=x onerror=alert(1)> testing is required."});
  const result=f.store.ask("What testing is required?");
  assert.match(result.sources[0].excerpt,/<img src=x onerror=alert\(1\)>/);
});
