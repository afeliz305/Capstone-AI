# Capstone AI Chat

Standalone proof of concept for a zero-token, site-grounded support assistant for the FIU KFSCIS Capstone portal.

The assistant will answer from a reviewed local knowledge base, cite the relevant Capstone page, and route unresolved questions to a local demo support queue. It will not depend on the HelpDesk INC project or call a paid AI API.

See [CAPSTONE_AI_CHAT_PROJECT_PLAN.md](docs/CAPSTONE_AI_CHAT_PROJECT_PLAN.md) for the approved project direction, scope, architecture, and delivery phases.

## Teammates: start here

The [GitHub repository](https://github.com/afeliz305/Capstone-AI-Chat) is public: anyone can view, clone, or download the source without an invitation. This shares the source code, not a hosted app or your local ticket queue. Staff passwords, tickets, attachments, and local backups remain excluded from Git.

Follow the maintained [VS Code setup and testing guide](docs/TEAM_SETUP_GUIDE.md) for GitHub access, cloning or ZIP download, installation, test scenarios, troubleshooting, and future updates.

## Project folders

The homepage is **`index.html` at the project root**. Other files are organized by purpose:

```text
index.html          Student assistant homepage
pages/              Other HTML pages (staff.html)
css/                Stylesheets, with images/ and fonts/ inside
js/                 Browser code: chat/, staff/, shared/
docs/               Guides and font license
server/             Node backend and server-only helpers
scripts/            Password setup and sample-ticket commands
data/               Knowledge base and private local runtime data
test/               Automated tests and fictional fixtures
```

`README.md`, `AGENTS.md`, and npm configuration stay at the root for discovery and startup. Existing local tickets, passwords, and uploaded documents have not moved. **The complete app still needs Node.js; a root index does not make login, search, tickets, or uploads work on HTML-only hosting.** The Node server exposes only an explicit static-file allowlist, not the entire repository. Never put private `data/`, `.env`, or credential files in an unrestricted public web folder. See the [folder and hosting notes](docs/TEAM_SETUP_GUIDE.md).

After getting this folder update, restart with `npm.cmd start` (now runs `server/server.js`) and refresh with **Ctrl+Shift+R**. The staff page is now `/pages/staff.html`; existing `/staff.html` bookmarks redirect there when using the Node server.

## Run locally

Install a supported Node.js LTS release (the app declares Node 18+). Open this repository's root folder in VS Code, then choose **Terminal → New Terminal**. In Windows PowerShell, use `npm.cmd` so the command works even when PowerShell script execution is restricted.

```powershell
Test-Path .\package.json
npm.cmd install
npm.cmd start
```

The first command must return **True**; otherwise open the correct project folder before continuing. Run each command separately and stop if one fails. Open <http://localhost:3000> for the student assistant and <http://localhost:3000/pages/staff.html> for the local support queue.

The chat starts minimized. Select **Chat with Capstone** in the bottom-right corner to open it. Use **Minimize chat** (the minus button) or press **Escape** inside the chat to collapse it. Messages and unsent text stay in place until you refresh or leave the page. Selecting a popular topic also opens the chat.

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
- password-protected staff sign-in for the six approved accounts, with personal assignment views and claim/reassignment controls
- staff-created tickets for workflow improvements, testing/updates, and implementation/testing, with optional initial assignment
- automatic category tags on every staff-queue card, including existing tickets, searchable using the top search bar
- selectable ticket workspaces with editable fields, priority/status/category/assignee dropdowns, and separate internal work notes and requester-facing comments
- preferred Email/Phone contact with format checks, plus staff-applied project-owner tags

## Set your staff password

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

The staff sign-in page remembers the last successfully signed-in email on this browser and prefills it after logout or a later visit. You can edit it to switch accounts; only a successful sign-in replaces the saved email. This does not sign you in automatically or save passwords/session tokens in browser storage. Refresh with **Ctrl+Shift+R** to get this update; no server restart is needed. See the [remembered email checks](docs/TEAM_SETUP_GUIDE.md#remembered-staff-email).

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

1. Start the app, refresh <http://localhost:3000>, and select **Chat with Capstone**.
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
