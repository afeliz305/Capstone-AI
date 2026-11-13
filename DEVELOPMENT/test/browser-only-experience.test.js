const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs');
const {searchKnowledge}=require('../server/lib/search');
const entries=require('../server/lib/knowledge').reviewedKnowledge(require('../data/capstone-knowledge.json'));
test('student personal questions have relevant development notes and official destinations without connector instructions',()=>{
 for(const question of ['What is my grade?','Who is on my team?','Show my sprint cards','Show my standups','Open my meetings','What are my deadlines?','What is my standing?','Check my messages']){
  const result=searchKnowledge(entries,question);assert.equal(result.status,'matched',question);
  const match=result.matches[0];assert.match(match.developmentNote,/Development note:.*FIU-approved/);
  assert.doesNotMatch(match.answer,/connector|pairing|extension installation|local helper|localhost/i);
  assert.ok(match.url,question);
  if(question.includes('grade'))assert.match(match.developmentNote,/grade-specific/);
 }
});
test('public guidance and production entry points require no local connector',()=>{
 for(const question of ['What counts as evidence?','What are acceptance criteria?','How do I post a standup?']){
  const result=searchKnowledge(entries,question);assert.ok(result.matches.length);assert.ok(!result.matches[0].developmentNote,question);
 }
 for(const file of ['index.html','js/chat/capstone-chat.js','js/shared/portal-data.js','js/shared/team-workspace.js']){
  const source=fs.readFileSync(require('node:path').join(__dirname,'..',file),'utf8');
  assert.doesNotMatch(source,/Connect my portal|Extension pairing required|approved local portal preview|local connector|portal-client\.js/i,file);
 }
});
