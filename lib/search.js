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
    score: Math.round(score * 1000) / 1000
  };
}

function searchKnowledge(entries, question) {
  const ranked = entries
    .map((entry) => ({ entry, score: scoreEntry(entry, question) }))
    .filter((item) => item.score > 0)
    .sort((a, b) => b.score - a.score);

  const top = ranked[0];
  if (!top || top.score < 0.4) {
    return { status: "unmatched", matches: [] };
  }

  const second = ranked[1];
  const closeSecond = second && second.score >= 0.24 && top.score - second.score < 0.11;
  if (top.score < 0.43 || closeSecond) {
    return {
      status: "choices",
      matches: ranked.slice(0, 3).map((item) => publicEntry(item.entry, item.score))
    };
  }

  return { status: "matched", matches: [publicEntry(top.entry, top.score)] };
}

module.exports = { normalize, scoreEntry, searchKnowledge, tokenize };
