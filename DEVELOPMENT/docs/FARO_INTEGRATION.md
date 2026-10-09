# FARO reviewed-knowledge integration

Updated October 9, 2026. This document records the bounded integration of the existing [FARO audit](FARO_DEEP_KNOWLEDGE_AUDIT.md) and [review dataset](faro-review-dataset.json). No new FARO scrape was performed.

## Scope and source precedence

FARO is a reviewed secondary source, not universal course authority. MIRA uses this precedence when sources cover the same scope:

1. Current-term official syllabus or instructor source.
2. Current portal instruction.
3. Current official public Capstone source.
4. Reviewed static FARO content.
5. Reviewed historical or general guidance.

Each directly indexed FARO item retains its stable ID, canonical question, reviewed answer, category, `FARO_CURATED` provenance, original FARO source reference, underlying current portal source, authority, term/applicability, aliases, navigation target, and review date. The user-facing source remains the verified Capstone portal Board rather than presenting FARO as the primary authority.

## Integration decisions

The audit contained 15 unique vocabulary candidates.

| Tier | Candidates | Integration action |
| --- | --- | --- |
| Tier 1 | Acceptance criteria, Evidence, Verify, Accept/Request changes | Added as reviewed Board workflow knowledge with explicit distinctions among criteria, proof, teammate verification, Product Owner decision, and Done. |
| Tier 1 | Standup | Added as terminology and retrieval aliases only. Existing official Daily Scrum/template behavior remains primary. The disputed frequency was not ingested. |
| Tier 2 | Card, Size, Owner, Blocked | Added as reviewed Board workflow knowledge. |
| Tier 2 | Sprint review, Retro | Alias/retrieval support only; stronger official syllabus and template sources remain primary. |
| Tier 2 | Find a time, Poll, Meet now | Safe navigation aliases to the authenticated Meetings section only. No availability or meeting state is read. |
| Tier 3 | Calendar feed | Help/navigation alias to Meetings only. No private feed URL is indexed or exposed. |

Eight Board definitions are directly indexed. The other seven candidates affect bounded aliases or navigation only, avoiding duplicate or lower-authority answers.

## Safety boundaries

MIRA remains read-only. It cannot move a card, verify work, accept a card, request changes, mark work Done, or infer a private card's status. Evidence never automatically means accepted, approved, verified, or Done.

The integration excludes generated FARO responses, FARO history, private prompts, personal status, grades, message content, selected private work, and account identifiers. Fuzzy correction remains limited to reviewed Capstone vocabulary and is never applied as a general correction mechanism for names, dates, grades, ticket numbers, or record identifiers.

## Unresolved conflicts

Two explicit conflict records remain `HUMAN_REVIEW_REQUIRED`:

- Stand-up frequency: FARO/current Board wording is not used to replace the existing conflict-aware official-source answer.
- Office Hours wording: the generic FARO placeholder is not indexed; MIRA must use an approved current source or the instructor contact route.

Neither conflict is silently resolved or exposed unless it is relevant to the user's question.

The conflict records, candidate-action map, and exclusion labels are kept in the development-only `server/lib/faro-review-metadata.js`. The public browser bundle imports only the safe reviewed runtime entries, so unresolved values and review-only privacy labels are absent from the deployment artifact.

## Retrieval and navigation coverage

Board aliases include task card, sprint card, work item, story size, card owner, assignee, acceptance conditions, card requirements, proof of completion, supporting evidence, peer check, request changes, and blocker. Stand-up variants include standup, stand-up, stand up, daily update, daily scrum, and status update.

Reviewed navigation aliases include:

- Board: Open my Board; Take me to my card; Open Review on my Board; Show my sprint cards.
- Meetings: Open Find a time; Open the meeting poll; Start a team call; Open my calendar feed.

These routes navigate only to existing verified authenticated sections and do not read or mutate private portal data.

## Verification

`test/faro-knowledge.test.js` covers dataset shape, provenance, all five Tier 1 topics, canonical/paraphrase/typo variants, contextual follow-ups, source requests, navigation requests, conflict guards, and private/generated-content exclusions. Existing MIRA acceptance and Michael/Rome regression tests were updated to expect the newly grounded answers while preserving uncertainty for Verify transition requirements, Definition of Done, and stand-up cadence.

This integration changes source code and tests only. It does not modify FARO, Supabase, Ocelot, or the generated `MIRA` deployment folder.
