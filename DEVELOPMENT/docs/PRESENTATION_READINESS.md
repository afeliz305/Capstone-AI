# MIRA presentation readiness register

Owner checkpoint: November 12, 2026 (America/New_York). Starting release: 89085fe49469a4032750c9353304785ae41da1cb, https://f87e5670.mira-9gg.pages.dev/.

## Current completion record

| Workstream | Status | Local evidence | Hosted / demonstration evidence |
|---|---|---|---|
| Public student journeys | Complete locally; publication verification pending | Both MIRA entry points, themes, Profile/Team, keyboard focus, 1440/768/390/320px and 200% CSS zoom | Baseline public walkthrough completed; corrected package must be checked after deployment |
| Knowledge routing | Complete locally | Ordinary Verify/Done, retrospective, attendance, team-change, Product Owner, stand-up and multipart wording now selects existing reviewed evidence | 14-question browser record; no new course facts or portal reads |
| Workspace and ceremonies | Complete | All seven actions, draft evidence, duplicate warning, Review and Retro prompts; mock/provider-failure fallback | Historical snapshot label and disabled hosted refresh preserved |
| Local fallback | Complete | Production mock handler reused with empty environment; privacy/oversize/protected-path checks pass | Prebuilt local preview on 3010; no paid calls possible through this wrapper |
| Staff authentication | Blocked: owner session unavailable | Auth/RLS/session/internal-note/concurrency regression suite passed; signed-out staff and recovery UI passed | Fresh login, ticket/attachment read and logout remain a manual acceptance step; no email sent |
| Security and spending | Preserved | No ledger, secret, binding or live-flag edits; financial/privacy regressions passed | Prior verified spent $0.003915, held $0, available $24.996085; halted/mock-only; no new paid call |
| Presentation and handoff | Complete | 12-slide portable HTML + PDF, visual review and geometry checks; six-minute demo, fallback, operator/student/team guides | Generated files under ignored dist/presentation; no private session data |
| Clean release candidate | Complete | npm ci: 0 reported vulnerabilities; package + Function compilation passed; 33 files / 5,169,116 bytes | Manifest SHA-256: 98853be3ba373d2aad9577b50f04944d8b2e0b7142ef030832a307e1af130b2a |

Full regression: **403 passed, 0 failed, 1 optional skip (404 total)**. The optional skip is not counted as a pass. Generated Cloudflare, workspace and branding browser suites passed. These include synthetic authenticated UI/SQL checks, not a new real hosted staff session.

## Reproducible evidence

- npm.cmd test: dist/staging/presentation-full-tests.log
- node scripts/smoke-presentation.js: dist/presentation/acceptance.json and screenshots (public/fictional only). MIRA_REVIEW_ORIGIN selects local or immutable hosted target.
- node scripts/verify-presentation-release.js: all 32 downloadable assets, headers, recovery no-store, protected paths and privacy checks; dist/presentation/hosted-integrity.json.
- node scripts/build-class-presentation.js: self-contained HTML, PDF and slide PNGs. Presentation authoring service unavailable; portable offline artifacts supplied instead.
- Clean build: dist/staging/presentation-clean/DEVELOPMENT; manifest exactly matched local candidate. Build checkout contains only tracked baseline plus the reviewed candidate source set.
- Final deployment SHA, immutable URL and verification outcome are recorded in dist/presentation/FINAL_RELEASE.json after publication. Do not infer deployment success from a Git push alone.

## Remaining issues

**Critical:** none reproduced in the completed public/local checks. Final hosted candidate verification is mandatory before marking the release ready.

**Major with workaround:** fresh authenticated staff acceptance needs the owner's accessible session. Demonstrate the public workflows and signed-out Staff Queue instead; no credentials are requested in chat. Prior CAP-1002 acceptance remains historical evidence, and this task neither changes nor deletes it.

**Minor / scope limits:** native classroom-browser 200% zoom and assistive-technology review remain presenter checks; automation uses CSS zoom/reflow. Historical snapshot is not live synchronization. Some inherited answer wording still says Ocelot although the same standalone limitation applies on Cloudflare. Optional PHP runtime was not deployed or newly verified. Team contribution attribution requires team confirmation.

## Safety boundary

No new paid AI calls, operator recovery, credentials, portal writes, Supabase changes, Ocelot upload or main merge. No private portal values, passwords, tokens or new student records are included. The prior Sol result is recorded acceptance, not an interactive live feature. Preserve unrelated docs/evidence, sibling MIRA output and sibling scripts. See CLASS_DEMO_GUIDE.md for the full classroom handoff.
