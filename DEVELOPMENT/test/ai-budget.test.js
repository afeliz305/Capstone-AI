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
  const call = (route, body = {}, credential) => instance.fetch(new Request('https://budget.internal' + route, { method: 'POST', headers: credential ? { authorization: 'Bearer ' + credential } : {}, body: JSON.stringify(body) }));
  return { call, env, corrupt: () => { record.spent = -1; }, restart: () => { instance = new AiBudget({ storage }, env); } };
}

test('operator demo sessions expire, revoke and enforce a durable non-resetting $1 campaign', async t => {
  const original=Date.now; let now=Date.UTC(2026,10,13,12); Date.now=()=>now; t.after(()=>Date.now=original);
  const f=await fixture(); await f.call('/initialize');
  const operator='a'.repeat(64), token='b'.repeat(64), digest=createHash('sha256').update(token).digest('hex');
  f.env.MIRA_AI_OPERATOR_SHA256=createHash('sha256').update(operator).digest('hex');
  const start={expectedRevision:0,hash:digest,durationMinutes:60,pricingUntil:now+3600000};
  assert.equal((await f.call('/demo-start',start)).status,403);
  assert.equal((await f.call('/demo-start',start,operator)).status,200);
  assert.equal((await f.call('/demo-auth',{demoHash:'wrong'})).status,403);
  assert.equal((await f.call('/demo-auth',{demoHash:digest})).status,200);
  assert.equal((await f.call('/reserve',{id:randomUUID()})).status,403);
  for(let i=0;i<4;i++) { now+=61000; const id=randomUUID(); assert.equal((await f.call('/reserve',{id,demoHash:digest})).status,200); await f.call('/settle',{id,costMicroUsd:250000}); }
  f.restart(); now+=61000;
  assert.equal((await f.call('/reserve',{id:randomUUID(),demoHash:digest})).status,429);
  assert.equal((await f.call('/demo-stop',{},operator)).status,200);
  assert.equal((await f.call('/demo-auth',{demoHash:digest})).status,403);
  const status=await (await f.call('/status')).json();
  await f.call('/recover',{id:randomUUID(),expectedRevision:status.revision,reason:'reviewed-controlled-test-complete',evidence:'MOCK_CAMPAIGN_TEST'},operator);
  const revision=(await (await f.call('/status')).json()).revision;
  const next=createHash('sha256').update('new').digest('hex');
  assert.equal((await f.call('/demo-start',{...start,hash:next,expectedRevision:revision},operator)).status,200);
  assert.equal((await f.call('/reserve',{id:randomUUID(),demoHash:next})).status,429);
  now+=3600001;
  assert.equal((await f.call('/demo-auth',{demoHash:next})).status,403);
});

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
  const operator = 'fictional-sqlite-operator-'.padEnd(64, 's');
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
  // Reopen the same SQLite store with explicit operator configuration, not a new ledger.
  await mf.dispose();
  const operatorOptions = { ...convertV4MiniflareOptions({ name:'budget-test', modules:true, script, compatibilityDate:'2026-11-12', durableObjects:{BUDGET:{className:'AiBudget',useSQLite:true},MIRA_AI_BUDGET:{className:'AiBudget',useSQLite:true}}, bindings:{MIRA_AI_BUDGET_ENABLED:'true',MIRA_AI_OPERATOR_SHA256:createHash('sha256').update(operator).digest('hex')} }), resourcePersistencePath:persist };
  mf = new Miniflare(operatorOptions);
  const admin = async (route, body = {}) => { const ns=await mf.getDurableObjectNamespace('BUDGET'); return ns.get(ns.idFromName('mira-usd25-lifetime-v1')).fetch('https://budget.internal'+route,{method:'POST',headers:{authorization:'Bearer '+operator},body:JSON.stringify(body)}); };
  const history = await (await admin('/operator-audit')).json();
  for(const r of history.records) await call('/settle',{id:r.id,costMicroUsd:55});
  await call('/halt',{reason:'controlled-test-complete'});
  const revision=(await(await call('/status')).json()).revision;
  assert.equal((await admin('/recover',{id:randomUUID(),expectedRevision:revision,reason:'reviewed-controlled-test-complete',evidence:'FICTIONAL_SQLITE_ACCEPTANCE'})).status,200);
  await mf.dispose(); mf=new Miniflare(operatorOptions);
  const persisted=await(await admin('/operator-audit')).json();
  assert.equal(persisted.audit.filter(e=>e.action==='operator-recovery').length,1);
  assert.equal((await(await call('/status')).json()).spentMicroUsd,110);
  assert.equal(persisted.records.length,2);
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
  for (const outcome of ['missing-usage', 'excess-usage', 'bad-citation', 'settlement-offline', 'provider-timeout', 'model-rejection']) {
    const f = await fixture(); await f.call('/initialize');
    const env = { MIRA_AI_PROVIDER: 'openai', MIRA_AI_LIVE_ENABLED: 'true', MIRA_AI_CONTROLLED_TESTS: 'true', MIRA_AI_KILL_SWITCH: 'off', MIRA_AI_TESTER_SHA256: createHash('sha256').update(tester).digest('hex'),
      OPENAI_API_KEY: 'fictional-unit-test-value', MIRA_OPENAI_MODEL: 'gpt-6-luna', MIRA_AI_VERIFIED_MODEL: 'gpt-6-luna', MIRA_AI_INPUT_USD_PER_MILLION: '0.10', MIRA_AI_OUTPUT_USD_PER_MILLION: '0.50', MIRA_AI_PRICING_VALID_UNTIL: new Date(Date.now() + 3600000).toISOString(),
      MIRA_AI_BUDGET: { idFromName: n => n, get: () => ({ fetch: (url, opts) => {
        if (outcome === 'settlement-offline' && url.endsWith('/settle')) throw new Error('storage unavailable');
        return f.call(new URL(url).pathname, JSON.parse(opts.body));
      } }) } };
    global.fetch = async () => {
      if (outcome === 'provider-timeout') throw new Error('fictional timeout');
      if (outcome === 'model-rejection') return Response.json({error:'must-not-be-exposed'}, {status:404});
      return Response.json({ output_text: 'Rejected content must-not-be-exposed [999]', ...(outcome === 'missing-usage' ? {} : { usage: { input_tokens: 300, output_tokens: outcome === 'excess-usage' ? 999 : 50, output_tokens_details: {reasoning_tokens:30} } }) });
    };
    const result = await api.onRequestPost({ env, request: new Request('https://example.test/api/ai', { method: 'POST', headers: { authorization: 'Bearer ' + tester, 'cf-connecting-ip': outcome }, body: JSON.stringify({ task: 'next-steps', testCase: 'public-program-v1' }) }) });
    const answer = await result.json();
    assert.equal(answer.provider, 'deterministic');
    assert.doesNotMatch(JSON.stringify(answer), /must-not-be-exposed/);
    const status = await (await f.call('/status')).json();
    assert.equal(status.heldMicroUsd, outcome === 'bad-citation' ? 0 : 250000);
    if (outcome.includes('usage')) assert.equal(status.halted, true);
    if (outcome === 'bad-citation') {
      assert.equal(status.spentMicroUsd, 55);
      assert.equal(answer.providerAttempt.accounting, 'settled');
      assert.equal(answer.providerAttempt.costMicroUsd, 55);
      assert.deepEqual(answer.providerAttempt.usage, { inputTokens:300, outputTokens:50, reasoningTokens:30, estimatedUsd:0.000055, estimateConfigured:true });
    }
    if (outcome === 'model-rejection') assert.equal(answer.providerAttempt.providerStatus, 404);
    if (outcome === 'provider-timeout') assert.equal(answer.providerAttempt.reason, 'provider-outcome-uncertain');
  }
});

test('operator recovery is separately authenticated, atomic, audited and preserves spending', async () => {
  const f = await fixture(); await f.call('/initialize');
  const operator = 'fictional-operator-'.padEnd(64, 'o');
  const tester = 'fictional-tester-'.padEnd(64, 't');
  f.env.MIRA_AI_OPERATOR_SHA256 = createHash('sha256').update(operator).digest('hex');
  const id = randomUUID(); await f.call('/reserve', { id }); await f.call('/settle', { id, costMicroUsd: 120 });
  await f.call('/halt', { reason: 'controlled-test-complete' });
  const before = await (await f.call('/status')).json();
  const body = { id: randomUUID(), expectedRevision: before.revision, reason: 'reviewed-controlled-test-complete', evidence: 'FICTIONAL_ACCEPTANCE_001' };
  assert.equal((await f.call('/recover', body)).status, 403);
  assert.equal((await f.call('/recover', body, tester)).status, 403);
  assert.equal((await f.call('/operator-audit', {}, tester)).status, 403);
  assert.equal((await f.call('/recover', { ...body, reason: '' }, operator)).status, 400);
  assert.equal((await f.call('/recover', { ...body, expectedRevision: before.revision - 1 }, operator)).status, 409);
  const results = await Promise.all(Array.from({length: 8}, () => f.call('/recover', {...body, id: randomUUID()}, operator)));
  assert.equal(results.filter(r => r.status === 200).length, 1);
  assert.equal(results.filter(r => r.status === 409).length, 7);
  f.restart();
  const after = await (await f.call('/status')).json();
  assert.equal(after.spentMicroUsd, 120); assert.equal(after.heldMicroUsd, 0); assert.equal(after.attempts, 1); assert.equal(after.halted, false);
  const audit = await (await f.call('/operator-audit', {}, operator)).json();
  assert.equal(audit.records.length, 1); assert.equal(audit.records[0].cost, 120);
  assert.equal(audit.audit.filter(e => e.action === 'operator-recovery').length, 1);
  const used = audit.audit.find(e => e.action === 'operator-recovery').id;
  assert.equal((await f.call('/recover', {...body, id:used}, operator)).status, 409);
  await f.call('/halt', {reason:'controlled-test-complete'});
  assert.equal((await f.call('/reserve', {id:randomUUID()})).status, 403);
  assert.equal((await f.call('/recover', {...body,id:used,expectedRevision:(await (await f.call('/status')).json()).revision}, operator)).status, 409);
});

test('recovery fails closed on unresolved holds, financial halts and exhausted budget', async () => {
  const operator = 'fictional-financial-operator-'.padEnd(64,'z');
  for (const outcome of ['held','usage','overspend','exhausted']) {
    const f=await fixture();await f.call('/initialize');f.env.MIRA_AI_OPERATOR_SHA256=createHash('sha256').update(operator).digest('hex');
    const id=randomUUID();await f.call('/reserve',{id});
    if(outcome!=='held')await f.call('/settle',{id,costMicroUsd:outcome==='exhausted'?25000000:outcome==='overspend'?250001:120});
    await f.call('/halt',{reason:outcome==='usage'?'usage-unverified':'controlled-test-complete'});
    const before=await(await f.call('/status')).json();
    const r=await f.call('/recover',{id:randomUUID(),expectedRevision:before.revision,reason:'reviewed-controlled-test-complete',evidence:'FICTIONAL_UNRESOLVED_001'},operator);
    assert.equal(r.status,409);assert.deepEqual(await(await f.call('/status')).json(),before);
  }
});
