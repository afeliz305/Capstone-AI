function mergeKnowledge(base, supplement) {
  const original = new Map(base.map(entry => [entry.id, entry]));
  const overrides = new Map(supplement.map(entry => [entry.id, entry]));
  return [...base.filter(entry => !overrides.has(entry.id)), ...supplement.map(entry => {
    const previous = original.get(entry.id);
    return previous?.linkKeywords ? { ...entry, linkKeywords:previous.linkKeywords,
      navigationUrl:previous.url, navigationSourceTitle:previous.sourceTitle, navigationAccess:previous.access } : entry;
  })];
}
function reviewedKnowledge(base) {
  return mergeKnowledge(base, [
    ...require("../../js/shared/syllabus-data").entries,
    ...require("../../js/shared/portal-data").entries
  ]);
}
module.exports = { mergeKnowledge, reviewedKnowledge };
