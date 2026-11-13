# Controlled OpenAI testing and persistent budget infrastructure

## Current infrastructure checkpoint (supersedes earlier blockers)

Wrangler now verifies `workers_scripts:write`. Existing Pages project `mira` is preserved. A lookup confirmed the budget Worker did not exist, then `mira-ai-budget` and its SQLite `AiBudget` namespace were provisioned once. Current Worker version: `1ced1930-9596-4564-a387-8c66cadd8f1c`. No public route, workers.dev URL, preview URL or observability logging is enabled. Final configuration enables reservations internally and disables initialization; Pages remains mock/false with no OpenAI key entered.

Hosted mock checks ran through Wrangler's authenticated remote preview, reached through a loopback-only operator proxy. They verified 12 simultaneous reservations produce only 2 successes, repeat reservation rejection, idempotent settlement, conflicting settlement rejection, held unknown outcomes, persistent halt, daily-limit rejection and a seeded fictional $25 exhausted ledger. Fictional fixtures are isolated at `mira-acceptance-concurrent-v1`, `mira-acceptance-daily-v1` and `mira-acceptance-exhausted-v1`. The real `mira-usd25-lifetime-v1` ledger was initialized once and verified at zero spent, zero held, zero attempts. No real provider was called. The uncertain fictional reservation was retained (not refunded) and its fixture halted.

The private `/initialize-fixture` route accepts only the two exact exhausted/daily object identities, only while operator initialization is enabled, and only for missing state. It cannot overwrite a ledger or seed the real spending object. Initialization is now disabled on the deployed Worker. These controls were exercised with actual local SQLite runtime tests as well as hosted mock requests.

The correction candidate adds `MIRA_AI_BUDGET` to the existing Pages Wrangler configuration, referencing `AiBudget` in `mira-ai-budget`. Mock responses expose only a read-only `budgetReady` boolean; they never expose totals or reserve funds. The true hosted Pages read-back and correction publication are still pending at this checkpoint.

Clean-checkout candidate build passed: 33 files, 5,168,275 bytes, unchanged manifest SHA-256 `f624d3c3cf89b665fb70541e9b3383150610e362e4e522a2a6040c47fe3eb3f0`; Pages Functions compiled. During local verification, `npm ci` first encountered a Windows file lock from the operator's running esbuild process; the operator was stopped and the install/test rerun. This was local tooling, not a hosted application failure.

2026-11-12. Owner authorization is confirmed: classmate-owned API project, $25 total MIRA testing, fictional questions and reviewed public course sources only. The MIRA owner does not have the classmate's dashboard access and must not be asked to sign into it. No real key was entered, read or used during this implementation. No provider request was made. The private budget Worker is hosted; Pages correction publication was pending at this checkpoint.

Final local release verification: 399 passed, 0 failed, 1 optional skip (400 total). Final focused budget/runtime rerun: 8/8; the earlier broader focused run passed 14/14. Generated Cloudflare and Team Workspace browser smoke checks passed. Clean-checkout package and Pages Functions compilation passed. Only the 11 budget implementation/configuration/test/documentation files are included; generated packages, screenshots, unrelated scripts and runtime data are excluded.

## Implemented boundary

Pages `functions/api/ai.js` keeps the existing mock mode and deterministic fallback. Even when both provider gates are enabled, paid access requires all of:

- `MIRA_AI_CONTROLLED_TESTS=true`, `MIRA_AI_KILL_SWITCH=off` (missing means blocked).
- A separate high-entropy tester bearer credential whose SHA-256 matches `MIRA_AI_TESTER_SHA256`. Never use the OpenAI key as the tester credential. Do not put either credential in static JavaScript, URLs, screenshots, logs or chat.
- Exactly `{ "task": "next-steps", "testCase": "public-program-v1" }`. Extra fields, arbitrary prompts, source excerpts, context and conversation history are rejected from external processing. Public MIRA does not contain the tester credential and cannot invoke paid AI.
- A configured model matching `MIRA_AI_VERIFIED_MODEL`, positive reviewed prices, and `MIRA_AI_PRICING_VALID_UNTIL` in the next 24 hours. Missing/expired configuration blocks provider calls.
- A working `MIRA_AI_BUDGET` Durable Object binding with an initialized, enabled ledger.

Only the server-authored fictional program question and the exact reviewed public homepage excerpt from `knowledge/public-index.json` enter the model input. Private portal records, grades, messages, tickets, attachments, user context and browser-supplied sources cannot enter this controlled path. No portal writes exist. Responses use `store:false`, standard service tier, no tools, at most 128 output tokens, and a conservative UTF-8 input ceiling plus 512 tokens of overhead (maximum 4096). Missing or out-of-range citations produce deterministic fallback. Citation format validation does not prove factual entailment: initial generated answers still require human comparison against the source.

## Persistent spending controls

`workers/ai-budget/worker.mjs` implements a SQLite-backed Durable Object. All Pages instances must bind the SAME deployed namespace and use the fixed identity `mira-usd25-lifetime-v1`. Never vary the namespace/object by deployment, user, date or model.

- Lifetime cap: 25,000,000 integer micro-USD ($25), not a monthly reset.
- Every attempt atomically reserves 250,000 micro-USD ($0.25) BEFORE the provider call. Configured prices and token ceilings must fit that reservation.
- Global maximum: 2 attempts/minute, 10/day, 2 unresolved reservations and 100 lifetime attempts. These conservative limits remain even after successful settlement refunds unused reservation amounts.
- Successful provider usage reconciles input/output tokens to reviewed prices, rounding UP to micro-USD without cached-input discounts. Idempotent settlement cannot refund twice; conflicting settlements fail.
- Timeout, connection error, missing usage or unavailable reconciliation retain the reservation. No automatic timeout refunds or retries. Unexpected token usage halts further spending; an explicit internal `/halt` persists across restarts. The environment kill switch prevents new requests but cannot cancel a request already accepted by OpenAI.
- Missing/corrupt/unavailable storage blocks spending. Initialization is explicit and cannot replace an existing ledger. There is no reset, delete, unhalt or refund endpoint.
- Stored fields are reservation UUIDs, numeric counters/costs and status only; never questions, answers, headers, tokens or credentials.

This controls requests routed through this gateway, conditional on reviewed pricing and unchanged bindings. It cannot cap other uses of the classmate's key/project, taxes, currency conversion or unrelated charges. Project budget notifications are not a hard cap. Do not claim this is a provider-enforced account-wide $25 limit.

## Cloudflare provisioning procedure and secure secret handoff

Cloudflare Pages cannot itself declare a Durable Object class; deploy the separate Worker and bind it to Pages. The prepared Worker config disables public workers.dev/preview URLs and observability. Its default fetch handler always returns 404. See [Pages bindings](https://developers.cloudflare.com/pages/functions/bindings/) and [transactional storage](https://developers.cloudflare.com/durable-objects/api/sqlite-storage-api/).

1. Provision the private Worker using `workers/ai-budget/wrangler.jsonc`, after checking account plan/quota. Do not alter the working Pages deployment to provision it. Keep `MIRA_AI_BUDGET_ENABLED=false` initially.
2. Through a temporary operator-only internal binding, enable initialization, POST `/initialize` once, verify `/status` reports zero totals, then disable initialization. Do not expose these administrative operations as public Pages routes. Retain the same namespace permanently. If a ledger has ever been used, missing storage is an incident, not permission to reinitialize it.
3. A separately reviewed Pages candidate needs this binding in its Wrangler configuration (not applied to the current deployment):

```json
"durable_objects": {
  "bindings": [{
    "name": "MIRA_AI_BUDGET",
    "class_name": "AiBudget",
    "script_name": "mira-ai-budget"
  }]
}
```

4. In the existing Pages project **mira**, select the correct deployment environment. Its `preview/mira-cloudflare` branch is configured as Pages' production branch, so do not assume the Preview secret scope is used. Under Settings → Variables and Secrets, the owner enters **OPENAI_API_KEY**, type **Secret**, directly. The Function reads `env.OPENAI_API_KEY`; no VITE/NEXT_PUBLIC prefix or build substitution is used. Do not enter a key yet: provision and verify the budget binding first, and avoid triggering a replacement of the current approved deployment.
5. Set the separate tester credential hash, verified model/pricing and short review expiry in the controlled candidate. Leave the existing `wrangler.jsonc` mock/false gates unchanged until hosted protections are verified. Any dashboard/source variable conflict must be resolved in that candidate, not guessed.
6. Verify the binding, durable counters, access denial and kill switch in the hosted candidate with provider calls disabled. Only then enter the key securely and run the controlled sequence below.

The budget resource has now been provisioned and tested as recorded above. No OpenAI secret has been entered. Local provider-mock tests and hosted ledger tests are separate evidence.

## Account-owner checklist (no dashboard access needed by MIRA owner)

Ask the classmate to confirm non-secret facts: project identity used by this credential; billing responsibility and currency/tax treatment; available credit/payment status; existing project spending; model access/permissions and model rate limits; current standard input/output prices; project budget and usage notifications. Budget/data authorization is already recorded and need not be repeated. Restrict the key to this testing workload where supported, and avoid other MIRA callers outside this ledger. Alerts should be set below $25 and usage monitored independently. Do not request the key in a message.

## Initial model-access and live-test plan

1. After secure secret entry, use a temporary authenticated server-only diagnostic to GET the exact model metadata (no text generation). Return only available/not available; never provider headers, key or raw errors. This diagnostic is a future step, not an exposed public endpoint. Project metadata access does not itself prove generation permission or credit availability.
2. Provisional cost-effective candidate: `gpt-6-luna`; project access is NOT VERIFIED. Official standard published pricing checked 2026-11-12 is $0.10 input / $0.50 output per million tokens ([pricing](https://developers.openai.com/api/docs/pricing)). Verify again at activation; do not assume every project has access.
3. Set verified model and short pricing expiry only after access/price checks. Reserve $0.25, send ONE fixed public-program fixture with at most 128 output tokens, reconcile the returned usage, then disable paid requests. No retry on uncertain outcome. This is a tiny generation test; maximum reserved exposure is $0.25, not a claim of exact final billing.
4. Compare the answer with the reviewed excerpt and its citation. Read ledger totals through an internal binding and have the classmate compare provider usage when available. If totals disagree, halt; retain unresolved reservations. Usage-derived cost is an estimate, not the provider's invoice.
5. Test rate/cap/kill/failure paths with mocks instead of spending money. General-public paid access, arbitrary text and multi-turn histories remain disabled. Broader fixtures need their own reviewed server-authored content, not a bypass of the fixed-case gate.

## Local verification commands

```powershell
node --test test/ai-budget.test.js test/ai-function-runtime.test.js test/ai-gateway.test.js
npm.cmd test
npm.cmd run verify:cloudflare
git diff --check
```

Budget tests include concurrent reservations, real local workerd/SQLite restart persistence, lifetime/day limits, idempotent settlement, unknown-outcome holds, corrupted/unavailable storage, kill switches, private-text exclusion, citation rejection and provider-failure fallback. All provider responses are mocked. Fictional SQLite test stores remain in the OS temporary directory; they contain no real user information or credentials.

Verified locally on 2026-11-12: focused suite **14 passed, 0 failed**; full suite **399 passed, 0 failed, 1 optional skip** (400 total). Pages Functions compiled successfully; budget Worker Wrangler dry-run compiled successfully with both enable/initialize flags false. `git diff --check` passed. Existing public package remained **33 files / 5,168,275 bytes**, manifest SHA-256 `f624d3c3cf89b665fb70541e9b3383150610e362e4e522a2a6040c47fe3eb3f0`. No generated release was replaced, no commit/push/deployment occurred, and no Cloudflare/Supabase/Ocelot/portal/FARO data or settings changed. API spending by this task: **$0**. Hosted budget enforcement, secret configuration, model access and actual provider billing remain unverified.

## Hosted provisioning attempt: external access blocker

### Official agent setup follow-up

Read Cloudflare's official `https://developers.cloudflare.com/agent-setup/prompt.md` directly before setup. The active agent is Codex; the executable is supplied by the installed OpenAI VS Code extension, not GitHub Copilot. Executed the owner's requested `npx.cmd -y skills add cloudflare/skills --skill '*' --yes --global`. All 22 skills were installed and their `SKILL.md` files verified under `C:\Users\afeli\.agents\skills\`. The installer's additional PromptScript-global warnings do not affect these Codex-readable files. The optional beta `cf` CLI was not installed.

No `cloudflare` MCP registration existed. Added exactly one enabled streamable-HTTP registration in the user's Codex configuration (`C:\Users\afeli\.codex\config.toml`), URL `https://mcp.cloudflare.com/mcp`. `codex mcp get cloudflare` confirmed its configuration. The add command automatically started OAuth, so no second parallel MCP login was started. The owner was asked to approve the official browser authorization; registration alone does not establish authenticated MCP connectivity. Restart/reload the agent after completed authorization to load the new server; skills are available for the next turn.

Ran the requested corrected Wrangler OAuth command including `workers_scripts:write`. It timed out waiting for owner approval. A subsequent `whoami` still verified the existing login but showed only user/account read, workers/pages write and offline access; `workers_scripts:write` remained in the **missing** list. Do not mistake that warning for a granted permission. No resource, migration, binding or deployment was changed. The existing local source and unrelated work were preserved. Continue after owner completion of the two Cloudflare authorization steps; never request the OpenAI key to solve this blocker.

Follow-up on 2026-11-12 (Cloudflare CLI log UTC date 2026-11-13): the owner completed OAuth successfully. `wrangler whoami` verified the existing account and encrypted Windows Credential Manager-backed storage; `wrangler pages project list` verified project `mira`. The earlier authentication timeout is superseded. The granted scopes are user read, account read, workers write, pages write and offline access. However, **`workers_scripts:write` is absent**. Both Worker deployment lookup and `wrangler deploy --config workers/ai-budget/wrangler.jsonc` failed at the initial `/workers/scripts/mira-ai-budget/deployments` GET with **No access to the specified resource**, before any upload/migration. Wrangler's scope list specifically associates `workers_scripts:write` with scripts and Durable Objects. The previous suggested restricted OAuth command omitted this necessary scope. Request only its addition, retaining the existing scopes; do not request every scope in Wrangler's generic warning. No repeated OAuth was initiated during this diagnosis. No new deployment, resource, binding, secret, commit or push occurred. Hosted safeguard tests remain blocked by this permission; local verification results are unchanged.

Owner action to add the missing permission through Cloudflare's own authorization page:

```powershell
npx.cmd wrangler login --scopes account:read user:read workers:write workers_scripts:write pages:write --use-keyring
```

After approval, verify the exact scope and rediscover existing resources before provisioning. Do not infer that a denied lookup proves the Worker does not exist. No OpenAI key is needed for this permission correction.

The follow-up review reran `npm ci` and the full suite: **399 passed, 0 failed, 1 optional skip**. Focused budget tests again passed **14/14**. A fresh local clone of `preview/mira-cloudflare`, overlaid with only the nine intended source/documentation files below, installed from the lockfile and built without private runtime inputs. Its 33-file manifest exactly matched the hash above. The credential-pattern scan found no suspected credentials in this candidate; unrelated `docs/evidence/`, sibling generated `MIRA/`, and sibling scripts were excluded.

The existing public hostname was checked read-only: **32/32 downloadable assets matched** sizes and hashes; `/pages/recover.html` returned 308 with `no-store`, `/pages/recover` returned 200 with `no-store`; `/api/ai` returned HTTP 200, provider `mock`, state `draft`. This confirms the OLD deployment remains healthy, not that the new budget binding is deployed.

External blocker: Work reported `The browser access host is unavailable`; Wrangler `whoami` reported not authenticated. Wrangler OAuth was opened with account/user read and Workers/Pages write scopes, using Windows keyring storage. The authorization attempt timed out waiting for the browser authorization code. No resource provisioning, binding changes, secret entry, commit, push or deployment occurred. The owner must complete Cloudflare OAuth (not OpenAI login); then resource discovery must precede creation to prevent duplicates. No temporary preview account is acceptable.

Reviewed proposed commit set (not staged/committed):

- `functions/api/ai.js`
- `workers/ai-budget/worker.mjs`
- `workers/ai-budget/wrangler.jsonc`
- `test/ai-budget.test.js`
- `docs/AI_CONTROLLED_BUDGET.md`
- `docs/CLOUDFLARE_FOUNDATION.md`
- `docs/DEPLOYMENT_AND_INTEGRATION_PLAN.md`
- `docs/TEAM_SETUP_GUIDE.md`
- `docs/README.md`

Do not enter `OPENAI_API_KEY` yet. Hosted concurrency/exhaustion/kill-switch tests must use isolated mock test state without altering or clearing any real lifetime reservations. Those hosted checks, initialization and the production Pages binding still require authenticated Cloudflare access. The API model-access probe is prepared as a plan only; no model is claimed verified and no billable test has run.
