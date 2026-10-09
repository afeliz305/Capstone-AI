const { findKeywordLinks } = require("./keyword-links");
const { searchIndex } = require("./index-search");
const { routeMira } = require("./mira-policy");

const STOP_WORDS = new Set([
  "a", "about", "an", "and", "are", "can", "do", "for", "from", "how", "i", "in", "is", "it",
  "me", "my", "of", "on", "our", "please", "the", "this", "to", "we", "what", "where", "which", "with"
]);

const SYNONYMS = new Map([
  ["retro", "retrospective"],
  ["standup", "standup"],
  ["stand-up", "standup"],
  ["scrum", "standup"],
  ["proof", "evidence"],
  ["assignee", "owner"],
  ["blocker", "blocked"],
  ["deck", "slides"],
  ["colour", "color"],
  ["colours", "colors"],
  ["begin", "start"],
  ["starting", "start"],
  ["teacher", "instructor"],
  ["prof", "professor"]
]);

// Fuzzy correction is deliberately limited to reviewed Capstone terms. It is
// never applied to arbitrary words, identifiers, names, dates, or numbers.
const DOMAIN_VOCABULARY = Object.freeze([
  "acceptance", "assignment", "blocked", "calendar", "criteria", "evidence",
  "meeting", "owner", "product", "retrospective", "review", "standup",
  "submit", "verification", "verify"
]);

function damerauLevenshtein(left, right) {
  const a=String(left),b=String(right),rows=a.length+1,cols=b.length+1;
  const matrix=Array.from({length:rows},()=>Array(cols).fill(0));
  for(let i=0;i<rows;i++)matrix[i][0]=i;
  for(let j=0;j<cols;j++)matrix[0][j]=j;
  for(let i=1;i<rows;i++)for(let j=1;j<cols;j++){
    const cost=a[i-1]===b[j-1]?0:1;
    matrix[i][j]=Math.min(matrix[i-1][j]+1,matrix[i][j-1]+1,matrix[i-1][j-1]+cost);
    if(i>1&&j>1&&a[i-1]===b[j-2]&&a[i-2]===b[j-1])matrix[i][j]=Math.min(matrix[i][j],matrix[i-2][j-2]+1);
  }
  return matrix[a.length][b.length];
}

function correctDomainToken(token) {
  if (!/^[a-z]{5,18}$/.test(token)) return token;
  let best=token,distance=2;
  for(const candidate of DOMAIN_VOCABULARY){
    const next=damerauLevenshtein(token,candidate);
    if(next<distance){best=candidate;distance=next;}
  }
  return distance<=1?best:token;
}

function normalize(value) {
  return String(value || "")
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9#-]+/g, " ")
    .trim();
}

function canonicalizeQuestion(value) {
  let text=normalize(value);
  text=text
    .replace(/\b(?:turn|hand) in\b/g,"submit")
    .replace(/\bupload(?:ing|ed|s)?\b/g,"submit")
    .replace(/\bsubmissions?\b/g,"submit")
    .replace(/\bassignments?\b/g,"assignment")
    .replace(/\bcourse\s+work\b|\bcoursework\b/g,"assignment")
    .replace(/\bdaily (?:status )?updates?\b|\bdaily scrums?\b|\bstand[ -]?ups?\b/g,"standup")
    .replace(/\bstatus updates?\b/g,"standup")
    .replace(/\b(?:peer|teammate) checks?\b/g,"verify")
    .replace(/\bpo\b/g,"product owner")
    .replace(/\bacceptance conditions?\b|\bcard requirements?\b/g,"acceptance criteria")
    .replace(/\bproof of completion\b|\bsupporting evidence\b/g,"evidence")
    .replace(/\bverification\b/g,"verify")
    .replace(/\bretros?\b/g,"retrospective")
    .replace(/\bsprint demo\b/g,"sprint review");
  return text.split(/\s+/).map(correctDomainToken).join(" ");
}

function tokenize(value, { keepStopWords = false } = {}) {
  return canonicalizeQuestion(value)
    .split(/\s+/)
    .filter(Boolean)
    .map((token) => SYNONYMS.get(token) || token)
    .filter((token) => keepStopWords || !STOP_WORDS.has(token));
}

function fieldTokens(value) {
  return new Set(tokenize(Array.isArray(value) ? value.join(" ") : value));
}

function intersectionCount(queryTokens, field) {
  let matches = 0;
  for (const token of queryTokens) {
    if (field.has(token)) matches += 1;
  }
  return matches;
}

function scoreEntry(entry, rawQuestion) {
  const question = canonicalizeQuestion(rawQuestion);
  const queryTokens = [...new Set(tokenize(rawQuestion))];
  if (!queryTokens.length) return 0;

  const keywords = fieldTokens(entry.keywords);
  const title = fieldTokens(entry.title);
  const intents = fieldTokens(entry.intents);
  const body = fieldTokens(`${entry.answer} ${entry.content} ${entry.section}`);

  const keywordMatches = intersectionCount(queryTokens, keywords);
  const titleMatches = intersectionCount(queryTokens, title);
  const intentMatches = intersectionCount(queryTokens, intents);
  const bodyMatches = intersectionCount(queryTokens, body);
  const coverageSet = new Set([...keywords, ...title, ...intents, ...body]);
  const coverage = intersectionCount(queryTokens, coverageSet) / queryTokens.length;

  let phraseBonus = 0;
  for (const intent of entry.intents || []) {
    const intentTokens = tokenize(intent);
    if (intentTokens.length && intentTokens.every((token) => queryTokens.includes(token))) {
      phraseBonus = Math.max(phraseBonus, 0.35);
    }
    const normalizedIntent = normalize(intent);
    if (question.includes(normalizedIntent) || normalizedIntent.includes(question)) {
      phraseBonus = Math.max(phraseBonus, 0.45);
    }
  }

  const weighted = (
    keywordMatches * 4.5 +
    titleMatches * 3.5 +
    intentMatches * 2.5 +
    bodyMatches * 1.25
  ) / Math.max(queryTokens.length * 7, 1);

  return Math.min(1, coverage * 0.42 + weighted * 0.58 + phraseBonus);
}

function publicEntry(entry, score) {
  return {
    id: entry.id,
    title: entry.title,
    sourceTitle: entry.sourceTitle,
    url: entry.url,
    section: entry.section,
    access: entry.access,
    answer: entry.answer,
    ...(entry.sourceKind ? { sourceKind:entry.sourceKind } : {}),
    ...(entry.provenance ? {
      provenance:entry.provenance,
      canonicalQuestion:entry.canonicalQuestion,
      category:entry.category,
      faroSourceTitle:entry.faroSourceTitle,
      faroSourceUrl:entry.faroSourceUrl,
      underlyingOfficialSource:entry.underlyingOfficialSource,
      authorityLevel:entry.authorityLevel,
      term:entry.term,
      applicability:entry.applicability,
      aliases:entry.aliases,
      navigationTarget:entry.navigationTarget,
      reviewedAt:entry.reviewedAt
    } : {}),
    ...(entry.sourcePages !== undefined ? { sourcePages:entry.sourcePages } : {}),
    ...(entry.sourceKind === "portal-navigation" ? {
      portalSection:entry.portalSection,
      portalSectionId:entry.portalSectionId,
      navigationCapability:entry.navigationCapability,
      dataCapability:entry.dataCapability,
      authCapability:entry.authCapability,
      loginReturnVerified:entry.loginReturnVerified,
      liveDataConnected:false
    } : {}),
    followUps: (entry.followUps || []).slice(0, 5),
    score: Math.round(score * 1000) / 1000
  };
}

function portalMatches(entries, question, contextId) {
  // Match only reviewed navigation rules. Error messages are not inbox messages.
  const text = canonicalizeQuestion(question).replace(/\berror messages?\b/g, "");
  const navigation = entries.filter(entry => entry.sourceKind === "portal-navigation");
  if (/\b(?:grade|grades|grading|graded)\b/.test(text) && /\b(?:calculated|calculation|weight|weights|policy|rules|scale)\b/.test(text)) return [];
  if (/\bcanvas\b/.test(text) && /\b(?:messages?|inbox|unread|notifications?|open|view)\b/.test(text)) return navigation.filter(entry=>entry.id === "portal-canvas");
  const matches = navigation.filter(entry => entry.intents.some(intent=>normalize(intent) === text) ||
    entry.navigationPatterns.some(pattern=>new RegExp(pattern).test(text)) ||
    text === normalize("open " + entry.portalSection) || text === normalize("go to " + entry.portalSection));
  if (matches.length) return matches.filter(entry=>!(entry.id === "portal-team" && matches.some(e=>e.id === "portal-team-contacts")));
  if (/^(?:open it|open that|take me there|where do i click|how do i open it|check again|any updates|anything new|any new ones|read them|tell me more)$/.test(text)) return navigation.filter(entry=>entry.id === contextId);
  return [];
}

function courseMatches(entries, question, contextId) {
  const text = canonicalizeQuestion(question);
  const byId = id => entries.find(entry => entry.id === id);
  const topics = { attendance:"syllabus-attendance", syllabus:"syllabus-overview", deadlines:"syllabus-deadlines", grades:"syllabus-grading", grading:"syllabus-grading", "grade scale":"syllabus-grade-scale", "late work":"syllabus-late-work", "my dashboard":"dashboard-personal", "my project":"dashboard-personal" };
  if (topics[text] && byId(topics[text])) return [byId(topics[text])];
  if (/\bwho (?:is|are) (?:my|our) (?:product owner|team|teammates)\b|\b(?:what are|show|check) my (?:deadlines|assignments)\b|^what should i do next$/.test(text) && byId("dashboard-personal")) return [byId("dashboard-personal")];
  if (/\b(?:grade|grades|grading)\b/.test(text) && /\b(?:calculated|calculation|weight|weights|policy)\b/.test(text) && byId("syllabus-grading")) return [byId("syllabus-grading")];
  const personal = /\b(?:my|our) (?:current |actual |recorded |personal )?(?:grade|grades|attendance|progress|tasks|task list|project status|assigned project|completion|team members)\b|\b(?:what is|show|check) (?:on )?my (?:dashboard|project)\b|\bwho is on my team\b|\bwhat is due for me\b|\bhow (?:am i|is my team) doing\b|\bhow many .* (?:have i|did i) (?:miss|missed|attend|attended|complete|completed)\b/;
  if (personal.test(text) && byId("dashboard-personal")) return [byId("dashboard-personal")];
  const exact = entries.filter(entry => entry.sourceKind && entry.intents?.some(intent => normalize(intent) === text));
  if (exact.length) return exact;
  const numbers = [...text.matchAll(/\bsprint\s+([1-5])\b/g)].map(match => match[1]);
  const numbered = [...new Set(numbers)].map(n => byId("syllabus-sprint-"+n)).filter(Boolean);
  if (numbered.length) return numbered;
  if (/^(?:and |also )?(?:what about )?(?:the )?next (?:one|sprint)?$/.test(text)) {
    const current=/^syllabus-sprint-([1-5])$/.exec(String(contextId||""));
    const next=current&&Number(current[1])<5?byId("syllabus-sprint-"+(Number(current[1])+1)):null;
    if(next)return[next];
  }
  if (/^(?:and |also )?(?:when is (?:it|that|this) due|when is the deadline|what is the deadline|how many points(?: is (?:it|that|this))?|what is (?:it|that) worth|tell me more|what does that mean|what should i do|what do i need to do)$/.test(text)) {
    const context = byId(contextId);
    if (context && context.sourceKind !== "portal-navigation") return [context];
  }
  if (contextId && /^(?:and |also )?(?:where (?:do i |should i )?(?:submit|post|upload)(?: (?:it|that|this))?|how (?:is it|is that|am i) graded)$/.test(text)) {
    const target = byId(/graded/.test(text) ? "syllabus-grading" : "canvas-assignments");
    if (target) return [target];
  }
  return [];
}

function searchKnowledge(entries, question, contextId, siteIndex = null) {
  const canonicalQuestion=canonicalizeQuestion(question);
  const policy = routeMira(entries, canonicalQuestion, contextId, publicEntry);
  if (policy) return policy;
  const portal = portalMatches(entries, canonicalQuestion, contextId);
  if (portal.length) return { status:portal.length > 1 ? "choices" : "matched", matches:portal.slice(0,3).map(entry=>publicEntry(entry,1)), links:[] };
  // Personal-work language must never fall through to the broad website index.
  // Hosted MIRA can navigate, but it cannot claim to have inspected the account.
  if (/\b(?:what|show|check|where).*(?:current(?:ly)?|in progress|open|active|assigned).*(?:work|task|card)|\b(?:what|show|check|where).*(?:work|task|card).*(?:current(?:ly)?|in progress|open|active|assigned)|\bwhat am i working on\b|\bwhat is currently in progress\b/.test(canonicalQuestion)) {
    const target=entries.find(entry=>entry.id==="portal-my-work")||entries.find(entry=>entry.id==="portal-board")||entries.find(entry=>entry.id==="dashboard-personal")||entries.find(entry=>entry.id==="portal-team");
    if(target)return {status:"matched",matches:[publicEntry(target,1)],links:[]};
    return {status:"unmatched",matches:[],links:[],scopeNote:"Personal work requires the signed-in Capstone portal. MIRA has not checked your account."};
  }
  if (siteIndex && /^(?:take me there|show me that section|where does it say that|open it|open that)[.!?]*$/i.test(question.trim())) return searchIndex(siteIndex,question,contextId);
  const links = findKeywordLinks(entries, canonicalQuestion);
  // A course PDF is not authority for another term/section. Never infer personal
  // completion/grades from the calendar or from an unrelated staff login.
  if ((!siteIndex || /\b(?:syllabus|sprint|assignment|course deadline)\b/i.test(question)) && /\b(?:spring|summer)\s+20\d\d\b|\b(?:fall\s+)?(?:202[0-5]|202[7-9]|20[3-9]\d)\b/i.test(question)) {
    return { status:"unmatched", matches:[], links:[], scopeNote:"The imported syllabus covers CIS 4951 RVC, Fall 2026 only. Ask the instructor for the other term's requirements." };
  }
  const direct = courseMatches(entries, canonicalQuestion, contextId);
  if (direct.length) return { status:direct.length > 1 ? "choices" : "matched", matches:direct.slice(0,3).map(entry => publicEntry(entry,1)), links:direct.some(entry => entry.id === "dashboard-personal") ? [] : links };
  if (siteIndex) return searchIndex(siteIndex,canonicalQuestion,contextId);
  if (/^(?:when is (?:it|that|this) due|when is the deadline|what is the deadline|how many points(?: is (?:it|that|this))?|what is (?:it|that) worth|tell me more|what does that mean)$/.test(normalize(question))) return { status:"unmatched", matches:[], links:[], scopeNote:"Which assignment or sprint do you mean? Try 'Sprint 2' or 'Final deliverables', then ask your follow-up." };
  // Navigation-only entries must not compete with course facts in fuzzy search.
  const ranked = entries.filter(entry=>entry.sourceKind !== "portal-navigation")
    .map((entry) => ({ entry, score: scoreEntry(entry, question) }))
    .filter((item) => item.score > 0)
    .sort((a, b) => b.score - a.score);

  const top = ranked[0];
  if (!top || top.score < 0.4) {
    return { status: "unmatched", matches: [], links };
  }

  const second = ranked[1];
  const closeSecond = second && second.score >= 0.24 && top.score - second.score < 0.11;
  if (top.score < 0.43 || closeSecond) {
    return {
      status: "choices",
      links,
      matches: ranked.slice(0, 3).map((item) => publicEntry(item.entry, item.score))
    };
  }

  return { status: "matched", matches: [publicEntry(top.entry, top.score)], links };
}

module.exports = { canonicalizeQuestion, correctDomainToken, damerauLevenshtein, normalize, scoreEntry, searchKnowledge, tokenize };
