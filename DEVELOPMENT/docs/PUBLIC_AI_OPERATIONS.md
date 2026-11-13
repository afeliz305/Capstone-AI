# Public MIRA AI and operator guide

Owner confirmed public visitor billing authorization on November 13, 2026, within the existing $25 cumulative MIRA allocation. This is not an unlimited allocation. The ledger cannot control unrelated use of the classmate's OpenAI project.

## Student experience

Use MIRA in a browser without accounts, pairing, extensions or tester credentials for public course questions. Both composers use the same retrieval and public synthesis path. Search first resolves reviewed topic IDs; the Function loads the authoritative approved excerpts for those IDs. Raw visitor questions, conversation text, shared personal information, staff tickets and portal records are never sent to OpenAI. Follow-ups retain only reviewed topic IDs in the current browser conversation. Multiple resolved topics can be synthesized together (maximum three).

This is grounded topic synthesis, not an unrestricted assistant: unsupported or personal questions stay in Course Knowledge mode and use official portal links where appropriate. Fictional stand-up preparation and other Workspace drafts remain draft-only. Public Resources/About/Engage/Tutorials retrieval can also return direct verified excerpts without a paid call. Grades still require FIU-approved grade-specific integration.

Only a validated OpenAI response is labeled `MIRA — Live AI`. All unavailable, exhausted, invalid, timed-out or unapproved responses fall back to `MIRA — Course Knowledge`, with no automatic provider retry. The old tester-code form is omitted from the Cloudflare package. The restricted endpoint remains internal tooling; the earlier classroom browser launcher is a historical workflow, not the public demonstration path.

## Financial and abuse controls

One existing Durable Object, `mira-usd25-lifetime-v1`, governs every paid attempt. No migration resets spending, attempts, audit or reservations. Atomic transaction enforces:

- $25 lifetime ceiling; public admission stops at $24.50 spent plus held, leaving $0.50 operational margin.
- $0.25 reserved before every provider attempt; at most two held requests globally.
- Two attempts globally/minute, ten/day (UTC), 100 lifetime; existing counts remain.
- One attempt/visitor/minute, three/day, one pending request per visitor. Visitors are identified using a server-secret HMAC of Cloudflare's trusted connecting IP; raw IP is not stored. Shared networks share a limit. This is throttling, not human verification; distributed bots can consume the small global allowance but cannot bypass it.
- 1,600-byte inbound public body, at most three approved source IDs, 4,096 conservative input-token ceiling, 512 output tokens including reasoning, 30-second provider timeout, 64KB response ceiling.
- Unknown provider outcomes retain reservations. Verified usage is reconciled before citation validation, so rejected answers are still accounted. Reconciliation failure keeps the reservation. Never refund ambiguous attempts.
- Persistent halt, separate operator credential and revision-checked recovery; financial/security halts cannot be cleared by public activation.

Public configuration flags are necessary but insufficient. An operator's durable approval expires within 24 hours, including pricing review. No automatic renewal or budget reset. A killed or expired gate returns reviewed knowledge. In-flight requests may complete; their reservations remain protected.

## Model and accounting

`gpt-6.1-sol`, Responses API, `store:false`, standard service tier, no tools. Official pricing checked November 13: input $2/million, cached input $0.10, cache writes $2.50, output $10. MIRA conservatively accounts all input at $5/million and output at $10, including reasoning in total output (not counted twice). This estimate may exceed the eventual provider invoice; MIRA cannot inspect the project owner's invoice. Source: https://developers.openai.com/api/docs/models/gpt-6.1-sol

## Operator workflow

Run from DEVELOPMENT. Existing encrypted `OPENAI_API_KEY` remains unchanged. `MIRA_PUBLIC_VISITOR_SECRET` is encrypted in Cloudflare Production; do not rotate it just to bypass visitor limits. No secrets belong in browser assets, command arguments or reports.

Start the local administrative bridge (operator tooling only, not a student dependency):

```powershell
node node_modules/wrangler/bin/wrangler.js dev --config scripts/demo-operator.wrangler.jsonc --remote --ip 127.0.0.1 --port 8798 --log-level error
```

In another terminal:

```powershell
powershell.exe -NoProfile -File scripts/public-ai-operator.ps1 -Action status
# Only after current pricing, billing, hosted checks and held reservations are reviewed:
powershell.exe -NoProfile -File scripts/public-ai-operator.ps1 -Action start -PricingReviewed -BillingApproved
# Immediately disable new public attempts:
powershell.exe -NoProfile -File scripts/public-ai-operator.ps1 -Action stop
# Persistent emergency halt of all paid paths:
powershell.exe -NoProfile -File scripts/public-ai-operator.ps1 -Action halt
```

The wrapper uses the existing Windows-DPAPI operator credential without printing it. Start performs read-back, requires no held reservations and available capacity, and can recover only a reviewed controlled-test-complete halt. Other halts require evidence-based investigation. It does not forgive spending or release holds. Start grants 23 hours, then public AI fails closed until pricing is reviewed again.

Cloudflare flags: `MIRA_PUBLIC_AI_ENABLED=true`, `MIRA_PUBLIC_BILLING_APPROVED=true`, encrypted `MIRA_AI_KILL_SWITCH=off`; the original `/api/ai` remains mock. Turn either public flag off for a deployment-level shutdown. Do not enable arbitrary browser context through that older endpoint.

## Verification and publication

Run `npm.cmd test`, `node scripts/smoke-cloudflare-preview.js`, branding/Workspace checks, clean-checkout package verification, Worker dry run and hosted asset hashes. Never use broad browser smoke scripts against an activated public gateway without intercepting `/api/public-ai`; otherwise ordinary course questions become paid calls. Controlled live acceptance uses at most two approved course questions, one attempt each, no retry, and checks ledger deltas. Current execution evidence belongs in ignored `dist/presentation/PUBLIC_AI_RELEASE.json`.

Preserve main, Ocelot, Supabase, FARO and portal records. No portal submission is enabled.
