// Pure, transport-neutral portal question routing shared by local development
// tooling and the owner-installable portal-native MIRA module.
const aliases={deadlines:['dates','due','assignment','schedule'],deadline:['dates','due'],coming:['next','upcoming'],upcoming:['next','coming'],finish:['deadline','due','end','date','schedule'],tasks:['task','assignment','sprint','board','work'],work:['task','card','assigned','in-progress'],assigned:['work','task','owner'],criteria:['acceptance','requirements','success'],evidence:['proof','recorded','history'],recorded:['evidence','history','proof'],notifications:['messages','unread','channel','inbox'],inbox:['messages','unread','channel'],conversation:['messages','channel'],teammates:['team','member','people'],professor:['product','owner'],status:['sprint','team','standing'],scores:['grade','points'],weights:['grade','weight'],retrospective:['retro','ceremony'],review:['ceremony'],standup:['stand-up','stand up','daily update','daily scrum'],showcase:['presentation','readiness'],letters:['recommendation','letter'],meetings:['ceremony','schedule'],today:['overview','dashboard'],rhythm:['standup','cards-moved','week'],blocked:['blocker','work'],snapshot:['today','work','rhythm','meeting','inbox']};
const injected=text=>/ignore (?:all |previous |the )?(?:instructions|rules)|system prompt|reveal (?:secrets|tokens|password)|execute (?:this|the) (?:code|command)|send .*?(?:cookie|token|password)/i.test(String(text||''));
const navigationQuery=q=>/^(?:take me there|open it|open that|show me that section|where does it say that|view (?:the |this )?source)[.!?]*$/i.test(String(q||'').trim());
const personalFollowup=q=>/^(?:what about|and |when is it|is it|how about|show me more|which one|guide me through this|just tell me the next step)/i.test(String(q||'').trim());
const personalQuery=q=>/\b(my|our|mine|i am|i have|am i|who am i|signed in|logged in|messages?|inbox|unread)\b/i.test(q)||/\b(?:current|this) sprint\b/i.test(q)||/\b(?:this|the) (?:card|task|(?:team )?conversation|page)\b/i.test(q)||/\b(?:assigned to me|recorded for this task|posted grade components|standing explanation|deadlines? (?:are )?coming up|current work|open work|tasks? (?:are )?still open|what is in progress|what is blocked|anything blocked|should i finish|card am i on|waiting for verify|still needs evidence|standups? (?:do i need|have i done)|caught up on standups|my capstone|my snapshot|what should i do next|just tell me the next step|next meeting|product owner|check my work|who should i ask|ask a person|human help|need a person)\b/i.test(q);
const publicAuthorityQuery=q=>/\b(?:mira|you) (?:cannot|can't|could not|couldn't|do not|don't) answer\b|\b(?:extension|extra time|extend(?:ed)? (?:my|the|an) assignment)\b|\b(?:what grade will|guess (?:my|the) grade|predict (?:my|the) grade)\b|\b(?:move me to|change (?:my|our) (?:capstone )?team)\b|\b(?:approve|mark) (?:my|our|the|this|a) card (?:as )?done\b|\b(?:another|other) student(?:'s)?\b|\bwhat (?:information )?(?:do i put|should i include) in (?:my |our )?(?:standup|stand-up|daily scrum)\b|\bwhere (?:do|should) we (?:submit|upload|document) (?:our )?sprint work\b/i.test(q);

function routeQuestion(q,context=''){return personalQuery(q)||(String(context).includes('private-')&&(navigationQuery(q)||personalFollowup(q)));}
function usablePublicResult(result){return!!result&&((result.indexed&&result.answerStatus!=='not_found')||['matched','choices'].includes(result.status));}
function sectionFor(q,contextRecords=[],activeSection=''){
  if(navigationQuery(q)&&contextRecords.length===1)return contextRecords[0].section;
  if(/\b(messages?|inbox|unread|channel|conversation)\b/i.test(q))return'Inbox';
  if(/\b(grade|score|points?|weight|remaining work|past term)\b/i.test(q))return'Grade';
  if(/\b(standing|trend|compare|comparison)\b/i.test(q))return'Standing';
  if(/\b(onboarding|orientation|intake|start here)\b/i.test(q))return'Start here';
  if(/\b(classmate|classmates)\b/i.test(q))return'Classmates';
  if(/\b(alumni|alumnus|alumna|alumni directory)\b/i.test(q))return'Alumni directory';
  if(/\b(connection|connected)\b/i.test(q))return'Connections';
  if(/\b(opportunit(?:y|ies)|internship|job)\b/i.test(q))return'Opportunities';
  if(/\b(team contact|linkedin)\b/i.test(q))return'Team contacts';
  if(/\b(ai anchor|anchor)\b/i.test(q))return'AI Anchors';
  if(/\b(capstone record|my record)\b/i.test(q))return'Record';
  if(/\b(showcase|readiness|poster|slides)\b/i.test(q))return'Showcase';
  if(/\b(recommendation letter|my letters?|letter status)\b/i.test(q))return'Letters';
  if(/\b(request a letter|letter request)\b/i.test(q))return'Request a letter';
  if(/\b(brand|logo|colors?|typography)\b/i.test(q))return'Brand & templates';
  if(/\b(resource|template|guide)\b/i.test(q))return'Resources';
  if(/\b(meetings?|ceremon(?:y|ies)|office hours|availability)\b/i.test(q))return'Meetings';
  if(/\b(my work|work do i have|work am i|am i working|working on|open work|finish|assigned work)\b/i.test(q))return'My work';
  if(/\b(rhythm|standups? (?:have i|did i|this week|last week)|caught up on standups|cards moved)\b/i.test(q))return'My rhythm';
  if(/\b(card|task|criteria|evidence|board|stand ?up|daily update|blocked|in progress|work(?: is)? assigned|current work)\b/i.test(q))return'Board';
  if(/\b(team|teammate|member|leader|leadership|product owner)\b/i.test(q))return'Team';
  if(contextRecords.length===1&&(personalFollowup(q)||/\b(?:it|that|those|previous|past|more|details?)\b/i.test(q)))return contextRecords[0].section;
  if(/^(?:what does this mean|what should i do here|what is missing|take me back to this page)[.!?]*$/i.test(String(q||'').trim())&&activeSection)return activeSection;
  return'Today';
}

function sectionsFor(q,contextRecords=[],activeSection=''){
  const text=String(q||'');
  if(/\b(?:my capstone|my snapshot|capstone snapshot)\b/i.test(text))return['Today','My work','Board','My rhythm','Meetings','Inbox','Team'];
  if(/\b(?:what am i working on|what work do i have open|what should i finish(?: next)?|do i have anything blocked|what card am i on|what is waiting for verify|what still needs evidence)\b/i.test(text))return['My work','Board','Today'];
  if(/\bwhat should i do next\b|\bjust tell me the next step\b/i.test(text))return['Today','My work','Board','My rhythm'];
  if(/\bcan i move (?:this|the|my) card to (?:review|verify|done)\b|\bcheck my (?:current )?(?:card|work)\b/i.test(text))return['Board'];
  if(/\b(?:who should i ask|ask a person|human help|need a person)\b/i.test(text))return['Team','People'];
  return[sectionFor(text,contextRecords,activeSection)];
}

function publicCompanionQuestion(q){
  const text=String(q||'');
  if(/\b(?:move|ready).*(?:review|verify|done)|\bcheck my (?:current )?(?:card|work)\b/i.test(text))return'What are the acceptance criteria, evidence, verification, and Product Owner decision requirements for a card?';
  if(/\bdoes (?:my |the )?evidence mean (?:this|the) card is done\b/i.test(text))return'Does evidence mean a card is Done?';
  return'';
}

function assistanceIntent(q){
  const text=String(q||'');
  if(/\b(?:my capstone|my snapshot|capstone snapshot)\b/i.test(text))return'snapshot';
  if(/\bwhat should i do next\b|\bjust tell me the next step\b/i.test(text))return'next-step';
  if(/\bcheck my (?:current )?(?:card|work)\b|\bcan i move (?:this|the|my) card\b/i.test(text))return'check-work';
  if(/\b(?:who should i ask|ask a person|human help|need a person)\b/i.test(text))return'human-help';
  return'answer';
}

module.exports={aliases,injected,navigationQuery,personalFollowup,personalQuery,publicAuthorityQuery,routeQuestion,usablePublicResult,sectionFor,sectionsFor,publicCompanionQuestion,assistanceIntent};
