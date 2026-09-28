const { mountPortalNativeMira } = require("./component");
const { PortalNativeMira, PRIVATE_TTL } = require("./mira-service");
const { validateHostAdapter, PortalNativeError } = require("./host-adapter");
const navigation = require("./navigation-continuation");
const { reviewedKnowledge } = require("../server/lib/knowledge");
const { searchKnowledge } = require("../server/lib/search");
const baseKnowledge = require("../data/capstone-knowledge.json");
const knowledge = reviewedKnowledge(baseKnowledge);
const defaultPublicSearch = (question,context) => Promise.resolve(searchKnowledge(knowledge,question,context));

window.CapstonePortalNativeMira = Object.freeze({
  version:"0.1.0-owner-review",
  mount(options={}){return mountPortalNativeMira({...options,publicSearch:options.publicSearch||defaultPublicSearch});},
  PortalNativeMira,
  PortalNativeError,
  PRIVATE_TTL,
  validateHostAdapter,
  navigation
});
