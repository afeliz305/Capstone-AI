(function (root, factory) {
  const api = factory();
  if (typeof module === "object" && module.exports) module.exports = api;
  root.MiraTeamWorkspace = api;
})(typeof globalThis !== "undefined" ? globalThis : this, function () {
  "use strict";

  const source = Object.freeze({
    label: "Capstone portal audit snapshot",
    verifiedAt: "2026-11-12T12:00:00-05:00",
    state: "snapshot",
    permission: "read-only",
    current: false,
    dataOwner: "Capstone portal",
    authorizationScope: "reviewed team workspace snapshot"
  });

  const publicGuidanceSource = Object.freeze({
    id: "faro.acceptance-evidence",
    title: "Reviewed acceptance criteria and evidence guidance",
    url: "/index.html#ask-mira",
    excerpt: "Acceptance criteria describe testable outcomes. Evidence must show the outcome, verification remains separate, and only an authorized human can accept the work."
  });

  const criteria = {
    "CAP-1315": ["A teammate-accessible run is demonstrated.", "Four decision types use the same limitation, owner, and follow-up pattern.", "One versioned rules file is used.", "Changing a rule updates the response.", "A teammate independently verifies the behavior."],
    "CAP-1316": ["Four human-decision scenarios create a support-request draft.", "The original question is preserved.", "Context, privacy, and preferred contact are captured.", "Topic, category, and summary are prepared.", "A teammate completes the flow end to end."],
    "CAP-1317": ["The handoff pattern is consistent.", "The responsible person is explained.", "The issue can be previewed before handoff.", "Available choices are shown without guessing.", "A teammate reviews the experience."],
    "CAP-1318": ["One command runs the checks.", "A supported and a human-decision example are covered.", "Expected, actual, and result are recorded.", "Source and authority checks are included.", "A teammate can run the checks independently."],
    "CAP-1319": ["A versioned source configuration is documented.", "Sprint, deadline, and stand-up mappings are documented.", "Named resources are included.", "Conflicts are classified.", "A teammate verifies a source independently."]
  };

  const cards = Object.freeze([
    { id: "CAP-1315", title: "Harden communication decision guidance", owner: "Christopher Hernandez", status: "in-progress", size: "M", type: "Hardening", area: "Communication", dependency: "Team verification", blocker: "No blocker verified; teammate verification remains required.", reviewRequirement: "A teammate independently verifies the behavior.", completed: 0, evidence: [], criteria: criteria["CAP-1315"] },
    { id: "CAP-1316", title: "Prepare human-decision support handoffs", owner: "Anthony Feliz", status: "in-progress", size: "M", type: "Hardening", area: "Operations", dependency: "Reviewed privacy/contact fields", blocker: "No blocker verified; privacy and contact fields still need review.", reviewRequirement: "A teammate completes the handoff flow end to end.", completed: 0, evidence: [], criteria: criteria["CAP-1316"] },
    { id: "CAP-1317", title: "Standardize the handoff experience", owner: "Romelin Charnel", status: "in-progress", size: "S", type: "Change", area: "Design", dependency: "Teammate design review", blocker: "No blocker verified; design review is pending.", reviewRequirement: "A teammate reviews the experience.", completed: 0, evidence: [], criteria: criteria["CAP-1317"] },
    { id: "CAP-1318", title: "Create repeatable authority checks", owner: "Zavier Richardson", status: "ready", size: "M", type: "Hardening", area: "Data", dependency: "Independent teammate run", blocker: "No blocker verified; independent execution is pending.", reviewRequirement: "A teammate runs the checks independently.", completed: 0, evidence: [], criteria: criteria["CAP-1318"] },
    { id: "CAP-1319", title: "Document the source runbook", owner: "Michael Alvarez", status: "in-progress", size: "M", type: "Runbook", area: "Data", dependency: "Source-owner verification", blocker: "No blocker verified; source-owner verification is pending.", reviewRequirement: "A teammate verifies a source independently.", completed: 3, evidence: [], criteria: criteria["CAP-1319"] },
    ...[1108, 1109, 1110, 1111, 1112].map((number, index) => ({ id: `CAP-${number}`, title: ["Define grounded-answer boundaries", "Build the team workspace baseline", "Review navigation sources", "Test human-decision guidance", "Record sprint evidence"][index], owner: ["Christopher Hernandez", "Anthony Feliz", "Romelin Charnel", "Zavier Richardson", "Michael Alvarez"][index], status: "done", size: "S", type: "Completed", area: "Sprint 5", dependency: "None recorded", blocker: "None recorded in the reviewed snapshot.", reviewRequirement: "See the authoritative portal record for the completed human review.", completed: 5, evidence: [{ label: "Portal evidence record", state: "verified" }], criteria: Array.from({ length: 5 }, (_, item) => `Accepted criterion ${item + 1} (see portal for the authoritative wording).`) }))
  ].map((card) => {
    const historicalDone = card.status === "done";
    return Object.freeze({
      ...card,
      sprint: "Sprint 5",
      description: `${card.type} work in ${card.area}. Confirm the current card wording and assignment in the signed-in portal before acting.`,
      availableSources: ["Reviewed November 12 portal audit", "Current signed-in portal when the local connector is authorized", "Reviewed FARO acceptance/evidence guidance"],
      progress: Object.freeze({
        workCompleted: historicalDone,
        evidencePrepared: historicalDone && card.evidence.length > 0,
        evidenceSubmitted: historicalDone && card.evidence.length > 0,
        verified: historicalDone,
        accepted: historicalDone,
        done: historicalDone
      }),
      source
    });
  }));

  function clone(value) { return JSON.parse(JSON.stringify(value)); }
  function snapshot() {
    return clone({
      source,
      sprint: { name: "Sprint 5", state: "snapshot", cards: 10, ready: 1, inProgress: 4, review: 0, done: 5 },
      user: { name: "Anthony Feliz", state: "snapshot" },
      standups: { weeklySubmitted: 2, weeklyExpected: 2, sprintSubmitted: 4, sprintExpected: 4, latestAt: "2026-11-12T06:57:00-05:00", state: "submitted" },
      ceremony: { dueAt: "2026-11-13T23:59:00-05:00", reviseThrough: "2026-11-15T23:59:00-05:00", state: "snapshot" },
      cards
    });
  }
  function getCard(id) { return snapshot().cards.find((card) => card.id === id) || null; }
  function actionSteps(card) {
    if (!card) return [];
    return [
      `Confirm ${card.id} is still assigned and permitted in the current portal.`,
      `Review all ${card.criteria.length} acceptance criteria with ${card.owner}.`,
      "Complete the smallest verifiable change and record what changed.",
      `Collect evidence for each criterion; ${card.dependency} remains a handoff dependency.`,
      "Ask a teammate to verify, then use the portal for any official status or evidence update."
    ];
  }
  function assessEvidence(card, supplied) {
    if (!card) return { state: "unavailable", supported: 0, total: 0, results: [] };
    const list = Array.isArray(supplied) ? supplied : [];
    const results = card.criteria.map((criterion, index) => ({ criterion, state: list[index]?.trim() ? "draft" : "missing", evidence: String(list[index] || "").trim() }));
    return { state: results.every((item) => item.state === "draft") ? "draft-ready-for-review" : "incomplete", supported: results.filter((item) => item.state === "draft").length, total: results.length, results };
  }
  function standupDraft(card) {
    if (!card) return { did: "", willDo: "", blockers: "", state: "draft", duplicateWarning: true };
    return {
      did: `Reviewed ${card.id} (${card.title}) and its ${card.criteria.length} acceptance criteria. Confirm completed work before submitting.`,
      willDo: actionSteps(card).slice(1, 3).join(" "),
      blockers: card.dependency === "None recorded" ? "No blocker confirmed. Verify before submitting." : `Possible dependency: ${card.dependency}. Confirm whether it is an actual blocker.`,
      state: "draft",
      duplicateWarning: true
    };
  }
  function handoffDraft(card) {
    if (!card) return "Select a card first.";
    return `${card.id} · ${card.title}\nOwner: ${card.owner}\nCurrent snapshot status: ${card.status}\nDependency: ${card.dependency}\nRequested handoff: review the criteria and verify the supplied evidence. This is a draft; confirm current portal state first.`;
  }
  function readiness(card, supplied) {
    const assessment = assessEvidence(card, supplied);
    if (!card) return { state: "unavailable", recommendation: "Select a permitted card first.", officialDecision: false, assessment };
    const portalStatusCurrent = card.source.current === true;
    const ready = portalStatusCurrent && assessment.state === "draft-ready-for-review";
    return {
      state: ready ? "recommend-review" : "not-ready",
      recommendation: ready
        ? "The available draft evidence supports asking an authorized reviewer. This is not approval."
        : "Do not move or approve this card from MIRA. Confirm the current portal status and complete missing evidence first.",
      officialDecision: false,
      assessment
    };
  }
  function assistanceRequest(card, action, supplied) {
    if (!card) return null;
    const assessment = assessEvidence(card, supplied);
    const taskByAction = {
      explain: "explain-criteria",
      steps: "next-steps",
      progress: "review-evidence",
      missing: "what-is-missing",
      evidence: "prepare-evidence",
      handoff: "prepare-handoff",
      readiness: "ready-for-review"
    };
    const task = taskByAction[action];
    if (!task) return null;
    const missing = assessment.results.filter((item) => item.state === "missing").map((item) => item.criterion);
    return {
      task,
      prompt: `${action} for ${card.id}`,
      context: `${card.id}: ${card.title}. Snapshot status: ${card.status}. Owner: ${card.owner}. Dependency: ${card.dependency}. Draft evidence: ${assessment.supported}/${assessment.total}. Missing criteria: ${missing.join(" | ") || "none in the current draft"}.`,
      sources: [publicGuidanceSource],
      privatePortalData: false,
      externalEligible: false
    };
  }
  function ceremonyPrompts(kind, selectedCard) {
    if (kind === "retro") return ["Keep: What helped the team deliver?", "Change: What slowed or confused the team?", "One thing about the team: What specific experiment should happen next sprint?"];
    const context = selectedCard ? ` for ${selectedCard.id}` : "";
    return [`What did the team demonstrate${context}?`, "Which acceptance criteria have reviewed evidence?", "What remains unfinished or needs a human decision?", "Who will verify the result before the portal submission?"];
  }
  return Object.freeze({ snapshot, getCard, actionSteps, assessEvidence, readiness, assistanceRequest, standupDraft, handoffDraft, ceremonyPrompts });
});
