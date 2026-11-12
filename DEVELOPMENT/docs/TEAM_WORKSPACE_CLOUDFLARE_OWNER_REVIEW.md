# MIRA team workspace and Cloudflare foundation — owner review

Date: November 12, 2026
Status: local implementation and Cloudflare/OpenAI readiness preparation complete; stopped before GitHub authorization and Cloudflare project creation.

No commit, push, deployment, Supabase change, portal write, Ocelot change, external AI request, email, password change, ticket write, or FARO mutation was performed.

## Unified Team Workspace

| Capability | Result |
| --- | --- |
| Sprint overview | Implemented from the clearly labeled November 12 audit snapshot |
| Team cards / owners / statuses / dependencies | Implemented; 10 audited Sprint 5 cards, team and individual views |
| Criteria and evidence preparation | Implemented; draft evidence maps to criteria without marking completion |
| Actionable steps and handoff | Implemented; confirmation, work, evidence, verification, and portal handoff |
| Stand-up Assistant | Implemented with exact three fields and a duplicate warning; no posting action |
| Sprint Review / Retrospective | Implemented as editable, unsubmitted preparation |
| Live portal writes | Not implemented or attempted |

All records are labeled with source/state at the workspace or record level. Current live portal values remain unavailable until checked through the signed-in portal.

## Data and permission matrix

| Data | Current source | MIRA permission | External AI |
| --- | --- | --- | --- |
| Public course/FARO knowledge | Reviewed local bundle | Read/search | Not needed |
| Sprint 5 card snapshot | November 12 read-only audit | Read and prepare drafts | Blocked by default |
| Student-entered evidence/stand-up/ceremony drafts | Current page | Edit locally; no portal submit | Mock-only, non-private examples |
| Current private portal state | Signed-in portal | Unavailable in hosted MIRA | Prohibited pending separate review |
| Tickets and staff workflow | Existing Supabase browser client | Existing authorization unchanged | Not sent |

## Cloudflare preview foundation

- Deterministic Supabase-compatible packager: pass.
- Candidate public package: 33 files in the verified build, including a dedicated static 404 page.
- Repeated-build manifest identity: pass.
- Public allowlist/private-path/credential-pattern checks: pass.
- Security headers and exact recovery callback injection: pass using a synthetic test origin.
- Exact candidate real-browser smoke: pass for public/FARO search, embedded MIRA, floating MIRA, mock AI, Staff Queue signed-out recovery UI, recovery page, and 390px containment.
- Ocelot rollback: unchanged.
- Stable `dist/cloudflare/MIRA` release: intentionally not generated. The exact reviewed Cloudflare Pages origin is still required as `MIRA_PUBLIC_ORIGIN`.
- Cloudflare account: active and Pages-compatible; no existing projects.
- Proposed project: `mira-capstone`. Its `pages.dev` hostname did not resolve, but final availability is confirmed only when Cloudflare accepts project creation.
- Cloudflare project/deployment: not created or changed. GitHub authorization is the next owner-controlled action.

Proposed Supabase changes, not applied:

- Site URL: `https://<reviewed-project>.pages.dev/`
- Redirect: `https://<reviewed-project>.pages.dev/pages/recover.html`

## Secure AI gateway

The checked-in foundation is `browser -> same-origin /api/ai -> Cloudflare Pages Function -> mock provider`. A server-only OpenAI Responses API adapter is present but requires two explicit activation gates and an encrypted secret; checked-in defaults keep it disabled. It uses reviewed evidence only, preserves reviewed citations, sets `store: false`, rejects private portal payloads, and falls back to deterministic guidance.

GPT-6 model documentation is public, but access for the proposed classmate-owned credential, available credits, exact project rate limits, and spend controls were not verified because the credential was not used. A classmate's personal key is not approved for deployment; use a MIRA-owned project service account after owner authorization.

## Future submission investigation

The design is `Draft -> Human review -> Explicit approval -> Authorized submission -> Read-back confirmation`. Implementation requires a portal-owner-approved write API/contract with field authorization, CSRF/replay protection, idempotency, version conflicts, audit logs, and receipts. No DOM automation or copied portal session is proposed as a production write path.

## Verification record

| Check | Result |
| --- | --- |
| Full automated suite | 386 passed, 0 failed, 1 optional PHP integration skipped (387 total) |
| Branding/responsive browser smoke | Pass, including 200% zoom and 1440 through 320px |
| Mobile browser smoke | Pass at 440, 390, 375, 360, and 320px |
| Workspace browser flow | Pass |
| Cloudflare exact-candidate browser flow | Pass |
| `git diff --check` | Pass |

Workspace review screenshots:

- `dist/staging/team-workspace-review/workspace-desktop.png`
- `dist/staging/team-workspace-review/workspace-mobile-390.png`

General responsive review screenshots remain under `dist/staging/branding-ui/` and `dist/staging/mobile-ui-review/`. These are ignored local QA artifacts, not public release files.

## Owner decisions still required

1. Approve the audited Sprint 5 snapshot as the demo workspace seed or provide a newer reviewed snapshot.
2. Authorize Cloudflare's GitHub integration, select only `afeliz305/Capstone-AI`, and confirm `mira-capstone` is accepted before project creation.
3. Decide how the completed, uncommitted workspace changes will reach a controlled preview branch; remote `main` does not yet contain them.
4. Approve preview-only Supabase redirect entries only after the exact preview origin is live and verified.
5. Keep the first preview in mock mode unless owner-only mock evaluation is desired.
6. Replace the classmate-key plan with a MIRA-owned OpenAI project service account, then approve model, hard budget, retention/privacy, rate limits, and incident controls before any live request.
