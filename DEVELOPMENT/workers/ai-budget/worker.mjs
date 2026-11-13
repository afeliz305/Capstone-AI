// Internal binding only. No public routes, credentials, prompts, or response text.
const CAP = 25_000_000; // integer micro-USD, lifetime (never monthly)
const RESERVE = 250_000; // $0.25 per attempted provider request
const json = (body, status = 200) => new Response(JSON.stringify(body), { status, headers: { 'content-type': 'application/json', 'cache-control': 'no-store' } });
const integer = n => Number.isSafeInteger(n) && n >= 0;
async function operator(request, env) {
  const expected = env.MIRA_AI_OPERATOR_SHA256;
  const header = request.headers.get('authorization') || '';
  if (!/^[a-f0-9]{64}$/.test(expected || '') || !/^Bearer [A-Za-z0-9_-]{43,128}$/.test(header)) return false;
  const digest = new Uint8Array(await crypto.subtle.digest('SHA-256', new TextEncoder().encode(header.slice(7))));
  const actual = [...digest].map(n => n.toString(16).padStart(2, '0')).join('');
  let difference = 0;
  for (let i = 0; i < 64; i++) difference |= actual.charCodeAt(i) ^ expected.charCodeAt(i);
  return difference === 0;
}
function audit(s, action, reason, id = '') {
  s.revision = (s.revision || 0) + 1;
  s.audit ||= [];
  s.audit.push({ revision: s.revision, at: Date.now(), action, reason, id, spent: s.spent, held: s.held, attempts: s.attempts });
}

function valid(s) {
  if (!s || s.version !== 1 || !integer(s.spent) || !integer(s.held) ||
      !integer(s.attempts) || s.attempts > 100 || typeof s.halted !== 'boolean' ||
      !Array.isArray(s.records) || s.records.length !== s.attempts ||
      !integer(s.minute) || !integer(s.minuteCount) || !integer(s.day) || !integer(s.dayCount)) return false;
  let spent = 0, held = 0;
  const ids = new Set();
  for (const r of s.records) {
    if (!r || !/^[a-f0-9-]{36}$/.test(r.id) || ids.has(r.id) || !['held', 'settled'].includes(r.state) || !integer(r.cost)) return false;
    ids.add(r.id);
    if (r.state === 'held') held += RESERVE;
    else spent += r.cost;
  }
  if (s.revision !== undefined && (!integer(s.revision) || !Array.isArray(s.audit) || s.audit.length !== s.revision ||
      s.audit.some((e, i) => e.revision !== i + 1 || !integer(e.at) || !integer(e.spent) || !integer(e.held) || !integer(e.attempts)))) return false;
  return spent === s.spent && held === s.held;
}

export class AiBudget {
  constructor(state, env) { this.storage = state.storage; this.env = env; this.id = state.id; }
  async fetch(request) {
    if (request.method !== 'POST') return json({ error: 'Method not allowed' }, 405);
    let body;
    try { body = await request.json(); } catch { return json({ error: 'Invalid input' }, 400); }
    const route = new URL(request.url).pathname;
    if (['/recover', '/operator-audit', '/demo-start', '/demo-stop'].includes(route) && !await operator(request, this.env)) return json({ error: 'Operator authorization required' }, 403);
    try {
      return await this.storage.transaction(async tx => {
        let s = await tx.get('lifetime-v1');
        // Operator-only acceptance fixtures. Exact isolated object identities;
        // never seed/reset the real lifetime ledger or overwrite existing state.
        if (route === '/initialize-fixture') {
          const names = ['mira-acceptance-exhausted-v1', 'mira-acceptance-daily-v1'];
          const match = names.find(name => this.env.MIRA_AI_BUDGET && this.id &&
            this.env.MIRA_AI_BUDGET.idFromName(name).toString() === this.id.toString());
          if (!match || s !== undefined || this.env.MIRA_AI_ALLOW_INITIALIZE !== 'true') return json({ error: 'Fixture initialization denied' }, 403);
          s = { version: 1, spent: 0, held: 0, attempts: 0, halted: false, minute: 0, minuteCount: 0, day: Math.floor(Date.now() / 86400000), dayCount: 10, records: [] };
          if (match.includes('exhausted')) {
            s.spent = CAP; s.attempts = 100; s.dayCount = 0;
            s.records = Array.from({ length: 100 }, () => ({ id: crypto.randomUUID(), state: 'settled', cost: RESERVE }));
          }
          await tx.put('lifetime-v1', s);
          return json({ initialized: true, fictional: true });
        }
        // Only an operator's temporary internal binding may initialize an empty ledger.
        // Never expose this path through Pages. Reinitialization cannot reset spending.
        if (route === '/initialize') {
          if (s !== undefined || this.env.MIRA_AI_ALLOW_INITIALIZE !== 'true') return json({ error: 'Initialization denied' }, 409);
          s = { version: 1, spent: 0, held: 0, attempts: 0, halted: false, minute: 0, minuteCount: 0, day: 0, dayCount: 0, records: [] };
          await tx.put('lifetime-v1', s);
          return json({ initialized: true });
        }
        if (!valid(s)) return json({ error: 'Spending state unavailable' }, 503);
        if (s.demo && (!integer(s.demo.baseline) || s.demo.baseline > s.spent || s.demo.cap !== 1000000 || !integer(s.demo.expires) || !integer(s.demo.pricingUntil) || !/^[a-f0-9]{64}$/.test(s.demo.hash))) return json({ error: 'Campaign state unavailable' }, 503);
        if (route === '/demo-start') {
          if (s.halted || s.held || body.expectedRevision !== (s.revision || 0) ||
              !/^[a-f0-9]{64}$/.test(body.hash || '') || !integer(body.durationMinutes) || body.durationMinutes < 1 || body.durationMinutes > 60 ||
              !integer(body.pricingUntil) || body.pricingUntil <= Date.now() || body.pricingUntil > Date.now() + 86400000)
            return json({ error: 'Reviewed recovery, pricing and session configuration required' }, 409);
          if (s.demo?.hash === body.hash) return json({ error: 'Do not reuse tester credentials' }, 409);
          // This campaign ceiling and baseline NEVER reset when a session restarts.
          s.demo = { baseline: s.demo?.baseline ?? s.spent, cap: 1000000, hash: body.hash,
            expires: Math.min(Date.now() + body.durationMinutes * 60000, body.pricingUntil), pricingUntil: body.pricingUntil };
          audit(s, 'demo-start', 'integrated-public-course-usd1'); await tx.put('lifetime-v1', s);
          return json({ started: true, expires: s.demo.expires, campaignCapMicroUsd: s.demo.cap });
        }
        if (route === '/demo-stop') {
          if (s.demo) s.demo.expires = 0;
          s.halted = true;
          if (!s.haltReason || ['manual','controlled-test-complete'].includes(s.haltReason)) s.haltReason = 'controlled-test-complete';
          audit(s, 'demo-stop', 'session-revoked'); await tx.put('lifetime-v1', s);
          return json({ stopped: true, halted: true });
        }
        const demoAuthorized = () => s.demo && !s.halted && s.demo.expires > Date.now() &&
          s.demo.pricingUntil > Date.now() && body.demoHash === s.demo.hash;
        if (route === '/demo-auth') {
          if (!demoAuthorized()) return json({ error: 'Demo session unavailable or expired' }, 403);
          return json({ authorized: true, expires: s.demo.expires, pricingUntil: s.demo.pricingUntil,
            campaignSpentMicroUsd: s.spent - s.demo.baseline, heldMicroUsd: s.held });
        }
        if (route === '/status') return json({ capMicroUsd: CAP, spentMicroUsd: s.spent, heldMicroUsd: s.held, attempts: s.attempts, halted: s.halted, revision: s.revision || 0, haltReason: s.haltReason || (s.halted ? 'legacy-unrecorded' : null) });
        if (route === '/operator-audit') return json({ revision: s.revision || 0, audit: s.audit || [], records: s.records, halted: s.halted, haltReason: s.haltReason || 'legacy-unrecorded' });
        if (route === '/recover') {
          if (!body || Object.keys(body).some(k => !['id','expectedRevision','reason','evidence'].includes(k)) ||
              !/^[a-f0-9-]{36}$/.test(body.id || '') || !integer(body.expectedRevision) ||
              body.reason !== 'reviewed-controlled-test-complete' || !/^[A-Z0-9_-]{8,100}$/.test(body.evidence || '')) return json({ error: 'Explicit reviewed recovery required' }, 400);
          if (!s.halted || body.expectedRevision !== (s.revision || 0) || (s.audit || []).some(e => e.id === body.id)) return json({ error: 'Stale or repeated recovery' }, 409);
          if (s.held !== 0 || s.attempts >= 100 || s.spent + RESERVE > CAP || s.records.some(r => r.cost > RESERVE) ||
              !['controlled-test-complete','manual','legacy-unrecorded'].includes(s.haltReason || 'legacy-unrecorded')) return json({ error: 'Financial halt remains unresolved' }, 409);
          s.halted = false; s.haltReason = null;
          audit(s, 'operator-recovery', body.reason + ':' + body.evidence, body.id);
          await tx.put('lifetime-v1', s);
          return json({ recovered: true, revision: s.revision, spentMicroUsd: s.spent, heldMicroUsd: s.held });
        }
        if (route === '/halt') {
          s.halted = true;
          const reason = ['controlled-test-complete','usage-unverified'].includes(body?.reason) ? body.reason : 'manual';
          // A benign halt must never erase a prior financial/security halt reason.
          if (!s.haltReason || ['manual','controlled-test-complete'].includes(s.haltReason)) s.haltReason = reason;
          audit(s, 'halt', s.haltReason); await tx.put('lifetime-v1', s); return json({ halted: true, revision: s.revision });
        }
        if (!/^[a-f0-9-]{36}$/.test(body?.id || '')) return json({ error: 'Invalid reservation' }, 400);
        if (route === '/reserve') {
          if (this.env.MIRA_AI_BUDGET_ENABLED !== 'true' || s.halted) return json({ error: 'Paid testing disabled' }, 403);
          if ((body.demoHash || s.demo) && !demoAuthorized()) return json({ error: 'Demo session unavailable or expired' }, 403);
          if (s.demo && s.spent - s.demo.baseline + s.held + RESERVE > s.demo.cap) return json({ error: 'Campaign limit reached' }, 429);
          // A duplicate reservation is never permission to repeat a provider request.
          if (s.records.some(r => r.id === body.id)) return json({ error: 'Duplicate request' }, 409);
          const now = Date.now(), minute = Math.floor(now / 60000), day = Math.floor(now / 86400000);
          if (minute < s.minute || day < s.day) return json({ error: 'Clock mismatch' }, 503);
          if (minute !== s.minute) { s.minute = minute; s.minuteCount = 0; }
          if (day !== s.day) { s.day = day; s.dayCount = 0; }
          if (s.attempts >= 100 || s.spent + s.held + RESERVE > CAP || s.minuteCount >= 2 || s.dayCount >= 10 || s.held >= 2 * RESERVE) return json({ error: 'Testing limit reached' }, 429);
          s.held += RESERVE; s.attempts++; s.minuteCount++; s.dayCount++;
          s.records.push({ id: body.id, state: 'held', cost: 0 });
          audit(s, 'reserve', 'provider-attempt', body.id);
          await tx.put('lifetime-v1', s);
          return json({ reserved: true, reservationMicroUsd: RESERVE });
        }
        if (route === '/settle') {
          const r = s.records.find(r => r.id === body.id);
          if (!r || !integer(body.costMicroUsd)) return json({ error: 'Invalid settlement' }, 400);
          if (r.state === 'settled') return json({ settled: r.cost === body.costMicroUsd }, r.cost === body.costMicroUsd ? 200 : 409);
          r.state = 'settled'; r.cost = body.costMicroUsd;
          s.spent += r.cost; s.held -= RESERVE;
          if (r.cost > RESERVE || s.spent + s.held > CAP) { s.halted = true; s.haltReason = 'overspend'; }
          audit(s, 'settle', s.halted ? (s.haltReason || 'halted') : 'usage-reconciled', body.id);
          await tx.put('lifetime-v1', s);
          return json({ settled: true, halted: s.halted });
        }
        return json({ error: 'Not found' }, 404);
      });
    } catch { return json({ error: 'Spending state unavailable' }, 503); }
  }
}

export default { fetch() { return json({ error: 'Not found' }, 404); } };
