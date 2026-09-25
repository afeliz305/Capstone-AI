# Capstone - AI — development

This is the **DEVELOPMENT** folder, not the upload website. Run npm commands here. The ready-to-upload website is the sibling **Capstone - AI** folder; documents, tests, local data, and archives stay here. The outer workspace has a short start-here guide.

**MIRA source-grounding release (September 25):** the existing chat routes the 15 requested sprint/workflow/grade/team questions through reviewed public, Fall 2026 course, authenticated-navigation, or verified-local scopes. Supported facts cite the syllabus/index; missing Review/Retro/template/Verify/Done/acceptance-criteria details remain explicit coverage gaps with verified destinations instead of generic Scrum guesses. Source follow-ups support **Take me there**, **Show me the instructions**, and numbered-source selection. The complete suite passed 261/261 and the generated Supabase **Capstone - AI** folder is prepared for FileZilla upload; this does not itself upload Ocelot files, change cloud data, or push Git. See the [source map and 15-row acceptance record](docs/MIRA_SOURCE_COVERAGE.md).

**Local portal personalization (September 25):** `npm.cmd install --include=dev`, then `npm.cmd run demo:portal` (or `scripts\Start Capstone Portal Demo.cmd`) starts the read-only loopback demo on port 3005. Open it directly and choose **Connect my portal**; terminal code entry is now only an Advanced fallback. Chrome approval and an explicitly selected, freshly verified Overview are still required. There is no periodic portal-reload loop: initial verification/**Verify again** reload once, while **Refresh information** and personal questions use non-reloading checks. Focused tests passed 34/34 and the full project passed 252/252. The real local bootstrap passed, but Chrome's application-owned connection still stopped at **Browser connection unavailable**, so real Overview acceptance remains pending browser approval/handshake. [Setup, states, privacy boundaries, tests and live status](docs/LOCAL_PORTAL_CONNECTOR.md). This connector is never enabled on public Ocelot, and private information is not shared with Supabase or tickets.

Standalone proof of concept for a zero-token, site-grounded support assistant for the FIU KFSCIS Capstone portal.

**September 25 indexed-search update:** an owner-run crawler now saves public website evidence for the chat. Run `npm.cmd ci`, `npm.cmd run index:site`, then `npm.cmd start` here; `index:status` reports coverage/failures and `index:refresh` updates the index. A successful bounded live crawl saved 34 pages/190 sections, and a second refresh recognized all 34 as unchanged. Answers show source excerpts, indexing dates and verified section links; this is keyword/extractive mode, not semantic AI or private-account access. All 237 tests passed. Source and the isolated preview are updated; no stable upload, Ocelot deployment or Git push is included. [Commands, architecture, files and verification](docs/WEBSITE_INDEX.md).

**September 25 local update:** chat and homepage prompts now cover all 19 portal sections, including Messages, Overview, Team, Grade and Canvas. Answers open the verified portal address and tell students which section to choose; live inbox counts, messages and personal records are **not connected**. The isolated port-3004 preview is updated and 221 tests passed. The stable upload folder, Ocelot and GitHub do not yet include this change. See [portal navigation and testing](docs/PORTAL_NAVIGATION.md).

The assistant answers from reviewed Capstone site content and the supplied Fall 2026 CIS 4951 RVC syllabus, cites sources/pages, and offers contextual follow-up questions. Guided dashboard topics explain course rules; actual student project, task, attendance and grade records are not connected. Unresolved questions can create a prototype support ticket; the syllabus directs course questions to Canvas Inbox. The app remains separate from HelpDesk INC and calls no paid AI API. See [syllabus search, date conflicts and dashboard integration requirements](docs/SYLLABUS_AND_DASHBOARD.md).

See [CAPSTONE_AI_PROJECT_PLAN.md](docs/CAPSTONE_AI_PROJECT_PLAN.md) for the approved project direction, scope, architecture, and delivery phases.

**Existing Node/browser testing modes:** Staff password checks are disabled in these demo modes. Anyone who knows an approved email can access their respective queues, so use fictional data only. **Supabase mode is different:** it requires a provisioned email/password account and database-enforced staff access. Existing local password records are preserved.

## Teammates: start here

**Uploaded website verified:** the owner uploaded this Supabase release to [Ocelot](https://ocelot.aul.fiu.edu/~afeli016/Capstone%20-%20AI/). All 21 public files match the prepared build; live chat, contextual answers and syllabus viewing work. Ocelot-origin ticket save/read-back/download remains the next manual test. See [current hosted verification](docs/OCELOT_SUPABASE_UPLOAD.md). No GitHub push occurred; the preparation note below describes the earlier packaging step.

**Current Ocelot group-test package:** the sibling **Capstone - AI** folder now contains the Supabase shared version, including the syllabus viewing buttons. Live staff read/download/edit/preview/reload checks passed on the existing fictional test ticket. Follow the [Supabase FileZilla upload checklist](docs/OCELOT_SUPABASE_UPLOAD.md) and [remaining acceptance checks](docs/SUPABASE_SETUP.md#current-upload-preparation). Rebuild with `npm.cmd run package:ocelot:supabase`; the default browser-only packaging instructions farther below describe a separate alternative, not this prepared release. No Ocelot upload or GitHub push has occurred.

**Supabase staff passwords:** signed-in staff can select **Change password** in the queue header to verify their current password and set a new one. This changes only their own app account; it is not FIU password reset or forgotten-password recovery. [Instructions](docs/SUPABASE_SETUP.md#change-your-staff-password). Email-only demo variants remain unchanged.

**Shared Supabase testing:** the selected project has its initial setup and Anthony's staff access configured; remaining teammate provisioning and broader acceptance are recorded in [the setup guide](docs/SUPABASE_SETUP.md). Do not rerun the initial migration on that project. Use Node 22+, run `npm.cmd install`, then `npm.cmd run demo:supabase` for an isolated candidate on port 3004. The default `demo` and `package:ocelot` still select browser-only mode and replace the current upload folder, so do not use them to prepare the shared release. No existing data is migrated automatically.

**For a local presentation:** double-click [Start Capstone Demo.cmd](scripts/Start Capstone Demo.cmd) or run `npm.cmd run demo` here. It rebuilds the browser demo and starts <http://127.0.0.1:3003/Capstone%20-%20AI/>. Use the [short demo guide](docs/LOCAL_DEMO.md). No PHP setup or manual folder switching is needed; existing server/browser tickets are preserved.

For the **Ocelot group test**, the default package is now a browser-only demo: one website link, but a separate ticket queue on each browser/device. No GitHub download or local setup is required after upload. This avoids the blocked PHP storage setup; it does not fix or replace the server store. See the [upload guide](docs/OCELOT_UPLOAD_GUIDE.md) and [future shared-queue/integration plan](docs/DEPLOYMENT_AND_INTEGRATION_PLAN.md). Use fictional information only.

The [GitHub repository](https://github.com/afeliz305/Capstone-AI) is public: anyone can view, clone, or download the source without an invitation. This shares the source code, not a hosted app or your local ticket queue. Staff passwords, tickets, attachments, and local backups remain excluded from Git.

Follow the maintained [VS Code setup and testing guide](docs/TEAM_SETUP_GUIDE.md) for GitHub access, cloning or ZIP download, installation, test scenarios, troubleshooting, and future updates.

## Project folders

**Uploading to Ocelot?** From the outer workspace, transfer only the inner **Capstone - AI** website folder. Do not upload `DEVELOPMENT` or the entire outer workspace. Rebuild the shared website with `npm.cmd run package:ocelot:supabase` from this development folder; previous packages are preserved in `dist/archive/`.

The homepage is **`index.html` at the project root**. Other files are organized by purpose:

```text
index.html          Student assistant homepage
pages/              Other HTML pages (staff.html)
css/                Stylesheets, with images/ and fonts/ inside
js/                 Browser code: chat/, staff/, shared/
docs/               Guides, previews, and font license (start with docs/README.md)
server/             Node backend, PHP hosting backend, server-only helpers
scripts/            Password setup and sample-ticket commands
data/               Knowledge base and private local runtime data
test/               Automated tests and fictional fixtures
../Capstone - AI/ The sibling generated website; the only folder to upload
dist/               Archived packages, Node builds, and temporary build staging
```

The application `README.md`, `AGENTS.md`, and npm configuration are here in `DEVELOPMENT`. Local runtime data remains private in `DEVELOPMENT/data/`. **The local app uses Node.js; the default Ocelot upload is static HTML/CSS/JS with browser-only storage.** PHP shared storage is an optional separate build. The Node server and static preview expose only explicit public-file allowlists. Never publish the full development directory or private data.

After getting this folder update, restart with `npm.cmd start` (now runs `server/server.js`) and refresh with **Ctrl+Shift+R**. The staff page is now `/pages/staff.html`; existing `/staff.html` bookmarks redirect there when using the Node server.

## Local and uploaded hosting

The same frontend now keeps API requests and document downloads within its app folder, whether served at localhost's root or a hosted subfolder. HTML error pages produce a clear backend-setup message instead of `Unexpected token '<'`. Email remembering remains tied to a successful sign-in on the same browser, site address, and app folder; localhost preferences do not transfer to the hosted site.

**For Ocelot:** run `npm.cmd run package:ocelot` from `DEVELOPMENT`. Upload only the generated sibling **Capstone - AI** folder into `public_html`. It contains `index.html` and frontend assets, including the browser-demo bundle, with no PHP requirement. Guides/checksums stay in `DEVELOPMENT/dist/release-records/`; previous websites are preserved in `DEVELOPMENT/dist/archive/ocelot/`. Follow the [upload guide](docs/OCELOT_UPLOAD_GUIDE.md). Run `npm.cmd run preview:ocelot` to test that package at <http://127.0.0.1:3003/Capstone%20-%20AI/>. Use HTTP/HTTPS, not double-clicked HTML.

**Browser-only storage:** tickets and documents are committed together in IndexedDB, scoped by site and app folder. No failed server request silently falls back to this mode. Clearing site data/private browsing can remove records; export backups privately with **Export browser tickets**. Different browsers/devices have different queues. The first queue is empty; Node/PHP tickets are not imported or erased. Email entry selects a demo identity, not secure access, and no professor email is sent.

**Optional PHP shared queue:** `npm.cmd run package:ocelot:php` builds it into the same generated folder and archives the previous version. It stores tickets outside `public_html` in `.capstone-chat-private` and still needs host-approved private writes. Only this mode uses `ocelot:setup` / `ocelot:check`; see [PHP setup](docs/OCELOT_PHP_GUIDE.md). No local tickets, credentials, `.git`, or `.env` are bundled. Preserve needed old remote data privately before replacing an old full-project upload; uploading over files does not remove obsolete files. No remote files were changed by this work.

The PHP backend passed local integration checks with PHP 8.4.25; its source targets 7.2 syntax for the reported Ocelot runtime. Ocelot returns the app's JSON storage error (HTTP 503); private writes, filesystem locking, sign-in, and shared persistence are not yet verified. The local helper has not been run against the remote filesystem, and this change did not upload files. PHP 7.2 is upstream end-of-life, and this is fictional-data testing only. The [production integration plan](docs/DEPLOYMENT_AND_INTEGRATION_PLAN.md) records the future requirements. PHP supports only the temporary email-demo access; changing Node's password configuration does not secure the PHP deployment.

`npm.cmd run package:upload` still creates the separate two-part **Node** deployment package, now grouped under `dist/node/`. Its private backend needs a running Node process and approved HTTPS proxy. See [Node hosting instructions](docs/HOSTING.md). Do not confuse that package with `package:ocelot` or upload the complete repository. The [documentation index](docs/README.md) groups setup, hosting, feature, and planning guides.

## Run locally

Install a supported Node.js LTS release, version **22 or newer**, as required by `package.json` and the pinned Supabase SDK. Open **DEVELOPMENT** in VS Code, then choose **Terminal → New Terminal**. The terminal must be in `DEVELOPMENT`, where `package.json` lives. In Windows PowerShell use `npm.cmd` to avoid script-execution-policy errors.

```powershell
Test-Path .\package.json
npm.cmd install
npm.cmd start
```

The first command must return **True**; otherwise open the correct project folder before continuing. Run each command separately and stop if one fails. Open <http://localhost:3000> for the student assistant and <http://localhost:3000/pages/staff.html> for the local support queue.

The chat starts minimized. Select the generic chat-bubble **Capstone - AI / Let's chat** button in the bottom-right corner to open it. Use **Minimize chat** (the minus button) or press **Escape** inside the chat to collapse it. Messages and unsent text stay in place until you refresh or leave the page. Selecting a popular topic also opens the chat. Restart the local server and hard-refresh after updating; the new SVG replaces the retired mascot.

## Test

```powershell
npm.cmd test
```

The prototype uses deterministic local retrieval and does not require an API key or paid AI tokens. Submitted support requests are stored locally in `data/tickets.json`, which is excluded from Git.

## Current MVP

- portal-matched student interface, support form, and staff queue (see [design reference](docs/DESIGN_REFERENCE.md))
- floating chat popup that starts minimized and preserves the conversation when reopened
- reviewed local Capstone knowledge base
- deterministic search with ambiguity and no-answer handling
- source link with every factual answer
- clickable keyword links to reviewed Capstone pages and templates, including multiple topics in one question
- support escalation form and local ticket IDs
- Attendance ticket topic and optional document attachments (PDF, DOCX, TXT)
- automatic ticket name/email from a server-verified account, with a clearly labeled local sample session
- staff queue with four visible views, assignee grouping, search, filtering, and status updates
- temporary email-only demo sign-in for the five approved accounts, with a switch to restore password checks, personal assignment views, and claim/reassignment controls
- staff-created tickets for workflow improvements, testing/updates, and implementation/testing, with optional initial assignment
- automatic category tags on every staff-queue card, including existing tickets, searchable using the top search bar
- selectable ticket workspaces with editable fields, priority/status/category/assignee dropdowns, and separate internal work notes and requester-facing comments
- preferred Email/Phone contact with format checks, plus staff-applied project-owner tags

## Restore staff passwords later

Password entry is hidden and disabled in the current temporary mode. To restore it, stop the server, change `staffLoginMode` in `server/config.json` from `email-demo` to `password`, configure each account below, then restart. Alternatively, set `CAPSTONE_STAFF_LOGIN_MODE=password` in the server's environment to override the file. Invalid mode values stop startup; a missing backend never grants access. Restarting clears existing sessions without deleting tickets or attachments.

In the project folder's VS Code terminal, run:

```powershell
npm.cmd run staff:password -- afeli016@fiu.edu
```

Replace the email with your approved staff address, or omit it to choose from the six names. Enter and confirm a **separate prototype password** of 12–128 characters; typing is hidden. Never use your FIU password. No default passwords are bundled. Each local copy needs its own password setup, and only salted password hashes are stored locally, outside Git.

Open <http://localhost:3000/pages/staff.html> and sign in. Your name and four view buttons appear: **All tickets** (the default, grouped by assignee with Unassigned first), **My tickets**, **All resolved**, and **My resolved**. Personal views use the signed-in email and current assignment; **My tickets** includes resolved tickets too. Choose **All tickets → Unassigned only → Claim ticket**, or use a ticket's **Assign to** dropdown to assign it to a teammate. Assignments persist after restarting the server; older tickets start unassigned.

Use **Search tickets** at the top of the queue to see matching cards and a result count while typing, without pressing Enter. Search covers ticket IDs, student names/emails, topics, questions, details, and resolution notes within the selected view and filters. **Clear search** or Escape in the field clears only the search; your view and status filters stay selected.

Select **Create ticket** beneath your signed-in identity to log a staff task. Choose **Workflow and improvements**, **Testing and updates**, or **Implementation and testing**, or an existing support topic such as **Attendance**. Enter a title and details, then leave it **Unassigned** or select yourself/a teammate. Your name/email are filled from the staff session. Saving creates an **Open** ticket, switches to **All tickets**, and shows its ID. Tickets stay local; no email is sent. Restart the server after updating this feature, refresh with **Ctrl+Shift+R**, and sign in again. See the [staff creation testing steps](docs/TEAM_SETUP_GUIDE.md#create-a-ticket-from-the-staff-queue).

For an explicitly local, fictional-data test, `npm.cmd run staff:password -- your-approved-email@fiu.edu --local-test-only` allows an 8–128-character password for that account only. Enter it at the hidden prompt; there is still no bundled password. The account is then restricted to localhost/loopback requests outside production mode. Reset it with the normal command and a 12–128-character password to remove the exception. Restart the server after updating the code and refresh the sign-in page. See [staff access details](docs/STAFF_ACCESS.md).

An invalid sign-in shows **Unauthorized access**, a return link, and a 15-second inactivity countdown. **Try signing in again** cancels the redirect. Staff sessions expire after one hour or on server restart; **Sign out** ends the session immediately. See [staff access details](docs/STAFF_ACCESS.md).

The staff sign-in page remembers the last email accepted by the backend on this browser at this site address and app folder, and prefills it after logout or a later visit. In email-only mode, that is a selected demo identity, not a verified email owner. You can edit it to switch accounts; only a successful sign-in replaces the saved email. This email preference alone never grants access. Separately, Supabase staff login offers an unchecked **Remember me for 7 days** option: after verified login it saves session tokens, never passwords, with a browser-enforced seven-day deadline. Use it only on personal computers; Sign out clears the remembered session. Local preview and Ocelot require separate logins. Restart the preview after changes and refresh with **Ctrl+Shift+R**. See [remembered sessions](docs/SUPABASE_SETUP.md#remember-me-for-7-days) and [remembered email checks](docs/TEAM_SETUP_GUIDE.md#remembered-staff-email).

## Preferred contact and project-owner tags

Both ticket creation forms offer **Preferred method of contact: Email or Phone**. Email uses the requester email (the signed-in account email when available). Phone requires a contact number. U.S./Canada examples accept 10 digits, optional `1`/`+1`, and common spacing; international numbers need `+` and country code. No extensions. Checks run in the form and on the server; they check formatting, not ownership, service availability, or mailbox existence. Requester email remains required even when phone is preferred. No calls or emails are sent.

The staff queue and ticket workspace show the saved preferred contact. Older tickets default to their requester email. Phone preferences are entered manually; they are not pulled from FIU accounts.

Staff can select **Created by a project owner — staff marked** under **Project-owner tag** when creating a staff ticket or editing an existing ticket. Marked tickets show **Project owner · Staff marked** and match a search for `project owner`. This is a staff classification, not automatic owner detection or a verified account role. It does not change the saved creator/requester or grant access. No owner roster has been configured; the student form cannot apply this tag.

Restart the server after updating, hard-refresh both pages, and sign in again. See the [teammate guide](docs/TEAM_SETUP_GUIDE.md#preferred-contact-and-project-owner-tags).

## Open and work a ticket

Select a ticket number or **Open ticket** in any staff queue view. The FIU-styled workspace shows requester data and lets you edit the title, description, category, status, priority, assignee, and internal resolution notes. **Save changes** keeps you in the ticket and updates the queue behind it.

**Work notes — internal only** and **Additional comments — requester-visible** are separate append-only journal fields with staff names and timestamps. Internal notes are never included in the server-generated requester view. **Requester preview** currently lets staff check saved requester-facing content; it is not an end-user page, and comments are not delivered by email. End-user access still needs a separate secure delivery flow.

Unsaved changes prompt before closing/reloading, failed saves preserve the draft, and stale saves are rejected to protect teammate updates. Restart the app after updating these server features, hard-refresh the staff page, and sign in again. See the [workspace testing guide](docs/TEAM_SETUP_GUIDE.md#open-and-work-a-ticket).

## Load sample tickets for testing

Stop the app with **Ctrl+C** first, then run these commands separately:

```powershell
npm.cmd run tickets:seed -- --server-stopped
npm.cmd start
```

This adds **12 fictional resolved tickets with example resolution notes** (two assigned to each staff member) and **5 new open, unassigned tickets** across different site-support topics. These are invented testing scenarios, not actual reports about the FIU site. No email is sent.

Sign in to **Staff queue** and select **All resolved** for the resolved examples, grouped by assignee. Resolution notes are searchable. Choose **All tickets → Unassigned only** to claim the five new requests. Switching views clears search and extra filters; **Refresh queue** keeps the current view and filters.

Existing tickets are preserved, with a local backup at `data/tickets.json.seed-backup-*`. Repeating the command skips this batch without duplicating tickets or resetting staff edits. Tickets and backups stay out of Git; each teammate runs the command on their own copy. The `--server-stopped` flag confirms you have stopped the server; it does not stop it for you.

## Try account autofill

1. Start the app, refresh <http://localhost:3000>, and select **Capstone - AI / Let's chat**.
2. Ask an unsupported question (for example, “Where can I park my car?”).
3. Select **Create support request**, then **Try sample signed-in account**.
4. Name and email fill with **Demo Student / demo.student@example.edu** and become read-only. Complete the help details and create a request.
5. Sign in to the staff queue with a configured staff account, choose **All tickets**, and find the saved contact details and **Sample account · demo only** label.

The sample session lasts one hour and is isolated to the browser. **Stop using sample account** returns to manual entry. It is not a real FIU login; being signed in to the FIU site in another tab does not connect that account to this local app.

Real account autofill needs the project owner to connect a trusted server-side session adapter. See [ACCOUNT_INTEGRATION.md](docs/ACCOUNT_INTEGRATION.md). No AI API or tokens are involved.

## Try attendance and document attachments

In **Create a support request**, choose **Attendance** under **Topic**. Use **Attach documents** to select up to 3 PDF, Word (.docx), or UTF-8 text (.txt) files: 5 MB per file and 10 MB total. Selected files can be removed before submission. For a harmless sample, use `test/fixtures/attendance-note.txt`.

**Staff queue → Create ticket** now includes **Attach documents (optional)** below Details with the same formats and limits. Select files, remove any unwanted selection, and save the ticket. Files are downloadable from its card or opened workspace under **Documents**. Staff Cancel/sign-out clears unsent selections; a read/save error preserves them. Restart `npm.cmd start` after updating the server, hard-refresh with **Ctrl+Shift+R**, and sign in again to test.

After creating the ticket, sign in to **Staff queue**, choose **All tickets**, and download its files under **Documents**. Attachments are saved outside the public web folder in `data/attachments/`, with their metadata in `data/tickets.json`; both locations are ignored by Git. No email is sent. Restart the server after updating to this version, then refresh the browser.

Only use trusted fictional test files. Upload validation is not malware scanning. Downloads now require a valid staff session. See [document upload notes](docs/DOCUMENT_ATTACHMENTS.md) for limits, storage, and production requirements.

This is a local demo, bound to `127.0.0.1`. Approved staff can view all team tickets; assignment is a work filter, not a confidentiality boundary. The privacy checkbox records a preference, not an instructor-only access restriction. Use sample data only; real deployment still needs institutional identity, role/privacy rules, HTTPS, and data retention.
