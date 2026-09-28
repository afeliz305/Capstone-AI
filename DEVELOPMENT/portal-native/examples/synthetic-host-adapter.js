const { resolvePortalDestination } = require("../../js/shared/portal-navigation");

// Review/test fixture only. It is deliberately synthetic and must never be
// mounted as the production portal adapter.
function createSyntheticHostAdapter() {
  let session = { state:"verified", binding:"synthetic-session-a" };
  const listeners = new Set();
  const sources = [
    { id:"synthetic-grade", section:"Grade", label:"Grade", readable:true },
    { id:"synthetic-team", section:"Team", label:"Team", readable:true }
  ];
  const records = {
    Grade:[{ kind:"grade", heading:"Synthetic posted grade", text:"Synthetic current-term result: 91 points.", subview:"Current term" }],
    Team:[{ kind:"task", heading:"Synthetic sprint", text:"Synthetic sprint deadline: October 2.", subview:"Sprint board" }]
  };

  function verified() {
    if (session.state !== "verified") throw new Error("Synthetic session is not verified.");
    return session;
  }

  const adapter = {
    async getVerifiedSession() { return { ...session }; },
    async listAccessibleSources({ binding }) {
      if (verified().binding !== binding) throw new Error("Synthetic binding mismatch.");
      return sources.map(source => ({ ...source }));
    },
    async readAuthorizedSection({ sourceId, section }) {
      const current = verified();
      if (!sources.some(source => source.id === sourceId && source.section === section)) throw new Error("Synthetic source denied.");
      return { sessionBinding:current.binding, section, records:records[section].map(record => ({ ...record })), coverage:"Synthetic fixture only." };
    },
    async resolveSourceDestination({ sourceId, section }) {
      if (!sources.some(source => source.id === sourceId && source.section === section)) throw new Error("Synthetic source denied.");
      const destination = resolvePortalDestination(section.toLowerCase());
      return { capability:"exact-section", url:destination.url, label:"Open " + section };
    },
    async openAuthorizedSection({ sourceId, section }) {
      verified();
      return this.resolveSourceDestination({ sourceId, section });
    },
    subscribeToSessionChanges(callback) {
      listeners.add(callback);
      return () => listeners.delete(callback);
    }
  };

  return {
    adapter,
    signOut() { session={ state:"signed-out" }; for (const listener of listeners) listener({ ...session }); },
    switchAccount() { session={ state:"verified", binding:"synthetic-session-b" }; for (const listener of listeners) listener({ ...session }); }
  };
}

module.exports = { createSyntheticHostAdapter };
