# Capstone AI Chat

Standalone proof of concept for a zero-token, site-grounded support assistant for the FIU KFSCIS Capstone portal.

The assistant will answer from a reviewed local knowledge base, cite the relevant Capstone page, and route unresolved questions to a local demo support queue. It will not depend on the HelpDesk INC project or call a paid AI API.

See [CAPSTONE_AI_CHAT_PROJECT_PLAN.md](CAPSTONE_AI_CHAT_PROJECT_PLAN.md) for the approved project direction, scope, architecture, and delivery phases.

## Run locally

Requires Node.js 18 or newer. In Windows PowerShell, use `npm.cmd` so the command works even when PowerShell script execution is restricted.

```powershell
cd "C:\Users\afeli\Desktop\Capstone AI Chat"
npm.cmd install
npm.cmd start
```

Open <http://localhost:3000> for the student assistant and <http://localhost:3000/staff.html> for the local support queue.

## Test

```powershell
npm.cmd test
```

The prototype uses deterministic local retrieval and does not require an API key or paid AI tokens. Submitted support requests are stored locally in `data/tickets.json`, which is excluded from Git.

## Current MVP

- FIU-styled student support interface
- reviewed local Capstone knowledge base
- deterministic search with ambiguity and no-answer handling
- source link with every factual answer
- support escalation form and local ticket IDs
- staff queue with search, filtering, and status updates
