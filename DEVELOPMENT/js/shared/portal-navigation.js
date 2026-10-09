// Verified against the live portal navigation controls and router on 2026-10-09.
// Keep destinations here so Ocelot answers never invent portal routes.
const PORTAL_ORIGIN = "https://capstone.cs.fiu.edu";
const PORTAL_URL = PORTAL_ORIGIN + "/portal";

const definitions = [
  ["overview", "Today", null, true, false, "/today"],
  ["messages", "Inbox", null, true, false, "/inbox"],
  ["board", "Board", null, true, false, "/board"],
  ["meetings", "Meetings", null, true, false, "/meetings"],
  ["my-work", "My work", null, true, false, "/my-work"],
  ["this-term", "Projects this term", null, true, false, "/this-term"],
  ["people", "People", null, true, false, "/people"],
  ["rhythm", "My rhythm", null, true, false, "/me/rhythm"],
  ["recognition", "Recognition", null, true, false, "/recognition"],
  ["privacy", "Profile and privacy", null, true, false, "/me/privacy"],
  ["start", "Start here", "orientation"],
  ["team", "Team", "team", true],
  ["standing", "Standing", "compare", true],
  ["grade", "Grade", "mygrade", true, true],
  ["classmates", "Classmates", "netclass"],
  ["alumni", "Alumni directory", "netdir"],
  ["connections", "Connections", "netconn"],
  ["opportunities", "Opportunities", "netopp"],
  ["team-contacts", "Team contacts", "netteam"],
  ["ai-anchors", "AI Anchors", "aidir"],
  ["record", "Record", "caprecord"],
  ["showcase", "Showcase", "myshowcase"],
  ["letters", "Letters", "myletters"],
  ["request-letter", "Request a letter", "reqletter"],
  ["resources", "Resources", "resources"],
  ["brand", "Brand & templates", "brandhub"]
];

const destinations = Object.fromEntries(definitions.map(([id, label, viewId, signedInVerified=false, refreshVerified=false, pathname=null]) => [id, Object.freeze({
  id,
  label,
  viewId,
  url: pathname ? PORTAL_ORIGIN + pathname : PORTAL_URL + "#" + viewId,
  navigationCapability: "exact-section",
  dataCapability: "navigation-only",
  authCapability: "existing-portal-session",
  mappedFromObservedControl: true,
  signedInVerified,
  refreshVerified,
  loginReturnVerified: false,
  verifiedMechanism: pathname ? "portal route" : "portal hash router"
})]));

destinations.canvas = Object.freeze({
  id: "canvas",
  label: "Canvas",
  viewId: null,
  url: "https://fiu.instructure.com/courses/262782",
  navigationCapability: "exact-external",
  dataCapability: "navigation-only",
  authCapability: "separate-canvas-session",
  mappedFromObservedControl: true,
  signedInVerified: false,
  refreshVerified: false,
  loginReturnVerified: false,
  verifiedMechanism: "portal-generated Canvas link"
});

function resolvePortalDestination(id) {
  const destination = destinations[String(id || "").toLowerCase()];
  return destination ? { ...destination } : null;
}

function resolvePortalDestinationByLabel(label) {
  const wanted = String(label || "").trim().toLowerCase();
  const destination = Object.values(destinations).find(item => item.label.toLowerCase() === wanted);
  return destination ? { ...destination } : null;
}

const portalNavigation = {
  PORTAL_ORIGIN,
  PORTAL_URL,
  destinations: Object.freeze(destinations),
  resolvePortalDestination,
  resolvePortalDestinationByLabel
};

if (typeof module !== "undefined" && module.exports) module.exports = portalNavigation;
if (typeof window !== "undefined") window.CapstonePortalNavigation = portalNavigation;
