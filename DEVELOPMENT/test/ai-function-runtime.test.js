const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs/promises');
const path = require('node:path');

test('actual Pages Function remains mock, rejects private/oversized inputs and throttles without provider calls', async (t) => {
  const source = await fs.readFile(path.join(__dirname, '../functions/api/ai.js'), 'utf8');
  const api = await import('data:text/javascript;base64,' + Buffer.from(source).toString('base64'));
  const original = global.fetch;
  let calls = 0;
  global.fetch = async () => { calls++; throw new Error('External network prohibited in this test'); };
  t.after(() => { global.fetch = original; });
  let address = 0;
  const run = (body, env = {}, ip = String(++address)) => api.onRequestPost({ env, request: new Request('https://example.test/api/ai', { method: 'POST', headers: { 'content-type': 'application/json', 'cf-connecting-ip': ip }, body: JSON.stringify(body) }) });
  const request = { task: 'review-evidence', context: 'Fictional public test', sources: [{ id: 'test.criteria', title: 'Reviewed test source', url: '/pages/syllabus.html', excerpt: 'Evidence supports review.' }] };
  for (const env of [{}, { MIRA_AI_PROVIDER: 'openai', MIRA_AI_LIVE_ENABLED: 'false' }]) {
    const response = await run(request, env);
    assert.equal(response.headers.get('cache-control'), 'no-store');
    const result = await response.json();
    assert.equal(result.provider, 'mock');
    assert.equal(result.state, 'draft');
    assert.equal(result.budgetReady, false);
    assert.equal(result.citations[0].id, 'test.criteria');
  }
  assert.equal((await run({ ...request, privatePortalData: true })).status, 403);
  assert.equal((await run({ ...request, context: 'x'.repeat(13000) })).status, 413);
  assert.equal((await run({ task: 'post-standup' })).status, 400);
  const blocked = await (await run({ ...request, externalEligible: false })).json();
  assert.equal(blocked.provider, 'deterministic');
  assert.equal(blocked.blockedExternal, true);
  assert.equal((await run(request, { MIRA_AI_MAX_REQUESTS_PER_MINUTE: '1' }, 'limit')).status, 200);
  assert.equal((await run(request, { MIRA_AI_MAX_REQUESTS_PER_MINUTE: '1' }, 'limit')).status, 429);
  assert.equal(calls, 0);
  const ready = await (await run(request, { MIRA_AI_BUDGET: {
    idFromName: name => name,
    get: () => ({ fetch: async url => {
      assert.equal(new URL(url).pathname, '/status');
      return Response.json({ capMicroUsd: 25000000, spentMicroUsd: 0, heldMicroUsd: 0, halted: false });
    } })
  } })).json();
  assert.equal(ready.budgetReady, true);
  assert.equal(ready.provider, 'mock');
});
