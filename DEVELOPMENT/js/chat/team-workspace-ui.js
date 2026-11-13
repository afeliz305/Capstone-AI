(function () {
  "use strict";
  const model = window.MiraTeamWorkspace;
  const gateway = window.MiraAiGateway;
  const api = window.CapstoneApi;
  const root = document.querySelector("#team-workspace");
  if (!model || !root) return;
  const data = model.snapshot();
  const list = root.querySelector("#team-card-list");
  const detail = root.querySelector("#selected-work-card");
  const summary = root.querySelector("#workspace-summary");
  const statusFilter = root.querySelector("#workspace-status-filter");
  const standup = root.querySelector("#standup-draft-form");
  const standupStatus = root.querySelector("#standup-draft-status");
  const ceremonyPrompts = root.querySelector("#ceremony-prompts");
  let view = "team", selected = null;

  function node(tag, className, text) { const element = document.createElement(tag); if (className) element.className = className; if (text !== undefined) element.textContent = text; return element; }
  function stateLabel(value) { return ({ "in-progress": "In progress", ready: "Ready", done: "Accepted" })[value] || value; }
  function time(value) { try { return value ? new Date(value).toLocaleString() : "Not available"; } catch (_) { return "Not available"; } }
  function visibleCards() { const filter = statusFilter.value; return data.cards.filter((card) => (view !== "mine" || card.owner === data.user.name) && (filter === "all" || filter === "active" && card.status !== "done" || card.status === filter)); }
  function renderCards() {
    list.replaceChildren(); const cards = visibleCards();
    summary.textContent = `${data.sprint.name} snapshot · ${cards.length} card${cards.length === 1 ? "" : "s"} shown · ${data.sprint.inProgress} in progress · ${data.sprint.ready} ready · ${data.sprint.done} accepted`;
    cards.forEach((card) => { const button = node("button", "team-card-row"); button.type = "button"; button.dataset.cardId = card.id; button.setAttribute("aria-pressed", String(card.id === selected?.id)); button.append(node("span", `card-status status-${card.status}`, stateLabel(card.status)), node("strong", "", `${card.id} · ${card.title}`), node("small", "", `${card.owner} · ${card.size} · ${card.area}`)); button.addEventListener("click", () => { selected = card; renderCards(); renderDetail(); }); list.append(button); });
    if (!cards.length) list.append(node("p", "empty-workspace-state", "No cards match this view. Open the current portal board to verify live work."));
  }
  function suppliedEvidence(container) { return [...container.querySelectorAll("textarea[data-criterion-evidence]")].map((input) => input.value); }
  function renderProgress(card) {
    const wrapper = node("section", "card-progress-state"); wrapper.append(node("h4", "", "State distinctions")); const values = node("ul");
    const labels = { workCompleted: "Work completed", evidencePrepared: "Evidence prepared", evidenceSubmitted: "Evidence submitted", verified: "Verified", accepted: "Accepted", done: "Done" };
    Object.entries(labels).forEach(([key, label]) => values.append(node("li", card.progress[key] ? "state-confirmed" : "state-unconfirmed", `${label}: ${card.progress[key] ? "recorded in the historical snapshot" : "not confirmed"}`)));
    wrapper.append(values); return wrapper;
  }
  function renderAssistance(output, result, title) {
    output.hidden = false; output.replaceChildren(node("h4", "", title), node("p", "assistant-state-label", `${result.provider === "mock" ? "Mock AI" : "Deterministic fallback"} · draft recommendation · no portal action`), node("p", "", result.text));
    if (result.citations?.length) { const values = node("ul", "assistant-citations"); result.citations.forEach((citation) => { const item = node("li"); const link = node("a", "", citation.title); link.href = citation.url; link.target = "_blank"; link.rel = "noreferrer"; item.append(link); values.append(item); }); output.append(values); }
  }
  function renderDetail() {
    detail.replaceChildren(); if (!selected) { detail.append(node("p", "", "Select a permitted card to review its details, criteria, evidence, and preparation tools.")); return; }
    const header = node("header", "selected-card-header"), title = node("div"); title.append(node("p", "eyebrow", `${selected.type} · ${selected.area}`), node("h3", "", `${selected.id} · ${selected.title}`)); header.append(title, node("span", `card-status status-${selected.status}`, stateLabel(selected.status)));
    const metadata = node("dl", "selected-card-meta");
    [["Owner", selected.owner], ["Sprint", selected.sprint], ["Snapshot status", stateLabel(selected.status)], ["Dependency", selected.dependency], ["Blocker", selected.blocker], ["Review requirement", selected.reviewRequirement], ["Evidence", selected.evidence.length ? `${selected.evidence.length} verified record` : "Unavailable in snapshot"], ["Source", `${selected.source.label} · ${time(selected.source.verifiedAt)} · read-only`]].forEach(([term, value]) => { metadata.append(node("dt", "", term), node("dd", "", value)); });
    const available = node("details", "card-available-sources"); available.append(node("summary", "", "Available sources")); const availableList = node("ul"); selected.availableSources.forEach((value) => availableList.append(node("li", "", value))); available.append(availableList);
    const form = node("div", "criteria-checker"); selected.criteria.forEach((criterion, index) => { const label = node("label", "criterion-row"); label.append(node("span", "criterion-number", String(index + 1)), node("span", "criterion-text", criterion)); const input = node("textarea"); input.rows = 2; input.maxLength = 800; input.dataset.criterionEvidence = String(index); input.placeholder = "Describe evidence to review (draft only)"; label.append(input); form.append(label); });
    const result = node("p", "evidence-result", "No draft evidence assessed yet."), actions = node("div", "selected-card-actions"), output = node("div", "workspace-draft-output"); output.hidden = true;
    [["explain", "Explain this card"], ["steps", "What should I do?"], ["progress", "Check my progress"], ["missing", "What's missing?"], ["evidence", "Prepare evidence"], ["handoff", "Ask a teammate"], ["readiness", "Ready for Review?"]].forEach(([action, label]) => {
      const button = node("button", "", label); button.type = "button"; button.addEventListener("click", async () => { const evidence = suppliedEvidence(form); if (action === "progress") { const assessment = model.assessEvidence(selected, evidence); result.textContent = `${assessment.supported} of ${assessment.total} criteria have draft evidence. Drafts are not submitted, verified, accepted, or Done.`; result.className = `evidence-result ${assessment.state}`; } if (action === "readiness") { const check = model.readiness(selected, evidence); result.textContent = check.recommendation; result.className = `evidence-result ${check.state}`; } const request = model.assistanceRequest(selected, action, evidence); if (!request || !gateway) return; button.disabled = true; try { renderAssistance(output, await gateway.request(request), label); } finally { button.disabled = false; } }); actions.append(button);
    });
    detail.append(header, node("p", "selected-card-description", selected.description), metadata, available, renderProgress(selected), node("h4", "", "Acceptance criteria & evidence draft"), form, result, actions, output);
  }
  function renderCeremony(kind) { ceremonyPrompts.replaceChildren(); model.ceremonyPrompts(kind, selected).forEach((prompt) => { const label = node("label", "ceremony-prompt", prompt), textarea = node("textarea"); textarea.rows = 2; textarea.maxLength = 1000; label.append(textarea); ceremonyPrompts.append(label); }); }
  root.querySelectorAll("[data-workspace-view]").forEach((button) => button.addEventListener("click", () => { view = button.dataset.workspaceView; root.querySelectorAll("[data-workspace-view]").forEach((item) => { const active = item === button; item.classList.toggle("active", active); item.setAttribute("aria-pressed", String(active)); }); renderCards(); }));
  statusFilter.addEventListener("change", renderCards);
  root.querySelector("[data-prepare-standup]").addEventListener("click", () => { if (!selected) { standupStatus.textContent = "Select a card before preparing a stand-up draft."; return; } const draft = model.standupDraft(selected); standup.elements.did.value = draft.did; standup.elements.willDo.value = draft.willDo; standup.elements.blockers.value = draft.blockers; standupStatus.textContent = "Draft prepared. Duplicate warning: the latest snapshot already shows 2 of 2 weekly submissions. Verify the live portal before posting anything."; });
  root.querySelector("[data-clear-standup]").addEventListener("click", () => { standup.reset(); standupStatus.textContent = "Draft cleared. Nothing was posted or saved to the portal."; }); standup.addEventListener("submit", (event) => event.preventDefault());
  root.querySelectorAll("[data-ceremony]").forEach((button) => button.addEventListener("click", () => { root.querySelectorAll("[data-ceremony]").forEach((item) => { const active = item === button; item.classList.toggle("active", active); item.setAttribute("aria-selected", String(active)); }); renderCeremony(button.dataset.ceremony); }));
  renderCards(); renderDetail(); renderCeremony("review");
})();
