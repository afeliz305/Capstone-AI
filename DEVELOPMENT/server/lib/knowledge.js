function mergeKnowledge(base, supplement) {
  const original = new Map(base.map(entry => [entry.id, entry]));
  const overrides = new Map(supplement.map(entry => [entry.id, entry]));
  return [...base.filter(entry => !overrides.has(entry.id)), ...supplement.map(entry => {
    const previous = original.get(entry.id);
    return previous?.linkKeywords ? { ...entry, linkKeywords:previous.linkKeywords,
      navigationUrl:previous.url, navigationSourceTitle:previous.sourceTitle, navigationAccess:previous.access } : entry;
  })];
}
module.exports = { mergeKnowledge };
