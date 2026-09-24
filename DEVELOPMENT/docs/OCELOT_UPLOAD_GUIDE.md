# Upload Capstone - AI to Ocelot

September 24 rename: upload the inner **Capstone - AI** folder. Follow [the FileZilla rename checklist](PROJECT_RENAME.md) first. The new Ocelot URL is an intended destination, not a confirmed live deployment; existing browser-only tickets stay at their old address. Prior hosting checks below concern the former `Capstone AI Chat` URL.

Updated September 18, 2026. The default upload is now a **browser-only testing demo** because the PHP private-storage setup is blocked. It needs no PHP, Node, database, or SSH setup on Ocelot. Use fictional tickets and harmless sample documents only.

## Upload this folder only

### Supabase shared release (new, explicit mode)

Complete [Supabase setup and the live acceptance test](SUPABASE_SETUP.md) first. Then use `npm.cmd run package:ocelot:supabase` to generate the shared version in the same inner project folder. It has no PHP and needs no Ocelot filesystem-write permissions. Its banner says **Supabase shared test queue**; staff need their provisioned Supabase email/password. The SQL and all private settings stay in DEVELOPMENT, not the upload. Never run the default browser packaging command when intending to upload Supabase. The remaining browser-specific sign-in/storage instructions below describe the default alternative only. The current stable upload folder is not changed by `demo:supabase`.

**Latest hosting check (September 18):** the current live page still selects PHP, and its health check returns 503 because private storage is not writable. Neither the browser package nor the Supabase candidate was uploaded by this change. Supabase code is implemented locally; dashboard setup and live cloud acceptance are pending. See [Supabase setup](SUPABASE_SETUP.md).

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
