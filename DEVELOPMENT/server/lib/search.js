const { findKeywordLinks } = require("./keyword-links");

const STOP_WORDS = new Set([
  "a", "about", "an", "and", "are", "can", "do", "for", "from", "how", "i", "in", "is", "it",
  "me", "my", "of", "on", "our", "please", "the", "this", "to", "we", "what", "where", "which", "with"
]);

const SYNONYMS = new Map([
  ["retro", "retrospective"],
  ["standup", "scrum"],
  ["stand-up", "scrum"],
  ["deck", "slides"],
  ["colour", "color"],
  ["colours", "colors"],
  ["begin", "start"],
  ["starting", "start"],
  ["teacher", "instructor"],
  ["prof", "professor"]
]);

function normalize(value) {
  return String(value || "")
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9#-]+/g, " ")
    .trim();
}

function tokenize(value, { keepStopWords = false } = {}) {
  return normalize(value)
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
  const question = normalize(rawQuestion);
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
    ...(entry.sourceKind ? { sourceKind:entry.sourceKind, sourcePages:entry.sourcePages } : {}),
    followUps: (entry.followUps || []).slice(0, 5),
    score: Math.round(score * 1000) / 1000
  };
}

function courseMatches(entries, question, contextId) {
  const text = normalize(question);
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
  if (/^(?:and |also )?(?:when is (?:it|that|this) due|when is the deadline|what is the deadline|how many points(?: is (?:it|that|this))?|what is (?:it|that) worth|tell me more|what does that mean|what should i do|what do i need to do)$/.test(text)) {
    const context = byId(contextId);
    if (context) return [context];
  }
  if (contextId && /^(?:and |also )?(?:where (?:do i |should i )?(?:submit|post|upload)(?: (?:it|that|this))?|how (?:is it|is that|am i) graded)$/.test(text)) {
    const target = byId(/graded/.test(text) ? "syllabus-grading" : "canvas-assignments");
    if (target) return [target];
  }
  return [];
}

function searchKnowledge(entries, question, contextId) {
  const links = findKeywordLinks(entries, question);
  // A course PDF is not authority for another term/section. Never infer personal
  // completion/grades from the calendar or from an unrelated staff login.
  if (/\b(?:spring|summer)\s+20\d\d\b|\b(?:fall\s+)?(?:202[0-5]|202[7-9]|20[3-9]\d)\b/i.test(question)) {
    return { status:"unmatched", matches:[], links:[], scopeNote:"The imported syllabus covers CIS 4951 RVC, Fall 2026 only. Ask the instructor for the other term's requirements." };
  }
  const direct = courseMatches(entries, question, contextId);
  if (direct.length) return { status:direct.length > 1 ? "choices" : "matched", matches:direct.slice(0,3).map(entry => publicEntry(entry,1)), links:direct.some(entry => entry.id === "dashboard-personal") ? [] : links };
  if (/^(?:when is (?:it|that|this) due|when is the deadline|what is the deadline|how many points(?: is (?:it|that|this))?|what is (?:it|that) worth|tell me more|what does that mean)$/.test(normalize(question))) return { status:"unmatched", matches:[], links:[], scopeNote:"Which assignment or sprint do you mean? Try 'Sprint 2' or 'Final deliverables', then ask your follow-up." };
  const ranked = entries
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

module.exports = { normalize, scoreEntry, searchKnowledge, tokenize };
