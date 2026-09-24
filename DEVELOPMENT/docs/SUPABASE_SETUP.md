# Supabase shared queue: one-time setup and testing

Updated September 18, 2026. **The Supabase application code and database scripts are implemented locally. Hosted setup and live acceptance are still required.** No GitHub push or Ocelot deployment is implied by a successful build.

Project: `https://mkpkjmqjbfhkazxgpggg.supabase.co`.

## 1. One-time database setup (project owner)

1. Open this project's [Supabase dashboard](https://supabase.com/dashboard/project/mkpkjmqjbfhkazxgpggg) and choose **SQL Editor > New query**.
2. Open [001_capstone.sql](../server/supabase/001_capstone.sql), copy the entire script, review it, and run it once. It creates the ticket schema, private attachment bucket, staff roster, row-level access rules, and validated database functions. It never imports or deletes existing tickets. If it reports that Capstone objects already exist, **stop and inspect them**; do not delete anything or disable RLS to make it run.
3. In **Authentication > Sign In / Providers**, enable **Anonymous Sign-Ins** for this fictional-data test project. This lets a requester submit without typing a password. It does NOT give anonymous users staff access or permission to read the queue. Anonymous Auth sessions are created only on submission, not when reading chat answers. Keep email confirmation enabled for ordinary email accounts. Before wider testing, configure CAPTCHA and review Supabase rate limits; test-only database quotas are not a substitute for bot protection. [Supabase anonymous sign-in guidance](https://supabase.com/docs/guides/auth/auth-anonymous).
4. In **Authentication > Users**, create the intended staff accounts with the exact roster emails and separate test-project passwords. Provision/confirm accounts only for known teammates; do not reuse FIU passwords or the old shared `password` value. Do not send passwords to the assistant or commit them. Account invitations/confirmation messages are an owner action, not something this app sends automatically.
5. Run [002_bind_staff.sql](../server/supabase/002_bind_staff.sql) in the SQL Editor. It binds only existing confirmed, non-anonymous users to the six approved roster entries. Review its result: `user_id` must be populated for each staff member who will test. Unknown/unbound/unconfirmed accounts are rejected even if they can sign into Supabase Auth. This binding step is separate from creating a user; run it again when adding the remaining roster users.

The publishable key cannot perform this administrative setup. Use your signed-in dashboard; no secret/service-role key or database password is needed in the website. [Tables and SQL Editor](https://supabase.com/docs/guides/database/tables), [API key guidance](https://supabase.com/docs/guides/api/api-keys).

## 2. Local configuration and safe readiness check

Use Node 22+ (verified locally with Node 24). From `DEVELOPMENT`, install the pinned dependencies, then check readiness:

```powershell
npm.cmd install
npm.cmd run supabase:check
```

The owner's local configuration is already saved in Git-ignored `server/supabase.local.json`. For another checkout, copy `server/supabase.example.json` to that filename and enter the project URL and **publishable** key. Only these two public values are accepted by the build. The helper performs GET requests only: it does not log the key, read ticket rows, create users, send emails, or write data. Exit code 1 means the configuration/connection failed; code 2 means schema/anonymous-sign-in setup is incomplete; code 0 means ready to attempt a live test, **not** that ticket saving, file storage or staff provisioning has been verified.

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
- Initial live checks accepted the key, but the database RPC/table was unavailable and anonymous sign-in was disabled. The last checked Ocelot release was still the failing PHP version. Re-run readiness after the dashboard steps. No live successful save is claimed by this guide.
- Test quotas: 1,000 reserved/finalized tickets, 10 submissions per requester per hour, three documents per ticket, 5 MB per document, 10 MB per ticket and 100 MB total reserved files. Drafts count toward limits to bound storage use. Anonymous sessions can be recreated, so use CAPTCHA/provider limits before expanding testing.
- Partial uploads remain private drafts for owner review; no automatic delete or cleanup is performed. Do not remove only Storage metadata through SQL. Export required data first and use supported Storage deletion tools if the owner later authorizes cleanup.
- File format checks are not malware scanning. Only staff can download finalized files, which are handled as downloads rather than rendered previews. Do not upload untrusted or real student documents.
- Shared persistence is **not a backup**. Export the database privately and back up Storage objects separately; Supabase database backups do not include the file bytes. Do not put these exports in public GitHub or Ocelot. [Supabase backup limitations](https://supabase.com/docs/guides/platform/backups).

No existing tickets are migrated, deleted or published by this integration. FIU SSO, professor email, recovery/migration tooling, institutional approval and production security review remain separate work.
