const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const gateway = require("../js/shared/ai-gateway");

test("mock AI supports only reviewed drafting tasks and deterministic fallback", async () => {
  const request = { task: "review-evidence", context: "Fictional criterion", sources: [{ id: "faro.criteria", title: "FARO criteria guide", url: "/docs/faro.html", excerpt: "Evidence must support a testable criterion." }] };
  const mock = await gateway.request(request);
  assert.equal(mock.provider, "mock");
  assert.equal(mock.state, "draft");
  assert.match(mock.text, /No portal change was made/);
  assert.deepEqual(mock.citations, [{ id: "faro.criteria", title: "FARO criteria guide", url: "/docs/faro.html" }]);
  const fallback = gateway.deterministic({ ...request, task: "next-steps", context: "CAP-1316" });
  assert.equal(fallback.provider, "deterministic");
  assert.equal(fallback.sourced, true);
});

test("AI gateway rejects private portal content and unknown tasks", async () => {
  assert.throws(() => gateway.validate({ task: "prepare-standup", privatePortalData: true }), /separate data-handling review/);
  assert.throws(() => gateway.validate({ task: "invent-answer" }), /Unsupported/);
  assert.throws(() => gateway.validate({ task: "prepare-handoff", sources: [{ id: "bad", title: "Bad", url: "https://example.com/", excerpt: "Unreviewed" }] }), /invalid/);
});

test("AI gateway supports all draft-only card assistance tasks", async () => {
  const source = [{ id: "faro.acceptance-evidence", title: "Reviewed guidance", url: "/index.html#ask-mira", excerpt: "Evidence supports a testable criterion." }];
  for (const task of ["what-is-missing", "prepare-evidence", "ready-for-review"]) {
    const result = await gateway.request({ task, context: "Fictional card", sources: source });
    assert.equal(result.provider, "mock");
    assert.equal(result.state, "draft");
    assert.match(result.text, /No portal change was made/);
  }
});

test("Cloudflare OpenAI adapter is server-only, gated, non-storing, and preserves fallback", () => {
  const source = fs.readFileSync(path.resolve(__dirname, "../functions/api/ai.js"), "utf8");
  assert.match(source, /MIRA_AI_PROVIDER === "openai"/);
  assert.match(source, /MIRA_AI_LIVE_ENABLED === "true"/);
  assert.match(source, /https:\/\/api\.openai\.com\/v1\/responses/);
  assert.match(source, /store:\s*false/);
  assert.match(source, /deterministic\(body\.task, contextText, sources, true\)/);
  assert.doesNotMatch(source, /sb_secret_|service[_-]?role|sk-[A-Za-z0-9_-]{12,}|OPENAI_API_KEY\s*[:=]\s*["'][^"']+/i);
  assert.match(source, /Private portal content is not approved/);
  assert.match(source, /provider:\s*"mock"/);
  assert.match(source, /MAX_BODY_BYTES = 12000/);
  assert.match(source, /MIRA_AI_MAX_REQUESTS_PER_MINUTE/);
  assert.match(source, /MIRA_AI_MAX_OUTPUT_TOKENS/);
  assert.match(source, /MIRA_AI_TIMEOUT_MS/);
  assert.match(source, /MIRA_AI_INPUT_USD_PER_MILLION/);
  assert.match(source, /MIRA_AI_OUTPUT_USD_PER_MILLION/);
  assert.match(source, /estimateConfigured/);
  assert.match(source, /TextEncoder\(\)\.encode\(raw\)/);
});

test("browser accepts only reviewed gateway citations and falls back safely", async (t) => {
  const originalFetch = global.fetch;
  t.after(() => { global.fetch = originalFetch; });
  global.fetch = async () => ({ ok: true, json: async () => ({ provider: "openai", model: "gpt-6-luna", text: "Draft recommendation [1]", citations: [{ id: "faro.criteria" }, { id: "invented" }] }) });
  const request = { task: "prepare-handoff", sources: [{ id: "faro.criteria", title: "FARO criteria guide", url: "/docs/faro.html", excerpt: "Reviewed evidence." }] };
  const result = await gateway.request(request, { mode: "gateway" });
  assert.equal(result.provider, "openai");
  assert.equal(result.state, "draft");
  assert.deepEqual(result.citations, [{ id: "faro.criteria", title: "FARO criteria guide", url: "/docs/faro.html" }]);
  global.fetch = async () => { throw new Error("offline"); };
  const fallback = await gateway.request(request, { mode: "gateway" });
  assert.equal(fallback.provider, "deterministic");
  assert.equal(fallback.fallback, true);
});

test("gateway never sends context explicitly marked ineligible for external processing", async (t) => {
  const originalFetch = global.fetch;
  t.after(() => { global.fetch = originalFetch; });
  let calls = 0;
  global.fetch = async () => { calls += 1; throw new Error("must not run"); };
  const result = await gateway.request({
    task: "review-evidence",
    prompt: "Review this local snapshot",
    context: "Authorized local-only snapshot",
    sources: [{ id: "faro.criteria", title: "FARO criteria guide", url: "/docs/faro.html", excerpt: "Reviewed evidence." }],
    externalEligible: false
  }, { mode: "gateway" });
  assert.equal(calls, 0);
  assert.equal(result.blockedExternal, true);
  assert.equal(result.provider, "deterministic");
});
