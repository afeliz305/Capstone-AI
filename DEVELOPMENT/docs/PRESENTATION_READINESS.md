# MIRA presentation readiness register

Owner checkpoint: November 12, 2026 (America/New_York). Starting release: 89085fe49469a4032750c9353304785ae41da1cb, https://f87e5670.mira-9gg.pages.dev/.

## Current completion record

| Workstream | Status | Local evidence | Hosted / demonstration evidence |
|---|---|---|---|
| Public student journeys | Complete — hosted verified | Both MIRA entry points, themes, Profile/Team, keyboard focus, 1440/768/390/320px and 200% CSS zoom | Corrected immutable deployment and public URL verified; both assistant entry points passed |
| Knowledge routing | Complete — hosted verified | Ordinary Verify/Done, retrospective, attendance, team-change, Product Owner, stand-up and multipart wording now selects existing reviewed evidence | 14-question browser record; no new course facts or portal reads |
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
- Implementation commit ed3936b466379c4eb2893027fd14dfd2f919c39d was deployed at https://61a06ef7.mira-9gg.pages.dev/. Wrangler associated source ed3936b with that deployment, and all 32 public asset hashes matched the clean candidate. Final documentation-release SHA, immutable URL and verification outcome are recorded in dist/presentation/FINAL_RELEASE.json after publication. Do not infer deployment success from a Git push alone.

## Remaining issues

**Critical:** none reproduced in the completed public/local checks. Hosted implementation acceptance passed on https://61a06ef7.mira-9gg.pages.dev/ and the public alias.

**Major with workaround:** fresh authenticated staff acceptance needs the owner's accessible session. Demonstrate the public workflows and signed-out Staff Queue instead; no credentials are requested in chat. Prior CAP-1002 acceptance remains historical evidence, and this task neither changes nor deletes it.

**Minor / scope limits:** native classroom-browser 200% zoom and assistive-technology review remain presenter checks; automation uses CSS zoom/reflow. Historical snapshot is not live synchronization. Some inherited answer wording still says Ocelot although the same standalone limitation applies on Cloudflare. Optional PHP runtime was not deployed or newly verified. Team contribution attribution requires team confirmation.

## Safety boundary

No new paid AI calls, operator recovery, credentials, portal writes, Supabase changes, Ocelot upload or main merge. No private portal values, passwords, tokens or new student records are included. The prior Sol result is recorded acceptance, not an interactive live feature. Preserve unrelated docs/evidence, sibling MIRA output and sibling scripts. See CLASS_DEMO_GUIDE.md for the full classroom handoff.

## Hosted acceptance completed

Both the immutable implementation deployment and https://mira-9gg.pages.dev/ passed 32/32 downloadable hashes (5,168,613 bytes), mock-only response, recovery no-store, security headers, eight protected-path 404s and private-context/invalid/oversized request rejection. Hosted browser acceptance passed all 14 questions, seven workspace actions, duplicate warning, both ceremony prompts, both assistant entry points, Profile/Team/themes, all four widths and isolated gateway-503 deterministic fallback. No page exceptions or failed network requests were recorded (the intentional synthetic 503 is not an application outage).

An additional 720x500 CSS-pixel viewport at device scale 2 passed full chat containment as a 200% reflow equivalent for a 1440x1000 display. Native classroom-browser zoom remains a manual display check; CSS zoom alone is not proof of that behavior.

Presentation status: **ready for the public/mock classroom demonstration**, with the fresh authenticated staff segment explicitly optional and blocked on owner-session access. No critical defect remains in the verified scope. The latest documentation-only follow-up does not change the 33-file candidate or its manifest.

## November 12-13 authenticated audit update

See [AUTHENTICATED_WEBSITE_AUDIT.md](AUTHENTICATED_WEBSITE_AUDIT.md) for the current native Chrome acceptance record. It supersedes earlier owner-session-blocked and native-zoom-pending statements: authorized queue access, fictional CAP-1002 read/download, requester-preview filtering and logout passed. A short-height chat layout defect was repaired, with minimum readable answer-area regression checks. Full suite: 403 passed, 0 failed, 1 optional skip. No ticket, account, Supabase, Ocelot or portal mutations. Public AI remains mock. Fresh password login, real hosted expiry and assistive-technology conformance are not claimed.
