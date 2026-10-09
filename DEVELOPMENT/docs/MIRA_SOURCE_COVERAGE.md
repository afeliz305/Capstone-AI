# MIRA source coverage and acceptance record

September 26 architecture correction: hosted Ocelot remains navigation-only for personal information. The Ocelot-to-extension relay was removed so private questions and answers do not return to the shared Ocelot origin. The approved private source coverage remains local development evidence; the owner-review portal-native module is pending installation. See [PORTAL_OWNER_HANDOFF.md](PORTAL_OWNER_HANDOFF.md).

Updated October 9, 2026. This records the local development implementation. It is not production authorization and does not claim that unavailable or excluded data was searched.

The October 9 personal-context update adds allowlisted Today, personal Board, My work, Meetings metadata, Inbox metadata, People relationships, My rhythm, Team, and Standing adapters. It also adds My Capstone, Check My Work, response depth, page-aware follow-ups, and human-help routing. Projects this term, Recognition, Profile/privacy, Grade values, Classmates, and Alumni are navigation-only. The exact route/selector/privacy audit is in [PORTAL_CONTEXT_AUDIT.md](PORTAL_CONTEXT_AUDIT.md).

## Source classes

| Class | Authority and retrieval | Retention |
| --- | --- | --- |
| Public Capstone site | Reviewed public index and exact source URLs | Versioned public index. |
| Fall 2026 course material | Owner-supplied syllabus plus reviewed linked Capstone templates | Static reviewed knowledge with source/page or exact document destination. |
| Authenticated navigation | Observed `/portal` sections and verified links | Capability metadata only; no private values. |
| FARO reviewed vocabulary | Static curated Board/Meetings vocabulary reviewed October 9; secondary to official current sources | Eight Board definitions plus bounded aliases/navigation. Generated and private FARO content is excluded. |
| Local private portal | Current account, relevant supported section, and visible authorized records through the extension/MCP transport abstraction | Helper memory only; five-minute absolute lifetime. |

Public/course/private scopes are checked before retrieval. Private questions, excerpts, answers, and embeddings are not sent to Supabase, tickets, external AI/search providers, analytics, logs, files, localStorage, IndexedDB, or extension storage.

## Dashboard source map

| Source | Discovered | Account access checked | Inspected | Extractable/searchable | Navigation | Status/limit |
| --- | --- | --- | --- | --- | --- | --- |
| Today | Yes | Current-account verification | Yes | Yes, on demand | Exact `/today` route | Current sprint/project labels, own next steps/cards, and safe schedule data; broad team preview excluded. |
| Board | Yes | Current account | Yes | Own visible card metadata only | Exact `/board` route | No card move, status change, evidence submission, or unrelated card indexing. |
| My work | Yes | Current account | Yes | Current sprint/open-work metadata | Exact `/my-work` route | Earlier grade values excluded. |
| Meetings | Yes | Current account | Yes | Title/date/time/type/status and safe location labels | Exact `/meetings` route | Private notes, meeting URLs, calendar-feed secrets, and availability controls excluded. |
| Inbox | Yes | Current account | Yes | Unread and channel/category metadata only | Exact `/inbox` route | Message bodies and read-state controls excluded. |
| My rhythm | Yes | Current account | Yes | Own visible weekly counts/history and next step | Exact `/me/rhythm` route | No grade, class comparison, rank, or performance judgment inferred. |
| Projects this term | Yes | Not read | Structure only | No | Exact `/this-term` route | Navigation-only; unrelated teams are not indexed. Current project comes from signed-in Today/Team context. |
| People | Yes | Current account | Yes | Own team/support role relationships only | Exact `/people` route | Broad directories and unrelated students excluded. |
| Recognition | Yes | Not read | Structure only | No | Exact `/recognition` route | Navigation-only because teammate recognition and evaluation-related information may be visible. |
| Profile and privacy | Yes | Not read | Structure only | No | Exact `/me/privacy` route | Navigation/settings awareness only; identifiers, contact details, credentials, and setting values excluded. |
| Start here | Yes | Current account | Yes | Yes | Parent route | Forms excluded. |
| Team | Yes | Current account | Yes | Yes | Parent route | Own team/card descriptions, criteria, evidence/history; workflow controls excluded. |
| Standing | Yes | Current account | Yes | Yes | Parent route | Visible explanation/trend only. |
| Grade | Yes | Current account | Yes | No values extracted | Parent route | Personal navigation only; grade values remain excluded from shared and local indexes. |
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
| Verify transition | Reviewed FARO vocabulary defines teammate verification, while inspected official sources do not provide a complete transition checklist | Partial; explains the role and keeps the missing checklist explicit. |
| Official Definition of Done | FARO distinguishes criteria, evidence, Verify, and Product Owner decisions but does not define a complete official Definition of Done | Partial; no single step is presented as proof of Done. |
| Course-wide acceptance-criteria instructions | Reviewed FARO vocabulary defines the term; card-specific criteria/evidence can be read only from the student's connected Team view | Answers the definition while avoiding a universal checklist or private-state claim. |
| Sprint filing/submission | Minutes usage guide distinguishes Capstone-site ceremony/board filing from Canvas assignments and conflicts with Daily template wording | Partial; MIRA asks which work item and does not collapse the destinations. |

## Original fifteen-question behavioral acceptance

| # | Behavior | Coverage result |
| --- | --- | --- |
| 1 | Current sprint due date | Clarification unless the connected context or Sprint 1–5 is identified. |
| 2 | Sprint Review | Answered from reviewed template. |
| 3 | Sprint Retrospective | Answered from reviewed template. |
| 4 | Per-member stand-up frequency | Partial because current documents conflict. |
| 5 | Stand-up fields | Answered from reviewed template. |
| 6 | Entering Verify | Partial reviewed role guidance; complete transition checklist still not found. |
| 7 | Definition of Done | Partial distinctions among criteria, evidence, Verify, and Product Owner decision; official complete rule still not found. |
| 8 | Sprint submission/documentation | Partial because destination is work-item dependent and sources conflict. |
| 9 | Unanswered question | Course contact/escalation route; MIRA sends nothing automatically. |
| 10 | Acceptance criteria | Reviewed definition plus card-specific private evidence when present; no invented universal checklist. |
| 11 | Extension request | Published grace only; MIRA cannot grant or submit an individual request. |
| 12 | Future sprint grade | Published criteria and posted components only; no prediction. |
| 13 | Team change | Escalation; MIRA cannot change membership or promise approval. |
| 14 | Approve card Done | Escalation/read-only boundary; no mutation. |
| 15 | Another student's grade | Privacy restricted; unrelated records are never searched. |

Behavioral correctness is separate from full-answer coverage. Safe `partial`, `link_only`, clarification, privacy, or escalation results pass behavior while still documenting a source gap.

## Natural personal questions

Supported retrieval/routing now includes: assigned/open/blocked work; current sprint and next-step context; card-specific acceptance criteria and evidence metadata; the signed-in user's rhythm counts; upcoming safe meeting metadata; Inbox unread/channel metadata; team/support roles; and page-aware source follow-ups. **My Capstone** combines only currently authorized fields and treats missing fields as unavailable rather than zero. Check My Work evaluates pasted redacted text locally or visible card metadata, never claims approval, and never changes the portal. Answers retain an exact verified URL when one exists and label personal sources as the current portal.

## Test commands

```powershell
npm.cmd run extension:build
node --test test/portal-extension.test.js test/portal-local.test.js test/mira-acceptance.test.js test/syllabus.test.js test/chat-popup.test.js
npm.cmd test
```

Extension tests run without an MCP adapter and cover permissions, pairing authentication/replay protection, suspension/resumption, helper restart, trust expiry, explicit disconnect, and private-storage restrictions. Portal tests use synthetic accounts/content for expiry, account switching, stale-result rejection, on-demand source routing, opt-in message content, and source navigation.

Live local acceptance on September 26 confirmed extension pairing, exact portal-tab discovery after the required first-install tab reload, section-independent account verification, a loaded private Overview source, an extractive answer, and its verified portal destination. The test did not enable message-content scope or perform any portal mutation.
