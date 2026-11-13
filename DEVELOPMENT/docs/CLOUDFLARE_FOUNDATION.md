# Cloudflare Pages foundation

Current AI activation authority: [Controlled $25 testing guide](AI_CONTROLLED_BUDGET.md). It supersedes the early activation prerequisites below: the classmate-owned project is explicitly authorized. Its dashboard need not be shared. The new local adapter permits only authenticated fixed-case testing with a persistent budget binding; it has not been deployed. The currently configured Pages production branch is `preview/mira-cloudflare`; `main` remains untouched.

Status: existing preview foundation plus a new local owner-review candidate. This update did not deploy, push, change Supabase/DNS, call OpenAI, or activate a paid provider.

## Proposed Pages configuration

The existing repository remains the source. Configure a future Pages project only after owner review:

| Setting | Proposed value |
| --- | --- |
| Repository | `afeliz305/Capstone-AI` |
| Pages project | `mira` |
| Assigned Pages hostname | `mira-9gg.pages.dev` |
| Production branch | `main` (automatic production deployment stays disabled until approval) |
| Root directory | `DEVELOPMENT` |
| Build command | `npm ci && npm run package:cloudflare` |
| Build output | `dist/cloudflare/MIRA` |
| Functions directory | `DEVELOPMENT/functions` |

The `/functions/api/ai.js` route contains a disabled-by-default OpenAI adapter: live calls require both provider gates to be explicitly enabled, so missing variables remain mock-only. Wrangler is pinned as a development dependency. This Pages account did not inject its dashboard runtime variables into the Git build, so `wrangler.jsonc` carries only the browser-public Pages origin, Supabase URL, Supabase publishable key, and the explicit mock gates. No service-role key or other private credential belongs in that file.

The Cloudflare account and existing Pages project `mira` are verified. The current preview hostname is `mira-9gg.pages.dev`; this local candidate does not replace or modify that deployment.

## Build inputs

Set these in the controlled build environment. Names are documented without secret values:

- `MIRA_PUBLIC_ORIGIN` — exact reviewed HTTPS Pages origin.
- `MIRA_SUPABASE_URL` — public Supabase project origin.
- `MIRA_SUPABASE_PUBLISHABLE_KEY` — `sb_publishable_` browser key only.
- `MIRA_AI_PROVIDER` — set to `mock` in the preview project; use `openai` only after approval.
- `MIRA_AI_LIVE_ENABLED` — set to `false` in the preview project; both activation gates must opt in.
- `MIRA_OPENAI_MODEL` — owner-approved model ID after access and price review.
- `OPENAI_API_KEY` — Cloudflare encrypted secret only; never a build variable or repository value.
- `MIRA_AI_MAX_REQUESTS_PER_MINUTE` — bounded per-isolate throttle; default 12.
- `MIRA_AI_MAX_OUTPUT_TOKENS` — bounded response ceiling; default 700.
- `MIRA_AI_TIMEOUT_MS` — bounded provider timeout; default 15000.
- `MIRA_AI_INPUT_USD_PER_MILLION` — owner-reviewed current input-token rate; zero means no estimate is configured.
- `MIRA_AI_OUTPUT_USD_PER_MILLION` — owner-reviewed current output-token rate; zero means no estimate is configured.

Never supply a Supabase service-role key or OpenAI secret to the static build. Local development may use ignored `server/supabase.local.json`; the packager refuses to build without an explicit public origin.

```powershell
npm.cmd run package:cloudflare
npm.cmd run verify:cloudflare
npm.cmd run preview:cloudflare
npx.cmd wrangler pages dev dist/cloudflare/MIRA
```

The packager reuses the reviewed public Supabase allowlist, bundles public search, adds security headers, rejects backend/runtime/private paths and credential patterns, calculates a SHA-256 manifest, and writes only under `DEVELOPMENT/dist/cloudflare/`. It does not replace the sibling `MIRA/` Ocelot package.

## Proposed Supabase Auth URLs

Do not apply these until Cloudflare accepts the project name and the exact preview origin passes acceptance:

- Site URL: retain the current Ocelot value during preview.
- Additional redirect candidate: `https://mira-9gg.pages.dev/pages/recover.html`

Do not use a wildcard. Do not change the current Site URL for this preview-readiness phase.

## Secure AI gateway

```text
MIRA browser
  -> same-origin POST /api/ai
  -> Cloudflare Pages Function (validation, limits, privacy gate)
  -> mock provider by default
  -> OpenAI Responses API only after separate owner activation
  -> deterministic MIRA response on provider failure
```

The browser contains no AI key. The function accepts only reviewed drafting tasks, caps request/source/output sizes, validates source links, rejects private-portal payloads, sets `store: false`, and returns only citations from the reviewed request. Browser requests explicitly marked externally ineligible are resolved locally without a gateway request. Output remains draft-only and must distinguish verified facts, recommendations, missing evidence, unconfirmed actions, and official approval decisions. No live posting or card modification is implemented.

The in-memory request limiter is best-effort per Cloudflare isolate; it is not a global hard cap and must not be presented as guaranteed cost containment. Live activation additionally requires provider-side project budgets/usage restrictions and either Cloudflare rate limiting or durable centralized accounting, plus alerts and owner review.

When a live provider eventually returns token usage, the server can calculate a per-request estimate from the two owner-configured rate variables. It reports whether an estimate was actually configured and never guesses current model pricing. This estimate is informational, not billing authority or an enforceable budget.

The classmate has authorized MIRA's limited $25 testing workload using fictional questions and reviewed public sources. Account-specific model/billing facts remain to be confirmed without sharing dashboard access. A dedicated MIRA service account is a future operational recommendation, not a new approval prerequisite. Provider notifications are not hard spending caps; use the persistent lifetime ledger and restricted test path described in the current guide.

Activation sequence after separate approval:

1. Confirm account-specific billing/model facts with the credential owner; preserve the already-granted workload and budget authorization.
2. Confirm the selected model for that exact project and record current pricing and rate limits.
3. Configure provider notifications and verify the centralized lifetime reservation ledger. Do not claim provider alerts enforce a hard cap.
4. Store `OPENAI_API_KEY` as an encrypted Cloudflare secret.
5. Set `MIRA_OPENAI_MODEL`, then set both activation gates only in a controlled preview environment.
6. Run grounding, privacy, citation, fallback, cost, and abuse acceptance tests before broader release.

## Preview acceptance and rollback

Before release, verify public/FARO answers, embedded and floating MIRA, Team Workspace, draft stand-ups/review/retro/handoff, Staff Queue/recovery UI, mobile/accessibility, security headers, privacy boundaries, 404s for private paths, and exact package hashes. Ocelot remains the production and rollback target.

`preview:cloudflare` validates the package before serving it on loopback with mock `/api/ai`. `wrangler pages dev` provides closer local Pages Functions parity and does not deploy. Keep all live-provider variables unset during local checks.
