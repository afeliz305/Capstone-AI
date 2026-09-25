// Reviewed navigation labels only. Never put a user's messages, unread counts,
// grades, account IDs, cookies or tokens in this public/bundled knowledge.
const url = "https://capstone.cs.fiu.edu/portal";
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
  const instruction = `Open the Capstone portal, sign in if needed, then choose ${label} in the sidebar or the "Jump to" menu.`;
  let answer = `${instruction} This is a navigation shortcut only: live account data is NOT connected to this chatbot. I cannot see what is currently shown in your ${label} section. Nothing has been checked or changed in your account.`;
  if (id === "messages") answer = `${instruction} I cannot check for new or unread messages, report an unread count, or read message contents because live account data is NOT connected. No messages have been read, marked as read, sent or changed by this chatbot. Check Messages inside the portal for your current inbox.`;
  if (id === "overview") answer = `${instruction} I can help you navigate, but live account data is NOT connected. I cannot see your current tasks, deadlines, project updates, attendance or grades. Open the portal for current personal information, or ask me about the reviewed course syllabus.`;
  if (id === "canvas") answer = `${instruction} Canvas is a separate service from the portal's Messages section. For Canvas messages, select Inbox after opening Canvas. Live account data is NOT connected: I cannot check either inbox or read your recorded Canvas grades. No message has been sent or changed.`;
  if (id === "request-letter") answer += " Opening this shortcut does not submit a letter request; review and submit it yourself in the portal.";
  return {
    id:"portal-" + id, title:label + " — portal shortcut", sourceTitle:"Capstone portal · " + label,
    sourceKind:"portal-navigation", url, section:group, portalSection:label, liveDataConnected:false,
    access:"authenticated", audience:"student", answer, content:"", keywords:[],
    intents:["Open portal " + label, ...intents], navigationPatterns:patterns,
    followUps:["Check my messages", "Open my dashboard", "Open portal Team", "Open portal Grade"].filter(q=>!intents.includes(q)).slice(0,3)
  };
});

module.exports = { url, reviewed:"2026-09-25", entries };
