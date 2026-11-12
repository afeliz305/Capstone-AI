(function (root, factory) {
  const api = factory();
  if (typeof module === "object" && module.exports) module.exports = api;
  root.MiraAiGateway = api;
})(typeof globalThis !== "undefined" ? globalThis : this, function () {
  "use strict";
  const allowedTasks = new Set(["explain-criteria", "summarize-work", "prepare-standup", "review-evidence", "draft-review", "draft-retro", "next-steps", "prepare-handoff"]);
  const allowedProviders = new Set(["mock", "openai", "deterministic"]);
  function clean(value, limit = 4000) { return String(value || "").replace(/[\u0000-\u001f]/g, " ").trim().slice(0, limit); }
  function safeSourceUrl(value) {
    const text = clean(value, 500);
    if (/^\/(?!\/)/.test(text) && !text.includes("..")) return text;
    try { const url = new URL(text); return url.protocol === "https:" && !url.username && !url.password && url.hostname === "capstone.cs.fiu.edu" ? url.href : ""; } catch (_) { return ""; }
  }
  function sources(value) {
    if (value == null) return [];
    if (!Array.isArray(value) || value.length > 6) throw new Error("Only reviewed source evidence may be supplied.");
    return value.map((source) => {
      const item = { id: clean(source && source.id, 80), title: clean(source && source.title, 140), url: safeSourceUrl(source && source.url), excerpt: clean(source && source.excerpt, 1200) };
      if (!/^[a-z0-9][a-z0-9._:-]*$/i.test(item.id) || !item.title || !item.url || !item.excerpt) throw new Error("A reviewed source is invalid.");
      return item;
    });
  }
  function validate(request) {
    if (!request || !allowedTasks.has(request.task)) throw new Error("Unsupported MIRA assistance task.");
    if (request.privatePortalData || request.source === "private-portal") throw new Error("Private portal content requires a separate data-handling review and explicit authorization.");
    return { task: request.task, prompt: clean(request.prompt, 1200), context: clean(request.context), sources: sources(request.sources) };
  }
  function deterministic(request) {
    const value = validate(request);
    const heading = ({
      "explain-criteria": "Review each criterion as a testable outcome.",
      "summarize-work": "Separate completed work from planned work and unresolved dependencies.",
      "prepare-standup": "Use What I did, What I will do, and What's blocking me; verify each statement before posting.",
      "review-evidence": "Map one concrete artifact or observation to each acceptance criterion.",
      "draft-review": "Describe what was demonstrated, the evidence, and what remains unfinished.",
      "draft-retro": "Prepare one Keep, one Change, and one specific team experiment.",
      "next-steps": "Confirm current ownership, complete the smallest verifiable step, collect evidence, and request teammate review.",
      "prepare-handoff": "Separate verified facts, draft recommendations, missing evidence, unconfirmed actions, and official approval decisions."
    })[value.task];
    return { provider: "deterministic", state: "draft", text: `${heading}${value.context ? ` Context supplied: ${value.context}` : ""}`, citations: value.sources.map(({ id, title, url }) => ({ id, title, url })), sourced: value.sources.length > 0 };
  }
  function mock(request) {
    const result = deterministic(request);
    return { ...result, provider: "mock", text: `[Mock AI] ${result.text} No portal change was made.` };
  }
  function safeCitations(value, requested) {
    if (!Array.isArray(value)) return [];
    const allowed = new Map(requested.map((item) => [item.id, item]));
    return value.slice(0, 6).flatMap((item) => {
      const known = allowed.get(clean(item && item.id, 80));
      return known ? [{ id: known.id, title: known.title, url: known.url }] : [];
    });
  }
  async function request(requestValue, options = {}) {
    const value = validate(requestValue);
    if (options.mode !== "gateway") return mock(value);
    try {
      const response = await fetch(options.endpoint || "/api/ai", { method: "POST", credentials: "same-origin", headers: { "Content-Type": "application/json" }, body: JSON.stringify(value) });
      if (!response.ok) throw new Error("Gateway unavailable");
      const body = await response.json();
      if (!body || !allowedProviders.has(body.provider) || typeof body.text !== "string") throw new Error("Unexpected gateway response");
      return { provider: body.provider, model: clean(body.model, 80) || undefined, state: "draft", fallback: body.fallback === true, text: clean(body.text, 6000), citations: safeCitations(body.citations, value.sources), sourced: value.sources.length > 0 };
    } catch (_) { return { ...deterministic(value), fallback: true }; }
  }
  return Object.freeze({ allowedTasks, validate, deterministic, mock, request });
});
