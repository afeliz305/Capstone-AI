# MIRA unified team workspace

Status: local owner-review candidate, November 12, 2026. No portal, Supabase, Ocelot, Git, or external AI change was made.

## What is implemented

The existing MIRA dashboard now contains one integrated Sprint Workspace. It is not a second application. Students can switch between team and individual views, filter Sprint 5 cards, select a permitted card, review acceptance criteria and dependencies, draft criterion evidence, create actionable steps, prepare a teammate handoff, draft the three portal stand-up fields, and prepare Sprint Review or Retrospective notes.

The workspace deliberately uses the verified November 12 portal audit as a **snapshot**. It never claims the snapshot is current. The live portal board remains authoritative for ownership, status, evidence, submission, verification, and acceptance.

Every workspace object has a source/state boundary:

| Information | Source | State shown | Permission |
| --- | --- | --- | --- |
| Sprint/card/owner/status/dependency | November 12 portal audit | Snapshot | Read-only |
| Existing evidence counts | November 12 portal audit | Verified or unavailable | Read-only |
| Criterion evidence typed in MIRA | Student | Draft | Browser page only |
| Stand-up text | MIRA/student | Draft, not submitted | Browser page only |
| Review/retro text | MIRA/student | Draft, not submitted | Browser page only |
| Portal submission/status movement | Capstone portal | Unavailable in MIRA | No write permission |

## Card preparation

Selecting a card supports seven preparation activities without changing the portal:

1. Read the audited details and acceptance criteria.
2. Ask the existing grounded MIRA assistant to explain the requirements.
3. Break work into a confirmation, implementation, evidence, verification, and authorized-portal sequence.
4. Draft evidence for each criterion.
5. Count which criteria have a draft evidence statement; this never marks them verified or accepted.
6. Draft a teammate handoff with owner, snapshot status, dependency, and requested review.
7. Review remaining missing evidence before a human verification/approval step.

## Stand-up Assistant

The draft uses the portal's exact fields:

- What I did
- What I will do
- What's blocking me

The last verified snapshot shows 2 of 2 weekly submissions and 4 of 4 Sprint 5 submissions. Therefore every generated draft displays a duplicate warning and requires the student to check the current portal. A possible dependency is not called a blocker until the student confirms it. MIRA has no Post/Submit action.

## Review and retrospective

Sprint Review preparation asks what was demonstrated, which criteria have evidence, what remains unfinished/human-decided, and who will verify it. Retrospective preparation uses Keep, Change, and one specific team experiment. Both remain editable local drafts.

## Future authorized submission design

Any future write integration must follow this sequence:

`Draft -> Human review -> Explicit approval -> Authorized portal submission -> Read-back confirmation`

Before implementation, the portal owner must provide a documented same-origin write API or an approved authenticated submission contract, field-level authorization, CSRF/replay protection, idempotency, conflict/version handling, audit records, and a read-back receipt. DOM automation, copied session cookies, or browser scraping is not an authorized submission API. No live-write experiment was performed.
