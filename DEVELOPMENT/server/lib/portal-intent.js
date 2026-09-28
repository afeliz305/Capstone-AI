// Pure, transport-neutral portal question routing shared by local development
// tooling and the owner-installable portal-native MIRA module.
const aliases={deadlines:['dates','due','assignment','schedule'],deadline:['dates','due'],coming:['next','upcoming'],upcoming:['next','coming'],finish:['deadline','due','end','date','schedule'],tasks:['task','assignment','sprint','board','work'],work:['task','card','assigned'],assigned:['work','task','owner'],criteria:['acceptance','requirements','success'],evidence:['proof','recorded','history'],recorded:['evidence','history','proof'],notifications:['messages','unread','channel'],inbox:['messages','unread','channel'],conversation:['messages','channel'],teammates:['team','member'],professor:['product','owner'],status:['sprint','team','standing'],scores:['grade','points'],weights:['grade','weight'],retrospective:['retro','ceremony'],review:['ceremony'],standup:['stand-up','update'],showcase:['presentation','readiness'],letters:['recommendation','letter']};
const injected=text=>/ignore (?:all |previous |the )?(?:instructions|rules)|system prompt|reveal (?:secrets|tokens|password)|execute (?:this|the) (?:code|command)|send .*?(?:cookie|token|password)/i.test(String(text||''));
const navigationQuery=q=>/^(?:take me there|open it|open that|show me that section|where does it say that|view (?:the |this )?source)[.!?]*$/i.test(String(q||'').trim());
const personalFollowup=q=>/^(?:what about|and |when is it|is it|how about|show me more|which one)/i.test(String(q||'').trim());
const personalQuery=q=>/\b(my|our|mine|i am|i have|am i|who am i|signed in|logged in|messages?|inbox|unread)\b/i.test(q)||/\b(?:current|this) sprint\b/i.test(q)||/\b(?:this|the) (?:card|task|(?:team )?conversation)\b/i.test(q)||/\b(?:assigned to me|recorded for this task|posted grade components|standing explanation|deadlines? (?:are )?coming up)\b/i.test(q);
const publicAuthorityQuery=q=>/\b(?:mira|you) (?:cannot|can't|could not|couldn't|do not|don't) answer\b|\b(?:extension|extra time|extend(?:ed)? (?:my|the|an) assignment)\b|\b(?:what grade will|guess (?:my|the) grade|predict (?:my|the) grade)\b|\b(?:move me to|change (?:my|our) (?:capstone )?team)\b|\b(?:approve|mark) (?:my|our|the|this|a) card (?:as )?done\b|\b(?:another|other) student(?:'s)?\b|\bwhat (?:information )?(?:do i put|should i include) in (?:my |our )?(?:standup|stand-up|daily scrum)\b|\bwhere (?:do|should) we (?:submit|upload|document) (?:our )?sprint work\b/i.test(q);

function routeQuestion(q,context=''){return personalQuery(q)||(String(context).includes('private-')&&(navigationQuery(q)||personalFollowup(q)));}
function usablePublicResult(result){return!!result&&((result.indexed&&result.answerStatus!=='not_found')||['matched','choices'].includes(result.status));}
function sectionFor(q,contextRecords=[]){
  if(navigationQuery(q)&&contextRecords.length===1)return contextRecords[0].section;
  if(/\b(messages?|inbox|unread|channel|conversation)\b/i.test(q))return'Messages';
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
  if(/\b(team|teammate|member|leader|leadership|product owner|card|task|criteria|evidence|board|work(?: is)? assigned)\b/i.test(q))return'Team';
  if(contextRecords.length===1&&(personalFollowup(q)||/\b(?:it|that|those|previous|past|more|details?)\b/i.test(q)))return contextRecords[0].section;
  return'Overview';
}

module.exports={aliases,injected,navigationQuery,personalFollowup,personalQuery,publicAuthorityQuery,routeQuestion,usablePublicResult,sectionFor};
