(function () {
  "use strict";
  const model = window.MiraTeamWorkspace;
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
  let view = "team";
  let selected = null;

  function node(tag, className, text) {
    const element = document.createElement(tag);
    if (className) element.className = className;
    if (text !== undefined) element.textContent = text;
    return element;
  }
  function stateLabel(value) { return ({ "in-progress": "In progress", ready: "Ready", done: "Accepted" })[value] || value; }
  function visibleCards() {
    const filter = statusFilter.value;
    return data.cards.filter((card) => (view !== "mine" || card.owner === data.user.name) && (filter === "all" || filter === "active" && card.status !== "done" || card.status === filter));
  }
  function renderCards() {
    list.replaceChildren();
    const cards = visibleCards();
    summary.textContent = `${data.sprint.name} snapshot · ${cards.length} card${cards.length === 1 ? "" : "s"} shown · ${data.sprint.inProgress} in progress · ${data.sprint.ready} ready · ${data.sprint.done} accepted`;
    cards.forEach((card) => {
      const button = node("button", "team-card-row");
      button.type = "button";
      button.dataset.cardId = card.id;
      button.setAttribute("aria-pressed", String(card.id === selected?.id));
      button.append(node("span", `card-status status-${card.status}`, stateLabel(card.status)), node("strong", "", `${card.id} · ${card.title}`), node("small", "", `${card.owner} · ${card.size} · ${card.area}`));
      button.addEventListener("click", () => { selected = card; renderCards(); renderDetail(); });
      list.append(button);
    });
    if (!cards.length) list.append(node("p", "empty-workspace-state", "No cards match this view. Open the current portal board to verify live work."));
  }
  function renderDetail() {
    detail.replaceChildren();
    if (!selected) { detail.append(node("p", "", "Select a permitted card to review its details, criteria, evidence, and preparation tools.")); return; }
    const header = node("header", "selected-card-header");
    const title = node("div"); title.append(node("p", "eyebrow", `${selected.type} · ${selected.area}`), node("h3", "", `${selected.id} · ${selected.title}`));
    header.append(title, node("span", `card-status status-${selected.status}`, stateLabel(selected.status)));
    const metadata = node("dl", "selected-card-meta");
    [["Owner", selected.owner], ["Dependency", selected.dependency], ["Evidence", selected.evidence.length ? `${selected.evidence.length} verified record` : "Unavailable in snapshot"], ["Source", "Portal audit snapshot · read-only"]].forEach(([term, value]) => { metadata.append(node("dt", "", term), node("dd", "", value)); });
    const heading = node("h4", "", "Acceptance criteria & evidence draft");
    const form = node("div", "criteria-checker");
    selected.criteria.forEach((criterion, index) => {
      const label = node("label", "criterion-row");
      label.append(node("span", "criterion-number", String(index + 1)), node("span", "criterion-text", criterion));
      const input = node("textarea"); input.rows = 2; input.maxLength = 800; input.dataset.criterionEvidence = String(index); input.placeholder = "Describe evidence to review (draft only)";
      label.append(input); form.append(label);
    });
    const result = node("p", "evidence-result", "No draft evidence assessed yet.");
    const actions = node("div", "selected-card-actions");
    const explain = node("button", "", "Explain requirements"); explain.type = "button";
    explain.addEventListener("click", () => { const input = document.querySelector("#dashboard-mira-input"); if (input) { input.value = `Explain the acceptance criteria for ${selected.id}: ${selected.title}`; document.querySelector("#dashboard-mira-form")?.requestSubmit(); } });
    const steps = node("button", "", "Show actionable steps"); steps.type = "button";
    const handoff = node("button", "", "Draft teammate handoff"); handoff.type = "button";
    const assess = node("button", "", "Check draft evidence"); assess.type = "button";
    const output = node("div", "workspace-draft-output"); output.hidden = true;
    steps.addEventListener("click", () => { output.hidden = false; output.replaceChildren(node("h4", "", "Actionable preparation steps")); const ol = node("ol"); model.actionSteps(selected).forEach((item) => ol.append(node("li", "", item))); output.append(ol); });
    handoff.addEventListener("click", () => { output.hidden = false; output.replaceChildren(node("h4", "", "Editable handoff draft"), node("pre", "", model.handoffDraft(selected))); });
    assess.addEventListener("click", () => { const supplied = [...form.querySelectorAll("textarea")].map((input) => input.value); const assessment = model.assessEvidence(selected, supplied); result.textContent = `${assessment.supported} of ${assessment.total} criteria have draft evidence. Drafts are not verified or accepted.`; result.className = `evidence-result ${assessment.state}`; });
    actions.append(explain, steps, assess, handoff);
    detail.append(header, metadata, heading, form, result, actions, output);
  }
  function renderCeremony(kind) {
    ceremonyPrompts.replaceChildren();
    model.ceremonyPrompts(kind, selected).forEach((prompt) => { const label = node("label", "ceremony-prompt", prompt); const textarea = node("textarea"); textarea.rows = 2; textarea.maxLength = 1000; label.append(textarea); ceremonyPrompts.append(label); });
  }
  root.querySelectorAll("[data-workspace-view]").forEach((button) => button.addEventListener("click", () => { view = button.dataset.workspaceView; root.querySelectorAll("[data-workspace-view]").forEach((item) => { const active = item === button; item.classList.toggle("active", active); item.setAttribute("aria-pressed", String(active)); }); renderCards(); }));
  statusFilter.addEventListener("change", renderCards);
  root.querySelector("[data-prepare-standup]").addEventListener("click", () => { if (!selected) { standupStatus.textContent = "Select a card before preparing a stand-up draft."; return; } const draft = model.standupDraft(selected); standup.elements.did.value = draft.did; standup.elements.willDo.value = draft.willDo; standup.elements.blockers.value = draft.blockers; standupStatus.textContent = "Draft prepared. Duplicate warning: the latest snapshot already shows 2 of 2 weekly submissions. Verify the live portal before posting anything."; });
  root.querySelector("[data-clear-standup]").addEventListener("click", () => { standup.reset(); standupStatus.textContent = "Draft cleared. Nothing was posted or saved to the portal."; });
  standup.addEventListener("submit", (event) => event.preventDefault());
  root.querySelectorAll("[data-ceremony]").forEach((button) => button.addEventListener("click", () => { root.querySelectorAll("[data-ceremony]").forEach((item) => { const active = item === button; item.classList.toggle("active", active); item.setAttribute("aria-selected", String(active)); }); renderCeremony(button.dataset.ceremony); }));
  renderCards(); renderDetail(); renderCeremony("review");
})();
