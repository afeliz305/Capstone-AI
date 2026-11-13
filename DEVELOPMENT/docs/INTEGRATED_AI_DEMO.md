# Integrated MIRA classroom AI

## Architecture and boundaries

Both composers share capstone-chat.js. Default questions use reviewed deterministic course/FARO retrieval. Workspace assistance remains labeled mock/draft-only. A restricted browser session sends only four exact approved classroom questions to /api/demo. The Function selects canonical prompts and evidence from its server-side catalog; browser excerpts, personal context and arbitrary history cannot enter OpenAI requests. The evidence follow-up uses the preceding Done topic. This is bounded conversational demonstration, not unrestricted live chat.

The existing OPENAI_API_KEY stays encrypted in Cloudflare Production. The lifetime Durable Object enforces atomic $0.25 reservations, $25 cumulative spending, 2 attempts/minute, 10/day and at most two uncertain reservations. A separate **$1 cumulative integration campaign** baseline persists in the same object and never resets when a session restarts. Unrelated provider-project charges are not covered.

An operator-authenticated session installs a random tester hash with configurable 1-60 minute expiry. The browser exchanges its temporary code for a Secure, HttpOnly, SameSite=Strict cookie. No tester credential is bundled, stored in localStorage, included in URLs or recorded in acceptance artifacts. Every live reservation checks authorization and expiry atomically. Operator stop revokes the session and persists the halt; accepted in-flight calls may still finish and must reconcile.

Responses use gpt-6.1-sol, store:false, low reasoning, no tools and no retries. At most 4096 conservative input-token units and 512 total output tokens, including reasoning, are allowed. Standard published prices checked November 13, 2026 are $2 input/$10 output per million tokens; the ledger conservatively accounts input at $5 to cover cache-write pricing. Usage settles before citation validation. Unknown outcomes retain reservations. Numeric citations must reference the selected catalog; syntactic validation does not guarantee semantic correctness, so live acceptance includes answer review.

References: [Sol](https://developers.openai.com/api/docs/models/gpt-6.1-sol), [pricing](https://developers.openai.com/api/docs/pricing), [durable storage](https://developers.cloudflare.com/durable-objects/api/sqlite-storage-api/).

## Operator start and stop

Prerequisites: approved deployment and current pricing review, existing Wrangler login, existing Windows DPAPI operator credential, zero unresolved reservations, and remaining campaign/day/lifetime capacity. No API-key entry or Supabase change is required. Never deploy the local bridge publicly.

From DEVELOPMENT, keep this terminal open:

```powershell
npx.cmd wrangler dev --remote --config scripts/demo-operator.wrangler.jsonc --ip 127.0.0.1 --port 8798
```

In a second terminal:

```powershell
powershell.exe -NoProfile -ExecutionPolicy Bypass -File scripts/start-classroom-demo.ps1 -Minutes 15
```

Choose the duration deliberately; 15 minutes is an example, not an assumed class time. The script reads the protected operator credential without displaying it, checks the hosted audit, recovers only a reconciled controlled-test-complete halt, starts the bounded session, opens a dedicated Edge window and signs the demonstrator in through the website form. Close that window to stop. Normal exit and errors invoke /demo-stop and verify the halt. Process termination or network loss can prevent cleanup: expiry still denies new paid calls, and the operator must verify/stop the session after reconnecting. Never release uncertain reservations to continue.

The browser Disconnect button removes its cookie; it is not a global kill switch. Operator stop is global. Reloaded pages require Check existing demo session. Expiry/revocation is checked server-side. Refreshing cannot extend a session.

The -Acceptance switch performs four billable questions, not a generic smoke test. It requires remaining authorized campaign capacity. It captures only fictional answers, source IDs, usage totals and post-login screenshots under ignored dist/presentation/. Do not repeat it merely to improve screenshots. A failed live result stops without retries or model switching.

## Six-minute demonstration

1. **0:00-0:45:** Explain the Capstone problem and dashboard. Identify the historical workspace snapshot and official portal as source of record.
2. **0:45-1:45:** Embedded composer: What do I need to complete before a sprint card is considered Done? Show the live Sol label and citations. Distinguish implementation, evidence, verification, acceptance and Done.
3. **1:45-2:30:** Floating composer: What evidence should I prepare for that? Explain bounded follow-up context and inspect citations.
4. **2:30-3:30:** After the global minute limit permits: Help me draft a stand-up for a fictional card where I finished the UI but still need testing. Explain placeholders, missing testing, template labels and cadence conflict.
5. **3:30-4:15:** How do I prepare both Sprint Review and Retrospective? Explain product inspection versus process improvement. Nothing is posted.
6. **4:15-5:15:** Show Team Workspace, evidence and seven draft-only actions with their separate mock label. Personal-grade and grading-exception questions remain deterministic boundaries, not paid requests.
7. **5:15-6:00:** Show Staff Queue only if already authorized; do not edit records. Close the demo window. Verify session revoked, ledger halted and spending reconciled.

Offline fallback: existing PDF and deterministic local preview. Explicitly call screenshots recorded results and workspace output mock guidance. Never present them as a new provider response.

## Evidence and limits

Before integration, the hosted ledger read $0.003915 spent, $0 held, halted for completed testing. Current results belong in dist/presentation/CLASSROOM_LIVE_ACCEPTANCE.json; historical values are not a fresh invoice. Initial non-billable checks: 415 passed, 0 failed, one optional PHP skip; generated browser, branding/responsive and Function compilation passed. Final hosted results are recorded after publication.

Outside scope: arbitrary/private student questions sent to AI, automatic hosted portal synchronization, portal writes, account-wide billing controls and unrestricted public paid access. Supabase staff authentication is independent of the demonstrator cookie. Staff records are never AI evidence. Main, Ocelot, Supabase, portal records and FARO remain unchanged.
