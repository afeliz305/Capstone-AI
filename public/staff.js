(() => {
  "use strict";
  const $ = (selector) => document.querySelector(selector);
  const grid = $("#ticket-grid");
  const status = $("#queue-status");
  const search = $("#ticket-search");
  const clearSearch = $("#clear-ticket-search");
  const filter = $("#status-filter");
  const viewButtons = [...document.querySelectorAll("[data-view]")];
  const unassigned = $("#unassigned-filter");
  const refresh = $("#refresh-tickets");
  const logout = $("#staff-logout");
  const access = $("#staff-access");
  const checking = $("#staff-checking");
  const login = $("#staff-login");
  const denied = $("#staff-denied");
  const workspace = $("#staff-workspace");
  const loginForm = $("#staff-login-form");
  const loginStatus = $("#staff-login-status");
  const staffEmail = $("#staff-email");
  const rememberedEmailKey = "capstone-ai-chat:last-staff-email";
  const createButton = $("#create-staff-ticket");
  const ticketDialog = $("#staff-ticket-dialog");
  const ticketForm = $("#staff-ticket-form");
  const ticketFields = $("#staff-ticket-fields");
  const ticketStatus = $("#staff-ticket-status");
  const saveTicket = $("#save-staff-ticket");
  const cancelTicket = $("#cancel-staff-ticket");
  const attachmentInput = $("#staff-ticket-attachments");
  const attachmentList = $("#staff-attachment-list");
  const attachmentStatus = $("#staff-attachment-status");
  const attachmentPolicy = window.CapstoneAttachmentPolicy;
  let selectedAttachments = [];
  const contactPolicy = window.CapstoneContactPolicy;
  const contactFields = contactPolicy.bindContactFields({ method: $("#staff-contact-method"), phone: $("#staff-contact-phone"), phoneField: $("#staff-phone-field") });
  let creatingTicket = false;
  const { QUEUE_VIEWS, categoryTag, ticketsForView, groupTicketsByAssignee, createIdleRedirect } = window.CapstoneStaffView;
  let currentView = "all";
  let tickets = [];
  let staff = null;
  let members = [];
  let authEpoch = 0;
  let loadSequence = 0;
  const ticketWorkspace = window.CapstoneTicketWorkspace.createTicketWorkspace({
    getContext: () => ({ staff, members, epoch: authEpoch }),
    onUnauthorized: showDenied,
    onSaved: (updated) => {
      loadSequence++; refresh.disabled = false;
      tickets = tickets.map(item => item.id === updated.id ? updated : item);
      render();
      status.textContent = updated.id + " updated. Current view and filters retained.";
    },
    onClose: (id) => { const opener = $("#open-ticket-" + id); (opener || search).focus(); }
  });
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

  function readRememberedEmail() {
    try {
      const email = window.localStorage.getItem(rememberedEmailKey);
      return contactPolicy.validEmail(email) ? email.trim() : "";
    } catch { return ""; } // Browser storage may be disabled or unavailable.
  }

  function rememberStaffEmail(email) {
    if (!contactPolicy.validEmail(email)) return;
    // Use only the server-confirmed identity. This preference never grants access.
    staffEmail.value = email.trim();
    try { window.localStorage.setItem(rememberedEmailKey, staffEmail.value); }
    catch { /* Sign-in must still work when the browser cannot save preferences. */ }
  }

  function clearQueue() {
    authEpoch++;
    loadSequence++;
    staff = null;
    ticketWorkspace.clear();
    if (ticketDialog.open) ticketDialog.close();
    resetTicketForm();
    members = [];
    tickets = [];
    currentView = "all";
    search.value = "";
    clearSearch.disabled = true;
    filter.value = "all";
    unassigned.checked = false;
    status.textContent = "";
    viewButtons.forEach((button) => {
      button.querySelector("[data-view-count]").textContent = "0";
      button.setAttribute("aria-label", QUEUE_VIEWS[button.dataset.view].label + ", 0 tickets");
      button.setAttribute("aria-pressed", String(button.dataset.view === "all"));
    });
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

  function setAttachmentBusy(busy) {
    attachmentInput.disabled = busy;
    attachmentList.querySelectorAll("button").forEach(button => { button.disabled = busy; });
  }

  function renderAttachments() {
    attachmentList.replaceChildren();
    attachmentList.hidden = selectedAttachments.length === 0;
    selectedAttachments.forEach((file, index) => {
      const item = element("li");
      item.append(element("span", "", `${file.name} (${Math.max(1, Math.ceil(file.size / 1024))} KB)`));
      const remove = element("button", "staff-secondary", "Remove");
      remove.type = "button";
      remove.setAttribute("aria-label", `Remove ${file.name}`);
      remove.addEventListener("click", () => {
        if (creatingTicket) return;
        selectedAttachments.splice(index, 1);
        attachmentStatus.textContent = "";
        renderAttachments();
        attachmentInput.focus();
      });
      item.append(remove);
      attachmentList.append(item);
    });
    setAttachmentBusy(creatingTicket);
  }

  attachmentInput.addEventListener("change", () => {
    const next = [...selectedAttachments, ...attachmentInput.files];
    attachmentInput.value = "";
    if (!staff || creatingTicket) return;
    const error = attachmentPolicy.validate(next);
    attachmentStatus.textContent = error;
    if (error) return; // Keep the previous valid selection unchanged.
    selectedAttachments = next;
    renderAttachments();
  });

  function readAttachment(file) {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve({ name: file.name, size: file.size, data: String(reader.result).split(",")[1] });
      reader.onerror = reader.onabort = () => reject(new Error(`Could not read ${file.name}. Remove it and select the document again.`));
      reader.readAsDataURL(file);
    });
  }

  function resetTicketForm() {
    creatingTicket = false;
    ticketForm.reset();
    contactFields.reset();
    selectedAttachments = [];
    attachmentInput.value = "";
    attachmentStatus.textContent = "";
    renderAttachments();
    $("#staff-ticket-owner").value = "standard";
    $("#staff-ticket-creator").value = "";
    $("#staff-ticket-assignee").replaceChildren();
    ticketStatus.textContent = "";
    ticketForm.setAttribute("aria-busy", "false");
    ticketFields.disabled = saveTicket.disabled = cancelTicket.disabled = false;
    saveTicket.textContent = "Create ticket";
  }

  function openTicketForm() {
    if (!staff || ticketDialog.open) return;
    resetTicketForm();
    $("#staff-ticket-creator").value = staff.name + " (" + staff.email + ")";
    [{ name: "Unassigned", email: "" }, ...members].forEach((member) => {
      const option = element("option", "", member.name + (member.email === staff.email ? " (you)" : ""));
      option.value = member.email;
      $("#staff-ticket-assignee").append(option);
    });
    $("#staff-ticket-assignee").value = "";
    ticketDialog.showModal();
  }

  ticketForm.addEventListener("submit", async (event) => {
    event.preventDefault();
    if (!staff || creatingTicket || !ticketForm.reportValidity()) return;
    const question = $("#staff-ticket-question").value.trim();
    const details = $("#staff-ticket-details").value.trim();
    if (!question || !details) {
      ticketStatus.textContent = "Enter a title and details, not just spaces.";
      $(!question ? "#staff-ticket-question" : "#staff-ticket-details").focus();
      return;
    }
    const epoch = authEpoch;
    const contactInput = { preferredContactMethod: $("#staff-contact-method").value, contactPhone: $("#staff-contact-method").value === "phone" ? $("#staff-contact-phone").value : undefined };
    try { contactPolicy.normalizeContact(contactInput, staff.email); }
    catch (error) { ticketStatus.textContent = error.message; return; }
    const attachmentError = attachmentPolicy.validate(selectedAttachments);
    if (attachmentError) { attachmentStatus.textContent = attachmentError; attachmentInput.focus(); return; }
    const payload = { category: $("#staff-ticket-topic").value, question, details, assignedTo: $("#staff-ticket-assignee").value || null, ...contactInput, projectOwnerTicket: $("#staff-ticket-owner").value === "project-owner" };
    creatingTicket = true;
    contactFields.setBusy(true);
    setAttachmentBusy(true);
    ticketFields.disabled = saveTicket.disabled = cancelTicket.disabled = true;
    ticketForm.setAttribute("aria-busy", "true");
    saveTicket.textContent = "Creating ticket…";
    ticketStatus.textContent = selectedAttachments.length ? "Reading documents and saving your ticket…" : "Saving your ticket…";
    try {
      payload.attachments = selectedAttachments.length ? await Promise.all(selectedAttachments.map(readAttachment)) : [];
      // A logout or account change while reading must never submit the old draft.
      if (epoch !== authEpoch || !staff) return;
      const response = await fetch("/api/staff/tickets", {
        method: "POST", credentials: "same-origin", headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload)
      });
      const created = await response.json();
      if (epoch !== authEpoch || requestFailed(response, created)) return;
      // An older queue refresh must not overwrite the newly saved ticket.
      loadSequence++;
      refresh.disabled = false;
      tickets = [created, ...tickets.filter((ticket) => ticket.id !== created.id)];
      ticketDialog.close();
      resetTicketForm();
      selectView("all");
      status.textContent = created.id + " created · Open · " + nameFor(created.assignedTo) + ". Showing All tickets. No email sent.";
    } catch (error) {
      if (epoch === authEpoch) ticketStatus.textContent = error.message + " Your draft is still here. If the connection failed, check the queue before retrying to avoid a duplicate.";
    } finally {
      if (epoch === authEpoch) {
        creatingTicket = false;
        contactFields.setBusy(false);
        setAttachmentBusy(false);
        ticketFields.disabled = saveTicket.disabled = cancelTicket.disabled = false;
        ticketForm.setAttribute("aria-busy", "false");
        saveTicket.textContent = "Create ticket";
      }
    }
  });
  createButton.addEventListener("click", openTicketForm);
  cancelTicket.addEventListener("click", () => { if (!creatingTicket) ticketDialog.close(); });
  ticketDialog.addEventListener("cancel", (event) => { if (creatingTicket) event.preventDefault(); });
  ticketDialog.addEventListener("close", () => {
    resetTicketForm();
    if (staff) createButton.focus();
  });

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

  function renderTicket(ticket, grouped = false) {
    const card = element("article", "ticket-card");
    const content = element("div");
    const top = element("div", "ticket-badges");
    const category = categoryTag(ticket.category);
    const ticketLink = element("button", "ticket-id", ticket.id);
    ticketLink.type = "button";
    ticketLink.id = "open-ticket-" + ticket.id;
    ticketLink.setAttribute("aria-label", "Open ticket " + ticket.id);
    ticketLink.setAttribute("aria-haspopup", "dialog");
    ticketLink.addEventListener("click", () => void ticketWorkspace.open(ticket.id));
    top.append(
      ticketLink,
      element("span", "status-pill status-" + ticket.status, ticket.status.replace("-", " ")),
      element("span", "ticket-category-tag category-" + category.tone, "Category: " + category.label)
    );
    if (ticket.isSample) top.append(element("span", "sample-ticket-label", "Sample · fictional"));
    if (ticket.projectOwnerTicket === true) top.append(element("span", "project-owner-tag", "Project owner · Staff marked"));
    content.append(top, element(grouped ? "h3" : "h2", "ticket-title", ticket.name), element("p", "ticket-question", ticket.question), element("p", "ticket-details", ticket.details));
    const meta = element("div", "ticket-meta");
    const identityLabels = { "portal-session": "From signed-in account", "demo-session": "Sample account · demo only", "sample-seed": "Generated test data", "staff-session": "Created by signed-in staff", manual: "Manually entered contact" };
    meta.append(element("span", "", ticket.email), element("span", "", formatDate(ticket.createdAt)), element("span", "", identityLabels[ticket.identitySource] || identityLabels.manual));
    meta.append(element("span", "", "Assigned to: " + nameFor(ticket.assignedTo)));
    const contact = contactPolicy.contactFor(ticket);
    meta.append(element("span", "ticket-contact", "Preferred contact: " + (contact.method === "phone" ? "Phone · " : "Email · ") + contact.value));
    if (ticket.privateToInstructor) meta.append(element("span", "ticket-privacy", "Instructor privacy requested"));
    if (ticket.transcript) meta.append(element("span", "", "Chat included"));
    content.append(meta);
    if (ticket.resolution) {
      const resolution = element("section", "ticket-resolution");
      resolution.append(element(grouped ? "h4" : "h3", "resolution-title", ticket.isSample ? "Example resolution" : "Resolution"), element("p", "", ticket.resolution));
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
    const openTicket = element("button", "staff-secondary", "Open ticket");
    openTicket.type = "button";
    openTicket.setAttribute("aria-label", "Open ticket " + ticket.id);
    openTicket.setAttribute("aria-haspopup", "dialog");
    openTicket.addEventListener("click", () => void ticketWorkspace.open(ticket.id));
    actions.append(openTicket);
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
    clearSearch.disabled = !search.value;
    const definition = QUEUE_VIEWS[currentView];
    viewButtons.forEach((button) => {
      const view = button.dataset.view;
      const count = ticketsForView(tickets, view, staff.email).length;
      button.setAttribute("aria-pressed", String(view === currentView));
      button.setAttribute("aria-label", QUEUE_VIEWS[view].label + ", " + count + " tickets");
      button.querySelector("[data-view-count]").textContent = count;
    });
    $("#queue-view-description").textContent = definition.description;
    $("#unassigned-filter-label").hidden = !definition.grouped;
    filter.disabled = definition.resolvedOnly;
    if (definition.resolvedOnly) filter.value = "resolved";
    grid.setAttribute("aria-label", definition.label);
    $("#my-ticket-count").textContent = tickets.filter((ticket) => ticket.assignedTo === staff.email).length;
    $("#unassigned-count").textContent = tickets.filter((ticket) => !ticket.assignedTo).length;
    const scoped = ticketsForView(tickets, currentView, staff.email);
    $("#open-count").textContent = scoped.filter((ticket) => ticket.status === "open").length;
    $("#review-count").textContent = scoped.filter((ticket) => ticket.status === "in-review").length;
    $("#resolved-count").textContent = scoped.filter((ticket) => ticket.status === "resolved").length;
    const visible = ticketsForView(tickets, currentView, staff.email, { status: filter.value, search: search.value, unassignedOnly: unassigned.checked });
    grid.replaceChildren();
    if (!visible.length) {
      const empty = element("div", "empty-queue");
      const noneAssigned = currentView === "mine" && !scoped.length;
      const noResolved = definition.resolvedOnly && !scoped.length;
      const heading = noneAssigned ? "No tickets assigned to you yet" : noResolved ? (currentView === "mine-resolved" ? "No resolved tickets assigned to you" : "No resolved tickets yet") : "No requests match this view";
      empty.append(element("strong", "", heading), element("span", "", noneAssigned ? "Choose All tickets, then Unassigned only to find work to claim." : "Choose another view or clear the search and available filters."));
      grid.append(empty);
    } else if (definition.grouped) {
      groupTicketsByAssignee(visible, members).forEach((group, index) => {
        const section = element("section", "assignee-group");
        const header = element("div", "assignee-heading");
        const identity = element("div");
        const title = element("h2", "", group.name + (group.email === staff.email ? " (you)" : ""));
        title.id = "assignee-group-" + index;
        section.setAttribute("aria-labelledby", title.id);
        identity.append(title, element("p", "", group.email || "Waiting to be claimed"));
        header.append(identity, element("span", "assignee-count", group.tickets.length + (group.tickets.length === 1 ? " ticket" : " tickets")));
        const cards = element("div", "ticket-grid");
        group.tickets.forEach((ticket) => cards.append(renderTicket(ticket, true)));
        section.append(header, cards);
        grid.append(section);
      });
    } else visible.forEach((ticket) => grid.append(renderTicket(ticket)));
    status.textContent = definition.label + ": " + visible.length + " of " + scoped.length + (scoped.length === 1 ? " ticket shown." : " tickets shown.");
  }

  function selectView(view) {
    if (!QUEUE_VIEWS[view]) return;
    currentView = view;
    search.value = "";
    filter.value = QUEUE_VIEWS[view].resolvedOnly ? "resolved" : "all";
    unassigned.checked = false;
    render();
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
    rememberStaffEmail(staff.email);
    access.hidden = true;
    workspace.hidden = refresh.hidden = logout.hidden = false;
    logout.disabled = false;
    $("#staff-welcome").textContent = "Welcome, " + staff.name;
    $("#staff-identity").textContent = "Signed in as " + staff.email;
    selectView("all");
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
  function clearTicketSearch() {
    search.value = "";
    render();
    search.focus();
  }
  clearSearch.addEventListener("click", clearTicketSearch);
  search.addEventListener("keydown", (event) => {
    if (event.key === "Escape" && search.value) {
      event.preventDefault();
      clearTicketSearch();
    }
  });
  filter.addEventListener("change", render);
  unassigned.addEventListener("change", render);
  viewButtons.forEach((button) => button.addEventListener("click", () => selectView(button.dataset.view)));
  refresh.addEventListener("click", () => void loadTickets());
  window.addEventListener("pageshow", (event) => { if (event.persisted) { clearQueue(); void checkSession(); } });
  window.setInterval(() => { if (staff && !document.hidden) void checkSession(); }, 60000);
  if (!staffEmail.value) staffEmail.value = readRememberedEmail();
  void checkSession();
})();
