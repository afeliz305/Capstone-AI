(function (root) {
  "use strict";
  function createTicketWorkspace({ getContext, onSaved, onUnauthorized, onClose }) {
    const $ = selector => document.querySelector(selector);
    const dialog = $("#ticket-workspace-dialog");
    const form = $("#ticket-workspace-form");
    const fields = $("#ticket-workspace-fields");
    const message = $("#ticket-workspace-status");
    const save = $("#save-ticket-workspace");
    const close = $("#close-ticket-workspace");
    const reload = $("#reload-ticket-workspace");
    const preview = $("#load-requester-preview");
    const controls = { category: "work-category", status: "work-state", priority: "work-priority", assignedTo: "work-assignee", question: "work-question", details: "work-details", resolution: "work-resolution", workNote: "work-note", additionalComment: "work-comment", projectOwnerTicket: "work-owner" };
    let ticket = null;
    let activeId = null;
    let generation = 0;
    let previewSequence = 0;
    let busy = false;
    let original = "";
    let lastAttempt = null;
    const date = value => value ? new Date(value).toLocaleString() : "Not recorded";
    const node = (tag, text, className) => {
      const element = document.createElement(tag);
      if (text !== undefined) element.textContent = text;
      if (className) element.className = className;
      return element;
    };
    const values = () => Object.fromEntries(Object.entries(controls).map(([key, id]) => [key, key === "assignedTo" ? $("#" + id).value || null : key === "projectOwnerTicket" ? $("#" + id).value === "project-owner" : $("#" + id).value]));
    const dirty = () => Boolean(ticket) && JSON.stringify(values()) !== original;
    function setBusy(value) {
      busy = value;
      fields.disabled = value || !ticket;
      save.disabled = value || !ticket;
      close.disabled = value;
      reload.disabled = value || !activeId;
      preview.disabled = value || !ticket;
      form.setAttribute("aria-busy", String(value));
    }
    function wipe() {
      previewSequence++;
      ticket = null; activeId = null; original = ""; lastAttempt = null;
      Object.values(controls).forEach(id => { $("#" + id).value = ""; });
      ["work-number", "work-requester", "work-email", "work-contact", "work-created"].forEach(id => { $("#" + id).value = ""; });
      ["work-category", "work-assignee", "work-activity", "work-documents", "requester-preview-content"].forEach(id => $("#" + id).replaceChildren());
      $("#work-transcript").textContent = "";
      $("#ticket-workspace-title").textContent = "Ticket details";
      message.textContent = "";
      setBusy(false);
    }
    function clear() {
      generation++;
      wipe();
      if (dialog.open) dialog.close();
    }
    const alive = (turn, epoch) => turn === generation && epoch === getContext().epoch && Boolean(getContext().staff);
    async function request(route, options, turn, epoch) {
      const response = await window.CapstoneApi.fetch(route, { credentials: "same-origin", cache: "no-store", ...options });
      const data = await window.CapstoneApi.readJson(response);
      if (!alive(turn, epoch)) return null;
      if ([401, 403].includes(response.status)) { onUnauthorized(data.error); return null; }
      if (!response.ok) throw new Error(data.error || "The ticket could not be loaded or saved.");
      return data;
    }
    function options(select, choices, value) {
      select.replaceChildren();
      if (!choices.some(choice => choice.value === value)) choices.push({ value, label: value || "Other" });
      choices.forEach(choice => {
        const option = node("option", choice.label);
        option.value = choice.value;
        select.append(option);
      });
      select.value = value;
    }
    function fill(record) {
      previewSequence++;
      ticket = record;
      $("#ticket-workspace-title").textContent = record.id + " · Ticket details";
      $("#work-number").value = record.id;
      $("#work-requester").value = record.name;
      $("#work-email").value = record.email;
      const contact = root.CapstoneContactPolicy.contactFor(record);
      $("#work-contact").value = (contact.method === "phone" ? "Phone · " : "Email · ") + contact.value;
      $("#work-created").value = date(record.createdAt);
      const topics = [...$("#staff-ticket-topic").querySelectorAll("option")].map(option => ({ value: option.value, label: option.textContent }));
      options($("#work-category"), topics, record.category || "Other");
      options($("#work-assignee"), [{ value: "", label: "Unassigned" }, ...getContext().members.map(member => ({ value: member.email, label: member.name }))], record.assignedTo || "");
      Object.entries(controls).forEach(([key, id]) => {
        if (!["category", "assignedTo"].includes(key)) $("#" + id).value = key === "projectOwnerTicket" ? record.projectOwnerTicket === true ? "project-owner" : "standard" : key === "priority" ? record.priority || "normal" : record[key] || "";
      });
      $("#work-note").value = $("#work-comment").value = "";
      $("#work-transcript").textContent = record.transcript || "No chat transcript was included.";
      const documents = $("#work-documents"); documents.replaceChildren();
      if (!record.attachments?.length) documents.append(node("p", "No documents attached."));
      else {
        const list = node("ul");
        record.attachments.forEach(file => {
          const item = node("li"); const link = node("a", file.name);
          link.href = window.CapstoneApi.url("/api/tickets/" + encodeURIComponent(record.id) + "/attachments/" + encodeURIComponent(file.id));
          link.download = file.name; item.append(link); list.append(item);
          if (window.CapstoneApi.download) link.addEventListener("click", async event => {
            event.preventDefault();
            try { await window.CapstoneApi.download("/api/tickets/" + record.id + "/attachments/" + file.id, file.name); }
            catch (error) { message.textContent = error.message; }
          });
        });
        documents.append(list, node("p", "Files are not malware-scanned. Open only trusted test documents."));
      }
      const history = $("#work-activity"); history.replaceChildren();
      const entries = [...(record.activity || [])].reverse();
      if (!entries.length) history.append(node("p", "No work notes or comments yet."));
      for (const entry of entries) {
        const internal = entry.type !== "additional-comment";
        const item = node("article", undefined, "activity-entry " + (internal ? "activity-internal" : "activity-requester"));
        item.append(
          node("h4", entry.type === "work-note" ? "Work note · Internal only" : entry.type === "additional-comment" ? "Additional comment · Requester-visible" : "Field update · Internal only"),
          node("p", (entry.author?.name || "Staff") + " · " + date(entry.createdAt), "activity-meta"),
          node("p", entry.body, "activity-body")
        );
        history.append(item);
      }
      $("#requester-preview-content").replaceChildren();
      original = JSON.stringify(values());
      lastAttempt = null;
    }
    async function load(id) {
      const turn = ++generation;
      const epoch = getContext().epoch;
      activeId = id; setBusy(true); message.textContent = "Loading ticket…";
      try {
        const result = await request("/api/tickets/" + encodeURIComponent(id), {}, turn, epoch);
        if (!result) return;
        fill(result); message.textContent = "Edit fields or add a note, then Save changes.";
      } catch (error) { if (alive(turn, epoch)) message.textContent = error.message; }
      finally { if (alive(turn, epoch)) setBusy(false); }
    }
    async function open(id) {
      if (!getContext().staff || dialog.open) return;
      wipe();
      dialog.showModal();
      $("#ticket-workspace-title").focus();
      await load(id);
    }
    function requestClose() {
      if (busy) return;
      if (dirty() && !root.confirm("Discard the unsaved ticket changes and notes?")) return;
      dialog.close();
    }
    close.addEventListener("click", requestClose);
    dialog.addEventListener("cancel", event => { event.preventDefault(); requestClose(); });
    dialog.addEventListener("close", () => {
      const id = activeId; generation++; wipe();
      if (getContext().staff) onClose(id);
    });
    reload.addEventListener("click", () => {
      if (busy || !activeId) return;
      if (dirty() && !root.confirm("Reload the latest ticket? Unsaved changes and notes will be discarded. Copy any text you want to keep first.")) return;
      void load(activeId);
    });
    form.addEventListener("submit", async event => {
      event.preventDefault();
      if (busy || !ticket || !getContext().staff || !form.reportValidity()) return;
      const changes = values();
      if (!changes.question.trim() || !changes.details.trim()) { message.textContent = "Title and description cannot be blank."; return; }
      if (!dirty()) { message.textContent = "No unsaved changes."; return; }
      const signature = JSON.stringify({ ...changes, expectedRevision: ticket.revision || 0 });
      if (!lastAttempt || lastAttempt.signature !== signature) lastAttempt = { signature, body: { ...JSON.parse(signature), requestId: root.crypto.randomUUID() } };
      const turn = generation; const epoch = getContext().epoch;
      setBusy(true); message.textContent = "Saving changes…";
      try {
        const result = await request("/api/tickets/" + encodeURIComponent(ticket.id) + "/work", {
          method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify(lastAttempt.body)
        }, turn, epoch);
        if (!result) return;
        fill(result); onSaved(result);
        message.textContent = "Changes saved." + (changes.workNote.trim() || changes.additionalComment.trim() ? " Notes were added to the activity history." : "") + " No email sent.";
      } catch (error) { if (alive(turn, epoch)) message.textContent = error.message + " Your draft is still here."; }
      finally { if (alive(turn, epoch)) setBusy(false); }
    });
    preview.addEventListener("click", async () => {
      if (busy || !ticket) return;
      const turn = generation; const epoch = getContext().epoch;
      const sequence = ++previewSequence;
      const target = $("#requester-preview-content");
      preview.disabled = true; target.replaceChildren(node("p", "Loading saved requester view…"));
      try {
        const result = await request("/api/tickets/" + encodeURIComponent(ticket.id) + "/requester-preview", {}, turn, epoch);
        if (!result || sequence !== previewSequence) return;
        target.replaceChildren(node("h4", result.id + " · " + result.status.replace("-", " ")), node("p", result.question), node("p", result.details));
        if (!result.comments.length) target.append(node("p", "No additional comments yet."));
        result.comments.forEach(comment => {
          const item = node("article", undefined, "activity-entry activity-requester");
          item.append(node("p", comment.authorName + " · " + date(comment.createdAt)), node("p", comment.body, "activity-body"));
          target.append(item);
        });
      } catch (error) { if (alive(turn, epoch) && sequence === previewSequence) target.replaceChildren(node("p", error.message)); }
      finally { if (alive(turn, epoch) && sequence === previewSequence) preview.disabled = false; }
    });
    root.addEventListener("beforeunload", event => { if (dirty()) { event.preventDefault(); event.returnValue = ""; } });
    return { open, clear };
  }
  root.CapstoneTicketWorkspace = { createTicketWorkspace };
})(window);
