const test=require('node:test'),assert=require('node:assert/strict');
const {reviewedKnowledge}=require('../server/lib/knowledge');
const {searchKnowledge}=require('../server/lib/search');
const knowledge=reviewedKnowledge(require('../data/capstone-knowledge.json'));
test('presentation questions select reviewed guidance before the broad website index',()=>{
 const index={pages:[],chunks:[]};
 for(const [q,id] of [
 ['What is the difference between Verify and Done?','faro-board-verify'],
 ['How do I prepare a retrospective?','sprint-retrospective-template'],
 ['What are attendance requirements?','syllabus-attendance'],
 ['Can I change teams?','contact-help'],
 ['What does the Product Owner do?','faro-board-review-decision'],
 ['How do I post a standup?','daily-scrum']]){
  const result=searchKnowledge(knowledge,q,'',index);assert.equal(result.matches[0].id,id,q);assert.ok(result.matches[0].answer);
 }
 const multi=searchKnowledge(knowledge,'What are acceptance criteria and what evidence should I prepare?','',index);
 assert.deepEqual(multi.matches.map(x=>x.id),['faro-board-acceptance-criteria','faro-board-evidence']);
 const change=searchKnowledge(knowledge,'Can I change teams?','',index);assert.equal(change.answerStatus,'escalation');assert.match(change.matches[0].answer,/cannot change team membership/);
 const follow=searchKnowledge(knowledge,'Tell me more','faro-board-verify',index);assert.equal(follow.matches[0].id,'faro-board-verify');
});
