# Grade-specific portal integration approval request

Status: approval required. No grade adapter has been activated or grade values retrieved.

The reviewed portal navigation exposes the student's Grade section at `/portal#mygrade` (legacy classic menu: `/portal?classic=1#mygrade`). This identifies the official visible destination, not an authorized API or an approved extraction contract. The current connector intentionally excludes grade values. No evidence of institutional integration approval has been supplied.

## Request for the portal owner

Please confirm whether MIRA may read and display the authenticated student's own published course grade, and approve:

- The authoritative endpoint or portal-native adapter, supported fields, grading period and published/provisional distinction.
- Server-side authorization from the current portal session; no student ID supplied by MIRA may select another account.
- Whether local extension access, portal-native rendering, or a hosted institutional API is permitted, and its allowed origins and scopes.
- Expiry, revocation, account-switch handling, retention and audit requirements.
- Exact student consent/disclosure and any required university privacy review.

## Proposed narrow contract

The portal supplies `readOwnPublishedGrade()` only after its own authentication and authorization. Return a published value with scale, course/term, publication state, source URL and observation timestamp, or an explicit unavailable/not-published/unauthorized result. Do not return classmates, rankings, staff notes, unrelated courses, credentials or message content. A missing value is unknown, never zero.

Render locally and deterministically in the student's current MIRA session. Keep values in memory only, expire within five minutes, and clear them on logout, revocation, account change or verification failure. Exclude them from public indexing, Supabase/tickets, files, analytics and all OpenAI requests. Hosted synchronization requires an approved institutional connection; the local helper does not authorize or implement it.

## Acceptance before activation

Use synthetic fixtures for cross-account denial, expiry, account changes, malformed data and unauthorized states. With owner approval and the student's attended session, verify the displayed value against the official source without retaining screenshots or values in reports. Record pass/fail and timestamp only. Keep portal writes disabled.
