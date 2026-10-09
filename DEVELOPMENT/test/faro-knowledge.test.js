"use strict";

const assert=require("node:assert/strict");
const test=require("node:test");
const dataset=require("../docs/faro-review-dataset.json");
const faro={
  ...require("../js/shared/faro-knowledge"),
  ...require("../server/lib/faro-review-metadata")
};
const {reviewedKnowledge}=require("../server/lib/knowledge");
const {searchKnowledge}=require("../server/lib/search");

const knowledge=reviewedKnowledge(require("../data/capstone-knowledge.json"));
const search=(question,context="")=>searchKnowledge(knowledge,question,context);

test("reviewed FARO dataset has the expected bounded candidate set",()=>{
  assert.equal(dataset.dataset,"FARO review candidates");
  assert.equal(dataset.items.length,15);
  assert.deepEqual(dataset.items.reduce((counts,item)=>{
    counts[item.tier]=(counts[item.tier]||0)+1;
    return counts;
  },{}),{1:5,2:9,3:1});
  assert.equal(new Set(dataset.items.map(item=>item.id)).size,15);
  assert.equal(new Set(faro.vocabulary.map(item=>item.id)).size,15);
  assert.deepEqual(new Set(faro.vocabulary.map(item=>item.id)),new Set(dataset.items.map(item=>item.id)));
});

test("each ingested FARO item retains provenance while displaying the official portal source",()=>{
  assert.equal(faro.entries.length,8);
  for(const entry of faro.entries){
    assert.match(entry.id,/^faro-board-/);
    assert.ok(entry.canonicalQuestion);
    assert.ok(entry.answer);
    assert.equal(entry.category,"Board workflow");
    assert.equal(entry.provenance,"FARO_CURATED");
    assert.match(entry.faroSourceTitle,/FARO contextual vocabulary/);
    assert.equal(entry.faroSourceUrl,"https://capstone.cs.fiu.edu/board");
    assert.equal(entry.underlyingOfficialSource.url,"https://capstone.cs.fiu.edu/board");
    assert.equal(entry.sourceTitle,"Capstone portal · Board workflow");
    assert.equal(entry.url,"https://capstone.cs.fiu.edu/board");
    assert.ok(entry.authorityLevel);
    assert.ok(entry.term);
    assert.ok(entry.applicability);
    assert.ok(entry.aliases.length);
    assert.equal(entry.navigationTarget,"https://capstone.cs.fiu.edu/board");
    assert.equal(entry.reviewedAt,"2026-10-09");
  }
  const publicResult=search("What are acceptance criteria?").matches[0];
  assert.equal(publicResult.provenance,"FARO_CURATED");
  assert.equal(publicResult.term,"Fall 2026 / generic workflow");
  assert.equal(publicResult.sourceTitle,"Capstone portal · Board workflow");
  assert.equal(publicResult.underlyingOfficialSource.authority,"current portal instruction");
});

test("Tier 1 acceptance criteria handles canonical, paraphrase, typo, follow-up, source and navigation",()=>{
  for(const question of ["What are acceptance criteria?","What criteria do I have to satisfy?","What are aceptance criteria?"]){
    const result=search(question);
    assert.equal(result.matches[0].id,"faro-board-acceptance-criteria",question);
    assert.equal(result.responseStatus,"answered",question);
  }
  const follow=search("Who decides that?","faro-board-acceptance-criteria");
  assert.equal(follow.matches[0].id,"faro-board-review-decision");
  const source=search("Where does it say that?","faro-board-acceptance-criteria");
  assert.equal(source.navigationRequested,true);
  assert.equal(source.matches[0].url,"https://capstone.cs.fiu.edu/board");
  assert.equal(search("Open my Board").matches[0].id,"portal-board");
});

test("Tier 1 evidence remains separate from Done, approval and acceptance",()=>{
  for(const question of ["What counts as evidence?","How do I prove my card works?","What counts as evidance?"]){
    assert.equal(search(question).matches[0].id,"faro-board-evidence",question);
  }
  const done=search("Does adding evidence mean the card is done?");
  assert.equal(done.matches[0].id,"faro-board-evidence");
  assert.match(done.matches[0].answer,/does not automatically mean/i);
  assert.match(done.matches[0].answer,/verified, accepted, or Done/i);
  assert.equal(search("Does that mean Done?","faro-board-evidence").matches[0].id,"faro-board-evidence");
  assert.equal(search("Where does it say that?","faro-board-evidence").navigationRequested,true);
  assert.equal(search("Take me to my card").matches[0].id,"portal-board");
});

test("Tier 1 Verify explains the role but keeps the transition checklist incomplete",()=>{
  for(const question of ["Who can verify a card?","Can the card owner verify their own work?","Who can varify a card?"]){
    assert.equal(search(question).matches[0].id,"faro-board-verify",question);
  }
  const transition=search("What happens before a card goes to Verify?");
  assert.equal(transition.responseStatus,"partial");
  assert.equal(transition.matches[0].id,"faro-board-verify");
  assert.match(transition.missingEvidence,/not a complete course-wide checklist/i);
  assert.equal(search("What happens after verification?","faro-board-verify").matches[0].id,"faro-board-review-decision");
  assert.equal(search("Where does it say that?","faro-board-verify").navigationRequested,true);
  assert.equal(search("Open Review on my Board").matches[0].id,"portal-board");
});

test("Tier 1 Product Owner guidance never grants approval or claims private status",()=>{
  for(const question of ["Who decides whether this is accepted?","What can the PO do in reveiw?"]){
    assert.equal(search(question).matches[0].id,"faro-board-review-decision",question);
  }
  const approval=search("Can MIRA approve it?");
  assert.equal(approval.responseStatus,"partial");
  assert.equal(approval.matches[0].id,"faro-board-review-decision");
  assert.match(approval.missingEvidence,/cannot see or decide/i);
  assert.doesNotMatch(JSON.stringify(approval),/(?:has been|was) approved|approval granted/i);
  assert.equal(search("Where does it say that?","faro-board-review-decision").navigationRequested,true);
  assert.equal(search("Open the Board").matches[0].id,"portal-board");
});

test("Tier 1 stand-up terminology uses stronger official sources and preserves the cadence conflict",()=>{
  for(const question of ["What should go in my standup?","What do I write in my daily update?","What belongs in my status update?"]){
    const result=search(question);
    assert.equal(result.matches[0].id,"daily-scrum",question);
    assert.notEqual(result.matches[0].provenance,"FARO_CURATED",question);
  }
  const cadence=search("How often are stand-ups?");
  assert.equal(cadence.responseStatus,"partial");
  assert.match(cadence.missingEvidence,/conflict/i);
  assert.doesNotMatch(JSON.stringify(cadence),/2 or more a week/i);
  assert.equal(search("Open my standup form").matches[0].id,"portal-board");
});

test("all reviewed meeting vocabulary is navigation-only",()=>{
  for(const question of ["Open Find a time","Open the meeting poll","Start a team call","Open my calendar feed"]){
    const result=search(question);
    assert.equal(result.matches[0].id,"portal-meetings",question);
    assert.equal(result.matches[0].sourceKind,"portal-navigation",question);
  }
});

test("conflicts remain explicit, unresolved and absent from live FARO answers",()=>{
  assert.deepEqual(faro.conflicts.map(conflict=>conflict.id),[
    "faro-conflict-standup-frequency","faro-conflict-office-hours"
  ]);
  assert.ok(faro.conflicts.every(conflict=>conflict.status==="HUMAN_REVIEW_REQUIRED"));
  const answers=JSON.stringify(faro.entries);
  assert.doesNotMatch(answers,/2 or more a week|schedule to be confirmed/i);
  assert.ok(!faro.entries.some(entry=>/standup-frequency|office-hours/.test(entry.id)));
});

test("private and generated FARO content stays excluded",()=>{
  assert.deepEqual(faro.excluded,[
    "generated FARO responses","FARO history","private prompts","personal status",
    "grades","message content","selected private work","account identifiers"
  ]);
  const forbiddenKeys=new Set(["history","messages","grades","accountId","privateData","selectedWork","generatedResponse"]);
  for(const entry of faro.entries){
    assert.ok(!Object.keys(entry).some(key=>forbiddenKeys.has(key)),entry.id);
    assert.doesNotMatch(`${entry.answer} ${entry.content}`,/another student|private prompt|message content|account identifier|selected work/i,entry.id);
  }
});
