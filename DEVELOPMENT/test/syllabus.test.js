const test = require("node:test");
const assert = require("node:assert/strict");
const syllabus = require("../js/shared/syllabus-data");
const {mergeKnowledge} = require("../server/lib/knowledge");
const {searchKnowledge} = require("../server/lib/search");
const entries = mergeKnowledge(require("../data/capstone-knowledge.json"), syllabus.entries);
const search = (q, context) => searchKnowledge(entries, q, context);
function answer(q, id, context) {
  const result = search(q, context);
  assert.equal(result.status,"matched",q);
  assert.equal(result.matches[0].id,id,q);
  return result.matches[0];
}
test("reviewed syllabus entries have unique IDs, original page references and no meeting credentials",()=>{
  assert.equal(new Set(entries.map(e=>e.id)).size,entries.length);
  for(const entry of syllabus.entries) {
    assert.match(entry.url,/^pages\/syllabus\.html#[a-z0-9-]+$/);
    assert.ok(entry.answer.length>30);
    if(entry.sourceKind==="syllabus") assert.match(entry.sourcePages,/^[\d, -]+$/);
    assert.doesNotMatch(JSON.stringify(entry),/pwd=|zoom\.us\/j\/|sb_secret_|service_role/i);
    for(const question of entry.followUps) assert.notEqual(search(question).status,"unmatched",question);
  }
});
test("Fall 2026 posting and contact policies override obsolete generic instructions",()=>{
  const ambiguous=search("Where do I submit my work?");
  assert.equal(ambiguous.responseStatus,"partial");assert.equal(ambiguous.matches[0].id,"minutes-usage-guide");assert.ok(ambiguous.matches.some(match=>match.id==="canvas-assignments"));
  assert.match(ambiguous.missingEvidence,/exact destination depends on the specific work item/);
  const submission=answer("Where do I submit weekly assignments?","canvas-assignments");assert.match(submission.answer,/NOT uploaded to Canvas/);assert.equal(submission.sourcePages,"7");
  assert.match(answer("How do I contact the professor?","contact-help").answer,/Canvas Inbox/);
  assert.doesNotMatch(entries.find(e=>e.id==="sprint-planning").answer,/Every teammate should submit the same completed file to .*Canvas/);
});
test("each sprint returns its own goal, exact points, Eastern deadline and grace",()=>{
  const due=["September 18","October 2","October 16","October 30","November 13"];
  const grace=["September 20","October 4","October 18","November 1","November 15"];
  for(let n=1;n<=5;n++) {
    const result=answer(`When is Sprint ${n} due?`,`syllabus-sprint-${n}`);
    assert.ok(result.answer.includes(due[n-1]+", 2026"));
    assert.ok(result.answer.includes(grace[n-1]+", 2026"));
    assert.ok(result.answer.includes((25+n*25)+" points"));
    assert.match(result.answer,/11:59 PM Eastern/);
  }
  assert.equal(search("Sprint 2 and Sprint 4").status,"choices");
});
test("course grading scale, participation and attendance remain separate from personal records",()=>{
  assert.match(answer("How are sprints graded?","syllabus-grading").answer,/60% team artifact and 40% individual participation/);
  assert.match(answer("What is the grade scale?","syllabus-grade-scale").answer,/A 930-1000; A- 900-929/);
  assert.match(answer("What is the attendance policy?","syllabus-attendance").answer,/NOT required for RVC; U01 requires it/);
  for(const q of ["What is my grade?","What is my attendance?","What are my tasks?","What is my progress?","What is my project?","Who is on my team?","Who is my Product Owner?","What are my deadlines?","How many standups have I missed?"]) {
    const result=answer(q,"dashboard-personal");
    assert.match(result.answer,/NOT connected/);
    assert.match(result.answer,/cannot see/);
  }
  answer("How is my grade calculated?","syllabus-grading");
});
test("December conflicts are surfaced and the judging event is not confused with its submission date",()=>{
  const prep=answer("When is showcase preparation due?","syllabus-showcase-preparation");
  assert.match(prep.answer,/December 2, 2026/);assert.match(prep.answer,/December 1/);assert.match(prep.answer,/CONFLICT/);
  const show=answer("When is the Capstone Showcase?","syllabus-showcase");
  assert.match(show.answer,/December 4, 2026/);assert.match(show.answer,/December 3/);assert.match(show.answer,/CONFLICT/);
  const judging=answer("When are evaluations due?","syllabus-virtual-showcase");
  assert.match(judging.answer,/EVENT is Friday December 11/);assert.match(judging.answer,/due Sunday December 13/);
  const final=answer("What are the final deliverables?","syllabus-final");
  assert.match(final.answer,/December 14, 2026/);assert.match(final.answer,/NO weekend grace/);
  assert.match(final.answer,/does not enumerate every required file/);
});
test("AI, data use, workload and support are searchable as course facts",()=>{
  assert.match(answer("What is the AI disclosure policy?","syllabus-ai").answer,/what the tool got wrong/);
  assert.match(answer("What data may we use?","syllabus-data-policy").answer,/public or synthetic/);
  assert.match(answer("How many hours per week?","syllabus-overview").answer,/5-6 hours/);
  assert.match(answer("When are office hours?","syllabus-office-hours").answer,/1:00-2:00 PM Eastern/);
  assert.match(answer("What is the late work policy?","syllabus-late-work").answer,/NO weekend grace/);
});
test("follow-ups preserve only a reviewed topic ID, and unrelated questions switch topics",()=>{
  answer("When is it due?","syllabus-sprint-2","syllabus-sprint-2");
  answer("How many points?","syllabus-sprint-4","syllabus-sprint-4");
  answer("Where do I submit it?","canvas-assignments","syllabus-sprint-2");
  answer("How is it graded?","syllabus-grading","syllabus-sprint-2");
  answer("What is the attendance policy?","syllabus-attendance","syllabus-sprint-2");
  assert.equal(search("When is it due?","<script>bad</script>").status,"unmatched");
  assert.match(search("When is it due?").scopeNote,/Which assignment or sprint/);
  assert.equal(search("What is the professor's favorite restaurant?","syllabus-sprint-2").status,"unmatched");
  assert.equal(search("When is Sprint 2 due in Spring 2027?").status,"unmatched");
});
test("Supabase course search never calls Auth, a dashboard API or a paid model",async()=>{
  const {createSupabaseApi}=require("../js/shared/supabase-api");
  const forbidden=new Proxy({}, {get(){throw new Error("Search must not access account data");}});
  const api=createSupabaseApi({baseUrl:"https://example.test/Capstone/",knowledge:entries,staffClient:forbidden,guestClient:forbidden});
  for(const [q,context] of [["What is my grade?",""],["When is it due?","syllabus-sprint-2"]]) {
    const result=await api.fetch("/api/search?q="+encodeURIComponent(q)+"&context="+context);
    assert.equal(result.status,200);
    assert.deepEqual(await result.json(),{question:q,...search(q,context)});
  }
});
