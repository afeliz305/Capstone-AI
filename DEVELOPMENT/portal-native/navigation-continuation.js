const { PORTAL_ORIGIN, PORTAL_URL, destinations, resolvePortalDestination } = require("../js/shared/portal-navigation");
const { PortalNativeError, validateHostAdapter } = require("./host-adapter");

const byView = new Map(Object.values(destinations).filter(item => item.viewId).map(item => [item.viewId, item]));
const byPath = new Map(Object.values(destinations).filter(item => {
  try { const url=new URL(item.url); return url.origin===PORTAL_ORIGIN&&url.pathname!=="/portal"; } catch { return false; }
}).map(item => [new URL(item.url).pathname, item]));

function assistantFlag(value) {
  return value === "1" || value === 1 || value === true;
}

function readDestination(locationLike) {
  const url = new URL(locationLike.href || String(locationLike), PORTAL_URL);
  if (url.origin !== PORTAL_ORIGIN || url.username || url.password) return null;
  const standalone=byPath.get(url.pathname);
  if(standalone){if([...url.searchParams.keys()].some(key=>key!=="assistant"))return null;return { sectionId:standalone.id, section:standalone.label, viewId:null, assistant:assistantFlag(url.searchParams.get("assistant")) };}
  if(url.pathname!=="/portal")return null;
  const sectionId = url.searchParams.get("section");
  const fromQuery = sectionId ? resolvePortalDestination(sectionId) : null;
  const viewId = url.hash.slice(1).split("/")[0];
  const fromHash = byView.get(viewId) || null;
  const destination = fromQuery || fromHash;
  if (!destination || destination.id === "canvas") return null;
  return { sectionId:destination.id, section:destination.label, viewId:destination.viewId, assistant:assistantFlag(url.searchParams.get("assistant")) };
}

function buildVerifiedLink(sectionId) {
  const destination = resolvePortalDestination(sectionId);
  if (!destination || destination.navigationCapability !== "exact-section") return null;
  return destination.url;
}

// Proposed owner-side continuation value. The current live login does not yet
// consume it; the owner must wire this value into the email-code login flow.
function buildOwnerContinuation(sectionId, { assistant=false } = {}) {
  const destination = resolvePortalDestination(sectionId);
  if (!destination || destination.navigationCapability !== "exact-section") return null;
  const exact=new URL(destination.url);
  if(exact.pathname!=="/portal")return exact.pathname+(assistant?"?assistant=1":"");
  const query = new URLSearchParams({ section:destination.id });
  if (assistant) query.set("assistant", "1");
  return "/portal?" + query + "#" + destination.viewId;
}

function validateOwnerContinuation(value) {
  if (typeof value !== "string" || value.length > 180 || /[\u0000-\u001f]/.test(value)) return null;
  let url;
  try { url = new URL(value, PORTAL_ORIGIN); } catch { return null; }
  if (url.origin !== PORTAL_ORIGIN || url.username || url.password || [...url.searchParams.keys()].some(key=>key!=="assistant"&&key!=="section")) return null;
  const destination = readDestination(url);
  return destination ? buildOwnerContinuation(destination.sectionId, { assistant:destination.assistant }) : null;
}

async function applyOwnerDestination(adapter, locationLike) {
  validateHostAdapter(adapter);
  const requested = readDestination(locationLike);
  if (!requested) return { state:"no-destination" };
  const session = await adapter.getVerifiedSession();
  if (session?.state !== "verified" || typeof session.binding !== "string") {
    return { state:"sign-in-required", continuation:buildOwnerContinuation(requested.sectionId, { assistant:requested.assistant }) };
  }
  const sources = await adapter.listAccessibleSources({ binding:session.binding });
  const source = Array.isArray(sources) && sources.find(item => item?.section === requested.section && item.readable !== false);
  if (!source) throw new PortalNativeError("destination-unauthorized", "That portal section is not available to the current account.");
  const opened = await adapter.openAuthorizedSection({ sourceId:source.id, section:requested.section, purpose:"destination-continuation" });
  return { state:"opened", section:requested.section, assistant:requested.assistant, destination:opened };
}

module.exports = { readDestination, buildVerifiedLink, buildOwnerContinuation, validateOwnerContinuation, applyOwnerDestination };
