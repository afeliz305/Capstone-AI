# Optional PHP shared-queue deployment

**Not the default upload.** As of September 18, 2026, `npm.cmd run package:ocelot` builds a browser-only demo that needs no PHP setup. Follow [the current upload guide](OCELOT_UPLOAD_GUIDE.md) for that version. This document retains the server-backed setup and prior evidence for maintainers. To explicitly build this PHP variant, use `npm.cmd run package:ocelot:php`; it replaces the same generated upload folder and archives the previous release. Do not switch variants unintentionally. PHP storage is still blocked on the reported Ocelot account; rebuilding does not solve that host restriction.

Updated September 17, 2026. This release is for fictional-data group testing, not official FIU use. Staff passwords are intentionally disabled. Anyone knowing one of the approved staff emails can read/change all test tickets and download test attachments. Do not enter real student information, FIU passwords, grades, or sensitive documents.

## One-time setup and routine updates

**No, private storage should not need to be set up after every upload.** Once working, it lives outside the upload folder and survives code updates at the same physical app path. A new account, moved/renamed app, changed host configuration, or removed private store may need separate attention.

For the current storage error, on your **Windows computer**:

1. Open `DEVELOPMENT/scripts` in File Explorer and double-click **Ocelot Setup.cmd**. Alternatively, run `npm.cmd run ocelot:setup` in a Windows terminal opened in `DEVELOPMENT`.
2. The helper first checks the website. If storage already works, it stops successfully without SSH. If the app reports a private-storage failure, it explains the preparation and asks you to type `yes` before connecting. Any capitalization works (`yes`, `Yes`, or `YES`); surrounding spaces are ignored. Pressing Enter without an answer cancels without SSH. If an older helper cancelled after lowercase `yes`, close it and reopen the updated local helper; nothing was changed on Ocelot by that cancellation.
3. Enter your Ocelot password only at SSH's password prompt; typing is hidden. The helper does not receive/save that password. If asked to trust a new host key, verify its fingerprint with FIU first; do not approve an unknown key blindly.
4. The remote script prints the SSH identity and directory permissions. It creates only a missing `.capstone-chat-private` base folder beside `public_html`, with owner-only mode `700`. It refuses symlinks or unexpected existing ownership/permissions instead of changing them. It never reads, overwrites, deletes, reseeds, or resets tickets or attachments, and does not recursively change permissions.
5. The helper rechecks the website. **SSH success alone is not success for PHP.** If storage still fails, send the displayed result to the maintainer or `request@cs.fiu.edu`. The PHP runtime identity, restrictions, or deeper deployment/attachments directories may need host-side attention. Do not keep rerunning setup or use `777`.

Node 18+ and an SSH client must be installed on the maintainer's Windows computer; neither is installed on Ocelot by this helper. The existing local Node installation is sufficient. The default owner account is `afeli016`; another maintainer can use `npm.cmd run ocelot:setup -- theirUsername` for their own account. This creates a separate deployment, not access to the owner's queue. Helpers stay in `DEVELOPMENT/scripts`, never in the upload website. No PHP diagnostic/setup endpoint is made public.

**For routine updates after setup succeeds:**

1. Rebuild the optional PHP variant with `npm.cmd run package:ocelot:php` from `DEVELOPMENT` after source changes.
2. Upload the generated **Capstone - AI** website to the same remote `public_html/Capstone - AI` location. Leave the home-level `.capstone-chat-private` folder alone. Verify new public files have the permissions described below; private-storage setup is separate from public-file readability.
3. Run `npm.cmd run ocelot:check` from `DEVELOPMENT`, or open the backend-check link below. This sends only the app health request and never opens SSH. The endpoint may initialize an empty store on first successful use; it does not reset an existing queue. Hard-refresh the browser and check sign-in/tickets.

**Do not mix Windows and Ocelot prompts.** A prompt starting `PS C:\...>` is Windows; `afeli016@ocelot:~ ...%` is already inside Ocelot. Run the npm helper on Windows, not inside SSH. Open a new Windows PowerShell window, or type `exit` once to leave SSH. Paste commands only, without prompt text. The September 17 pasted command joined `ls` and a second `ssh` command, so it did not establish whether `.capstone-chat-private` exists.

The owner subsequently ran the helper successfully on September 17 at approximately 19:13 server time. It created `.capstone-chat-private` beside `public_html`, owned by `afeli016` (UID 53930, group `user`), with mode `700`. Home is `711` and `public_html` is `755`. A fresh live health request then returned HTTP 503 with `Private ticket storage is not writable by PHP. Ask the account owner to check permissions.` The base-folder creation step is complete; do not keep rerunning it. Hosted saving/sign-in remain blocked.

In `server/php/storage.php`, this error means `chmod(..., 0700)` failed **or** the directory failed `is_writable()`. It does not establish which check failed, which private-directory level was reached, or the effective web PHP identity. A different PHP user is a possible cause, not a confirmed finding. PHP permissions operations run as the PHP runtime user, which can differ from the SSH account. [PHP permission documentation](https://www.php.net/manual/en/function.chmod.php) Host filesystem restrictions may also apply. [PHP filesystem restriction documentation](https://www.php.net/manual/en/ini.core.php#ini.open-basedir)

### If preparation succeeds but PHP still cannot use storage

Leave the private folder at `700`; do not move tickets into the website, add public write access, or rerun setup repeatedly. Ask FIU hosting support to verify the **web request's** PHP identity, permitted private storage, and the failed operation using server logs. Terminal PHP settings/identity alone cannot answer this. No diagnostic endpoint or `phpinfo()` page needs to be made public.

Draft to send to `request@cs.fiu.edu` (not sent automatically):

> Subject: Ocelot PHP private-storage access for afeli016
>
> I am testing a Capstone project using fictional data at `/~afeli016/Capstone%20-%20AI/`. SSH setup created `/a/buffalo.cs.fiu.edu./disk/jccl-002/homes/afeli016/.capstone-chat-private`, owned by afeli016 (UID 53930), mode 700, outside public_html. My home is 711 and public_html is 755.
>
> The web PHP health endpoint returns HTTP 503: "Private ticket storage is not writable by PHP. Ask the account owner to check permissions." The application checks chmod(directory, 0700) and is_writable() and keeps private files at 600.
>
> Could you confirm the effective UID/GID for web PHP, whether per-account PHP with private storage outside public_html is supported, and whether PHP restrictions, filesystem policy, or permissions prevent these operations? Please advise an approved isolated setup or an approved database alternative if this file-store model is unsupported. We do not want world-readable/writable ticket storage.

Include the [health URL](https://ocelot.aul.fiu.edu/~afeli016/Capstone%20-%20AI/api/index.php?route=%2Fhealth) and the setup output, but no passwords or ticket contents. Await the host's supported approach before changing the storage architecture or ownership. The current backend requires owner-private directories and permission control; an arbitrary shared-user ACL alone is not verified as compatible.

## FileZilla: one folder to upload

1. Open the outer local Capstone project folder. It has **Capstone - AI** (the upload-ready website) and **DEVELOPMENT** (everything kept locally). For this optional PHP variant, the inner **Capstone - AI** folder must contain `index.html`, `api`, `css`, `js`, and `pages` directly. Build it explicitly with `npm.cmd run package:ocelot:php` from `DEVELOPMENT`.
2. In FileZilla's remote pane, open **public_html** inside your Ocelot home. The name is `public_html`, not `public.html`.
3. Before replacing an existing remote **Capstone - AI** folder containing old development files, privately preserve needed data and take that old copy out of the public web directory. Do not blindly delete records or merge the new release into that old copy. Upload only the inner local **Capstone - AI** website folder into `public_html`; do not upload the outer project folder, `DEVELOPMENT`, archives, or HelpDesk INC. Wait for FileZilla's transfer queue to finish and include the two small dotfiles in `api/`.
4. Check the public release permissions using the two-pass FileZilla instructions below: folders `755`, ordinary public files `644`. Limit recursive changes to the clean **Capstone - AI** upload, never the entire home directory or an old full-repository copy.
5. Open [the homepage directly](https://ocelot.aul.fiu.edu/~afeli016/Capstone%20-%20AI/index.html). The folder name is now **Capstone - AI**, matching the project name; spaces appear as `%20` in the URL. The previously suggested `Capstone-AI-Test` address is not the current release name. Changing a working deployment's physical path selects a different private ticket store; preserve any previous store before migrating.
6. Open [the backend check](https://ocelot.aul.fiu.edu/~afeli016/Capstone%20-%20AI/api/index.php?route=%2Fhealth). It should display JSON containing `"status":"ok"`, `"backend":"php"`, and `"storage":"private-files"`. This checks private storage initialization as well as PHP execution. If it shows a download, PHP code, or an error, stop and follow troubleshooting below. Do not share the test as working yet.
7. Open [the assistant](https://ocelot.aul.fiu.edu/~afeli016/Capstone%20-%20AI/) and [staff sign-in](https://ocelot.aul.fiu.edu/~afeli016/Capstone%20-%20AI/pages/staff.html). Refresh with **Ctrl+Shift+R** after uploading an update. Enter an approved staff email; no password is needed. Your last successful email is remembered on this browser at this site address.
8. Create a fictional `TEST —` ticket, then have another teammate sign in from a different browser/device and refresh the queue. Confirm the same ticket, assignment, notes, and sample document appear. Close/reopen the page and confirm they remain.

Teammates need only the web links after these checks pass. They do not need GitHub, Node, npm, PHP, or VS Code installed.

The upload website deliberately uses the same name as the project, as requested. It does **not** remove or repair the old full-project copy already at that remote address. Do not delete the separate HelpDesk project. Uploading frontend files over an old copy does not remove old private files or conflicting server configuration.

## FileZilla public-file permissions

The owner reported needing to set permissions after uploading to Ocelot. For the **clean public application folder only**, use two passes:

1. Right-click **Capstone - AI** in the remote pane and choose **File permissions**. Set the numeric value to `755`, check **Recurse into subdirectories**, and select **Apply to directories only**.
2. Open permissions for that same folder again. Set `644`, check **Recurse into subdirectories**, and select **Apply to files only**.
3. Refresh the remote listing and check that the app folder/subfolders show `drwxr-xr-x` and ordinary files such as `index.html` show `-rw-r--r--`. If a host-specific PHP handler needs different permissions, get the exact requirement from hosting support rather than making all files executable.

The screenshot's `00755` is the same permission value as `755`, but **Apply to all files and directories** also sets the execute bits on ordinary files. Do not use that option for the blanket update. FIU's published examples distinguish `755` for a web directory and `644` for an HTML file. [FIU permission examples](https://users.cs.fiu.edu/~downeyt/cop2250/c2250.shtml)

Do not apply these settings recursively to your home directory, all of `public_html`, an old full-project upload, or `.capstone-chat-private`. Private storage stays at `700` for directories and `600` for files. Public-file permissions do not solve PHP's inability to write private storage.

## What is included

```text
Capstone - AI/
  index.html
  pages/staff.html
  css/                 styles, images/, fonts/
  js/                  chat/, staff/, shared/
  api/                 PHP ticket/search backend and reviewed knowledge
```

No local tickets, documents, passwords, `.git`, `.env`, npm packages, tests, guides, or sample queue are bundled. The first hosted queue is empty; teammates can create fictional tickets. The complete local Node project and its data are preserved under `DEVELOPMENT`, outside the upload website. PHP still has to execute on the web server; opening HTML files directly or using Live Server does not run this backend.

The September 24 package replaces the mascot with `css/images/capstone-chat.svg`, an original chat-bubble icon. Upload the complete rebuilt website, including that asset, `index.html`, and `css/capstone-chat.css`, then hard-refresh. The icon and **Let's chat** label both open the same popup. The local package update does not upload anything to Ocelot. Renaming a PHP deployment can select a different private store; do not move or reset private records as part of the branding change.

The upload uses direct `api/index.php?route=...` requests, so it does not need Apache URL rewriting, a Node process, or a reverse proxy. No database setup is required. The browser keeps only the remembered email preference; tickets are stored on the server.

## Storage and updates

On first successful API use, PHP creates `.capstone-chat-private` in the account home **beside, not inside, `public_html`**. A stable deployment-specific subfolder holds `state.json`, `state.lock`, and `attachments/`. The subfolder is derived from the application's absolute location. Keep the app folder name/location unchanged for later updates to continue using the same queue. Moving/renaming the app starts a separate queue; it does not delete the old one.

Storage directories use owner-only permissions (700), files 600. The PHP web process must be allowed to create/write this location as the hosting account. If it cannot, the API stops with a setup error; it never falls back to publicly accessible storage or browser-only tickets. **Do not use 777 or make your home directory broadly writable.** The host administrator must resolve a different web-process identity, denied filesystem access, or host restrictions.

Updates: generate a new bundle and replace only the contents of the same remote **Capstone - AI** application folder. Never upload a local state file, replace `.capstone-chat-private`, or use directory mirroring that removes it. New packages contain no state file and do not reset or reseed the hosted queue. Keep a private backup of the previous release before replacing code.

Backups: during a short agreed maintenance window with no writes, download the entire deployment-specific private storage folder to a non-public backup location; preserve `state.json` and `attachments/` together. Treat backups as private. A future production deployment needs automated, tested backup/restore and retention procedures. There is no web reset/delete endpoint. Do not delete shared test data without agreement.

The file store uses one bounded exclusive lock around reads/updates and same-directory temporary-file replacement; workspace edits additionally use revisions and retry identifiers. This is a small single-host test queue, not a production database. Ocelot's actual filesystem locking and concurrent writes still require hosted validation. No SQLite suitability is assumed from the installed extension list.

Testing limits: 1,000 tickets, 100 MB of attached documents across the queue, 30 ticket submissions per client IP per 15 minutes, and 10 failed sign-ins per client IP per 15 minutes. Staff sessions last one hour. People sharing an IP share request limits. Each ticket allows three PDF/DOCX/TXT documents, 5 MB each and 10 MB total. Files have basic content checks but are not malware-scanned. Health checks do not validate every existing document.

## Troubleshooting

- **PHP source or a file download:** PHP web execution is not configured. Remove the newly uploaded testing folder from the public site and ask FIU hosting support for the approved PHP execution method. There are no embedded credentials in the package. Terminal PHP availability alone does not prove web execution.
- **404:** check that `index.html` is directly inside `public_html/Capstone - AI`, with `api/index.php` beside the other app folders. Do not nest the outer package folder.
- **500 or HTML instead of JSON:** inspect FileZilla transfer failures and the host's PHP/Apache error log with the administrator. Do not add handler rules blindly. The optional `api/.htaccess` only denies direct helper access; it does not enable PHP or protect the private data store by itself. Ask the administrator about permitted overrides if this file causes an Apache error.
- **Private-storage error:** use the [one-time guided setup](#one-time-setup-and-routine-updates). A base folder that already exists with correct permissions is preserved. If the web check still fails, ask hosting support to inspect the PHP identity, restrictions, quota, and deeper storage directories outside the web root. Do not move state into `public_html`, weaken permissions, or change the app to pretend it saved.
- **Large attachment rejected:** the package requests `post_max_size=20M` and `memory_limit=128M` in `api/.user.ini`; the host may ignore/override these settings or apply an additional request limit. Use a small fictional TXT file first. Ask support to check effective limits; per-directory setting updates may be cached. The app still enforces its smaller attachment limits.
- **No remembered email:** it is saved only after successful login. Different browsers, private windows, localhost, renamed folders, or cleared browser storage do not share that preference. It is not automatic sign-in.
- **Empty queue after a move:** changing the app's physical path selects a different store. Restore the original app location or arrange a deliberate private data migration. Do not overwrite either store casually.
- **Save result uncertain:** refresh the staff queue before creating the same ticket again. Workspace save retries are deduplicated; ticket creation itself is not automatically retried.

## Maintainer: rebuild and verify

Open **DEVELOPMENT** in VS Code and run these commands there. If your terminal is in the outer organizing folder, run `cd .\DEVELOPMENT` first:

```powershell
npm.cmd test
npm.cmd run package:ocelot:php
```

Each packaging run prepares a clean website in the sibling **Capstone - AI** folder, with `index.html` directly at its root. Previous website files are moved intact into `DEVELOPMENT/dist/archive/ocelot/`, never deleted or merged into the new version. Upload instructions and checksum manifests remain outside the website in `DEVELOPMENT/dist/release-records/`. Failed builds leave the current website in place. Edit development source and rebuild, not generated files.

Older packages, including the former `UPLOAD_TO_OCELOT` wrapper, are preserved under `DEVELOPMENT/dist/archive/legacy/`; do not upload from that archive. Alternative Node builds use `DEVELOPMENT/dist/node/`. No remote folder, URL configuration, or ticket store was changed by the local file moves. The requested current release name is **Capstone - AI**; any previously deployed differently named PHP instance needs deliberate data migration, not an assumption that the new name shares its queue.

The optional PHP integration test uses `CAPSTONE_PHP_BIN` pointing to a locally installed PHP CLI executable; it creates isolated temporary `public_html` fixtures and fictional records. Without that setting it is explicitly skipped; ordinary Node tests and package checks still run. The PHP test process binds only to loopback. Do not expose PHP's development server publicly. [PHP development-server documentation](https://www.php.net/manual/en/features.commandline.webserver.php)

## Readiness and future go-live

The September 17 guided-setup change passed **141 local tests**, including twelve helper tests with mocked SSH, plus local shell syntax validation. The owner later ran the helper and confirmed remote base-directory creation; the fresh live health request still returned HTTP 503, now specifically failing the PHP permission/write check. No remote upload was performed by the assistant. PHP access, cross-device persistence, and the full hosted checklist remain pending. The helper itself requires no website re-upload.

The September 17 launcher update passed all **129 tests** with the runtimes below, including PNG transparency/serving and exact artwork inclusion in this package. Desktop Chrome and 320 × 568 viewport checks verified the launcher and popup on a separate local Node preview. No Ocelot files were uploaded or tested by this change.

Local verification on September 16 passed 128 tests with Node 24.15.0, npm 11.12.1, and PHP 8.4.25, including stable upload packaging, recoverable archives, unsafe/concurrent build rejection, PHP syntax checks, two-process concurrent submissions, restart persistence, full 10 MB document uploads, bounded lock failure, rate limiting, and corrupt-storage failure without data reset. This is not PHP 7.2.24 runtime verification, an Apache/CGI test, or a browser visual check.

Local code/package verification is not proof of a working Ocelot deployment. Record the live health check, cross-device persistence, simultaneous submissions, assignment conflicts, document download, and private-path checks after upload. The host must permit the deployment and private writes. User folders on one shared web origin are not an isolation boundary from other applications on that origin; use an approved isolated origin and real identity verification before production.

PHP source targets 7.2 syntax for the reported Ocelot runtime; PHP 7.2 is unsupported upstream and this is not a production endorsement. Production requires a supported runtime, verified institutional identity/roles, proper authorization, approved content access, privacy/security/accessibility review, notifications, monitoring, backups, and operator sign-off. The PHP bundle implements only temporary email-demo access; changing Node's `server/config.json` does not secure PHP. Do not use this bundle for real student information. Full requirements remain in the project's deployment and integration plan.
