# Upload the Supabase version to Ocelot

Use this checklist for **Capstone - AI with a shared Supabase ticket queue**. The browser-only and PHP variants in older instructions are different builds. Do not use their packaging commands for this release.

## MIRA group-test release — September 25, 2026

The current source passed 261/261 automated tests, including MIRA's 15-question acceptance set, the public website index, browser/Supabase packaging, and PHP compatibility. The generated **Capstone - AI** folder is prepared with the Supabase transport and the September 25 public-site snapshot. The hosted Ocelot copy is not updated until the owner transfers this folder with FileZilla. This release does not include the local Overview connector, run a database migration, reset tickets, change staff roles, or authorize production/student-data use.

## Uploaded-site check — September 24, 2026

The owner uploaded this release to Ocelot. Read-only verification found **all 21 public files returning HTTP 200 and matching the prepared release's SHA-256 checksums** at `https://ocelot.aul.fiu.edu/~afeli016/Capstone%20-%20AI/`. Chrome showed the Supabase banner; Sprint 2 and “When is it due?” returned the expected contextual answer, and **View syllabus** opened the hosted reference with all 31 sections. HEAD requests to `package.json`, `AGENTS.md`, `.git/HEAD`, `server/supabase.local.json` and `data/tickets.json` returned 404. These focused checks are not a complete security audit or proof that no other obsolete files exist.

No ticket, account, role or remote file was created/changed during this hosted check. **A ticket submission, staff read-back and attachment download from the Ocelot origin remain to be tested.** The local-preview live tests below do not establish that final hosted flow. Ocelot and localhost have separate browser sign-ins. No GitHub push was performed.

## Group-test release verification — September 24, 2026

The owner supplied a screenshot showing Anthony Feliz signed in and CAP-1001 visible in Chrome and the VS Code browser. The matching Chrome tab was then located and tested directly: the existing fictional ticket loaded, its 63-byte TXT attachment downloaded with the expected content, and a staff save was confirmed. CAP-1001 is now assigned to Anthony and **In review**, with one clearly labeled test work note and one test additional comment. The requester preview showed the additional comment but excluded the internal note; a fresh page load retained the assignment/status. No other ticket, account, role, password or database setting was changed, and no email was sent.

This is a **fictional-data group-test package**, not approval for official student use. The original requester save/fresh-client receipt test and the current staff checks are live evidence. Automated tests are separate evidence. Simultaneous stale-edit conflicts, another staff member's access, seven-day elapsed-session behavior, independent backup/restore and the final Ocelot-hosted save still need manual acceptance. The other four staff Auth accounts remain unbound unless the owner separately approves and completes their access provisioning; only Anthony's staff access is verified here. Do not weaken access rules to let them in.

The prepared website contains only 21 public files. The previous local upload is retained in `DEVELOPMENT/dist/archive/ocelot/`; build-specific checksums and instructions are in `DEVELOPMENT/dist/release-records/`. The owner subsequently uploaded the release; see the hosted verification above. No GitHub push has been performed.

Final local verification: **215 tests passed, zero failures/skips**, including the optional PHP compatibility suite. The promoted folder's 21 files (559,784 bytes total) matched manifest hashes, served correctly under the encoded project subfolder, contained the intended Supabase project and current syllabus/session controls, and exposed no private/backend paths. Release record: `dist/release-records/ocelot-upload-FZDpAW/`. Previous website: `dist/archive/ocelot/2026-09-25T01-30-37-069Z-Ys9MB2/release/`. Those paths are relative to `DEVELOPMENT`; neither belongs on Ocelot. This packaging audit is not an Ocelot-hosted acceptance result.

## Before copying files

Review the verification above and the [full live acceptance checklist](SUPABASE_SETUP.md#3-test-before-upload). Complete the remaining checks before expanding testing or official use. A healthy connection and passing local tests alone do not prove staff access or a hosted save. Staff need a confirmed Supabase account **and an active staff binding**; knowing a roster email is not sufficient. Use fictional test information only.

Build from `DEVELOPMENT`:

```powershell
npm.cmd run supabase:check
npm.cmd run package:ocelot:supabase
```

The first command is read-only. The second packages the public website, preserves the previous upload folder in `DEVELOPMENT/dist/archive/ocelot/`, and keeps its instructions/checksums in `DEVELOPMENT/dist/release-records/`. Neither command uploads files, resets tickets, runs migrations, or creates staff accounts.

## Copy exactly one folder using FileZilla

Upload the **inner `Capstone - AI` folder** containing these files:

```text
Capstone - AI/
  index.html
  pages/
    staff.html
    syllabus.html
  css/
    images/
    fonts/
    ...stylesheets
  js/
    chat/
    staff/
    shared/
      supabase.bundle.js
      ...shared scripts
```

1. Connect to your existing Ocelot account using FileZilla.
2. Open **`public_html`**, not `public.html`.
3. Transfer the inner website folder so the final path is **`public_html/Capstone - AI/index.html`**. Avoid another nested project folder.
4. If the existing remote project contains old `api`, `server`, `data`, `.git`, or development files, stop before merging releases. Preserve a private backup outside `public_html` and arrange a clean replacement. Uploading over files does not remove obsolete files. Do not touch HelpDesk INC or `.capstone-chat-private`.
5. Wait for all transfers to finish and check FileZilla's **Failed transfers** tab. For this public website only, directories should be `755` and ordinary files `644`. Apply directory/file permissions separately, never to the account home or private storage. Do not use `777`.

**Do not upload** `DEVELOPMENT`, this guide, `node_modules`, package files, SQL migrations, the original syllabus PDF, configuration files, passwords, runtime tickets, attachments, archives, or Git metadata. The generated bundle intentionally contains the public Supabase URL/publishable key, never an admin key.

No Node server, npm install, PHP storage, SSH setup helper, or private-folder write permissions are needed on Ocelot for this build. Ocelot serves HTML/CSS/JavaScript; Supabase handles authentication, shared tickets and private documents.

## Open and check the uploaded version

- [Student assistant](https://ocelot.aul.fiu.edu/~afeli016/Capstone%20-%20AI/index.html)
- [Staff queue](https://ocelot.aul.fiu.edu/~afeli016/Capstone%20-%20AI/pages/staff.html)
- [Reviewed syllabus reference](https://ocelot.aul.fiu.edu/~afeli016/Capstone%20-%20AI/pages/syllabus.html)

These destinations now serve the verified uploaded release. Press **Ctrl+Shift+R** after future uploads. The assistant and staff page must show **Supabase shared test queue**. A browser-only banner or PHP storage error means the wrong build or old files are still loading.

1. Open/minimize the generic chat button. Ask about **Sprint 2** and then **When is it due?**.
2. Select **View syllabus** from the homepage and chat header. Each opens the reviewed HTML reference in a new tab without closing the chat. The raw PDF is not published.
3. Sign in to the staff queue with your provisioned project account. Ocelot sign-in is separate from local preview sign-in. Optional **Remember me for 7 days** saves session tokens, not your password; use it only on a personal device.
4. Create one clearly labeled fictional test ticket with a harmless TXT attachment. Wait for the confirmed saved receipt, then find that exact ID in the staff queue and refresh.
5. Download the attachment, save a test work note/comment, and confirm changes from another authorized staff session. Internal work notes must not appear in requester preview. Complete the stale-edit check in the setup guide.

The local and Ocelot Supabase builds use the same online project and share its records. Old browser-only/Node/PHP tickets are not automatically imported or deleted. Shared storage is not an independent backup. No professor email is sent, and actual student dashboard records are not connected.

## Troubleshooting

- **404:** check the exact folder name, capitalization, spaces, and final `index.html` path. Open the direct URL above instead of relying on the account directory listing.
- **PHP/private-storage error:** this release has no PHP API. Check the build banner, URL, stale files and browser cache; do not loosen private-folder permissions.
- **Staff access denied:** an Auth account without an active staff binding cannot enter the queue. Ask the owner to finish approved provisioning; do not disable access rules.
- **Ticket not saved:** do not treat a draft or upload-in-progress as a saved ticket. Record the message/ID and check the queue before retrying. No failed cloud save falls back to browser storage.
- **Syllabus still looks old:** verify that `pages/syllabus.html`, both syllabus scripts, and the new homepage/CSS finished transferring; hard-refresh.

After every future source update, rebuild explicitly with **`package:ocelot:supabase`**, upload the complete public folder and repeat the hosted checks. Do not rerun the initial database migration or erase existing data.
