(() => {
  "use strict";

  const grid = document.querySelector("#ticket-grid");
  const status = document.querySelector("#queue-status");
  const search = document.querySelector("#ticket-search");
  const filter = document.querySelector("#status-filter");
  const refresh = document.querySelector("#refresh-tickets");
  let tickets = [];

  function createElement(tag, className, text) {
    const element = document.createElement(tag);
    if (className) element.className = className;
    if (text !== undefined) element.textContent = text;
    return element;
  }

  function formatDate(value) {
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return "Unknown date";
    return new Intl.DateTimeFormat("en", { dateStyle: "medium", timeStyle: "short" }).format(date);
  }

  function updateMetrics() {
    document.querySelector("#open-count").textContent = tickets.filter((ticket) => ticket.status === "open").length;
    document.querySelector("#review-count").textContent = tickets.filter((ticket) => ticket.status === "in-review").length;
    document.querySelector("#resolved-count").textContent = tickets.filter((ticket) => ticket.status === "resolved").length;
  }

  async function updateTicket(ticket, newStatus, select) {
    select.disabled = true;
    try {
      const response = await fetch(`/api/tickets/${encodeURIComponent(ticket.id)}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: newStatus })
      });
      const updated = await response.json();
      if (!response.ok) throw new Error(updated.error || "Status could not be updated.");
      tickets = tickets.map((item) => item.id === updated.id ? updated : item);
      status.textContent = `${updated.id} moved to ${newStatus.replace("-", " ")}.`;
      render();
    } catch (error) {
      select.value = ticket.status;
      status.textContent = error.message;
    } finally {
      select.disabled = false;
    }
  }

  function renderTicket(ticket) {
    const card = createElement("article", "ticket-card");
    const content = createElement("div");
    const topLine = createElement("div");
    topLine.append(
      createElement("span", "ticket-id", ticket.id),
      document.createTextNode(" "),
      createElement("span", `status-pill status-${ticket.status}`, ticket.status.replace("-", " "))
    );
    content.append(topLine);
    content.append(createElement("h2", "", `${ticket.category} · ${ticket.name}`));
    content.append(createElement("p", "ticket-question", ticket.question));
    content.append(createElement("p", "ticket-details", ticket.details));
    const meta = createElement("div", "ticket-meta");
    meta.append(
      createElement("span", "", ticket.email),
      createElement("span", "", formatDate(ticket.createdAt))
    );
    if (ticket.privateToInstructor) meta.append(createElement("span", "ticket-privacy", "Private to instructor"));
    if (ticket.transcript) meta.append(createElement("span", "", "Chat included"));
    content.append(meta);

    const actions = createElement("div", "ticket-actions");
    actions.append(createElement("label", "", "Update status"));
    const select = createElement("select");
    [
      ["open", "Open"],
      ["in-review", "In review"],
      ["resolved", "Resolved"]
    ].forEach(([value, label]) => {
      const option = createElement("option", "", label);
      option.value = value;
      option.selected = value === ticket.status;
      select.append(option);
    });
    select.setAttribute("aria-label", `Status for ${ticket.id}`);
    select.addEventListener("change", () => void updateTicket(ticket, select.value, select));
    actions.append(select);
    card.append(content, actions);
    return card;
  }

  function render() {
    updateMetrics();
    const term = search.value.trim().toLowerCase();
    const statusValue = filter.value;
    const visible = tickets.filter((ticket) => {
      const matchesStatus = statusValue === "all" || ticket.status === statusValue;
      const haystack = `${ticket.id} ${ticket.name} ${ticket.email} ${ticket.category} ${ticket.question} ${ticket.details}`.toLowerCase();
      return matchesStatus && (!term || haystack.includes(term));
    });

    grid.replaceChildren();
    if (!visible.length) {
      const empty = createElement("div", "empty-queue");
      empty.append(
        createElement("strong", "", tickets.length ? "No requests match these filters" : "No support requests yet"),
        createElement("span", "", tickets.length ? "Try a different search or status." : "Create one from the student assistant to test the escalation flow.")
      );
      grid.append(empty);
    } else {
      visible.forEach((ticket) => grid.append(renderTicket(ticket)));
    }
    status.textContent = `${visible.length} ${visible.length === 1 ? "request" : "requests"} shown.`;
  }

  async function loadTickets() {
    refresh.disabled = true;
    status.textContent = "Loading requests…";
    try {
      const response = await fetch("/api/tickets");
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || "Queue could not be loaded.");
      tickets = result;
      render();
    } catch (error) {
      status.textContent = error.message;
      grid.replaceChildren();
    } finally {
      refresh.disabled = false;
    }
  }

  search.addEventListener("input", render);
  filter.addEventListener("change", render);
  refresh.addEventListener("click", () => void loadTickets());
  void loadTickets();
})();
