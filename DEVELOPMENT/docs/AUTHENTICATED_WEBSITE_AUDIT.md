# Authenticated website audit — November 12–13, 2026

Baseline: e5b2be358915337e250e2d896596cf84bff2c1e9, https://3e2a8134.mira-9gg.pages.dev/. Native Chrome was used for the existing owner-authorized session. Browser-tab automation was unavailable; native accessibility controls provided access without another login. No credentials, cookies, private account values or unrelated ticket contents are recorded here.

| Feature | Test performed | Result | Issue | Fix | Retest |
|---|---|---|---|---|---|
| Staff authorization | Existing session loaded queue; refresh retained access | PASS | None reproduced | None | Queue loaded eight records |
| Staff views/search | Live search for fictional CAP-1002; all/my/resolved/empty views | PASS | None | None | Counts and empty states consistent |
| Ticket details | Read-only CAP-1002 inspection | PASS | None | None | Attendance, In review, existing assignment and historical comments persisted |
| Attachment | Existing fictional TXT downloaded in Chrome | PASS | None | None | 140 bytes; download completed |
| Note privacy | Compare staff activity with staff-only requester preview | PASS | None | None | Public comments visible; internal note absent from preview |
| Staff Profile/Settings | Open menus; locate Change password and Sign out | PASS | None | None | Controls in expected locations; password not changed |
| Logout | Profile → Sign out, then refresh | PASS | None | None | Queue/private staff UI cleared; sign-in returned |
| Session expiry | Automated expiry, remembered-session and authorization-loss regressions | PASS (simulated) | Real expiry not forced | None | Do not equate simulated expiry with a newly expired hosted session |
| Course/FARO retrieval | Fourteen browser questions including criteria, evidence, Verify/Done, stand-ups, review/retro, attendance, exceptions and follow-ups | PASS | None reproduced | None | Sources and personal-data boundaries retained |
| Embedded/floating MIRA | Ask from each entry point | PASS | None | None | Same grounded retrieval; no backend-unavailable warning |
| Workspace | Select historical card; exercise all seven assistance actions and evidence assessment | PASS | None | None | Mock recommendations, unconfirmed completion/approval and historical labels visible |
| Stand-up/ceremonies | Prepare draft, duplicate warning, Review and Retro prompts | PASS | None | None | No portal writes; preparation remains local |
| Profile/Team/themes | Public menus, theme persistence and Escape focus restoration | PASS | None | None | Isolated browser regression and native menu inspection |
| Responsive chat | Native Chrome 200% zoom and short viewport checks | FAIL → fixed | Toolbar consumed almost the entire answer area | Short-height viewport layout; bounded context/tool overlays; landscape toolbar arrangement | Native 200% local retest readable; 563×455: 186px, 320×450: 184px, 740×360: 124px answer area |
| Recovery | Signed-out rendering; HTTP cache check | PASS | None | None | No-store; no email or password reset performed |
| Security | Protected paths, private-context rejection, oversized/invalid requests, mock provider | PASS within tested scope | None reproduced | None | Eight protected paths return 404; private/invalid/oversize return 403/400/413 |
| Presentation sequence | Dashboard → sourced answer → historical card → guidance → draft/ceremonies → personal boundary → staff inspection/logout | PASS functionally | Zoom defect above | Layout repair | Each step exercised; timing is a suggested six-minute script, not a measured uninterrupted rehearsal |

## Evidence and limits

- Full suite: 403 passed, 0 failed, 1 optional PHP skip (404 total). Log: ignored `dist/authenticated-audit-tests.txt`.
- Public generated-package browser acceptance: fourteen questions, seven actions, deterministic provider-error fallback, four widths, three short viewports, themes, focus, signed-out staff/recovery. No page exceptions or failed requests. Evidence: ignored `dist/presentation/acceptance.json` and public screenshots. Its staff field refers only to that isolated unauthenticated runner; native authenticated findings are recorded above.
- Downloaded fictional CAP-1002 TXT SHA-256: `9a75cded1915fb95d002fdf32dddf4a382fdecac91461dda8b9114e99dc228bd1`. This run confirms download bytes, not a new comparison against the original upload. Attachment and ticket were not modified or deleted.
- The owner supplied an already-valid session. Fresh password authentication, a real expired hosted session, and a new recovery email were not exercised. No password or token was collected.
- Requester preview is a filtered staff feature, not an authenticated requester portal. No broader privacy guarantee is inferred from that preview alone; automated Auth/RLS/internal-note tests passed.
- Keyboard focus, responsive geometry and native zoom were checked; this is not a WCAG conformance certification or a screen-reader audit. External portal navigation remains a shortcut, not current private-data synchronization.
- Financial kill-switch configuration was not changed or recovered. Last independently verified ledger remains $0.003915 spent, $0 reserved, $24.996085 available, halted. Current public requests remain mock with budgetReady=false; no paid call was made during this audit.

## Release and safety

Only the chat stylesheet, browser regression and relevant audit/presentation guides are changed. No AI, authentication, database, portal or ticket implementation changes. Main, Supabase, Ocelot, FARO and portal records remain unchanged. Portal submissions and public paid AI remain disabled. Unrelated local evidence, generated packages and scripts remain outside the commit.

After publication, exact commit, immutable deployment, manifest identity and hosted retest evidence are recorded in ignored `dist/presentation/AUTHENTICATED_RELEASE.json`. A Git push alone is not deployment verification.

Class readiness: ready for the deterministic/mock demonstration once the repair's hosted hash and browser checks pass. Staff presentation requires the presenter to sign in personally again after this audit's successful logout.


## Final authenticated classroom gate ? November 13, 2026

Release: `6160dee0841889a0f88b09e2c6968db5dbe2413a`, https://mira-9gg.pages.dev/. **PASS: the previously outstanding authenticated Staff Queue gate is closed for the approved restricted classroom demonstration.** This does not expand the four-prompt live-AI scope or authorize public paid AI.

- Existing authorized Chrome session loaded the queue; browser refresh retained access and the eight-record count. Only clearly fictional CAP-1002 was opened for detail inspection.
- CAP-1002 retained Attendance, In review, Anthony Feliz assignment, two requester-visible comments and the internal staff note. No Save control was used.
- The staff-only requester preview displayed both public comments and omitted the internal note. It is a filtered staff preview, not an independently authenticated requester portal or a delivered message.
- Existing TXT attachment downloaded successfully: 140 bytes; SHA-256 `9a75cded1915fb95d002fdf32ddf4a382fdecac91461dda8b9114e99dc228bd1`, matching the previous local acceptance download. No attachment changed.
- Anonymous requests to staff session, ticket list, CAP-1002 detail, requester preview, ticket table and attachment metadata table all returned HTTP 401. No private response bodies were retained.
- Profile showed the verified staff identity; Settings contained Change password. Profile ? Sign out cleared the private queue and profile; refresh remained signed out. Remember me remained unchecked and the password field was empty.
- Current hosted integrity recheck: 32/32 downloadable assets matched the approved manifest; recovery no-store, protected-path 404, mock provider and private-context rejection passed.
- No new defect reproduced. No application code, deployment, ticket, user, password, recovery email, database configuration or portal record changed. No paid OpenAI calls were made. Only the authorized session was signed out and the harmless attachment was downloaded.

The prior write/persistence/concurrency and live-AI acceptance evidence remains historical; this focused check did not repeat writes, force session expiry, inspect tokens or prove immediate revocation of a previously issued JWT. Presenter must sign in personally again before the staff demonstration. Live AI remains disabled by default and portal submissions remain disabled.
