# Capstone AI Chat

Standalone proof of concept for a zero-token, site-grounded support assistant for the FIU KFSCIS Capstone portal.

The assistant will answer from a reviewed local knowledge base, cite the relevant Capstone page, and route unresolved questions to a local demo support queue. It will not depend on the HelpDesk INC project or call a paid AI API.

See [CAPSTONE_AI_CHAT_PROJECT_PLAN.md](CAPSTONE_AI_CHAT_PROJECT_PLAN.md) for the approved project direction, scope, architecture, and delivery phases.

## Teammates: start here

Follow the maintained [VS Code setup and testing guide](TEAM_SETUP_GUIDE.md) for GitHub access, cloning or ZIP download, installation, test scenarios, troubleshooting, and future updates.

## Run locally

Install a supported Node.js LTS release (the app declares Node 18+). Open this repository's root folder in VS Code, then choose **Terminal → New Terminal**. In Windows PowerShell, use `npm.cmd` so the command works even when PowerShell script execution is restricted.

```powershell
Test-Path .\package.json
npm.cmd install
npm.cmd start
```

The first command must return **True**; otherwise open the correct project folder before continuing. Run each command separately and stop if one fails. Open <http://localhost:3000> for the student assistant and <http://localhost:3000/staff.html> for the local support queue.

## Test

```powershell
npm.cmd test
```

The prototype uses deterministic local retrieval and does not require an API key or paid AI tokens. Submitted support requests are stored locally in `data/tickets.json`, which is excluded from Git.

## Current MVP

- portal-matched student interface, support form, and staff queue (see [design reference](DESIGN_REFERENCE.md))
- reviewed local Capstone knowledge base
- deterministic search with ambiguity and no-answer handling
- source link with every factual answer
- support escalation form and local ticket IDs
- automatic ticket name/email from a server-verified account, with a clearly labeled local sample session
- staff queue with search, filtering, and status updates

## Try account autofill

1. Start the app and refresh <http://localhost:3000>.
2. Ask an unsupported question (for example, “Where can I park my car?”).
3. Select **Create support request**, then **Try sample signed-in account**.
4. Name and email fill with **Demo Student / demo.student@example.edu** and become read-only. Complete the help details and create a request.
5. Open the staff queue to see the saved contact details and **Sample account · demo only** label.

The sample session lasts one hour and is isolated to the browser. **Stop using sample account** returns to manual entry. It is not a real FIU login; being signed in to the FIU site in another tab does not connect that account to this local app.

Real account autofill needs the project owner to connect a trusted server-side session adapter. See [ACCOUNT_INTEGRATION.md](ACCOUNT_INTEGRATION.md). No AI API or tokens are involved.

This is a local demo, bound to `127.0.0.1`. The staff queue has no staff authentication yet, and the privacy checkbox records a preference, not an access restriction. Use sample data only; do not deploy or collect real student tickets before adding authorization and a data-retention policy.
