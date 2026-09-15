(function (root) {
  "use strict";
  const QUEUE_VIEWS = Object.freeze({
    all: { label: "All tickets", assignment: "all", grouped: true, resolvedOnly: false, description: "All team tickets, grouped by assignee. Unassigned tickets appear first." },
    mine: { label: "My tickets", assignment: "mine", grouped: false, resolvedOnly: false, description: "Tickets currently assigned to your signed-in account, including resolved tickets." },
    resolved: { label: "All resolved", assignment: "all", grouped: true, resolvedOnly: true, description: "Resolved tickets across the team, grouped by their current assignee." },
    "mine-resolved": { label: "My resolved", assignment: "mine", grouped: false, resolvedOnly: true, description: "Resolved tickets currently assigned to your signed-in account." }
  });

  const categoryTones = new Map([
    ["workflow and improvements", "gold"], ["testing and updates", "blue"],
    ["implementation and testing", "navy"], ["website navigation", "blue"],
    ["coursework", "navy"], ["attendance", "gold"], ["scrum and sprints", "navy"],
    ["showcase", "gold"], ["templates and branding", "blue"], ["other", "neutral"]
  ]);

  function categoryTag(category) {
    const label = (typeof category === "string" && category.trim()) || "Other";
    return { label, tone: categoryTones.get(label.toLowerCase()) || "neutral" };
  }

  function filterTickets(tickets, { email, assignment = "mine", status = "all", search = "" }) {
    const term = search.trim().toLowerCase();
    return tickets.filter((ticket) => {
      const matchesAssignment = assignment === "all" || (assignment === "mine" ? Boolean(email) && ticket.assignedTo === email : !ticket.assignedTo);
      const haystack = `${ticket.id} ${ticket.name} ${ticket.email} ${categoryTag(ticket.category).label} ${ticket.question} ${ticket.details} ${ticket.resolution || ""} ${ticket.projectOwnerTicket === true ? "Project owner" : ""}`.toLowerCase();
      return matchesAssignment && (status === "all" || status === ticket.status) && (!term || haystack.includes(term));
    });
  }

  function ticketsForView(tickets, view, email, { status = "all", search = "", unassignedOnly = false } = {}) {
    const definition = QUEUE_VIEWS[view] || QUEUE_VIEWS.all;
    return filterTickets(tickets, {
      email,
      assignment: definition.grouped && unassignedOnly ? "unassigned" : definition.assignment,
      status: definition.resolvedOnly ? "resolved" : status,
      search
    });
  }

  function groupTicketsByAssignee(tickets, members) {
    const names = new Map(members.map((member) => [member.email, member.name]));
    const groups = new Map();
    for (const ticket of tickets) {
      const email = ticket.assignedTo || null;
      if (!groups.has(email)) groups.set(email, { email, name: names.get(email) || email || "Unassigned", tickets: [] });
      groups.get(email).tickets.push(ticket);
    }
    return [...groups.values()].sort((a, b) => {
      if (a.email === null) return b.email === null ? 0 : -1;
      if (b.email === null) return 1;
      return a.name.localeCompare(b.name) || a.email.localeCompare(b.email);
    });
  }
  function createIdleRedirect({ onTick, onTimeout, now = Date.now, schedule = setInterval, cancel = clearInterval, delay = 15000 }) {
    let timer = null;
    let deadline = 0;
    function stop() { if (timer !== null) cancel(timer); timer = null; }
    function tick() {
      const remaining = Math.max(0, Math.ceil((deadline - now()) / 1000));
      onTick(remaining);
      if (remaining === 0) { stop(); onTimeout(); }
    }
    function start() { stop(); deadline = now() + delay; tick(); timer = schedule(tick, 250); }
    function respond() { if (timer !== null) { deadline = now() + delay; tick(); } }
    return { start, stop, respond };
  }
  const helpers = { QUEUE_VIEWS, categoryTag, filterTickets, ticketsForView, groupTicketsByAssignee, createIdleRedirect };
  if (typeof module === "object" && module.exports) module.exports = helpers;
  else root.CapstoneStaffView = helpers;
})(typeof window === "undefined" ? {} : window);
