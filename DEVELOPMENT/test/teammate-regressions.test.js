const assert=require("node:assert/strict");
const fs=require("node:fs");
const path=require("node:path");
const test=require("node:test");
const {canonicalizeQuestion,searchKnowledge}=require("../server/lib/search");
const {reviewedKnowledge}=require("../server/lib/knowledge");
const {createSharedInformationStore}=require("../js/chat/shared-information");

const knowledge=reviewedKnowledge(JSON.parse(fs.readFileSync(path.join(__dirname,"../data/capstone-knowledge.json"),"utf8")));
let sequence=0;
const cryptoLike={randomUUID:()=>`00000000-0000-4000-8000-${String(++sequence).padStart(12,"0")}`};
const fictionalReadme=`Source: Fictional task for team testing

Task: Update the project README

Status: In progress

Acceptance criteria:
1. Include setup instructions.
2. List required environment-variable names without secret values.
3. Explain how to run the automated tests.

Evidence recorded:
A draft README is available.

Approval:
Not recorded.

Deadline:
Not provided.`;

test("Michael and Rome semantic retrieval prompts resolve consistently twice",()=>{
  const groups=[
    [["Where do I submit my course work?","How do I turn in assignments?"],new Set(["minutes-usage-guide","canvas-assignments"])],
    [["What do I put in my standup?","What goes in a stand-up?","What should I write for my daily update?"],new Set(["daily-scrum","minutes-usage-guide"])],
    [["What am I working on?","What is currently in progress?","What work do I have open?"],new Set(["dashboard-personal","portal-my-work","portal-board","portal-team"])]
  ];
  for(let pass=0;pass<2;pass++)for(const [questions,allowed] of groups)for(const question of questions){
    const result=searchKnowledge(knowledge,question);
    assert.equal(result.status,"matched",question);
    assert.ok(result.matches.some(match=>allowed.has(match.id)),question+": "+result.matches.map(match=>match.id).join(","));
  }
});

test("bounded typo correction stays within reviewed vocabulary",()=>{
  const cases={retrospecitve:/retrospective/,submitt:/submit/,assigment:/assignment/,"accpetance criteria":/acceptance criteria/,verfy:/verify/};
  for(let pass=0;pass<2;pass++)for(const [input,expected] of Object.entries(cases))assert.match(canonicalizeQuestion(input),expected,input);
  for(const exact of ["CAP-1002","10/15","A10029384","afeli016","93.5"]){
    const normalized=canonicalizeQuestion(exact);
    assert.match(normalized,/\d/,exact);
    assert.doesNotMatch(normalized,/acceptance|assignment|retrospective|standup|submit|verify/,exact);
  }
  const verify=searchKnowledge(knowledge,"verfy");
  assert.equal(verify.matches[0].id,"faro-board-verify");
});

test("fictional README fields preserve values, missing states, evidence, and follow-up provenance twice",()=>{
  for(let pass=0;pass<2;pass++){
    const store=createSharedInformationStore({cryptoLike});
    store.add({category:"Task",title:"Fictional README task",text:fictionalReadme});
    const criteria=store.ask("What must be completed for this task?");
    assert.equal(criteria.status,"matched");
    assert.match(criteria.answer,/Include setup instructions/);
    assert.match(criteria.answer,/environment-variable names/);
    assert.match(criteria.answer,/automated tests/);
    const proof=store.ask("Does this prove the task is finished?");
    assert.match(proof.answer,/does not prove/i);
    assert.match(proof.answer,/approval was not recorded/i);
    const due=store.ask("When is it due?");
    assert.match(due.answer,/no deadline was provided/i);
    assert.equal(due.valueState,"MISSING");
    const source=store.ask("Where does it say that?");
    assert.match(source.sources[0].excerpt,/Deadline:\s*\nNot provided/);
    const approval=store.ask("Who approved it?");
    assert.match(approval.answer,/approval was not recorded/i);
  }
});

test("Rome authority and multi-part shared-information prompts are bounded and complete twice",()=>{
  for(let pass=0;pass<2;pass++){
    const store=createSharedInformationStore({cryptoLike});
    store.add({category:"Task",title:"Fictional README task",text:fictionalReadme});
    const authority=store.ask("Can you make an exception for me?");
    assert.equal(authority.status,"not_authorized");
    assert.match(authority.answer,/cannot grant, approve, or promise an exception/i);
    assert.match(authority.answer,/approval was not recorded/i);
    const combined=store.ask("What must be completed and when is it due?");
    assert.match(combined.answer,/Include setup instructions/);
    assert.match(combined.answer,/environment-variable names/);
    assert.match(combined.answer,/No deadline was provided/i);
    assert.ok(combined.sources.some(source=>/Acceptance criteria/.test(source.excerpt)));
    assert.ok(combined.sources.some(source=>/Deadline/.test(source.excerpt)));
    assert.deepEqual([...new Set(combined.sources.map(source=>source.sourceId))],[combined.sources[0].sourceId]);
  }
});

test("Rome shared assignment-priority follow-up retains context without inventing an order twice",()=>{
  for(let pass=0;pass<2;pass++){
    const store=createSharedInformationStore({cryptoLike});
    store.add({category:"Task",title:"Fictional README task",text:fictionalReadme});
    store.ask("What must be completed for this task?");
    const result=store.ask("Which assignments should I submit first?");
    assert.equal(result.status,"partial");
    assert.match(result.answer,/one task/i);
    assert.match(result.answer,/does not provide a priority or comparison order/i);
    assert.match(result.answer,/cannot determine/i);
    assert.ok(result.sources.length>0);
    assert.ok(result.sources.every(source=>source.title==="Fictional README task"));
    assert.ok(!result.sources.some(source=>/^Deadline:/m.test(source.excerpt)));
  }
});

test("exact Michael public prompts and return-to-topic sequence remain stable twice",()=>{
  for(let pass=0;pass<2;pass++){
    const done=searchKnowledge(knowledge,"What does Done mean for a sprint card?");
    assert.notEqual(done.status,"not_found");
    assert.match(done.missingEvidence||done.matches[0]?.answer||"",/done|approval|source|evidence/i);
    const criteria=searchKnowledge(knowledge,"How should acceptance criteria be used when completing a card?");
    assert.notEqual(criteria.status,"not_found");
    assert.match(criteria.missingEvidence||criteria.matches[0]?.answer||"",/criteria|verify|source|evidence/i);
    const first=searchKnowledge(knowledge,"Where are the sprint meeting minutes?");
    searchKnowledge(knowledge,"What is the grading scale?");
    const returned=searchKnowledge(knowledge,"Where are the sprint meeting minutes?");
    assert.equal(returned.matches[0].id,first.matches[0].id);
  }
});

test("copied table without headers is never interpreted",()=>{
  for(let pass=0;pass<2;pass++){
    const store=createSharedInformationStore({cryptoLike});
    store.add({category:"Sprint",title:"Fictional copied sprint table",text:"Sprint 3 20 10/15\nSprint 4 25 11/02\nColumns were lost while copying."});
    const result=store.ask("What does the 20 mean?");
    assert.equal(result.status,"ambiguous");
    assert.match(result.answer,/column headings|columns are unclear/i);
    assert.match(result.answer,/will not guess/i);
  }
});

test("multiple shared sources retain one-source provenance",()=>{
  for(let pass=0;pass<2;pass++){
    const store=createSharedInformationStore({cryptoLike});
    const first=store.add({category:"Task",title:"Fictional README task",text:fictionalReadme});
    const second=store.add({category:"Task",title:"Fictional deployment task",text:"Owner: Jordan Example\n\nStatus: Ready for review\n\nReview date: November 10"});
    const owner=store.ask("Who owns the fictional deployment task?");
    assert.equal(owner.status,"matched");
    assert.deepEqual([...new Set(owner.sources.map(source=>source.sourceId))],[second.id]);
    assert.match(owner.answer,/Jordan Example/);
    assert.ok(!owner.sources.some(source=>source.sourceId===first.id));
  }
});

test("bounded public and shared follow-ups retain only the needed source context",()=>{
  for(let pass=0;pass<2;pass++){
    const sprint=searchKnowledge(knowledge,"Sprint 1");
    const next=searchKnowledge(knowledge,"What about the next one?",sprint.matches[0].id);
    assert.equal(next.matches[0].id,"syllabus-sprint-2");
    const template=searchKnowledge(knowledge,"Where are the sprint meeting minutes?");
    const destination=searchKnowledge(knowledge,"Where do I get it?",template.matches[0].id);
    assert.equal(destination.navigationRequested,true);
    assert.equal(destination.matches[0].id,template.matches[0].id);
    const store=createSharedInformationStore({cryptoLike});
    store.add({category:"Task",title:"Fictional README task",text:fictionalReadme});
    store.ask("What must be completed for this task?");
    const same=store.ask("What about this task?");
    assert.equal(same.status,"matched");
    assert.match(same.sources[0].excerpt,/Acceptance criteria/);
  }
});
