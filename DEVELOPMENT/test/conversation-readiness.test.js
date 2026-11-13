const test=require('node:test'),assert=require('node:assert/strict');
const {reviewedKnowledge}=require('../server/lib/knowledge');
const {searchKnowledge}=require('../server/lib/search');
const entries=reviewedKnowledge(require('../data/capstone-knowledge.json'));
const ask=(q,context='')=>searchKnowledge(entries,q,context,{pages:[],chunks:[]});
const ids=r=>r.matches.map(m=>m.id).join(',');

test('A criteria then evidence keeps reviewed source grounding',()=>{
 const first=ask('What are acceptance criteria?');const next=ask('What evidence do I need?',ids(first));
 assert.match(ids(first),/acceptance-criteria/);assert.match(ids(next),/board-evidence/);assert.match(next.matches[0].answer,/does not automatically/);
});
test('B stand-up then shorter draft retains template and uncertainty without inventing work',()=>{
 const first=ask('How do I prepare a standup?');const next=ask('Make that shorter',ids(first));
 assert.equal(next.status,'matched');assert.match(next.matches[0].answer,/Draft only/);assert.match(next.matches[0].answer,/\[verified work\]/);assert.match(next.matches[0].answer,/disagree/);assert.equal(ids(next),'daily-scrum,minutes-usage-guide');
 assert.equal(ask('Make that shorter').status,'unmatched');
});
test('C Review to Retrospective switches to the explicit new topic',()=>{
 const first=ask('How do I prepare a Sprint Review?');const next=ask('And retrospective?',ids(first));assert.match(ids(next),/sprint-retrospective-template/);
});
test('D grading exception remains a human decision after a drafting conversation',()=>{
 const r=ask('Can I get a grading exception?','daily-scrum');assert.notEqual(r.answerStatus,'answered');assert.match(r.matches[0].answer,/cannot|instructor|approval/i);
});
test('E personal grade cannot be inferred from a previous public topic',()=>{
 const r=ask('Where is my grade?','faro-board-evidence');assert.match(JSON.stringify(r),/navigation|cannot|not checked/i);assert.doesNotMatch(r.matches[0].answer,/your grade is [0-9]/i);
});
test('F unsupported topic does not reuse the previous answer as evidence',()=>{assert.equal(ask('quantum pizza robot','daily-scrum').status,'unmatched');});
test('G multipart criteria and evidence returns both approved sources',()=>{
 const r=ask('What are acceptance criteria and what evidence should I prepare?');assert.equal(ids(r),'faro-board-acceptance-criteria,faro-board-evidence');
 assert.match(r.matches[0].answer,/demo clip|test run/);assert.match(r.matches[0].answer,/acceptance/i);
});
