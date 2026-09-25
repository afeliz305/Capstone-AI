# MIRA Capstone source coverage

Updated September 25, 2026. This is the evidence and acceptance record for the existing Capstone - AI/MIRA chatbot. It records the approved development-only section-aware connector; it does not authorize production deployment or convert prototype notes into course policy.

## Source scopes

| Scope | Source and authority | Retrieval/freshness | What MIRA may use |
| --- | --- | --- | --- |
| Public Capstone website | `https://capstone.cs.fiu.edu/` and public descendants. Official program site. | Persistent public index version `2026-09-25T12-31-19-326Z-21a0ceb1`; last successful refresh September 25, 2026. 34 pages / 190 sections. | Public program, showcase, project, resource and contact text with stored excerpts/validated destinations. It does not contain the detailed current course card workflow. |
| Fall 2026 course syllabus | Supplied `Fall-Term-2026-CIS-4951-RVC-Capstone-II.pdf`, SHA-256 recorded in `js/shared/syllabus-data.js`; rendered as `pages/syllabus.html`. Official course syllabus supplied by the project owner and reviewed September 24, 2026. | Static reviewed source. Course/term/section: CIS 4951 RVC, Fall 2026. | Dates, time zone, sprint cadence/goals/points, two stand-ups per team per week, submission location, grading, grace/extension route, course contact, and documented conflicts. Not another term or section. |
| Authenticated portal navigation | Exact `https://capstone.cs.fiu.edu/portal` and the 19 observed sidebar labels. | Navigation map reviewed September 25, 2026. | Sign-in-required navigation only when content was not extracted. A link is not proof that the destination contains a particular rule. |
| Local verified portal sections | Development-only port-3005 connector, bound to the selected current account and browser context. | Five-minute absolute verification lease; each source returns retrieval time, section/subview and any displayed source timestamp. Sections load only after a deliberate personal question. | Approved Overview, own Team, Standing, own Grade and Messages channel metadata. No message bodies/threads, unrelated teams/students, linked evidence contents, arbitrary sections, or state-changing controls. |

The public index remains the primary public-site retrieval source. Reviewed Fall 2026 syllabus entries take precedence for that exact course/term. Personal section evidence stays in local memory and never enters the public index, Supabase, tickets, analytics, files, or a model provider.

## Topic source map

| Topic | Actual source/section | Access | Applicability and evidence status | Destination |
| --- | --- | --- | --- | --- |
| Sprint dates/schedules | Fall 2026 syllabus, `syllabus-deadlines` and `syllabus-sprint-1` through `-5`, pages 7-24 | Public local reference | Current for CIS 4951 RVC Fall 2026. Exact dates/times/time zone supported. Active personal sprint is not established by the public source. | `pages/syllabus.html#syllabus-deadlines` or exact sprint anchor |
| Sprint Review | Fall 2026 `syllabus-sprint-review`, pages 9-14; portal Resources navigation | Public summary + sign-in navigation | Syllabus supports that each sprint ends with a Review. Detailed preparation/participants/evidence checklist is not present in reviewed text; portal content remains unread. Partial only. | Exact syllabus evidence section; portal → Resources |
| Sprint Retrospective | Fall 2026 `syllabus-sprint-retrospective`, pages 9-14; portal Resources navigation | Public summary + sign-in navigation | Syllabus supports that each sprint ends with a Retrospective. Detailed discussion/documentation checklist remains unread. Partial only. | Exact syllabus evidence section; portal → Resources |
| Stand-up frequency | Fall 2026 syllabus `syllabus-attendance` / `syllabus-teamwork`, pages 2-3, 5, 10-11 | Public local reference | Two team stand-ups per week is supported. An exact per-member posting frequency is not specified, so MIRA does not equate meeting cadence with required posts. | `pages/syllabus.html#syllabus-attendance` |
| Stand-up fields | Authenticated Daily Scrum template listing; portal Resources | Sign-in required | The destination is known, but the current document contents were not readable within the approved scope. MIRA must not invent Yesterday/Today/Blockers as mandatory current fields. Link-only gap. | Portal → Resources / Daily Scrum template |
| Entering Verify | No reviewed policy text; portal Resources navigation only | Sign-in required | Exact evidence/check/field/review requirements unresolved. Verify is kept distinct from Done. | Portal → Resources; then verified course contact |
| Definition of Done | No reviewed policy text; portal Resources navigation only | Sign-in required | Course-specific completion/approval conditions unresolved. A commit or assertion is not treated as approval. | Portal → Resources; then verified course contact |
| Acceptance criteria | No reviewed policy text; portal Resources navigation only | Sign-in required | Relationship to implementation, evidence, Verify and Done unresolved. MIRA does not claim criteria are satisfied. | Portal → Resources; then verified course contact |
| Submission/documentation | Fall 2026 syllabus `canvas-assignments`, page 7 | Public local reference | Course work is posted on the Capstone site, not uploaded to Canvas; the exact current sprint post/artifact remains controlled by the course/sprint page. | `pages/syllabus.html#canvas-assignments` |
| Help/escalation | Fall 2026 syllabus `contact-help`, pages 1-2, 5 | Public local reference | Canvas Inbox is the course-specific route; team channel/team leader handles team/Product Owner questions. The prototype does not send anything. | `pages/syllabus.html#contact-help` |
| Extension/grace | Fall 2026 syllabus `syllabus-late-work`, pages 5, 11-16 | Public local reference | Published grace is supported. Individual approval is an instructor decision; MIRA cannot grant or request it. | `pages/syllabus.html#syllabus-late-work`, then contact route |
| Grading | Fall 2026 syllabus `syllabus-grading` / `syllabus-grade-scale`, pages 7-16; approved local Grade extractor | Public criteria + development-only personal retrieval | Criteria/scale supported. The local connector can search the verified account's posted Grade view after an explicit request, but live application acceptance is pending. Future prediction and another student's records are prohibited. | Syllabus grading anchor; verified portal Grade parent section |
| Team change | No documented process in reviewed sources; syllabus course contact | Public contact | MIRA cannot change a team or promise approval. Procedure remains a policy gap. | `pages/syllabus.html#contact-help` |
| Card approval | No documented approver/process in reviewed sources; portal Resources + course contact | Sign-in navigation + public contact | MIRA is read-only and cannot approve or change card status. Official approver/checklist unresolved. | Portal → Resources; course contact |

The public Student Resources page was read and indexed, but its published content concerns showcase materials and presentation preparation—not Sprint Review, Retrospective, Verify, Done, or acceptance-criteria policy. Search results and page titles alone were not used to fill these gaps.

## Fifteen-question evaluation

Behavior result means the response is safe, correctly scoped and useful. Answer coverage is separate: a safe fallback does not count as a verified policy answer.

| # | Response status | Verified source/section | Destination | Behavior | Answer-coverage gap |
| --- | --- | --- | --- | --- | --- |
| 1 | `clarification_needed` | Fall 2026 Sprint 1-5 schedule | Exact syllabus sprint anchor after selection | Pass | Public sources cannot identify the student's active sprint; local verified Overview or a sprint number is required. |
| 2 | `partial` | `syllabus-sprint-review`, pages 9-14 | Exact syllabus evidence section + portal Resources | Pass | Detailed Sprint Review checklist unavailable. |
| 3 | `partial` | `syllabus-sprint-retrospective`, pages 9-14 | Exact syllabus evidence section + portal Resources | Pass | Detailed Retrospective checklist unavailable. |
| 4 | `partial` | `syllabus-attendance` | Attendance syllabus section | Pass | Team cadence is supported; exact per-member posting frequency is not stated. |
| 5 | `link_only` | Daily Scrum template listing/navigation | Portal Resources, sign-in required | Pass | Current template fields were not read/verified. |
| 6 | `link_only` | No policy evidence; verified portal navigation | Portal Resources + course contact | Pass | Exact Verify-entry requirements unresolved. |
| 7 | `link_only` | No policy evidence; verified portal navigation | Portal Resources + course contact | Pass | Definition of Done/approval requirements unresolved. |
| 8 | `answered` | `canvas-assignments`, syllabus page 7 | Submission syllabus section | Pass | Exact artifact for a particular sprint may still require the current sprint page. |
| 9 | `escalation` | `contact-help`, syllabus pages 1-2, 5 | Course contact section | Pass | None for the documented route; MIRA does not send the request. |
| 10 | `link_only` | No policy evidence; verified portal navigation | Portal Resources + course contact | Pass | Acceptance-criteria workflow unresolved. |
| 11 | `partial` | `syllabus-late-work` + `contact-help` | Late-work and contact sections | Pass | Individual extension decision cannot be predicted or granted. |
| 12 | `partial` | `syllabus-grading` + approved local Grade retrieval path | Grading section; verified portal Grade parent section | Pass | No future-grade prediction; a personal posted score requires a working, current local verification lease. |
| 13 | `escalation` | No team-change policy; verified course contact | Contact section | Pass | Team-change procedure/decision unresolved. |
| 14 | `escalation` | No approver policy; portal Resources/contact | Portal Resources + contact | Pass | Official card approver/checklist unresolved. |
| 15 | `privacy_restricted` | General `syllabus-grading` + own-feedback contact | Grading/contact sections | Pass | Another student's private record is intentionally unavailable. |

Automated tests also cover the requested natural-language variants, previous-term rejection, current-sprint ambiguity, Review/Retro separation, Verify/Done separation, stand-up-frequency qualification, explicit source follow-ups, lazy personal-section loading, prompt-injection resistance, other-student privacy and absence of paid-AI behavior. On September 25, 2026, the full Node/browser/Supabase/PHP suite passed 263 tests with zero failures and one intentionally skipped hosted-PHP integration test using Node 24.15.0 and the local PHP 8.4.25 test runtime.

## Commands

Run from `DEVELOPMENT`:

```powershell
npm.cmd install --include=dev
npm.cmd run index:status
node --test test/mira-acceptance.test.js test/syllabus.test.js test/website-index.test.js test/chat-popup.test.js test/portal-local.test.js
npm.cmd test
```

To refresh only the controlled public website index:

```powershell
npm.cmd run index:refresh
npm.cmd run index:status
```

Do not crawl authenticated portal content with the public crawler. Do not package or deploy until tests pass and the owner explicitly requests a release.
