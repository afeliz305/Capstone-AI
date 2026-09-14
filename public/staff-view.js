(function (root) {
  "use strict";
  function filterTickets(tickets, { email, assignment = "mine", status = "all", search = "" }) {
    const term = search.trim().toLowerCase();
    return tickets.filter((ticket) => {
      const matchesAssignment = assignment === "all" || (assignment === "mine" ? ticket.assignedTo === email : !ticket.assignedTo);
      const haystack = `${ticket.id} ${ticket.name} ${ticket.email} ${ticket.category} ${ticket.question} ${ticket.details} ${ticket.resolution || ""}`.toLowerCase();
      return matchesAssignment && (status === "all" || status === ticket.status) && (!term || haystack.includes(term));
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
  const helpers = { filterTickets, createIdleRedirect };
  if (typeof module === "object" && module.exports) module.exports = helpers;
  else root.CapstoneStaffView = helpers;
})(typeof window === "undefined" ? {} : window);
