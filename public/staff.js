(() => {
  "use strict";
  const $ = (selector) => document.querySelector(selector);
  const grid = $("#ticket-grid");
  const status = $("#queue-status");
  const search = $("#ticket-search");
  const filter = $("#status-filter");
  const assignment = $("#assignment-filter");
  const refresh = $("#refresh-tickets");
  const logout = $("#staff-logout");
  const access = $("#staff-access");
  const checking = $("#staff-checking");
  const login = $("#staff-login");
  const denied = $("#staff-denied");
  const workspace = $("#staff-workspace");
  const loginForm = $("#staff-login-form");
  const loginStatus = $("#staff-login-status");
  const { filterTickets, createIdleRedirect } = window.CapstoneStaffView;
  let tickets = [];
  let staff = null;
  let members = [];
  let authEpoch = 0;
  let loadSequence = 0;
  const redirect = createIdleRedirect({
    onTick: (seconds) => { $("#staff-return-seconds").textContent = seconds; },
    onTimeout: () => window.location.replace("/")
  });

  function element(tag, className, text) {
    const node = document.createElement(tag);
    if (className) node.className = className;
    if (text !== undefined) node.textContent = text;
    return node;
  }

  function clearQueue() {
    authEpoch++;
    loadSequence++;
    staff = null;
    members = [];
    tickets = [];
    grid.replaceChildren();
    workspace.hidden = refresh.hidden = logout.hidden = true;
    $("#staff-welcome").textContent = "Support requests";
    $("#staff-identity").textContent = "";
    ["#my-ticket-count", "#unassigned-count", "#open-count", "#review-count", "#resolved-count"].forEach((selector) => { $(selector).textContent = "0"; });
  }

  function showLogin(message = "") {
    clearQueue();
    redirect.stop();
    access.hidden = login.hidden = false;
    checking.hidden = denied.hidden = true;
    loginStatus.textContent = message;
    $("#staff-password").value = "";
    $("#staff-email").focus();
  }

  function showDenied(message) {
    clearQueue();
    access.hidden = denied.hidden = false;
    checking.hidden = login.hidden = true;
    $("#staff-password").value = "";
    $("#staff-denied-message").textContent = message || "Your staff session has ended. Sign in again to continue.";
    $("#staff-denied-title").focus();
    redirect.start();
  }

  function requestFailed(response, data) {
    if ([401, 403].includes(response.status)) {
      showDenied(data.error);
      return true;
    }
    if (!response.ok) throw new Error(data.error || "The request could not be completed.");
    return false;
  }

  function nameFor(email) { return members.find((member) => member.email === email)?.name || email || "Unassigned"; }

  function formatDate(value) {
    const date = new Date(value);
    return Number.isNaN(date.getTime()) ? "Unknown date" : new Intl.DateTimeFormat("en", { dateStyle: "medium", timeStyle: "short" }).format(date);
  }

  async function updateTicket(ticket, changes, actions) {
    const epoch = authEpoch;
    actions.querySelectorAll("button, select").forEach((control) => { control.disabled = true; });
    try {
      const response = await fetch("/api/tickets/" + encodeURIComponent(ticket.id), {
        method: "PATCH", credentials: "same-origin",
        headers: { "Content-Type": "application/json" }, body: JSON.stringify(changes)
      });
      const updated = await response.json();
      if (epoch !== authEpoch || requestFailed(response, updated)) return;
      tickets = tickets.map((item) => item.id === updated.id ? updated : item);
      render();
      status.textContent = Object.hasOwn(changes, "assignedTo")
        ? updated.id + " assigned to " + nameFor(updated.assignedTo) + "."
        : updated.id + " moved to " + updated.status.replace("-", " ") + ".";
    } catch (error) {
      if (epoch !== authEpoch) return;
      render();
      status.textContent = error.message;
    }
  }

  function renderTicket(ticket) {
    const card = element("article", "ticket-card");
    const content = element("div");
    const top = element("div");
    top.append(element("span", "ticket-id", ticket.id), document.createTextNode(" "), element("span", "status-pill status-" + ticket.status, ticket.status.replace("-", " ")));
    if (ticket.isSample) top.append(document.createTextNode(" "), element("span", "sample-ticket-label", "Sample · fictional"));
    content.append(top, element("h2", "", ticket.category + " · " + ticket.name), element("p", "ticket-question", ticket.question), element("p", "ticket-details", ticket.details));
    const meta = element("div", "ticket-meta");
    const identityLabels = { "portal-session": "From signed-in account", "demo-session": "Sample account · demo only", "sample-seed": "Generated test data", manual: "Manually entered contact" };
    meta.append(element("span", "", ticket.email), element("span", "", formatDate(ticket.createdAt)), element("span", "", identityLabels[ticket.identitySource] || identityLabels.manual));
    meta.append(element("span", "", "Assigned to: " + nameFor(ticket.assignedTo)));
    if (ticket.privateToInstructor) meta.append(element("span", "ticket-privacy", "Instructor privacy requested"));
    if (ticket.transcript) meta.append(element("span", "", "Chat included"));
    content.append(meta);
    if (ticket.resolution) {
      const resolution = element("section", "ticket-resolution");
      resolution.append(element("h3", "", ticket.isSample ? "Example resolution" : "Resolution"), element("p", "", ticket.resolution));
      if (ticket.resolvedAt) resolution.append(element("p", "resolution-meta", (ticket.isSample ? "Sample resolution: " : "Resolved: ") + formatDate(ticket.resolvedAt) + (ticket.resolvedBy ? " · " + nameFor(ticket.resolvedBy) : "")));
      content.append(resolution);
    }
    if (ticket.attachments?.length) {
      const attachments = element("div", "ticket-attachments");
      const list = element("ul");
      for (const file of ticket.attachments) {
        const item = element("li");
        const link = element("a", "", file.name + " (" + Math.max(1, Math.ceil(file.size / 1024)) + " KB)");
        link.href = "/api/tickets/" + encodeURIComponent(ticket.id) + "/attachments/" + encodeURIComponent(file.id);
        link.download = file.name;
        item.append(link);
        list.append(item);
      }
      attachments.append(element("strong", "", "Documents"), list, element("p", "", "Downloads are not malware-scanned. Open only trusted sample documents."));
      content.append(attachments);
    }
    const actions = element("div", "ticket-actions");
    const statusLabel = element("label", "", "Update status");
    const statusSelect = element("select");
    statusSelect.setAttribute("aria-label", "Status for " + ticket.id);
    [["open", "Open"], ["in-review", "In review"], ["resolved", "Resolved"]].forEach(([value, label]) => {
      const option = element("option", "", label);
      option.value = value;
      option.selected = value === ticket.status;
      statusSelect.append(option);
    });
    statusSelect.addEventListener("change", () => void updateTicket(ticket, { status: statusSelect.value }, actions));
    statusLabel.append(statusSelect);
    const assignmentLabel = element("label", "", "Assign to");
    const assigneeSelect = element("select");
    assigneeSelect.setAttribute("aria-label", "Assignment for " + ticket.id);
    [{ name: "Unassigned", email: "" }, ...members].forEach((member) => {
      const option = element("option", "", member.name);
      option.value = member.email;
      option.selected = member.email === (ticket.assignedTo || "");
      assigneeSelect.append(option);
    });
    assigneeSelect.addEventListener("change", () => void updateTicket(ticket, { assignedTo: assigneeSelect.value || null, expectedAssignee: ticket.assignedTo || null }, actions));
    assignmentLabel.append(assigneeSelect);
    actions.append(statusLabel, assignmentLabel);
    if (!ticket.assignedTo) {
      const claim = element("button", "staff-primary", "Claim ticket");
      claim.type = "button";
      claim.addEventListener("click", () => void updateTicket(ticket, { assignedTo: staff.email, expectedAssignee: null }, actions));
      actions.append(claim);
    }
    card.append(content, actions);
    return card;
  }

  function render() {
    if (!staff) return;
    $("#my-ticket-count").textContent = tickets.filter((ticket) => ticket.assignedTo === staff.email).length;
    $("#unassigned-count").textContent = tickets.filter((ticket) => !ticket.assignedTo).length;
    const scoped = filterTickets(tickets, { email: staff.email, assignment: assignment.value });
    $("#open-count").textContent = scoped.filter((ticket) => ticket.status === "open").length;
    $("#review-count").textContent = scoped.filter((ticket) => ticket.status === "in-review").length;
    $("#resolved-count").textContent = scoped.filter((ticket) => ticket.status === "resolved").length;
    const visible = filterTickets(tickets, { email: staff.email, assignment: assignment.value, status: filter.value, search: search.value });
    grid.replaceChildren();
    if (!visible.length) {
      const empty = element("div", "empty-queue");
      const noneAssigned = assignment.value === "mine" && !tickets.some((ticket) => ticket.assignedTo === staff.email);
      empty.append(element("strong", "", noneAssigned ? "No tickets assigned to you yet" : "No requests match this view"), element("span", "", noneAssigned ? "Choose Unassigned tickets to claim one, or view All team tickets." : "Try another assignment, status, or search."));
      grid.append(empty);
    } else visible.forEach((ticket) => grid.append(renderTicket(ticket)));
    status.textContent = visible.length + (visible.length === 1 ? " request shown." : " requests shown.");
  }

  async function loadTickets() {
    if (!staff) return;
    const epoch = authEpoch;
    const sequence = ++loadSequence;
    refresh.disabled = true;
    status.textContent = "Loading requests…";
    try {
      const response = await fetch("/api/tickets", { credentials: "same-origin", cache: "no-store" });
      const result = await response.json();
      if (epoch !== authEpoch || sequence !== loadSequence || requestFailed(response, result)) return;
      tickets = result;
      render();
    } catch (error) {
      if (epoch === authEpoch && sequence === loadSequence) { status.textContent = error.message; grid.replaceChildren(); }
    } finally { if (epoch === authEpoch && sequence === loadSequence) refresh.disabled = false; }
  }

  async function enterQueue(session) {
    authEpoch++;
    redirect.stop();
    staff = session.staff;
    members = session.members;
    access.hidden = true;
    workspace.hidden = refresh.hidden = logout.hidden = false;
    logout.disabled = false;
    $("#staff-welcome").textContent = "Welcome, " + staff.name;
    $("#staff-identity").textContent = "Signed in as " + staff.email;
    assignment.value = "mine";
    await loadTickets();
  }

  async function checkSession() {
    const epoch = authEpoch;
    try {
      const response = await fetch("/api/staff/session", { credentials: "same-origin", cache: "no-store" });
      const data = await response.json();
      if (epoch !== authEpoch) return;
      if (response.status === 401) { if (staff) showDenied(data.error); else showLogin(); return; }
      if (!response.ok) throw new Error(data.error || "Staff sign-in is unavailable.");
      if (!staff) await enterQueue(data);
      else if (staff.email !== data.staff.email) { clearQueue(); await enterQueue(data); }
    } catch (error) { if (epoch === authEpoch) showLogin(error.message); }
  }

  loginForm.addEventListener("submit", async (event) => {
    event.preventDefault();
    const submit = loginForm.querySelector("button[type='submit']");
    if (submit.disabled) return;
    submit.disabled = true;
    loginStatus.textContent = "Signing in…";
    const epoch = authEpoch;
    try {
      const response = await fetch("/api/staff/login", {
        method: "POST", credentials: "same-origin",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: $("#staff-email").value, password: $("#staff-password").value })
      });
      const data = await response.json();
      if (epoch !== authEpoch || requestFailed(response, data)) return;
      await enterQueue(data);
    } catch (error) { if (epoch === authEpoch) loginStatus.textContent = error.message; }
    finally { submit.disabled = false; $("#staff-password").value = ""; }
  });

  logout.addEventListener("click", async () => {
    logout.disabled = true;
    try {
      const response = await fetch("/api/staff/logout", { method: "POST", credentials: "same-origin", headers: { "Content-Type": "application/json" }, body: "{}" });
      if (!response.ok) throw new Error("Sign out failed. Please try again.");
      showLogin("You have signed out.");
    } catch (error) { status.textContent = error.message; }
    finally { logout.disabled = false; }
  });
  $("#staff-retry").addEventListener("click", () => showLogin());
  for (const type of ["pointerdown", "keydown"]) denied.addEventListener(type, redirect.respond);
  search.addEventListener("input", render);
  filter.addEventListener("change", render);
  assignment.addEventListener("change", render);
  refresh.addEventListener("click", () => void loadTickets());
  window.addEventListener("pageshow", (event) => { if (event.persisted) { clearQueue(); void checkSession(); } });
  window.setInterval(() => { if (staff && !document.hidden) void checkSession(); }, 60000);
  void checkSession();
})();
