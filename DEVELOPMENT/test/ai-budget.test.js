const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs/promises');
const path = require('node:path');
const { pathToFileURL } = require('node:url');
const { randomUUID, createHash } = require('node:crypto');

async function fixture() {
  const { AiBudget } = await import(pathToFileURL(path.resolve(__dirname, '../workers/ai-budget/worker.mjs')));
  let record, tail = Promise.resolve();
  const storage = { transaction(fn) {
    const next = tail.then(async () => {
      let pending = structuredClone(record);
      const result = await fn({ get: async () => structuredClone(pending), put: async (_, v) => { pending = structuredClone(v); } });
      record = pending;
      return result;
    });
    tail = next.catch(() => {});
    return next;
  } };
  const env = { MIRA_AI_ALLOW_INITIALIZE: 'true', MIRA_AI_BUDGET_ENABLED: 'true' };
  let instance = new AiBudget({ storage }, env);
  const call = (route, body = {}) => instance.fetch(new Request('https://budget.internal' + route, { method: 'POST', body: JSON.stringify(body) }));
  return { call, env, corrupt: () => { record.spent = -1; }, restart: () => { instance = new AiBudget({ storage }, env); } };
}

test('budget is fail-closed, explicitly initialized, persistent, and cannot be reset', async () => {
  const f = await fixture();
  assert.equal((await f.call('/reserve', { id: randomUUID() })).status, 503);
  assert.equal((await f.call('/initialize')).status, 200);
  const id = randomUUID();
  assert.equal((await f.call('/reserve', { id })).status, 200);
  f.restart();
  assert.equal((await (await f.call('/status')).json()).heldMicroUsd, 250000);
  assert.equal((await f.call('/initialize')).status, 409);
  assert.equal((await f.call('/reserve', { id })).status, 409);
  f.corrupt();
  assert.equal((await f.call('/status')).status, 503);
});

test('concurrent attempts share limits; unknown outcomes retain reservations; settlement is idempotent', async () => {
  const f = await fixture(); await f.call('/initialize');
  const ids = Array.from({ length: 30 }, randomUUID);
  const results = await Promise.all(ids.map(id => f.call('/reserve', { id })));
  assert.equal(results.filter(r => r.status === 200).length, 2);
  assert.equal((await (await f.call('/status')).json()).heldMicroUsd, 500000);
  assert.equal((await f.call('/settle', { id: ids[0], costMicroUsd: 500 })).status, 200);
  assert.equal((await f.call('/settle', { id: ids[0], costMicroUsd: 500 })).status, 200);
  assert.equal((await f.call('/settle', { id: ids[0], costMicroUsd: 0 })).status, 409);
  const status = await (await f.call('/status')).json();
  assert.equal(status.spentMicroUsd, 500); assert.equal(status.heldMicroUsd, 250000);
});

test('lifetime $25 cap does not reset across days; daily caps and kill switch persist', async t => {
  const original = Date.now; let now = Date.UTC(2026, 10, 12, 1); Date.now = () => now;
  t.after(() => { Date.now = original; });
  const f = await fixture(); await f.call('/initialize');
  for (let day = 0; day < 10; day++) {
    for (let i = 0; i < 10; i++) {
      now += 60000;
      const id = randomUUID();
      assert.equal((await f.call('/reserve', { id })).status, 200);
      await f.call('/settle', { id, costMicroUsd: 250000 });
    }
    now += 60000;
    assert.equal((await f.call('/reserve', { id: randomUUID() })).status, 429);
    now += 86400000;
  }
  f.restart();
  assert.equal((await f.call('/reserve', { id: randomUUID() })).status, 429);
  assert.equal((await (await f.call('/status')).json()).spentMicroUsd, 25000000);
  await f.call('/halt'); f.restart();
  assert.equal((await f.call('/reserve', { id: randomUUID() })).status, 403);
});

test('unexpected overspend halts future requests; unavailable storage cannot authorize spending', async () => {
  const f = await fixture(); await f.call('/initialize');
  const id = randomUUID(); await f.call('/reserve', { id });
  assert.equal((await (await f.call('/settle', { id, costMicroUsd: 250001 })).json()).halted, true);
  assert.equal((await f.call('/reserve', { id: randomUUID() })).status, 403);
  const { AiBudget } = await import(pathToFileURL(path.resolve(__dirname, '../workers/ai-budget/worker.mjs')));
  const broken = new AiBudget({ storage: { transaction: async () => { throw new Error('offline'); } } }, {});
  assert.equal((await broken.fetch(new Request('https://budget.internal/reserve', { method: 'POST', body: '{}' }))).status, 503);
});

test('actual SQLite Durable Object persists across runtime restart and serializes concurrent reservations', async t => {
  const { Miniflare, convertV4MiniflareOptions } = require('miniflare');
  const os = require('node:os');
  const persist = await fs.mkdtemp(path.join(os.tmpdir(), 'mira-budget-test-'));
  const script = await fs.readFile(path.resolve(__dirname, '../workers/ai-budget/worker.mjs'), 'utf8');
  const options = { ...convertV4MiniflareOptions({ name: 'budget-test', modules: true, script, compatibilityDate: '2026-11-12', durableObjects: { BUDGET: { className: 'AiBudget', useSQLite: true }, MIRA_AI_BUDGET: { className: 'AiBudget', useSQLite: true } }, bindings: { MIRA_AI_ALLOW_INITIALIZE: 'true', MIRA_AI_BUDGET_ENABLED: 'true' } }), resourcePersistencePath: persist };
  let mf = new Miniflare(options);
  t.after(async () => { await mf.dispose(); });
  async function call(route, body = {}) {
    const ns = await mf.getDurableObjectNamespace('BUDGET');
    return ns.get(ns.idFromName('mira-usd25-lifetime-v1')).fetch('https://budget.internal' + route, { method: 'POST', body: JSON.stringify(body) });
  }
  assert.equal((await call('/initialize')).status, 200);
  assert.equal((await call('/initialize-fixture')).status, 403);
  const namespace = await mf.getDurableObjectNamespace('BUDGET');
  for (const name of ['mira-acceptance-exhausted-v1', 'mira-acceptance-daily-v1']) {
    const stub = namespace.get(namespace.idFromName(name));
    const post = (route, body = {}) => stub.fetch('https://budget.internal' + route, { method: 'POST', body: JSON.stringify(body) });
    assert.equal((await post('/initialize-fixture')).status, 200);
    assert.equal((await post('/initialize-fixture')).status, 403);
    assert.equal((await post('/reserve', { id: randomUUID() })).status, 429);
  }
  const results = await Promise.all(Array.from({ length: 12 }, () => call('/reserve', { id: randomUUID() })));
  assert.equal(results.filter(r => r.status === 200).length, 2);
  await mf.dispose(); mf = new Miniflare(options);
  assert.equal((await (await call('/status')).json()).heldMicroUsd, 500000);
  assert.equal((await mf.dispatchFetch('https://example.test/status')).status, 404);
});

test('controlled Function excludes arbitrary text, reserves before sending, reconciles usage and preserves holds on failures', async t => {
  const source = await fs.readFile(path.join(__dirname, '../functions/api/ai.js'), 'utf8');
  const api = await import('data:text/javascript;base64,' + Buffer.from(source).toString('base64'));
  const original = global.fetch; t.after(() => { global.fetch = original; });
  const f = await fixture(); await f.call('/initialize');
  const tester = 'fictional-test-credential-'.padEnd(48, 'x');
  const env = { MIRA_AI_PROVIDER: 'openai', MIRA_AI_LIVE_ENABLED: 'true', MIRA_AI_CONTROLLED_TESTS: 'true', MIRA_AI_KILL_SWITCH: 'off', MIRA_AI_TESTER_SHA256: createHash('sha256').update(tester).digest('hex'),
    OPENAI_API_KEY: 'fictional-unit-test-value', MIRA_OPENAI_MODEL: 'gpt-6-luna', MIRA_AI_VERIFIED_MODEL: 'gpt-6-luna', MIRA_AI_INPUT_USD_PER_MILLION: '0.10', MIRA_AI_OUTPUT_USD_PER_MILLION: '0.50', MIRA_AI_PRICING_VALID_UNTIL: new Date(Date.now() + 3600000).toISOString(),
    MIRA_AI_BUDGET: { idFromName: name => { assert.equal(name, 'mira-usd25-lifetime-v1'); return name; }, get: () => ({ fetch: (url, options) => f.call(new URL(url).pathname, JSON.parse(options.body)) }) } };
  let calls = 0, ip = 0;
  global.fetch = async (url, options) => {
    calls++;
    assert.equal(url, 'https://api.openai.com/v1/responses');
    assert.equal((await (await f.call('/status')).json()).heldMicroUsd, 250000);
    const body = JSON.parse(options.body);
    assert.equal(body.store, false); assert.equal(body.max_output_tokens, 128); assert.equal(body.service_tier, 'default');
    assert.doesNotMatch(body.input, /private-student|injected/);
    return Response.json({ output_text: 'Verified facts: the public program involves real clients [1]. Draft recommendations: explore the program. Missing evidence: individual outcomes. Unconfirmed actions: none. Official approval decisions: none.', usage: { input_tokens: 300, output_tokens: 50 } });
  };
  const run = (body, override = {}, auth = true) => api.onRequestPost({ env: { ...env, ...override }, request: new Request('https://example.test/api/ai', { method: 'POST', headers: { 'content-type': 'application/json', 'cf-connecting-ip': 'budget-' + ++ip, ...(auth ? { authorization: 'Bearer ' + tester } : {}) }, body: JSON.stringify(body) }) });
  const body = { task: 'next-steps', testCase: 'public-program-v1' };
  for (const override of [{ MIRA_AI_KILL_SWITCH: 'on' }, { MIRA_AI_BUDGET: null }, { MIRA_AI_PRICING_VALID_UNTIL: 'invalid' }, { MIRA_AI_VERIFIED_MODEL: '' }]) assert.equal((await (await run(body, override)).json()).provider, 'deterministic');
  assert.equal((await (await run(body, {}, false)).json()).blockedExternal, true);
  assert.equal((await (await run({ ...body, prompt: 'private-student injected' })).json()).blockedExternal, true);
  assert.equal(calls, 0);
  const result = await (await run(body)).json();
  assert.equal(result.provider, 'openai'); assert.equal(result.citations[0].id, 'public-program');
  assert.equal((await (await f.call('/status')).json()).spentMicroUsd, 55);
  global.fetch = async () => { calls++; throw new Error('timeout after possible provider acceptance'); };
  assert.equal((await (await run(body)).json()).provider, 'deterministic');
  assert.equal((await (await f.call('/status')).json()).heldMicroUsd, 250000);
  assert.equal(calls, 2);
});

test('controlled Function cannot release uncertain usage or present invented citations as grounded', async t => {
  const source = await fs.readFile(path.join(__dirname, '../functions/api/ai.js'), 'utf8');
  const api = await import('data:text/javascript;base64,' + Buffer.from(source).toString('base64'));
  const original = global.fetch; t.after(() => { global.fetch = original; });
  const tester = 'fictional-second-test-credential-'.padEnd(48, 'y');
  for (const outcome of ['missing-usage', 'excess-usage', 'bad-citation', 'settlement-offline']) {
    const f = await fixture(); await f.call('/initialize');
    const env = { MIRA_AI_PROVIDER: 'openai', MIRA_AI_LIVE_ENABLED: 'true', MIRA_AI_CONTROLLED_TESTS: 'true', MIRA_AI_KILL_SWITCH: 'off', MIRA_AI_TESTER_SHA256: createHash('sha256').update(tester).digest('hex'),
      OPENAI_API_KEY: 'fictional-unit-test-value', MIRA_OPENAI_MODEL: 'gpt-6-luna', MIRA_AI_VERIFIED_MODEL: 'gpt-6-luna', MIRA_AI_INPUT_USD_PER_MILLION: '0.10', MIRA_AI_OUTPUT_USD_PER_MILLION: '0.50', MIRA_AI_PRICING_VALID_UNTIL: new Date(Date.now() + 3600000).toISOString(),
      MIRA_AI_BUDGET: { idFromName: n => n, get: () => ({ fetch: (url, opts) => {
        if (outcome === 'settlement-offline' && url.endsWith('/settle')) throw new Error('storage unavailable');
        return f.call(new URL(url).pathname, JSON.parse(opts.body));
      } }) } };
    global.fetch = async () => Response.json({ output_text: 'Draft [999]', ...(outcome === 'missing-usage' ? {} : { usage: { input_tokens: 300, output_tokens: outcome === 'excess-usage' ? 999 : 50 } }) });
    const result = await api.onRequestPost({ env, request: new Request('https://example.test/api/ai', { method: 'POST', headers: { authorization: 'Bearer ' + tester, 'cf-connecting-ip': outcome }, body: JSON.stringify({ task: 'next-steps', testCase: 'public-program-v1' }) }) });
    assert.equal((await result.json()).provider, 'deterministic');
    const status = await (await f.call('/status')).json();
    assert.equal(status.heldMicroUsd, outcome === 'bad-citation' ? 0 : 250000);
    if (outcome.includes('usage')) assert.equal(status.halted, true);
    if (outcome === 'bad-citation') assert.equal(status.spentMicroUsd, 55);
  }
});
