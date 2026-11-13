> Current owner decision: students use [browser-only MIRA](BROWSER_ONLY_MIRA.md) directly on Cloudflare. No connector, extension, pairing or local helper is required. Public answers appear in chat; personal records remain in the official portal pending approved integration. Controlled Sol access is preserved; public paid AI and portal writes remain disabled. Earlier connector setup sections are internal development history only.

# MIRA proof-of-concept acceptance record

## Browser-only release — November 13, 2026

Owner decision supersedes the local connector as a student workflow. Production entry points contain no pairing, extension-install or local-helper requirement. Personal-information answers carry an official source link and relevant development note; grades require grade-specific institutional approval. Historical Workspace data remains labeled. Internal tooling and earlier evidence are retained separately.

Local validation: 435 passed, 0 failed, 1 optional PHP skip; focused student UX tests 45/45. Clean Cloudflare build: 33 files, 5,180,655 bytes, manifest SHA-256 `ccac1a0191fc8af3a281a394aecc4d0aa2eab7292d00674056e8af671b281c34`. Generated-package browser checks passed both composers, public/FARO answers, mock AI, signed-out staff/recovery rendering and 390px containment. Presentation HTML/PDF rebuilt with 12 rendered slides and overflow checks.

No new billable request, institutional portal read/write, Supabase mutation or Ocelot change was made. Current hosted commit/hash/browser evidence is recorded after deployment in ignored `dist/presentation/BROWSER_ONLY_RELEASE.json`. Signed-out UI checks do not establish a fresh authenticated staff-session test. Previous authenticated acceptance below remains historical evidence, not a newly performed login.

Acceptance completed September 28, 2026. This record covers the approved pre-integration proof of concept and the clearly fictional shared-queue record **CAP-1002**. It does not authorize or claim professor-portal modification, automatic private-dashboard access, production deployment, or use of real student information.

## 1. Public MIRA / Ocelot acceptance

| Check | Result |
| --- | --- |
| Hosted public build | **Pass** — the Ocelot build was reachable and its public behavior was verified. |
| Approved release integrity | **Pass** — all **24 of 24** deployed files matched the approved release checksums. |
| Public/course answers and cited sources | **Pass** |
| Sprint minutes | **Pass** |
| Brand & templates | **Pass** |
| Grade navigation | **Pass** |
| Team navigation | **Pass** |
| Standing navigation | **Pass** |
| Messages navigation | **Pass** |
| User-shared temporary information | **Pass** |
| Five-minute shared-information expiry | **Pass** |
| Mobile layout at 390 px | **Pass** |
| Explicit SVG favicon | **Pass** |
| Sensitive development/backend paths | **Pass** — tested paths returned HTTP 404. |

Public and course answers remained source-grounded. Portal destinations were treated as navigation only. The hosted proof of concept does **not** claim automatic access to a signed-in student's private messages, grades, team, standing, tasks, deadlines, or other dashboard values.

## 2. Authenticated support-workflow acceptance

- **Test record:** CAP-1002
- **Data classification:** clearly fictional acceptance-test data
- **Category:** Attendance
- **Final assignment:** Anthony Feliz
- **Final status:** In review

| Check | Result |
| --- | --- |
| Ticket creation | **Pass** |
| Refresh deduplication and staff read-back | **Pass** — CAP-1002 appeared once after refresh. |
| Assignment to Anthony Feliz | **Pass** |
| Status set to In review | **Pass** |
| Requester-visible comment persistence | **Pass** |
| Internal staff-note persistence | **Pass** |
| Internal note excluded from requester preview | **Pass** |
| Attachment integrity and authorized download | **Pass** |
| Two-session stale-edit protection | **Pass** |
| Invalid-login, password visibility, Remember me, logout, and session controls | **Pass as applicable to the approved test flow** |

The requester preview displayed the saved fictional public comment and did not display the internal work note. A refresh and reopen preserved the assignment, status, public comment, internal note, and attachment metadata for authorized staff.

### Stale-edit result

Two separately loaded authenticated staff tabs opened the same current version of CAP-1002. Session A saved a newer, clearly fictional requester-visible comment. Session B then attempted to save a different fictional internal note from its outdated version.

The application returned this explicit protection message:

> Ticket changed. Reload it; your draft has not been applied. Your draft is still here.

- Session B's stale note was rejected and did not enter the saved activity history.
- Session A's newer comment remained intact after a fresh reload.
- No silent overwrite occurred.
- CAP-1002 remained assigned to Anthony Feliz with status **In review**.

## 3. Attachment verification

- The existing TXT attachment remained unchanged throughout the staff and concurrency tests.
- An authorized staff browser downloaded it successfully.
- The downloaded file's SHA-256 matched the uploaded file's SHA-256 exactly.
- The browser-automation download listener did not observe the download before its timeout, although Chrome completed it and the file was verified on disk. This was a test-tool observation issue, **not** a reproduced application defect.
- No replacement attachment was uploaded during the concurrency test.

No password, access token, private session value, privileged Supabase credential, private portal value, or unrelated ticket content is included in this record.

## 4. Final capability matrix

| Ready for demonstration | Future integration — intentionally outside this proof of concept |
| --- | --- |
| Public/course MIRA | Automatic hosted access to the signed-in student's private dashboard |
| Grounded source retrieval | Portal-native MIRA integration |
| Verified portal navigation | Login-return preservation through the professor's portal |
| User-shared temporary information |  |
| Staff sign-in |  |
| Ticket creation and persistence |  |
| Staff workflow |  |
| Attachment handling |  |
| Requester-visible/internal comment separation |  |
| Concurrent-edit protection |  |

The future-integration column is a proposed next phase only. None of those capabilities is required for, installed by, or implied by the current pre-integration demonstration.

## 5. Known limitations

- Hosted Ocelot cannot automatically read the student's private portal information without future portal integration.
- A fresh email-code login may return the student to portal Overview instead of preserving the originally requested portal section.
- The local live connector remains demonstration/development tooling and is not part of the hosted Ocelot connection.
- CAP-1002 is fictional test data and remains in the shared test system unless cleanup is separately approved.

## 6. Demo-readiness statement

> The pre-integration proof of concept has completed public, navigation, temporary-information, authentication, ticket, attachment, privacy, and concurrency acceptance testing. No professor-portal modification was required. Automatic personal-dashboard access remains the proposed integration phase if the concept is approved.

## 7. Final safety check

- **Credentials and private values:** Confirmed absent from this documentation. No password, token, session value, Supabase secret, or private portal value was added.
- **Application code:** No application code was changed while creating this acceptance record.
- **Deployment and database:** No deployment, Supabase configuration change, schema change, or database mutation occurred while documenting these results.
- **Acceptance record:** CAP-1002 was not altered or deleted while documenting. It remains clearly labeled fictional test data in the shared test system.

This acceptance record documents completed observations only. It does not expand the proof-of-concept boundary or grant authority for production integration.
