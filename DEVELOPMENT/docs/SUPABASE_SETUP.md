# Supabase shared queue: one-time setup and testing

September 25 indexed website search: Supabase builds now embed the [public website index](WEBSITE_INDEX.md) when present. Run the owner-only `index:site`/`index:refresh` maintenance command before rebuilding the isolated preview or a requested release. Searches use the snapshot without querying the site, Auth, or ticket database; no migration or new Supabase permission/key is needed. Private FIU messages and grades are still not connected. The stable upload and Ocelot remain unchanged by this local implementation.

September 25 local feature update: the isolated preview includes [Messages/dashboard portal shortcuts](PORTAL_NAVIGATION.md). They search reviewed navigation only and do not call Supabase Auth or ticket APIs to read FIU records. No migration, staff binding, credential or hosted setting needs changing. Supabase login is not portal login. The stable upload folder and hosted website remain unchanged by this feature.

## Current uploaded state

September 24: the owner uploaded the Supabase release to Ocelot. All 21 public files match the prepared manifest and return HTTP 200. Chrome verified the Supabase banner, contextual syllabus chat and the View syllabus reference. The **Ocelot-origin ticket save, staff read-back and attachment download are still pending**, distinct from the local-preview live verification below. No remote data or settings changed during the hosted read-only check. See [the upload verification and next tests](OCELOT_SUPABASE_UPLOAD.md). No GitHub push occurred.

## Current upload preparation

The following records the completed preparation before the owner's upload; the uploaded-state section above is the current deployment status.

September 24: the prepared inner **Capstone - AI** folder now selects Supabase for fictional-data group testing; the previous website is archived. The 21-file candidate passed manifest, public-file allowlist and encoded-subfolder HTTP checks; private/backend paths returned 404. Hosted readiness returned health 200 and protected ticket metadata 401. The prior requester save/fresh-client receipt test remains verified. The owner showed Anthony signed in with CAP-1001 in Chrome and VS Code; direct Chrome checks then verified the ticket, matching 63-byte attachment download, successful staff edit, filtered requester preview and persistence after reload. CAP-1001 was assigned to Anthony, set In review, and received one labeled test work note/comment; no other record, account, permission or credential was changed. Multi-staff access, simultaneous stale edits, seven-day elapsed-session behavior, backup/restore and the eventual Ocelot-hosted save remain manual checks, not claimed successes. Use the [Supabase FileZilla checklist](OCELOT_SUPABASE_UPLOAD.md). No Ocelot upload or GitHub push has occurred. Earlier pending-login/unchanged-upload notes below are historical.

## Remember me for 7 days

September 24 follow-up: the owner confirmed that staff sign-in works in Chrome at `http://127.0.0.1:3004/Capstone%20-%20AI/pages/staff.html`. The Supabase login now has an optional **Remember me for 7 days** checkbox, unchecked by default. If already signed in, sign out and sign in again with it checked to opt in; existing sessions are not silently promoted.

- Checked: only after Auth **and active staff-roster verification**, session tokens are stored in browser `localStorage` with an absolute seven-day deadline. Passwords are never stored. Refreshes and current-password re-verification do not extend that deadline.
- Unchecked: tokens remain in tab `sessionStorage` (page memory if unavailable). Browsers may restore tab storage when reopening tabs; use **Sign out** on shared computers.
- Sign out clears the remembered session. Other tabs using that same remembered session stop using it too. Expiry clears it when the timer runs or it is next read, including after sleep/reopening. Revocation or cleared browser data can require earlier sign-in. Failed hosted sign-out still clears the local session and warns that remote revocation was not confirmed.
- Use only on personal computers: JavaScript-readable tokens are sensitive. If persistent storage is blocked, uncheck Remember me and retry. The separate remembered-email preference survives sign-out but never grants access.
- Storage is scoped by browser origin, Supabase project and app folder. `127.0.0.1`, `localhost`, different ports, and Ocelot need separate logins. No database migration or Ocelot server process is required.

This is a **browser-enforced convenience timeout**, not a server-enforced security policy: device-clock/storage tampering and copied tokens are outside this control. Production needs approved server-side session lifetime/revocation controls. Hosted Auth settings, RLS, staff bindings and passwords were not changed. [Supabase session controls](https://supabase.com/docs/guides/auth/sessions).

Verification: **203 tests passed, none failed/skipped**, including optional PHP tests. New tests cover reopen, exact seven-day expiry with an injected clock, refresh without extension, multi-tab logout/account replacement, malformed/blocked storage, unauthorized-login cleanup, UI opt-in and private-queue cleanup. SDK tests use mocked networking. The rebuilt preview's unchecked control, mouse/keyboard interaction and layout were checked in Chrome. Real remembered-login/reopen remains user acceptance: refresh, sign in with the box checked, then close/reopen the exact URL without signing out. This does not complete remaining queue edit/download release checks or deploy to Ocelot/GitHub.

Updated September 24, 2026. **Hosted requester persistence is verified: fictional ticket CAP-1001 and its TXT attachment were saved and finalized in Supabase. Anthony Feliz's staff account is now provisioned; end-to-end staff acceptance is still required.** No GitHub push or Ocelot deployment is implied by this test.

Selected project: **Capstone - AI**, `https://uoccyfcsalnancmdhnur.supabase.co`. The owner explicitly selected this project on September 24, replacing the older `mkpkjmqjbfhkazxgpggg` connection. Its dashboard publishable key is saved only in the ignored local configuration. Changing this setting does not move or delete records in either project, or update already-built/uploaded websites.

Initial September 24 inspection found an empty project with anonymous sign-in disabled. With the owner's approval, migration 001 was applied successfully and anonymous requester sign-in enabled; email confirmation remains enabled. The one-ticket live test then saved CAP-1001 and read its receipt with a fresh client. Dashboard verification confirmed `ready = true`, `fictional-persistence-test.txt`, matching expected/stored size of 63 bytes, and `bucket_public = false`. The test record and file are retained. No existing records were migrated or deleted.

**Staff provisioning update:** the owner created `afeli016@fiu.edu` and entered their password directly in Supabase. With explicit approval, the migration 002 binding operation was scoped to this account only. Dashboard verification returned `name: Anthony Feliz`, `bound: true`, `email_confirmed: true`, and `anonymous: false`. No other roster member was provisioned by this operation, and no password was read or stored by the assistant.

**Next owner action:** sign in to the [Supabase-connected staff preview](http://127.0.0.1:3004/Capstone%20-%20AI/pages/staff.html) using that account and the new project password, then complete the ticket edit/download and second-browser checks below. Supabase dashboard sign-in is separate from app staff sign-in. Migration 001 is already installed on this project: **do not run it again** or rewrite it to change the live schema.

September 24 label/account follow-up: the owner reported successful app sign-in. The Supabase build's field label now says **Password**, not **Supabase password**; this is a wording-only change, not a password reset or a shared default password. The rebuilt local preview was checked in Chrome and **174 automated tests passed, with zero failures/skips**, including PHP compatibility. Hosted staff edit/download and second-browser checks are still separate acceptance items. The stable upload folder and Ocelot have not been changed.

September 24 roster update: Raul Alvarenga (`ralva037@fiu.edu`) was removed from active staff at the owner's request. [Migration 003](../server/supabase/003_retire_raul.sql) is applied in the selected project: `active = false`, five active roster entries. No Raul Auth account existed to delete. Existing tickets and attachment metadata have identical before/after checksums. Historical authors/assignments and any stored credential records are retained; they do not grant access. New assignments to inactive staff are rejected, including from stale pages. Refresh the queue to reload the roster.

Removal verification: **176 automated tests passed, zero failures/skips**, including PostgreSQL access revocation, stale-session denial, inactive-assignment rejection, preserved ticket/file history, reassignment, and the PHP integration suite. The isolated Supabase preview was rebuilt; existing local runtime data and the stable upload folder were left unchanged. No Ocelot upload or GitHub push was performed.

Latest September 24 release-preparation check: all five active staff now have confirmed, non-anonymous Auth accounts. Anthony is bound and active. The other four staff bindings below still await explicit approval; the app's sign-in issue and live staff acceptance remain unresolved. No additional access was granted by this read-only check. Ticket and attachment counts/checksums still match the post-offboarding baseline (one ticket, one attachment).

| Staff member | Account email | Auth account status |
| --- | --- | --- |
| Zavier Richardson | `zrich010@fiu.edu` | Created by owner; staff binding pending |
| Christopher Hernandez | `chern563@fiu.edu` | Created by owner; staff binding pending |
| Michael Alvarez | `malva517@fiu.edu` | Created by owner; staff binding pending |
| Romelin Charnel | `rchar044@fiu.edu` | Created by owner; staff binding pending |

For each missing Auth account, use **Authentication > Users > Add user > Create new user**. The owner must enter and submit a separate project password directly in Supabase, with **Auto confirm user** checked for the intended known teammate. Do not send passwords in chat or commit them. Account creation does not itself grant queue access: after explicit approval, bind the confirmed accounts using migration 002, then verify the results. No invitation emails were sent. Do not create or reactivate an account for the departed member.

## Change your staff password

Password visibility: each sign-in/change-password field has its own **Show / Hide** button. It reveals only the value currently typed into that field; it cannot retrieve any saved account password. Fields start masked and return to masked on submission, cancellation, sign-out or page departure. Visibility is not saved as a preference, and showing a password does not submit the form. Be mindful of anyone viewing your screen.

Visibility verification, September 24: **189 automated tests passed, zero failures/skips**, including independent toggles, unchanged entered values, no requests/storage changes, cancellation/submission resets and hidden email-demo controls. The Supabase candidate was rebuilt and its port-3004 server restarted. Chrome confirmed the sign-in control changes `password → text → password` using both mouse and keyboard, with the empty field; no account credential was entered, read or changed. The signed-in dialog remains covered by automated handlers, not a live credential-change test. Stable upload/GitHub/Ocelot were not updated.

September 24: signed-in staff in **Supabase mode** now have a **Change password** button in the top navigation. Open it, enter your current password, enter and confirm a new project-only password (8–128 characters), then choose **Update password**. Wait for **Password updated**, then choose **Done**. Supabase can enforce stronger password requirements. Never reuse your FIU password or share a team-wide password.

The app verifies your current password with a fresh Supabase sign-in, checks that the same account is still active/provisioned, and updates only that account through [`auth.updateUser`](https://supabase.com/docs/reference/javascript/auth-updateuser). It also supplies `current_password`, as supported by the pinned SDK. No admin/service-role key, target-account selector, database migration, or dashboard security-setting change is needed. This is not a forgot-password recovery flow; if you cannot sign in, contact the project owner.

Password fields are cleared after an attempted submission, on cancellation and on loss of access. Passwords are not written to app storage, ticket history, logs or Git; existing session-token handling is unchanged. Duplicate submissions and sign-out are blocked while a change is pending. If the connection fails after submission, do not assume the password stayed unchanged: try signing in with the new password before retrying. Provider errors are mapped to safe messages, never echoed verbatim. No actual account password was changed during implementation/testing.

The button is hidden in Node/PHP/browser-demo builds; their existing authentication behavior is unchanged. Rebuild the isolated candidate with `npm.cmd run demo:supabase` (stop the previous port-3004 preview first), then refresh. The stable upload folder and Ocelot are unchanged until an explicitly prepared Supabase release is uploaded.

Owner acceptance: on your own account, enter and submit the credentials yourself, confirm success, sign out, then sign back in with the new password. Do not send passwords in chat. Automated test doubles do not prove a hosted password change.

Verification, September 24: **186 automated tests passed, none failed/skipped**, including the PHP suite, password dialog event handlers, wrong/mismatched/weak passwords, access loss, duplicate-request protection and the pinned Supabase SDK's actual request serialization over a mocked network. The port-3004 candidate was rebuilt and its signed-out page checked in Chrome. Live signed-in dialog/credential-change acceptance is still pending; no hosted credentials, tickets, attachments or Auth settings were changed. The stable upload folder, Ocelot and GitHub remain untouched by this password-option update.

## 1. One-time database setup (project owner)

1. Open this project's [Supabase dashboard](https://supabase.com/dashboard/project/uoccyfcsalnancmdhnur) and choose **SQL Editor > New query**.
2. Open [001_capstone.sql](../server/supabase/001_capstone.sql), copy the entire script, review it, and run it once. It creates the ticket schema, private attachment bucket, staff roster, row-level access rules, and validated database functions. It never imports or deletes existing tickets. If it reports that Capstone objects already exist, **stop and inspect them**; do not delete anything or disable RLS to make it run.
   Then apply [003_retire_raul.sql](../server/supabase/003_retire_raul.sql) before using a newly initialized project. It adds active-roster enforcement and disables Raul while preserving history. Both 001 and 003 are already applied on the selected project. Keep the original migration 001 unchanged; it is historical, not the current active roster.
3. In **Authentication > Sign In / Providers**, enable **Anonymous Sign-Ins** for this fictional-data test project. This lets a requester submit without typing a password. It does NOT give anonymous users staff access or permission to read the queue. Anonymous Auth sessions are created only on submission, not when reading chat answers. Keep email confirmation enabled for ordinary email accounts. Before wider testing, configure CAPTCHA and review Supabase rate limits; test-only database quotas are not a substitute for bot protection. [Supabase anonymous sign-in guidance](https://supabase.com/docs/guides/auth/auth-anonymous).
4. In **Authentication > Users**, create the intended staff accounts with the exact roster emails and separate test-project passwords. Provision/confirm accounts only for known teammates; do not reuse FIU passwords or the old shared `password` value. Do not send passwords to the assistant or commit them. Account invitations/confirmation messages are an owner action, not something this app sends automatically.
5. After explicit approval, run [002_bind_staff.sql](../server/supabase/002_bind_staff.sql) in the SQL Editor for confirmed, non-anonymous roster accounts. Review both `user_id` and `active` in `capstone_private.staff_members`: only the five active entries are eligible. Migration 002 does not reactivate a disabled member; a bound ID alone does not grant access. Unknown/unbound/unconfirmed/inactive accounts are rejected even if they can sign into Supabase Auth. This binding step is separate from creating a user.

The publishable key cannot perform this administrative setup. Use your signed-in dashboard; no secret/service-role key or database password is needed in the website. [Tables and SQL Editor](https://supabase.com/docs/guides/database/tables), [API key guidance](https://supabase.com/docs/guides/api/api-keys).

## 2. Local configuration and safe readiness check

Use Node 22+ (verified locally with Node 24). From `DEVELOPMENT`, install the pinned dependencies, then check readiness:

```powershell
npm.cmd install
npm.cmd run supabase:check
```

The owner's local configuration is already saved in Git-ignored `server/supabase.local.json`. For another checkout, copy `server/supabase.example.json` to that filename and enter the project URL and **publishable** key. Only these two public values are accepted by the build. The helper performs GET requests only: it does not log the key, read ticket rows, create users, send emails, or write data. Exit code 1 means the configuration/connection failed; code 2 means schema/anonymous-sign-in setup is incomplete; code 0 means ready to attempt a live test, **not** that ticket saving, file storage or staff provisioning has been verified.

The checker now probes `capstone_health` independently of direct ticket-table access. A configured project intentionally denies unauthenticated ticket reads, so the table metadata request may return 401/403 while health succeeds. Do not grant public ticket access or disable RLS to make that request return 200. The approved health RPC plus anonymous requester sign-in determine readiness for the one-ticket test; neither verifies staff provisioning or a successful save.

September 24 connection-fix verification: **173 local tests passed, zero failures/skips**, including the PHP compatibility suite and two new readiness regression cases. After approved hosted setup, `supabase:check` returned `schemaReady: true`, `anonymousSignInEnabled: true`, `readyForLiveTest: true`, health HTTP 200 and protected ticket metadata HTTP 401. The subsequent explicit `supabase:test -- --create-test` passed for CAP-1001. The GET-only checker itself did not create or change anything.

The Supabase build embeds the public project URL and publishable key in its browser bundle, as intended by Supabase. It never embeds a secret key, password, local runtime tickets, or the local configuration file itself. Do not upload `DEVELOPMENT`. Staff/requester Auth tokens use separate tab-session storage; passwords are never saved. Only the last successfully verified staff email is remembered as a preference. Supabase enforces access on every database and file request, not via the UI's email field.

## 3. Test before upload

For an explicit one-ticket automated cloud check after readiness passes, run `npm.cmd run supabase:test -- --create-test`. It creates one fictional requester account/session, ticket and harmless TXT attachment, then reads the saved receipt using a fresh client. It prints the ticket ID, never tokens/passwords, and retains the test data for staff inspection. It does not prove staff login or backup/restore. Without the flag, or while readiness fails, it creates nothing. Check the queue before repeating an uncertain test.

Run `npm.cmd run demo:supabase`. It builds an isolated public candidate and starts [the Supabase preview](http://127.0.0.1:3004/Capstone%20-%20AI/) on port 3004. Keep that terminal open. Stop it with Ctrl+C before rebuilding; it never kills another process. The existing upload folder, Node data, and browser-only preview on port 3003 are left unchanged.

1. Ask a chat question. Reviewed keyword search must still work without AI tokens.
2. Submit a fictional ticket titled `TEST Supabase persistence` with a small harmless TXT attachment. Do not use real student information. Submission reserves a draft, uploads documents privately, and confirms only after finalization. An unfinished upload is not a successful ticket.
3. Record the returned `CAP-...` ID. In the dashboard, open `public.capstone_tickets`; find that ID and confirm `ready = true`. The structured ticket is in the `record` JSON field. The attachment metadata is in `capstone_attachments`; actual bytes are in the private `capstone-attachments` bucket.
4. Open [staff sign-in](http://127.0.0.1:3004/Capstone%20-%20AI/pages/staff.html), sign in with a provisioned account, and find the same ID. Refresh, sign out/in, and verify from a second authorized browser. A different device still sees the same shared tickets after staff authentication.
5. Download the TXT attachment and compare its content. Claim/assign the ticket, change status, add an internal note and an additional comment. Requester preview must show only the additional comment. Guests must not be able to list records or download finalized attachments. An unbound Auth account must not access the queue.
6. Open the same ticket in two staff sessions. The second stale save must fail with a conflict and preserve its draft. Retrying an uncertain save with an unchanged draft in the same page must not duplicate notes/submissions. If you reload after an uncertain submission, check the queue before trying again.

The requester form's `privateToInstructor` checkbox is a recorded privacy request, not an instructor-only access rule. The interface already explains that authorized support staff can see tickets. Do not treat it as permission to submit confidential data.

## 4. Prepare the upload only after acceptance

```powershell
npm.cmd run package:ocelot:supabase
```

This explicit command creates the clean inner `Capstone - AI` upload folder with `index.html`, CSS/assets, JS including the Supabase bundle, and staff HTML. It archives the previous generated release. It includes no PHP, SQL migration, docs, private settings file, credentials, or runtime tickets. The default `package:ocelot` and `npm.cmd run demo` still select browser-only mode; do not run those to prepare the Supabase release.

Follow [the Ocelot upload guide](OCELOT_UPLOAD_GUIDE.md) for a clean replacement of the public release. Do not merge into an old full-project upload or change private-storage permissions. Supabase mode needs no Ocelot PHP write permissions. Check that the hosted banner says **Supabase shared test queue**, then repeat the save/read-back test. Ocelot and local Supabase builds using this same project share online data; old browser/Node/PHP tickets are not automatically migrated.

## 5. Verification, limits and backups

September 18 local verification: **171 automated tests passed, 0 failed, 0 skipped**, with Node 24.15.0 and PHP 8.4.25 configured for the legacy PHP checks. `npm.cmd run test:supabase:ui` passed in a fresh headless Edge browser: packaged SDK startup, Roary image, reviewed chat search, staff password UI, failed-cloud-save draft retention and mobile width. That UI check blocks all external requests and cannot create cloud records. Desktop/mobile screenshots were inspected. Live readiness still reported missing schema and disabled anonymous sign-in; no hosted save is claimed.

- The SQL and application adapter are tested against isolated PostgreSQL (PGlite), including role policies, record creation/read-back, staff provisioning, exact attachment metadata, ownership, finalization, idempotency and edit conflicts. The Auth provider and Storage HTTP service still require hosted tests. Unit success does not establish cloud readiness.
- September 24 supersedes the initial failed readiness checks: one live requester ticket and attachment are confirmed saved in the selected project. Staff authentication, cross-browser queue access, downloaded file contents, edit conflicts, and backup/restore remain unverified live. The last checked Ocelot release was the failing PHP version; no hosted website was changed by this setup, and the stable local upload folder remains browser-only pending acceptance.
- Test quotas: 1,000 reserved/finalized tickets, 10 submissions per requester per hour, three documents per ticket, 5 MB per document, 10 MB per ticket and 100 MB total reserved files. Drafts count toward limits to bound storage use. Anonymous sessions can be recreated, so use CAPTCHA/provider limits before expanding testing.
- Partial uploads remain private drafts for owner review; no automatic delete or cleanup is performed. Do not remove only Storage metadata through SQL. Export required data first and use supported Storage deletion tools if the owner later authorizes cleanup.
- File format checks are not malware scanning. Only staff can download finalized files, which are handled as downloads rather than rendered previews. Do not upload untrusted or real student documents.
- Shared persistence is **not a backup**. Export the database privately and back up Storage objects separately; Supabase database backups do not include the file bytes. Do not put these exports in public GitHub or Ocelot. [Supabase backup limitations](https://supabase.com/docs/guides/platform/backups).

No existing tickets are migrated, deleted or published by this integration. FIU SSO, professor email, recovery/migration tooling, institutional approval and production security review remain separate work.
