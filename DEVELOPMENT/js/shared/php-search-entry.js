// Optional PHP hosting keeps its existing ticket API. Public website retrieval
// uses the same build-time validated, read-only snapshot as static/Supabase.
const { searchKnowledge } = require("../../server/lib/search");
const { reviewedKnowledge } = require("../../server/lib/knowledge");
const knowledge = reviewedKnowledge(require("../../data/capstone-knowledge.json"));
window.CapstoneIndexedSearch = (question,context) => searchKnowledge(knowledge,question,context,CAPSTONE_WEBSITE_INDEX);
