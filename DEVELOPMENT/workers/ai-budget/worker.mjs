// Internal binding only. No public routes, credentials, prompts, or response text.
const CAP = 25_000_000; // integer micro-USD, lifetime (never monthly)
const RESERVE = 250_000; // $0.25 per attempted provider request
const json = (body, status = 200) => new Response(JSON.stringify(body), { status, headers: { 'content-type': 'application/json', 'cache-control': 'no-store' } });
const integer = n => Number.isSafeInteger(n) && n >= 0;

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
  return spent === s.spent && held === s.held;
}

export class AiBudget {
  constructor(state, env) { this.storage = state.storage; this.env = env; this.id = state.id; }
  async fetch(request) {
    if (request.method !== 'POST') return json({ error: 'Method not allowed' }, 405);
    let body;
    try { body = await request.json(); } catch { return json({ error: 'Invalid input' }, 400); }
    const route = new URL(request.url).pathname;
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
        if (route === '/status') return json({ capMicroUsd: CAP, spentMicroUsd: s.spent, heldMicroUsd: s.held, attempts: s.attempts, halted: s.halted });
        if (route === '/halt') { s.halted = true; await tx.put('lifetime-v1', s); return json({ halted: true }); }
        if (!/^[a-f0-9-]{36}$/.test(body?.id || '')) return json({ error: 'Invalid reservation' }, 400);
        if (route === '/reserve') {
          if (this.env.MIRA_AI_BUDGET_ENABLED !== 'true' || s.halted) return json({ error: 'Paid testing disabled' }, 403);
          // A duplicate reservation is never permission to repeat a provider request.
          if (s.records.some(r => r.id === body.id)) return json({ error: 'Duplicate request' }, 409);
          const now = Date.now(), minute = Math.floor(now / 60000), day = Math.floor(now / 86400000);
          if (minute < s.minute || day < s.day) return json({ error: 'Clock mismatch' }, 503);
          if (minute !== s.minute) { s.minute = minute; s.minuteCount = 0; }
          if (day !== s.day) { s.day = day; s.dayCount = 0; }
          if (s.attempts >= 100 || s.spent + s.held + RESERVE > CAP || s.minuteCount >= 2 || s.dayCount >= 10 || s.held >= 2 * RESERVE) return json({ error: 'Testing limit reached' }, 429);
          s.held += RESERVE; s.attempts++; s.minuteCount++; s.dayCount++;
          s.records.push({ id: body.id, state: 'held', cost: 0 });
          await tx.put('lifetime-v1', s);
          return json({ reserved: true, reservationMicroUsd: RESERVE });
        }
        if (route === '/settle') {
          const r = s.records.find(r => r.id === body.id);
          if (!r || !integer(body.costMicroUsd)) return json({ error: 'Invalid settlement' }, 400);
          if (r.state === 'settled') return json({ settled: r.cost === body.costMicroUsd }, r.cost === body.costMicroUsd ? 200 : 409);
          r.state = 'settled'; r.cost = body.costMicroUsd;
          s.spent += r.cost; s.held -= RESERVE;
          if (r.cost > RESERVE || s.spent + s.held > CAP) s.halted = true;
          await tx.put('lifetime-v1', s);
          return json({ settled: true, halted: s.halted });
        }
        return json({ error: 'Not found' }, 404);
      });
    } catch { return json({ error: 'Spending state unavailable' }, 503); }
  }
}

export default { fetch() { return json({ error: 'Not found' }, 404); } };
