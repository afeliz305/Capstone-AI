# MIRA source coverage and acceptance record

September 26 hosted transport note: the same approved private source coverage is now available from the Ocelot page when extension version 0.3.0 has both explicit site grants. Personal questions and excerpts remain browser-memory-only and do not enter Supabase. Without the extension or either permission, MIRA correctly falls back to portal navigation rather than claiming a live check.

Updated September 26, 2026. This records the local development implementation. It is not production authorization and does not claim that unavailable or excluded data was searched.

## Source classes

| Class | Authority and retrieval | Retention |
| --- | --- | --- |
| Public Capstone site | Reviewed public index and exact source URLs | Versioned public index. |
| Fall 2026 course material | Owner-supplied syllabus plus reviewed linked Capstone templates | Static reviewed knowledge with source/page or exact document destination. |
| Authenticated navigation | Observed `/portal` sections and verified links | Capability metadata only; no private values. |
| Local private portal | Current account, relevant supported section, and visible authorized records through the extension/MCP transport abstraction | Helper memory only; five-minute absolute lifetime. |

Public/course/private scopes are checked before retrieval. Private questions, excerpts, answers, and embeddings are not sent to Supabase, tickets, external AI/search providers, analytics, logs, files, localStorage, IndexedDB, or extension storage.

## Dashboard source map

| Source | Discovered | Account access checked | Inspected | Extractable/searchable | Navigation | Status/limit |
| --- | --- | --- | --- | --- | --- | --- |
| Overview | Yes | Current-account verification | Yes | Yes, on demand | Parent route verified | Visible cards, schedule, sprint and read-only task content. |
| Messages | Yes | Current account | Yes | Metadata; visible deliberately opened conversation when opted in | Parent route; conversation remains manual | No auto-open/read mutation; visible portion only. |
| Start here | Yes | Current account | Yes | Yes | Parent route | Forms excluded. |
| Team | Yes | Current account | Yes | Yes | Parent route | Own team/card descriptions, criteria, evidence/history; workflow controls excluded. |
| Standing | Yes | Current account | Yes | Yes | Parent route | Visible explanation/trend only. |
| Grade | Yes | Current account | Yes | Yes | Parent route | Own posted components/past-term disclosure; no prediction. |
| Connections | Yes | Current account | Yes | Yes | Parent route | Visible signed-in summary. |
| Opportunities | Yes | Current account | Yes | Yes | Parent route | No application action. |
| Team contacts | Yes | Current account | Yes | Yes | Parent route | Team-shared contacts only. |
| AI Anchors | Yes | Current account | Yes | Yes | Parent route | Controls not operated. |
| Record | Yes | Current account | Yes | Yes | Parent route | Own record only. |
| Showcase | Yes | Current account | Yes | Yes | Parent route/exact safe same-origin link | No submissions. |
| Letters | Yes | Current account | Yes | Yes | Parent route | Own status only. |
| Request a letter | Yes | Current account | Yes | Static guidance | Parent route | Draft/form excluded; no submission. |
| Resources | Yes | Current account | Yes | Visible descriptions/links; known templates separately extracted | Parent route/exact same-origin document | Arbitrary linked content is not assumed readable. |
| Brand & templates | Yes | Current account | Yes | Visible guidance/links | Parent route/exact safe link | Cross-origin links need separate permission. |
| Classmates | Yes | Not read | Structure only | No | Not offered | Intentionally excluded unrelated student records. |
| Alumni directory | Yes | Not read | Structure only | No | Not offered | Intentionally excluded unrelated alumni records. |
| Canvas/external destinations | Yes | Not assumed | Destination only | No | Exact destination where verified | Different origin/authentication; unsupported without separate approval. |

The runtime capability map independently reports discovered, accessible, inspected-in-this-session, extraction-supported, currently-loaded, searchable, navigation, and blocked fields. It contains no cached private values.

## Closed audit gaps and honest gaps

| Topic | Evidence/status | Answer behavior |
| --- | --- | --- |
| Sprint Review checklist | Reviewed `Sprint_Review_Minutes_Template.docx` plus syllabus | Answered with required fields and exact template destination. |
| Sprint Retrospective checklist | Reviewed `Sprint_Retrospective_Minutes_Template.docx` plus syllabus | Answered with required fields and exact template destination. |
| Stand-up fields | Reviewed `Daily_Scrum_Minutes_Template.docx` | Answered with actual headings/table relationships. |
| Stand-up frequency/submission | Daily Scrum template conflicts with `How_To_Use_Capstone_Minutes_Templates.docx` | Partial; conflict disclosed and instructor confirmation recommended. |
| Verify transition | Team board, Resources, and linked templates inspected | Not found after inspection; no invented checklist. |
| Official Definition of Done | Team board, Resources, and linked templates inspected | Not found after inspection. |
| Course-wide acceptance-criteria instructions | Team board, Resources, and linked templates inspected | Not found after inspection. Card-specific criteria/evidence can be read from the student's connected Team view. |
| Sprint filing/submission | Minutes usage guide distinguishes Capstone-site ceremony/board filing from Canvas assignments and conflicts with Daily template wording | Partial; MIRA asks which work item and does not collapse the destinations. |

## Original fifteen-question behavioral acceptance

| # | Behavior | Coverage result |
| --- | --- | --- |
| 1 | Current sprint due date | Clarification unless the connected context or Sprint 1–5 is identified. |
| 2 | Sprint Review | Answered from reviewed template. |
| 3 | Sprint Retrospective | Answered from reviewed template. |
| 4 | Per-member stand-up frequency | Partial because current documents conflict. |
| 5 | Stand-up fields | Answered from reviewed template. |
| 6 | Entering Verify | Safe link/contact fallback; global rule not found after inspection. |
| 7 | Definition of Done | Safe link/contact fallback; official rule not found after inspection. |
| 8 | Sprint submission/documentation | Partial because destination is work-item dependent and sources conflict. |
| 9 | Unanswered question | Course contact/escalation route; MIRA sends nothing automatically. |
| 10 | Acceptance criteria | Card-specific private evidence when present; no invented global policy. |
| 11 | Extension request | Published grace only; MIRA cannot grant or submit an individual request. |
| 12 | Future sprint grade | Published criteria and posted components only; no prediction. |
| 13 | Team change | Escalation; MIRA cannot change membership or promise approval. |
| 14 | Approve card Done | Escalation/read-only boundary; no mutation. |
| 15 | Another student's grade | Privacy restricted; unrelated records are never searched. |

Behavioral correctness is separate from full-answer coverage. Safe `partial`, `link_only`, clarification, privacy, or escalation results pass behavior while still documenting a source gap.

## Natural personal questions

Supported retrieval/routing now includes: work assigned to the signed-in student; upcoming visible deadlines; card-specific acceptance criteria and evidence; standing explanation; posted grade components; visible selected-conversation content; and source follow-ups such as **Where does it say that?** or **Take me there**. Answers retain an exact verified URL when one exists; otherwise they label the verified parent section and the remaining manual step.

## Test commands

```powershell
npm.cmd run extension:build
node --test test/portal-extension.test.js test/portal-local.test.js test/mira-acceptance.test.js test/syllabus.test.js test/chat-popup.test.js
npm.cmd test
```

Extension tests run without an MCP adapter and cover permissions, pairing authentication/replay protection, suspension/resumption, helper restart, trust expiry, explicit disconnect, and private-storage restrictions. Portal tests use synthetic accounts/content for expiry, account switching, stale-result rejection, on-demand source routing, opt-in message content, and source navigation.

Live local acceptance on September 26 confirmed extension pairing, exact portal-tab discovery after the required first-install tab reload, section-independent account verification, a loaded private Overview source, an extractive answer, and its verified portal destination. The test did not enable message-content scope or perform any portal mutation.
