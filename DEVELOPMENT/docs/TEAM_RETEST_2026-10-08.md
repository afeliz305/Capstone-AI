# MIRA team issue retest - October 8, 2026

This record covers the 19 issues reported in Michael's and Rome's team checklists. All shared-information fixtures are explicitly fictional. No real student record, private portal value, password, token, ticket, attachment, Supabase configuration, or hosted file was used or changed.

## Results

| Issue | Tester | Before | After | Result | Regression test |
| --- | --- | --- | --- | --- | --- |
| 4.6A Definition of Done | Michael | Answer did not reliably distinguish guidance from an official Done rule. | MIRA uses reviewed evidence and states when an official approval rule is unavailable. | PASS | `mira-acceptance.test.js` |
| 4.9B acceptance criteria | Michael | Criteria and verification terms could miss the reviewed workflow source. | Exact intent, aliases, and bounded vocabulary correction retrieve the reviewed source without inventing a rule. | PASS | `mira-acceptance.test.js`, `teammate-regressions.test.js` |
| 5.4C conversation follow-up | Michael | A short follow-up could lose the selected topic. | Bounded context retains the reviewed source and supports "Where do I get it?" and "What about this task?". | PASS | `teammate-regressions.test.js` |
| 5.5D missing-source handling | Michael | A response could sound conclusive without sufficient support. | Unsupported questions return an explicit evidence gap and do not invent a source. | PASS | `chat-popup.test.js`, `mira-acceptance.test.js` |
| 7.3E completion/evidence | Michael | A draft could be treated as proof that work was finished. | MIRA says a draft is evidence, not proof of completion or approval. | PASS | `teammate-regressions.test.js` |
| 7.4F missing deadline | Michael | `Deadline: Not provided` could be split and misread. | Structured fields preserve the MISSING state and answer that no deadline was provided. | PASS | `teammate-regressions.test.js` |
| 7.8G multi-source selection | Michael | Facts from temporary sources could be merged. | One source is selected when it fully answers; source ID and excerpt remain attached. | PASS | `teammate-regressions.test.js` |
| 9.4H invalid email on blur | Michael | Native validity failed without MIRA-visible feedback. | Blur sets an inline error, `aria-invalid`, and `aria-describedby`; correction clears it. | PASS | `chat-popup.test.js`, UI smoke |
| 7.AI ambiguous copied table | Michael | An unlabeled number could be interpreted. | MIRA refuses to interpret the value and requests the missing column headers. | PASS | `teammate-regressions.test.js` |
| 12.J return to earlier topic | Michael | Returning after an unrelated question could lose the original reviewed topic. | Public history keeps at most two reviewed source-ID sets and can retrieve the earlier topic safely. | PASS | `syllabus.test.js`, `chat-popup.test.js` |
| 5.5-A unsupported/confident source | Rome | Unsupported answers could appear more certain than their evidence. | MIRA identifies the evidence gap and keeps the source action absent or explicitly bounded. | PASS | `chat-popup.test.js`, `mira-acceptance.test.js` |
| 5.6-A semantic rephrasing | Rome | Course submission, stand-up, and current-work rephrasings were inconsistent. | Layered routing normalizes reviewed aliases before weighted search; each exact prompt passes twice. | PASS | `teammate-regressions.test.js` |
| 6.7-A browser Back | Rome | Returning from a portal shortcut could lose safe chat context. | `history.state` restores only bounded public source IDs and UI state; pasted/private text is never persisted. | PASS | `chat-popup.test.js` |
| 7.2-A shared-information context | Rome | `Label:` followed by a value was fragmented into unrelated lines. | The parser keeps field/value groups and KNOWN, MISSING, or AMBIGUOUS state. | PASS | `teammate-regressions.test.js` |
| 7.3-A authority/exception | Rome | An exception request did not clearly state MIRA's authority boundary. | MIRA explicitly says it cannot grant, approve, or promise an exception and points to an authorized owner. | PASS | `teammate-regressions.test.js` |
| 7.4-A missing deadline | Rome | Missing deadline text could produce an unsupported answer. | The exact field is cited and reported as not provided. | PASS | `teammate-regressions.test.js` |
| 9.1-A support-form open | Rome | The form was reported not to open in one test. | Not reproduced at supported desktop, 390px, or 320px widths; opening and focus behavior pass. | PASS (not reproduced) | UI smoke |
| 12-A multi-part query | Rome | A criteria-plus-deadline question dropped one part. | One selected source returns both its criteria and missing-deadline state with separate evidence excerpts. | PASS | `teammate-regressions.test.js` |
| 12-B typo/fuzzy | Rome | Common Capstone typos failed retrieval. | Damerau-Levenshtein correction is limited to approved domain vocabulary and excludes identifiers, names, dates, grades, and account values. | PASS | `teammate-regressions.test.js` |

## Portal route and selector retest

| Area | Current route or selector | Read-only result |
| --- | --- | --- |
| Today | `/today` | Visible current summary and safe display metadata |
| Inbox | `/inbox`, `.ibc`, `.ibc.un` | Channel/unread metadata only; message bodies excluded |
| Board/current work | `/board`, `.sb-card[data-card-id][data-column-key]` | Card title, owner, status, size, badges, sprint, and blocked/in-progress state |
| Meetings | `/meetings`, `.cpanel`, `.sp-tog` | Visible ceremony metadata only |
| Stand-up | `.sb-standup-form` | Prompt labels and submitted/pending display state; draft values excluded |
| Projects this term | `/this-term` | Safe visible project summary |
| People | `/people` | Navigation only; directory/profile extraction excluded |
| My rhythm | `/me/rhythm` | Safe visible personal rhythm summary when explicitly requested |
| Recognition | `/recognition` | Safe visible recognition summary when explicitly requested |
| Privacy | `/me/privacy` | Safe visible privacy/account summary; secret values excluded |
| Legacy sections | Team, Standing, Grade, Resources, Brand & templates | Existing verified navigation preserved |

Selectors fail closed: an unavailable route or unmatched selector is reported as unavailable, never as proof that the user has no tasks or messages. MIRA does not Post, Move, Confirm, Book, Approve, Start, or Submit portal data.

## Bounded state and privacy

- Public conversation history retains only the current reviewed intent, at most two prior source-ID sets, an explicit sprint ID, a navigation destination, and safe evidence references.
- Temporary shared text remains memory-only, expires after five minutes, and is not written to `localStorage` or history state.
- The local portal connector remains development/demo tooling and is excluded from the public Ocelot package.
- Ocelot still provides navigation rather than automatic access to a student's signed-in private portal data.

## Release boundary

This retest authorizes neither publication nor data/configuration changes. Supabase, Ocelot, GitHub, portal accounts, and tickets remained unchanged while the fixes and tests were prepared.

Final verification: 334 automated tests total, 333 passed, 0 failed, and 1 optional hosted-PHP integration test skipped. Browser UI smoke passed desktop, 390px, and 320px. The generated `MIRA/` package contains 26 files totaling 4,974,185 bytes; all files match `dist/release-records/mira-upload-2Dz0o9/manifest.json` with no missing, extra, size-mismatched, or hash-mismatched files.
