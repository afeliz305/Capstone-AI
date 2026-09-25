const SITE_ORIGIN = "https://capstone.cs.fiu.edu";

const ALIASES = new Map([
  ["tutorials", "tutorial"], ["templates", "template"], ["minutes", "minute"],
  ["projects", "project"], ["posters", "poster"], ["slides", "slide"],
  ["logos", "logo"], ["fonts", "font"], ["colors", "color"],
  ["colour", "color"], ["colours", "color"], ["assignments", "assignment"],
  ["grades", "grade"], ["retrospectives", "retrospective"]
]);

function tokens(value) {
  return String(value || "").toLowerCase().normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "").match(/[a-z0-9]+/g)?.map(token => ALIASES.get(token) || token) || [];
}

function isCapstoneUrl(value) {
  try {
    const url = new URL(value);
    return url.origin === SITE_ORIGIN && !url.username && !url.password;
  } catch { return false; }
}

// Navigation uses deliberately reviewed phrases, not arbitrary answer words or
// URLs supplied in a question. It does not change answer confidence thresholds.
function findKeywordLinks(entries, question) {
  const query = tokens(question);
  const candidates = [];
  entries.forEach((entry, order) => {
    if (entry.navigationUrl) entry = { ...entry, url:entry.navigationUrl, sourceTitle:entry.navigationSourceTitle, access:entry.navigationAccess };
    if (!isCapstoneUrl(entry.url)) return;
    for (const keyword of entry.linkKeywords || []) {
      const phrase = tokens(keyword);
      if (!phrase.length) continue;
      for (let start = 0; start <= query.length - phrase.length; start += 1) {
        if (phrase.every((token, offset) => query[start + offset] === token)) {
          candidates.push({ entry, keyword, start, length: phrase.length, order });
        }
      }
    }
  });

  // Prefer "sprint planning" over a broad overlapping "sprint", and "showcase
  // judge" over "showcase". Unrelated phrases elsewhere remain independently linked.
  candidates.sort((a, b) => b.length - a.length || a.start - b.start || a.order - b.order);
  const occupied = new Set();
  const selected = [];
  for (const candidate of candidates) {
    const positions = Array.from({ length: candidate.length }, (_, offset) => candidate.start + offset);
    if (positions.some(position => occupied.has(position))) continue;
    positions.forEach(position => occupied.add(position));
    selected.push(candidate);
  }
  selected.sort((a, b) => a.start - b.start);

  const links = new Map();
  for (const { entry, keyword } of selected) {
    if (!links.has(entry.id)) {
      links.set(entry.id, {
        id: entry.id, title: entry.title, sourceTitle: entry.sourceTitle,
        url: entry.url, section: entry.section, access: entry.access, keywords: []
      });
    }
    const keywords = links.get(entry.id).keywords;
    if (!keywords.includes(keyword) && keywords.length < 3) keywords.push(keyword);
  }
  return [...links.values()].slice(0, 4);
}

module.exports = { findKeywordLinks, isCapstoneUrl };
