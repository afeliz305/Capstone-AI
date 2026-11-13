# Integrated MIRA AI experience and classroom demo

Reviewed November 13, 2026. This checkpoint supersedes historical setup blockers, not financial safeguards. No provider call, tester creation, operator recovery or live activation occurs in this release.

## What is implemented

| Surface | Current implementation | Verification / boundary |
|---|---|---|
| Embedded and floating chat | One submit/search handler and bounded reviewed source-ID context | Same deterministic course/FARO retrieval; no duplicate transcript or provider call |
| Follow-ups | Reviewed topic IDs, source selection, explicit topic changes, shorter stand-up draft | A-G conversation tests; unknown topics do not reuse an unrelated answer |
| Workspace | Shared AI gateway for seven draft-only actions | Local mock; private/local context stays ineligible for external processing |
| Cloudflare Function | Server-only Responses adapter for gpt-6.1-sol | Previously verified fixed-case request; not general conversational live AI |
| Spending | Shared durable $25 lifetime ledger, reservations, reconciliation and operator recovery | Existing implementation unchanged; halt remains active |
| Restricted live demo | Existing tester-only fixed public-program fixture | BLOCKED pending a new bounded paid-test authorization, fresh tester and pricing checks; no public activation |

The public chat is not currently sending arbitrary course questions or conversation history to GPT-6.1 Sol. Both chat interfaces use the same grounding route, while workspace drafts use the mock gateway. The fixed-case live Function cannot be used as a general chat backend without a separate reviewed expansion. This intentional boundary must remain clear in the presentation.

## Confirmed repairs

- A stand-up followed by “Make that shorter” previously returned unmatched. The shared handler now passes the reviewed source IDs and the policy router produces a labeled, unsubmitted template with placeholders. The source cadence conflict remains visible.
- Browser gateway requests previously had no deadline. Fetch and body-reading now share a bounded timeout with abort and deterministic fallback; no retry is made.
- A provider answer containing an invented citation ID is now rejected instead of displaying text alongside a silently filtered citation list. Server-side usage reconciliation is unchanged and still precedes citation validation.
- Public embedded/floating status explicitly says “Course sources · live AI off.”
- Multipart criteria/evidence answers previously linked both sources but displayed only the first explanation. The response now combines the two reviewed explanations and retains both citations.

## Two-minute AI-focused classroom sequence (no spending)

1. In the embedded composer ask “What are acceptance criteria?” Read the answer and source link. Say: built-in reviewed retrieval, not a live model response.
2. In the floating composer ask “What evidence do I need?” Explain the distinction between evidence, verification, acceptance and Done.
3. Ask “How do I prepare a standup?” then “Make that shorter.” Point out the retained template sources, blank factual fields, and cadence uncertainty. Nothing is posted.
4. Ask “How do I prepare a Sprint Review?” then “And retrospective?” Show the explicit topic switch.
5. In Team Workspace select a historical card and choose Prepare evidence or Ask a teammate. Point to “Mock AI,” draft-only and snapshot labels. Do not describe these outputs as Sol-generated.
6. Show the recorded live-test facts below separately. If asked to activate Sol, explain that the financial halt is intentional and additional paid testing needs separate approval.

## Recorded Sol acceptance — not a live demo

Existing sanitized evidence: local `dist/staging/SOL_ACCEPTANCE_FINAL.md`. Model gpt-6.1-sol; HTTP 200, completed response; 223 input and 268 output tokens including zero reasoning tokens. The fixed fictional program question used only the reviewed public program excerpt. Last verified cumulative ledger: **$0.003915 spent, $0 reserved, $24.996085 available**, halted. These are historical usage-derived accounting figures, not a fresh provider invoice or new ledger read. New spending in this task: **$0**. No generated answer is fabricated or replayed as a new provider response.

## Exact future activation gates and shutdown order

This is an operator runbook, not authorization to execute it now. Use the existing account/project/namespace; never initialize a replacement ledger or reuse the invalidated tester.

1. Obtain explicit authorization for the number and scope of additional paid requests. Recheck current project model availability and pricing, including conservative cache/token accounting. Confirm no unresolved reservations, available lifetime/day/request capacity, and exact ledger revision through the existing private operator mechanism.
2. Use the existing separate DPAPI-protected operator mechanism only after those gates. Recovery requires the exact current revision, a unique request ID, reason `reviewed-controlled-test-complete`, and a non-sensitive evidence identifier. Do not reset history or release uncertain holds.
3. Configure a fresh high-entropy tester credential through the approved secure mechanism; install only its SHA-256 as `MIRA_AI_TESTER_SHA256`. Never put it in the public website, URL, transcript or slide. Keep `OPENAI_API_KEY` encrypted and server-only.
4. The controlled environment must have `MIRA_AI_PROVIDER=openai`, `MIRA_AI_LIVE_ENABLED=true`, `MIRA_AI_CONTROLLED_TESTS=true`, `MIRA_AI_KILL_SWITCH=off`, `MIRA_OPENAI_MODEL=gpt-6.1-sol`, `MIRA_AI_VERIFIED_MODEL=gpt-6.1-sol`, freshly reviewed input/output rates and `MIRA_AI_PRICING_VALID_UNTIL` no more than 24 hours ahead. Preserve the same `MIRA_AI_BUDGET` binding and `mira-usd25-lifetime-v1` identity. Set `MIRA_AI_CONTROLLED_OUTPUT_TOKENS` within 128–512 and the general output limit. Verify the private ledger kill switch and unauthorized denial with mocks first.
5. Only the authorized operator may send the exact body `{ "task": "next-steps", "testCase": "public-program-v1" }` with the separate tester bearer credential through the secure operator client. The server substitutes its own fixed fictional question and public excerpt. Do not add prompts, history, source text, tickets or personal records. Reserve $0.25 atomically before transmission; perform no automatic retry.
6. Record only sanitized model/status/token/cost/citation and ledger results. A timeout or unknown outcome retains its reservation. A rejected answer with known usage still costs money and must be reconciled. Reasoning tokens are already part of total output tokens.
7. In a guaranteed shutdown/finally path, halt the existing ledger through the private operator mechanism, restore `MIRA_AI_PROVIDER=mock`, `MIRA_AI_LIVE_ENABLED=false`, `MIRA_AI_CONTROLLED_TESTS=false`, and `MIRA_AI_KILL_SWITCH=on`; invalidate the temporary tester hash. Verify public mock response, unauthorized paid rejection, private halt read-back and unchanged reservation history. Do not claim shutdown until verified.

No general-public paid endpoint, arbitrary multi-turn provider history, or portal submission is enabled by this procedure. A kill switch prevents new calls, not cancellation of a request already accepted by the provider.

## Official references and verification

The [Sol model reference](https://developers.openai.com/api/docs/models/gpt-6.1-sol) confirms the exact model and Responses support. [Conversation-state guidance](https://developers.openai.com/api/docs/guides/conversation-state) explains API conversation persistence and `store:false`; MIRA deliberately does not send public chat history to that API. Provider retention settings are not a substitute for excluding private data.

Run `node --test test/conversation-readiness.test.js test/ai-gateway.test.js test/chat-popup.test.js`, the budget/runtime suites, full `npm.cmd test`, clean Cloudflare packaging, and `node scripts/smoke-presentation.js` against the candidate and deployed immutable URL. Evidence and release identity are saved under ignored `dist/presentation/INTEGRATED_AI_RELEASE.json`. Optional PHP coverage is not a live Cloudflare test.
