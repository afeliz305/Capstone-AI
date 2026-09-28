const REQUIRED_METHODS = [
  "getVerifiedSession",
  "listAccessibleSources",
  "readAuthorizedSection",
  "resolveSourceDestination",
  "openAuthorizedSection",
  "subscribeToSessionChanges"
];

class PortalNativeError extends Error {
  constructor(state, message) {
    super(message);
    this.name = "PortalNativeError";
    this.state = state;
  }
}

/**
 * Owner adapter contract (all functions may be async):
 * - getVerifiedSession() -> {state:"verified", binding:string} or an explicit
 *   signed-out/expired/unverified state. `binding` must be an opaque value from
 *   the server-validated current session, never a browser-supplied student id.
 * - listAccessibleSources({binding}) -> [{id, section, label, readable}].
 * - readAuthorizedSection({sourceId, section, messageContent, purpose}) ->
 *   {sessionBinding, section, records:[{kind,heading,text,subview,sourceTimestamp}],coverage}.
 * - resolveSourceDestination({sourceId, section}) ->
 *   {capability:"exact-section"|"parent-only"|"unavailable",url,label}.
 * - openAuthorizedSection({sourceId, section}) -> the same destination shape
 *   after activating the existing portal router. It must not submit or mutate.
 * - subscribeToSessionChanges(callback) -> unsubscribe function.
 */
function validateHostAdapter(adapter) {
  if (!adapter || typeof adapter !== "object") throw new PortalNativeError("adapter-missing", "The portal owner adapter is not installed.");
  const missing = REQUIRED_METHODS.filter(name => typeof adapter[name] !== "function");
  if (missing.length) throw new PortalNativeError("adapter-incomplete", "Portal owner adapter is missing: " + missing.join(", ") + ".");
  return adapter;
}

module.exports = { REQUIRED_METHODS, PortalNativeError, validateHostAdapter };
