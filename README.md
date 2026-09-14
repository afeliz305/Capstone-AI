# Capstone AI Chat

Standalone proof of concept for a zero-token, site-grounded support assistant for the FIU KFSCIS Capstone portal.

The assistant will answer from a reviewed local knowledge base, cite the relevant Capstone page, and route unresolved questions to a local demo support queue. It will not depend on the HelpDesk INC project or call a paid AI API.

See [CAPSTONE_AI_CHAT_PROJECT_PLAN.md](CAPSTONE_AI_CHAT_PROJECT_PLAN.md) for the approved project direction, scope, architecture, and delivery phases.

## Teammates: start here

The [GitHub repository](https://github.com/afeliz305/Capstone-AI-Chat) is public: anyone can view, clone, or download the source without an invitation. This shares the source code, not a hosted app or your local ticket queue. Staff passwords, tickets, attachments, and local backups remain excluded from Git.

Follow the maintained [VS Code setup and testing guide](TEAM_SETUP_GUIDE.md) for GitHub access, cloning or ZIP download, installation, test scenarios, troubleshooting, and future updates.

## Run locally

Install a supported Node.js LTS release (the app declares Node 18+). Open this repository's root folder in VS Code, then choose **Terminal → New Terminal**. In Windows PowerShell, use `npm.cmd` so the command works even when PowerShell script execution is restricted.

```powershell
Test-Path .\package.json
npm.cmd install
npm.cmd start
```

The first command must return **True**; otherwise open the correct project folder before continuing. Run each command separately and stop if one fails. Open <http://localhost:3000> for the student assistant and <http://localhost:3000/staff.html> for the local support queue.

The chat starts minimized. Select **Chat with Capstone** in the bottom-right corner to open it. Use **Minimize chat** (the minus button) or press **Escape** inside the chat to collapse it. Messages and unsent text stay in place until you refresh or leave the page. Selecting a popular topic also opens the chat.

## Test

```powershell
npm.cmd test
```

The prototype uses deterministic local retrieval and does not require an API key or paid AI tokens. Submitted support requests are stored locally in `data/tickets.json`, which is excluded from Git.

## Current MVP

- portal-matched student interface, support form, and staff queue (see [design reference](DESIGN_REFERENCE.md))
- floating chat popup that starts minimized and preserves the conversation when reopened
- reviewed local Capstone knowledge base
- deterministic search with ambiguity and no-answer handling
- source link with every factual answer
- support escalation form and local ticket IDs
- Attendance ticket topic and optional document attachments (PDF, DOCX, TXT)
- automatic ticket name/email from a server-verified account, with a clearly labeled local sample session
- staff queue with search, filtering, and status updates
- password-protected staff sign-in for the six approved accounts, with personal assignment views and claim/reassignment controls

## Set your staff password

In the project folder's VS Code terminal, run:

```powershell
npm.cmd run staff:password -- afeli016@fiu.edu
```

Replace the email with your approved staff address, or omit it to choose from the six names. Enter and confirm a **separate prototype password** of 12–128 characters; typing is hidden. Never use your FIU password. No default passwords are bundled. Each local copy needs its own password setup, and only salted password hashes are stored locally, outside Git.

Open <http://localhost:3000/staff.html> and sign in. Your name and **Assigned to me** view appear. Choose **Unassigned tickets → Claim ticket**, or use a ticket's **Assign to** dropdown to assign it to a teammate. Assignments persist after restarting the server; older tickets start unassigned.

An invalid sign-in shows **Unauthorized access**, a return link, and a 15-second inactivity countdown. **Try signing in again** cancels the redirect. Staff sessions expire after one hour or on server restart; **Sign out** ends the session immediately. See [staff access details](STAFF_ACCESS.md).

## Load sample tickets for testing

Stop the app with **Ctrl+C** first, then run these commands separately:

```powershell
npm.cmd run tickets:seed -- --server-stopped
npm.cmd start
```

This adds **12 fictional resolved tickets with example resolution notes** (two assigned to each staff member) and **5 new open, unassigned tickets** across different site-support topics. These are invented testing scenarios, not actual reports about the FIU site. No email is sent.

Sign in to **Staff queue**, select **All team tickets**, and use the status filter to view the resolved examples. Resolution notes are searchable. Choose **Unassigned tickets** to claim the five new requests.

Existing tickets are preserved, with a local backup at `data/tickets.json.seed-backup-*`. Repeating the command skips this batch without duplicating tickets or resetting staff edits. Tickets and backups stay out of Git; each teammate runs the command on their own copy. The `--server-stopped` flag confirms you have stopped the server; it does not stop it for you.

## Try account autofill

1. Start the app, refresh <http://localhost:3000>, and select **Chat with Capstone**.
2. Ask an unsupported question (for example, “Where can I park my car?”).
3. Select **Create support request**, then **Try sample signed-in account**.
4. Name and email fill with **Demo Student / demo.student@example.edu** and become read-only. Complete the help details and create a request.
5. Sign in to the staff queue with a configured staff account, choose **All team tickets**, and find the saved contact details and **Sample account · demo only** label.

The sample session lasts one hour and is isolated to the browser. **Stop using sample account** returns to manual entry. It is not a real FIU login; being signed in to the FIU site in another tab does not connect that account to this local app.

Real account autofill needs the project owner to connect a trusted server-side session adapter. See [ACCOUNT_INTEGRATION.md](ACCOUNT_INTEGRATION.md). No AI API or tokens are involved.

## Try attendance and document attachments

In **Create a support request**, choose **Attendance** under **Topic**. Use **Attach documents** to select up to 3 PDF, Word (.docx), or UTF-8 text (.txt) files: 5 MB per file and 10 MB total. Selected files can be removed before submission. For a harmless sample, use `test/fixtures/attendance-note.txt`.

After creating the ticket, sign in to **Staff queue**, choose **All team tickets**, and download its files under **Documents**. Attachments are saved outside the public web folder in `data/attachments/`, with their metadata in `data/tickets.json`; both locations are ignored by Git. No email is sent. Restart the server after updating to this version, then refresh the browser.

Only use trusted fictional test files. Upload validation is not malware scanning. Downloads now require a valid staff session. See [document upload notes](DOCUMENT_ATTACHMENTS.md) for limits, storage, and production requirements.

This is a local demo, bound to `127.0.0.1`. Approved staff can view all team tickets; assignment is a work filter, not a confidentiality boundary. The privacy checkbox records a preference, not an instructor-only access restriction. Use sample data only; real deployment still needs institutional identity, role/privacy rules, HTTPS, and data retention.
