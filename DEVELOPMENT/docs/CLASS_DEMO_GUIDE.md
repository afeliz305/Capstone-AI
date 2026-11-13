# MIRA class demonstration and handoff

Prepared November 12, 2026. MIRA means Messaging, Information & Resolution Assistant. Current preview: https://mira-9gg.pages.dev/. This guide supersedes older candidate-status paragraphs for classroom operation; historical release records remain evidence of their dates.

## Six-minute demonstration

| Time | Action | Say / verify |
|---|---|---|
| 0:00–0:40 | Open the dashboard; briefly open navigation and Profile | MIRA combines course guidance, navigation, work preparation and support. It is a pre-integration proof of concept. |
| 0:40–1:25 | Ask the embedded composer “What are acceptance criteria?” | Read the sourced answer. Open the citation only if the portal is already signed in; otherwise show the destination. A source link is not a claim of live account access. |
| 1:25–2:30 | Select CAP-1316 in Team Workspace | Point to “Snapshot, not live portal state.” Enter fictional evidence in one criterion: “Fictional demo: test output prepared for review.” Choose Check my progress and What's missing? |
| 2:30–3:20 | Choose Prepare evidence and Ask a teammate | These are mock draft recommendations. Evidence prepared does not mean submitted, verified, accepted or Done. MIRA makes no portal changes. |
| 3:20–4:05 | Prepare from selected card; inspect duplicate warning | Draft remains local. The warning uses the historical snapshot; confirm current portal state before manually posting. Never submit during the demo. |
| 4:05–4:45 | Inspect Sprint Review and Retrospective prompts | Explain unfinished work, evidence gaps, human decisions and improvement proposals. |
| 4:45–5:25 | Use floating MIRA: “Where is my grade?” | Show the honest personal-data boundary and portal shortcut. Show a sourced course answer next. |
| 5:25–6:00 | Optional signed-in Staff Queue, otherwise signed-out screen | Authorized staff may inspect fictional tickets read-only. Do not change status, notes, passwords or attachments. Close with limitations and proposed integration. |

Keep both assistant entry points on the same knowledge backend. Do not call mock drafts live OpenAI. The prior GPT-6.1 Sol result is a **recorded controlled test**, not an enabled public feature.

## Reliable offline fallback

Before class, install dependencies and build while online. In DEVELOPMENT:

```powershell
npm.cmd ci
$env:MIRA_PUBLIC_ORIGIN='https://mira-9gg.pages.dev/'
npm.cmd run package:cloudflare
npm.cmd run verify:cloudflare
npm.cmd run preview:cloudflare
```

Open http://127.0.0.1:3010/. Keep that terminal open. The packager also requires the approved Supabase URL/publishable configuration, from environment variables or the existing local configuration. Never use a privileged key. The local preview serves only verified public files and invokes the production Function's mock handler with an empty environment. It cannot activate the real provider even if the shell has live-provider variables.

Once built, course retrieval, workspace drafts and slides work without Wi-Fi. Supabase sign-in and external citations still require a network. If authentication fails, show the signed-out screen and explain the access boundary. If Cloudflare fails, use this local preview. If all servers fail, open the self-contained HTML slides or PDF in dist/presentation. Screenshots are labeled recorded evidence. Do not improvise a paid AI call or loosen security during class.

## Architecture and deployment

```mermaid
flowchart LR
  Student[Browser: HTML / CSS / JavaScript] --> Knowledge[Packaged reviewed course / FARO knowledge]
  Student --> Pages[Cloudflare Pages + Pages Function]
  Pages --> Mock[Mock provider: current demonstration mode]
  Pages -. separately controlled testing .-> Ledger[Private Durable Object / persistent budget ledger]
  Ledger -. bounded authorized request .-> OpenAI[OpenAI Responses API]
  Staff[Authorized staff browser] --> Supabase[Supabase Auth / PostgreSQL RLS / Storage]
  Student --> Portal[Portal navigation: official source of record]
```

Node.js runs development, packaging and tests. Supabase uses PostgreSQL and SQL policies; browser and Cloudflare application code are JavaScript. Cloudflare Pages hosts the public bundle; Pages Functions enforce AI boundaries; a separate private Worker hosts the persistent Durable Object ledger. Ocelot remains unchanged as rollback. The optional local connector is session-scoped read-only development tooling, not a hosted automatic portal connection.

Publish only reviewed source to preview/mira-cloudflare. Cloudflare builds DEVELOPMENT with npm ci and npm run package:cloudflare, output dist/cloudflare/MIRA. Verify the full deployed commit, immutable URL, all 32 downloadable hashes, the configuration-only _headers entry and recovery no-store. Never upload DEVELOPMENT or runtime data. Main and Ocelot require separate migration approval.

## Feature inventory and boundaries

| Capability | Current demonstration behavior |
|---|---|
| Course / FARO questions | Reviewed answers, excerpts, citations, clarifying choices and honest missing evidence |
| Embedded + floating MIRA | Same retrieval; no public paid inference |
| Team Workspace | Historical Sprint 5 snapshot, card criteria, seven draft-only actions |
| Evidence assessment | Draft evidence count; does not assert verification or acceptance |
| Stand-up / ceremonies | Draft fields, duplicate warning, Sprint Review and Retro prompts |
| Personal information | Portal navigation or explicitly shared temporary context; no automatic hosted private reads |
| Staff Queue | Supabase Auth plus active staff binding, protected tickets and attachments; fresh owner-session check pending |
| Recovery | Signed-out UI and no-store page; no reset email in this acceptance run |
| AI gateway | Mock provider now; one previously verified controlled Sol test, persistent financial controls preserved |

## Student and teammate quick start

For hosted testing, open the preview without installing anything. Use fictional text. Ask a course question and inspect its source. For personal results, open the official portal. Use workspace assistance to prepare drafts, then obtain human verification and approval through the official workflow.

For source work, clone afeliz305/Capstone-AI, select preview/mira-cloudflare and open DEVELOPMENT in VS Code. Run npm.cmd ci, npm.cmd test and npm.cmd start; use the URL printed by the server. Do not open index.html directly or use a static server for the Node transport. See TEAM_SETUP_GUIDE.md for detailed troubleshooting and alternative modes.

Build environment names (values deliberately omitted): MIRA_PUBLIC_ORIGIN, MIRA_SUPABASE_URL, MIRA_SUPABASE_PUBLISHABLE_KEY. Current runtime mode: MIRA_AI_PROVIDER=mock, MIRA_AI_LIVE_ENABLED=false. Server-only encrypted secret name: OPENAI_API_KEY. A key is neither required nor requested for this demo. See AI_CONTROLLED_BUDGET.md for controlled-test/operator configuration; do not copy credentials into assets or guides.

## Operator runbook

Before class: verify site and local fallback, rehearse the script, keep PDF available, use a clean browser window, confirm no real student data on screen, and sign into Staff Queue personally only if that optional segment is desired. No password or token belongs in slides, screenshots or logs.

During class: keep mock mode and the persistent kill switch. Do not issue tester credentials, recover the ledger or send paid requests. The last verified ledger is $0.003915 spent, $0 reserved, $24.996085 available. It limits MIRA-controlled usage, not unrelated spending in the classmate's API project.

After class: sign out, clear fictional drafts, close the local server when finished. Do not delete shared tickets without separate approval. Preserve unresolved reservations if a future authorized provider test has an uncertain outcome. Use the documented operator-only audited procedure, never manual ledger edits.

## Limitations and future work

- Current hosted portal snapshot is historical. Automatic private dashboard access and portal-native integration require portal-owner-approved identity, read scopes and adapters.
- Fresh email-code login may lose the requested destination; use the shortcut again after login.
- Public AI remains mock/deterministic. A future live demonstration needs a new bounded request approval and all financial/privacy gates.
- The optional authenticated Staff Queue walkthrough needs an accessible owner session. Local Auth/RLS regression tests are not fresh hosted login evidence.
- 200% automated coverage uses CSS zoom/reflow; presenter should also check native browser zoom on the classroom display.
- Optional PHP runtime parity is not part of this Cloudflare release's live verification.
- Team roster: Anthony Feliz, Christopher Hernandez, Michael Alvarez, Romelin Charnel and Zavier Richardson, based on the approved staff roster. Individual contributions and presenter assignments remain unverified; confirm them with the team before assigning credit. Raul is not an active team member in this record.

Future work: portal-native integration, approved current-context synchronization, broader independently reviewed knowledge coverage, accessibility testing with assistive technology, and bounded AI evaluation after explicit authorization. No invented adoption, performance or instructor-approval claims are used.

## Presentation checklist

- [ ] Rehearse the six-minute script and assign presenters using confirmed contributions.
- [ ] Open hosted site and prebuilt local fallback before class.
- [ ] Open slides/PDF and confirm display scaling.
- [ ] Keep historical/mock/recorded labels visible.
- [ ] Optional: owner signs in, reads only fictional tickets, verifies attachment access, signs out; record result separately.
- [ ] Do not send recovery email, post stand-ups, edit portal cards or activate paid AI.
- [ ] Close with the proposed integration phase, not a claim of official FIU deployment.

Suggested closing: “The pre-integration proof of concept supports grounded course guidance, navigation, draft preparation and a protected support workflow. No professor-portal modification was required. Automatic personal-dashboard access remains a proposed integration phase.”
