// Reviewed navigation labels only. Never put a user's messages, unread counts,
// grades, account IDs, cookies or tokens in this public/bundled knowledge.
const { PORTAL_URL:url, resolvePortalDestination } = require("./portal-navigation");

const sections = [
  ["overview", "Overview", "Dashboard", ["Open my dashboard", "Check my dashboard", "What is on my dashboard?"], ["\\bdashboard\\b", "\\bportal overview\\b"]],
  ["messages", "Messages", "Dashboard", ["Do I have any new messages?", "Check my messages", "Open my inbox", "Have I received any messages?"], ["\\b(?:messages?|inbox|unread|notifications?)\\b"]],
  ["start", "Start here", "This term", ["Open Start here"], ["\\bstart here\\b"]],
  ["team", "Team", "This term", ["Who is on my team?", "Who is my product owner?", "What is my project?"], ["\\bwho (?:is|are) (?:on )?(?:my|our) (?:team|teammates|product owner)\\b", "\\b(?:show|check|open|view|see|find) (?:me )?(?:my|our) (?:team|teammates|product owner|project)\\b", "\\b(?:my|our) (?:team|project) (?:members|status|progress|details|information|info|name)\\b", "^(?:my|our) (?:team|project)$"]],
  ["standing", "Standing", "This term", ["What is my standing?"], ["\\bstanding\\b"]],
  ["grade", "Grade", "This term", ["What is my grade?", "Check my grades"], ["\\b(?:my|our) (?:(?:current|actual|recorded|personal) )?grades?\\b"]],
  ["classmates", "Classmates", "Network", ["Open my classmates"], ["\\bclassmates\\b"]],
  ["alumni", "Alumni directory", "Network", ["Find the alumni directory"], ["\\balumni(?: directory)?\\b"]],
  ["connections", "Connections", "Network", ["Open my connections"], ["\\bconnections\\b"]],
  ["opportunities", "Opportunities", "Network", ["Show me opportunities"], ["\\bopportunities\\b"]],
  ["team-contacts", "Team contacts", "Network", ["Open team contacts"], ["\\bteam contacts\\b"]],
  ["ai-anchors", "AI Anchors", "Network", ["What are AI Anchors?"], ["\\bai anchors?\\b"]],
  ["record", "Record", "My Capstone", ["Open my Capstone record"], ["\\b(?:my|capstone|portal) record\\b"]],
  ["showcase", "Showcase", "My Capstone", ["Open my showcase"], ["\\bmy showcase\\b"]],
  ["letters", "Letters", "My Capstone", ["Open my letters"], ["\\b(?:my|view|open|check) (?:recommendation )?letters\\b"]],
  ["request-letter", "Request a letter", "My Capstone", ["How do I request a letter?"], ["\\brequest (?:a |my |the )?(?:recommendation )?letter\\b"]],
  ["resources", "Resources", "Reference", ["Open portal resources"], []],
  ["brand", "Brand & templates", "Reference", ["Open portal brand and templates"], []],
  ["canvas", "Canvas", "Reference", ["Open Canvas", "Open Canvas Inbox", "Check my Canvas messages"], []]
];

const entries = sections.map(([id, label, group, intents, patterns]) => {
  const destination = resolvePortalDestination(id);
  const instruction = destination.navigationCapability === "exact-section"
    ? `Open ${label} in the secure Capstone portal using the link below.`
    : `Open ${label} using the verified portal link below.`;
  let answer = `${instruction} Ocelot MIRA cannot read personal account data. If the portal asks you to sign in, finish the email-code login; the current login returns to Overview, so then choose ${label}.`;
  if (id === "messages") answer = `${instruction} Ocelot MIRA cannot check unread counts or message contents. No message has been opened, marked read, sent, or changed. If sign-in is required, finish the email-code login and then choose Messages.`;
  if (id === "overview") answer = `${instruction} Ocelot MIRA cannot see your current tasks, deadlines, project updates, attendance, or grades. Ask about the reviewed syllabus here, or use the portal for personal information.`;
  if (id === "grade") answer = `Open your Grade section in the portal. Personal grades are not yet available inside this Ocelot chat, and MIRA has not read your posted result. If you are asked to sign in and land on Overview, choose Grade in the sidebar or open this Grade shortcut again.`;
  if (id === "canvas") answer = `${instruction} Canvas has separate authentication and is separate from portal Messages. Ocelot MIRA cannot check either inbox or read recorded Canvas grades.`;
  if (id === "request-letter") answer += " Opening the section does not submit a request; review and submit it yourself.";
  return {
    id:"portal-" + id,
    title:label + " — portal shortcut",
    sourceTitle:"Capstone portal · " + label,
    sourceKind:"portal-navigation",
    url:destination.url,
    section:group,
    portalSection:label,
    portalSectionId:id,
    portalViewId:destination.viewId,
    navigationCapability:destination.navigationCapability,
    dataCapability:destination.dataCapability,
    authCapability:destination.authCapability,
    mappedFromObservedControl:destination.mappedFromObservedControl,
    signedInVerified:destination.signedInVerified,
    refreshVerified:destination.refreshVerified,
    loginReturnVerified:destination.loginReturnVerified,
    liveDataConnected:false,
    access:"authenticated",
    audience:"student",
    answer,
    content:"",
    keywords:[],
    intents:["Open portal " + label, ...intents],
    navigationPatterns:patterns,
    followUps:["Check my messages", "Open my dashboard", "Open portal Team", "Open portal Grade"].filter(q=>!intents.includes(q)).slice(0,3)
  };
});

module.exports = { url, reviewed:"2026-09-26", entries };
