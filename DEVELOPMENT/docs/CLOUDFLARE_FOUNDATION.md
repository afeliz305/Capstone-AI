# Cloudflare Pages foundation

Status: preview candidate prepared locally. No Cloudflare project, preview deployment, production deployment, GitHub push, Supabase redirect, DNS record, OpenAI request, or paid AI provider was activated.

## Proposed Pages configuration

The existing repository remains the source. Configure a future Pages project only after owner review:

| Setting | Proposed value |
| --- | --- |
| Repository | `afeliz305/Capstone-AI` |
| Proposed Pages project | `mira-capstone` |
| Production branch | `main` (automatic production deployment stays disabled until approval) |
| Root directory | `DEVELOPMENT` |
| Build command | `npm ci && npm run package:cloudflare` |
| Build output | `dist/cloudflare/MIRA` |
| Functions directory | `DEVELOPMENT/functions` |

The checked-in `wrangler.jsonc` keeps the AI provider in mock mode. Wrangler is pinned as a development dependency. The `/functions/api/ai.js` route contains a disabled-by-default OpenAI adapter; the checked-in configuration makes no external provider call.

The Cloudflare account was verified as active and compatible with Pages, with no existing projects. `mira-capstone.pages.dev` did not resolve during the readiness check. That is a positive availability signal, not a reservation; Cloudflare confirms the name only at project creation. The dashboard's next step is GitHub authorization, so stop there for owner approval and repository selection.

## Build inputs

Set these in the controlled build environment. Names are documented without secret values:

- `MIRA_PUBLIC_ORIGIN` — exact reviewed HTTPS Pages origin.
- `MIRA_SUPABASE_URL` — public Supabase project origin.
- `MIRA_SUPABASE_PUBLISHABLE_KEY` — `sb_publishable_` browser key only.
- `MIRA_AI_PROVIDER` — checked in as `mock`; use `openai` only after approval.
- `MIRA_AI_LIVE_ENABLED` — checked in as `false`; both activation gates must opt in.
- `MIRA_OPENAI_MODEL` — owner-approved model ID after access and price review.
- `OPENAI_API_KEY` — Cloudflare encrypted secret only; never a build variable or repository value.

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
- Additional redirect candidate: `https://mira-capstone.pages.dev/pages/recover.html`

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

The browser contains no AI key. The function accepts only reviewed drafting tasks, caps request/source/output sizes, validates source links, rejects private-portal payloads, sets `store: false`, and returns only citations from the reviewed request. Output remains draft-only and must distinguish verified facts, recommendations, missing evidence, unconfirmed actions, and official approval decisions. No live posting or card modification is implemented.

Do not use a classmate's personal key for a deployed workload. Use a MIRA-owned OpenAI project service account after owner authorization. Before live activation, confirm credential authorization, project ownership, model access using that exact project credential, available credits, organization/project usage limits, a hard monthly spend limit, data retention/training terms, FERPA handling, logging/redaction, rate limits, abuse controls, incident response, and key rotation.

Activation sequence after separate approval:

1. Create a MIRA-owned OpenAI project/service account with appropriate scope and expiration.
2. Confirm the selected model for that exact project and record current pricing and rate limits.
3. Set a hard project spend limit plus a lower notification threshold.
4. Store `OPENAI_API_KEY` as an encrypted Cloudflare secret.
5. Set `MIRA_OPENAI_MODEL`, then set both activation gates only in a controlled preview environment.
6. Run grounding, privacy, citation, fallback, cost, and abuse acceptance tests before broader release.

## Preview acceptance and rollback

Before release, verify public/FARO answers, embedded and floating MIRA, Team Workspace, draft stand-ups/review/retro/handoff, Staff Queue/recovery UI, mobile/accessibility, security headers, privacy boundaries, 404s for private paths, and exact package hashes. Ocelot remains the production and rollback target.

`preview:cloudflare` validates the package before serving it on loopback with mock `/api/ai`. `wrangler pages dev` provides closer local Pages Functions parity and does not deploy. Keep all live-provider variables unset during local checks.
