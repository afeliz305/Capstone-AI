# Upload Capstone - AI to Ocelot

September 25 MIRA group-test release: the 15-question evidence router, multi-source navigation, public website snapshot, syllabus evidence and safe coverage fallbacks passed the complete 261-test suite. The current generated **Capstone - AI** folder is prepared with the Supabase transport for FileZilla upload. Upload that one generated folder only; do not upload DEVELOPMENT or copy individual source files. No database migration, new key or private portal permission is required. The local Overview connector is intentionally excluded, and unresolved authenticated workflow sources remain link-only. See [MIRA source coverage](MIRA_SOURCE_COVERAGE.md).

September 25 local portal connector: `demo:portal` is a separate owner-run loopback demo, **not an Ocelot upload feature**. Public Ocelot cannot reach a tester's Chrome session and must not display a fake Connect action. Never upload `js/local/portal-client.js`, the connector server, DEVELOPMENT, terminal fallback codes, or debugging endpoints. The ordinary Ocelot/Supabase package remains limited to public knowledge and the shared fictional ticket workflow; no personal Overview content enters Supabase or tickets. [Setup, architecture and live-verification limits](LOCAL_PORTAL_CONNECTOR.md).
September 25 indexed-content update, **not yet packaged into the stable upload folder**: new builds embed a validated public-site snapshot for source-excerpt search and navigation. On the owner's computer run `npm.cmd ci`, `npm.cmd run index:refresh`, `npm.cmd run index:status`, and tests before the requested `package:ocelot:supabase` release. Ocelot does not run the crawler. Never upload crawler history/configuration or DEVELOPMENT; only the generated website. No new PHP, database migration, credentials or private portal access is needed. [Index maintenance and verified limits](WEBSITE_INDEX.md).

September 25 pending feature update: source and the isolated Supabase preview include 19 [Messages/dashboard portal shortcuts](PORTAL_NAVIGATION.md), but the stable upload folder and hosted site have **not** been rebuilt or uploaded for this change. The feature needs no PHP, SQL migration, credential or permission changes and does not read live portal data. When preparing the next shared release, use `npm.cmd run package:ocelot:supabase` and the [Supabase checklist](OCELOT_SUPABASE_UPLOAD.md); never upload `DEVELOPMENT`.

**Owner upload verified — September 24:** the live Supabase website serves all 21 prepared public files with matching checksums. Chat, contextual syllabus answers and View syllabus passed Chrome checks. A ticket save/read-back/attachment test from Ocelot is still pending. Use the [current hosted verification and checklist](OCELOT_SUPABASE_UPLOAD.md); older pre-upload/browser-only notes below are historical. No remote files or cloud data were changed by this read-only check, and GitHub has not been updated.

**Current group-test release — September 24:** the prepared inner **Capstone - AI** folder now selects **Supabase**, not browser-only or PHP. Live staff reading, the test attachment download, ticket editing, filtered requester preview and persistence after reload were verified on CAP-1001. Follow the [current FileZilla checklist and verification limits](OCELOT_SUPABASE_UPLOAD.md). Upload the inner folder only; do not use the browser-only packaging/login steps below for this release. No Ocelot upload or GitHub push has been performed. Earlier dated statements about an unchanged stable folder are historical.

**Preparing the Supabase shared queue? Use the [Supabase FileZilla checklist](OCELOT_SUPABASE_UPLOAD.md).** The older browser-only steps below use different packaging, login and storage behavior; do not follow them for a Supabase release. Supabase needs `npm.cmd run package:ocelot:supabase`, provisioned staff passwords, and the **Supabase shared test queue** banner. It needs no PHP private-storage setup.

September 24 syllabus viewing: new builds add **View syllabus** on the homepage and in the persistent chat header. Both open the existing `pages/syllabus.html` reviewed reference in a separate tab using subfolder-safe relative links. No new backend, permissions or original PDF upload is required. Rebuild with the intended backend after its existing release acceptance checks; the current stable upload folder and hosted site are unchanged by the local preview update.

September 24 syllabus/chat update: new builds contain the reviewed Fall 2026 syllabus summaries, `pages/syllabus.html`, its public scripts, guided dashboard questions and contextual follow-ups. The original PDF and its private meeting access details are **not** part of the upload. No PHP/SQL setup is added. Use the packager; do not copy raw documents or `DEVELOPMENT` into the website. Actual student-record integration is still unavailable, and the existing shared-release acceptance gate remains. Source and port-3004 candidate were updated; neither the stable upload folder nor Ocelot was changed. [Details and verification](SYLLABUS_AND_DASHBOARD.md).

September 24 Remember me update: new Supabase builds include optional **Remember me for 7 days**. It needs no PHP, SSH or database migration. Use only on personal computers; the app retains session tokens, never passwords. Local preview sign-in is separate from Ocelot sign-in. After the existing shared-release acceptance gate is completed, rebuild/upload the generated Supabase folder and hard-refresh to get this option. The port-3004 preview was rebuilt and checked; the stable upload folder and remote website were not changed. [Session behavior and testing](SUPABASE_SETUP.md#remember-me-for-7-days).

September 24 rename: upload the inner **Capstone - AI** folder. Follow [the FileZilla rename checklist](PROJECT_RENAME.md) first. The new Ocelot URL is an intended destination, not a confirmed live deployment; existing browser-only tickets stay at their old address. Prior hosting checks below concern the former `Capstone AI Chat` URL.

Updated September 18, 2026. The default upload is now a **browser-only testing demo** because the PHP private-storage setup is blocked. It needs no PHP, Node, database, or SSH setup on Ocelot. Use fictional tickets and harmless sample documents only.

## Upload this folder only

### Supabase shared release (new, explicit mode)

Current release gate, September 24: all five active staff Auth accounts are confirmed, but only Anthony is bound to the staff roster. Permission to enable the other four and successful staff sign-in/edit/download acceptance are still pending. The saved test ticket and attachment remain intact. The stable inner upload folder is still the old browser-only release; **do not upload it for shared Supabase testing yet**. Preparing a candidate or passing health checks is not a completed release.

September 24 visibility follow-up: rebuilt staff pages include **Show / Hide** controls for sign-in and password changes. These change only the display of the current input, never expose stored credentials, and stay hidden for email-only login. Refresh after uploading the generated Supabase release; source/local preview updates alone do not change Ocelot. No additional hosting or database configuration is needed.

September 24 password option: new Supabase builds include **Change password** for signed-in staff. The current password is verified before updating that same account; the new password and confirmation must match. This does not require an Ocelot backend, database migration, or change to hosted Auth settings. It is hidden in the browser-only/PHP alternatives. The source/local candidate changes do not update an already-uploaded website. After release acceptance, rebuild with `npm.cmd run package:ocelot:supabase` and upload the generated inner folder, then hard-refresh. [Password change instructions](SUPABASE_SETUP.md#change-your-staff-password).

September 24 roster update: migration 003 is applied to the selected Supabase project and deactivates Raul, leaving five active staff. It preserves existing tickets and attachments. Source rosters for Node/browser/PHP were also updated; older generated/browser/PHP copies require a rebuild and upload. The Supabase backend access change is live, but no Ocelot website files were uploaded and the stable browser-only package was not replaced by a Supabase release.

September 24 UI follow-up: new Supabase builds use **Password** as the staff field label. This does not change account passwords or disable verification. The local candidate was rebuilt, but the stable upload folder remains unchanged pending acceptance. Remaining teammate account creation and approved role binding are documented in [Supabase setup](SUPABASE_SETUP.md).

September 24 live verification: project `uoccyfcsalnancmdhnur` now has the approved ticket schema, private attachment bucket, and anonymous requester sign-in. The app saved fictional ticket **CAP-1001** and its TXT attachment; a fresh client read the durable receipt, and dashboard verification confirmed `ready = true` and a private bucket. Anthony Feliz's confirmed account is provisioned; staff/cross-browser acceptance and other teammates' accounts are still pending. The default upload folder remains browser-only, and no Ocelot files were changed; see [Supabase setup](SUPABASE_SETUP.md).

Complete [Supabase setup and the live acceptance test](SUPABASE_SETUP.md) first. Then use `npm.cmd run package:ocelot:supabase` to generate the shared version in the same inner project folder. It has no PHP and needs no Ocelot filesystem-write permissions. Its banner says **Supabase shared test queue**; staff need their provisioned Supabase email/password. The SQL and all private settings stay in DEVELOPMENT, not the upload. Never run the default browser packaging command when intending to upload Supabase. The remaining browser-specific sign-in/storage instructions below describe the default alternative only. The current stable upload folder is not changed by `demo:supabase`.

**Latest Ocelot hosting check (September 18):** that live page selected PHP, and its health check returned 503 because private storage was not writable. Neither the browser package nor the Supabase candidate was uploaded by this change. September 24 verified a direct Supabase requester save, not the Ocelot website; staff acceptance and shared-release deployment are still pending. See [Supabase setup](SUPABASE_SETUP.md).

```text
Capstone - AI/          outer project — do not upload
  Capstone - AI/        UPLOAD THIS inner website folder
    index.html
    css/                  styles, images, fonts
    js/                   includes browser-demo.bundle.js
    pages/staff.html
  DEVELOPMENT/            source, documents, tests, private local data — keep local
```

1. In FileZilla, select the **inner** local `Capstone - AI` folder containing `index.html`, `css`, `js`, and `pages`. The default browser package has no `api` directory. Do not upload `DEVELOPMENT`, Git metadata, local tickets, archives, or HelpDesk INC.
2. On Ocelot, open `public_html` (not `public.html`). Keep the final path `public_html/Capstone - AI/index.html`, with no extra enclosing folder.
3. If an old upload contains development files or an `api` directory, privately back up the old release and preserve any needed records before retiring it outside the public website. Use a clean release folder at the final path; uploading over files does not remove obsolete files. Do not delete or change `.capstone-chat-private` beside `public_html`. Do not touch the separate HelpDesk project. No remote cleanup was performed by this code change.
4. Upload the complete inner folder. Wait for all transfers to finish and check failed transfers. For the **clean public release only**, use directories `755` and ordinary files `644`: FileZilla permissions, recurse with **Apply to directories only**, then a separate pass with **Apply to files only**. Never apply these recursively to the account home or private storage; do not use `777`.
5. Open [the Capstone assistant](https://ocelot.aul.fiu.edu/~afeli016/Capstone%20-%20AI/index.html) and press **Ctrl+Shift+R**. The top notice must say **Browser-only test queue**. If it still shows a PHP storage error, the new HTML/scripts were not loaded: check the URL, upload location, transfer failures, and refresh again.
6. Open [staff sign-in](https://ocelot.aul.fiu.edu/~afeli016/Capstone%20-%20AI/pages/staff.html). Enter an approved email, for example `afeli016@fiu.edu`. No password is required. Your last successful email is remembered in this browser at this site address.

The old PHP health URL is **not** the readiness check for this browser version. Do not run Ocelot Setup or repeat SSH folder preparation for it.

## Where tickets are saved

Tickets, work notes, comments, and documents are saved together in **IndexedDB**, the browser's site storage. Changes are acknowledged after the storage transaction commits. Concurrent tabs use serialized transactions; workspace edits keep revision checks and retry deduplication. These measures do not provide user authentication.

- Refreshing or reopening the same address in the same normal browser profile should retain tickets. Sign-out does not erase them.
- A different browser, computer, private window, hostname, port, or app-folder address has a separate queue. Localhost and Ocelot do not share tickets. Keep the published address unchanged across updates.
- Teammates can test the same website link, but **they cannot see each other's browser tickets**. Signing in as another demo staff member on the same browser lets you test assignment views against that browser's queue.
- Existing Node/PHP tickets are not imported, erased, or synchronized. The first browser queue starts empty, not with real or previously saved server data.
- Browser clearing, private-browsing cleanup, storage eviction, or browser-profile loss can remove records. Use **Export browser tickets** while signed in to download a JSON backup containing tickets and attachment data. Save it privately, not in Git or `public_html`. Export is a backup download; automatic restore/import and synchronization are not implemented.
- Browser storage can run out of room. Failed commits show an error, not a ticket success message; existing data is not intentionally reset. Keep files small for testing. Each ticket allows up to three PDF/DOCX/TXT documents, 5 MB each and 10 MB total. Format checks are not a malware scan.
- Staff entry is an email-only **demo identity**, not secure access. Anyone with access to that browser profile can inspect its data; internal-note labels and requester preview filtering do not make browser data private from the device user. No real student records, FIU passwords, or confidential documents.

## Quick acceptance test after uploading

1. Check the generic chat-bubble icon; open/minimize chat. Ask about sprint templates or showcase preparation and check its reviewed source links.
2. Create a student ticket with fictional name/email, `TEST —` title, and a small harmless TXT document. The receipt must say **saved in this browser only**. No professor email is sent.
3. Open the staff page in the same browser and sign in. Find the ticket using live search. Claim it or assign it to another demo staff member.
4. Open the ticket, save an internal work note and an additional comment, then resolve it. Verify the four queue views and requester preview; only the additional comment belongs in the preview.
5. Refresh, sign out/in, and confirm the ticket, notes, and downloadable document remain. Check the remembered email. Export a backup and confirm the download completes.
6. Try an unlisted email and invalid contact fields. Errors must not create a ticket. Test keyboard navigation and phone-sized layout.
7. Open in another browser and expect a separate empty queue. This is intentional, not shared-queue verification.

This release passed **151 automated tests** locally on September 18 (Node 24.15.0, npm 11.12.1, optional PHP 8.4.25 enabled); it has **not been uploaded to Ocelot by the assistant**. The interactive browser-control tool was unavailable, so actual browser IndexedDB persistence, appearance, and the hosted steps above still need manual verification. Automated tests cover the bundled API using an isolated transactional test store, IndexedDB event handling with fixtures, packaging, existing UI handlers, and Node/PHP regressions; they are not proof of live Ocelot operation.

## Rebuild or test locally

Open `DEVELOPMENT` in VS Code, where `package.json` lives:

For a local presentation, **`npm.cmd run demo`** now rebuilds and starts the browser demo in one step. Windows users can double-click [Start Capstone Demo.cmd](../scripts/Start Capstone Demo.cmd). See [the local demo guide](LOCAL_DEMO.md). The separate build/preview commands below remain available.

```powershell
npm.cmd test
npm.cmd run package:ocelot
npm.cmd run preview:ocelot
```

Open <http://127.0.0.1:3003/Capstone%20-%20AI/>. This preview serves only allowlisted public package assets, never the whole repository. It has no ticket API and tests the static upload under a subfolder. Do not double-click `index.html`; use HTTP/HTTPS. Keep the terminal running. Ctrl+C stops it.

The original server-backed local app is unchanged: `npm.cmd start`, then <http://localhost:3000/>. Its records remain in the private local `DEVELOPMENT/data` location. The static preview has its own browser queue, separate from that app.

Each package build replaces the generated inner website and preserves the old release intact under `DEVELOPMENT/dist/archive/ocelot`. Guides/checksums remain in `DEVELOPMENT/dist/release-records`, outside the upload. Edit source, then rebuild; do not edit generated assets as source.

## Optional shared queue later

A browser cannot securely write a shared ticket file to Ocelot just because HTML is uploaded. The existing PHP implementation already supports a private server file, but its permission failure remains unresolved. Moving that file into public webspace or making it world-writable is not the workaround.

For a host-approved PHP setup, build deliberately with `npm.cmd run package:ocelot:php` and follow [the PHP shared-queue guide](OCELOT_PHP_GUIDE.md). This changes the same generated folder to PHP mode; it does not migrate browser tickets or repair host permissions. To return to browser mode, rebuild with `package:ocelot`.

Alternatively, an approved separate backend could run the existing Node app with persistent private storage. Provider choice, account setup, identity, deployment, and costs require a separate decision; none are provisioned here. See [future deployment/integration requirements](DEPLOYMENT_AND_INTEGRATION_PLAN.md).

### One-time setup and routine updates

For this default browser demo, there is no private-server setup. Upload the complete new public release at the same address, hard-refresh, and run the acceptance test. The former SSH/private-folder instructions apply only to [optional PHP mode](OCELOT_PHP_GUIDE.md#one-time-setup-and-routine-updates).

### If preparation succeeds but PHP still cannot use storage

This historical failure is not used by browser mode. The optional PHP guide retains [the host-support checklist](OCELOT_PHP_GUIDE.md#if-preparation-succeeds-but-php-still-cannot-use-storage); do not weaken permissions or pretend a server save succeeded.
