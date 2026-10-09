# FARO deep knowledge audit

Audit date: October 9, 2026
Scope: Read-only inspection of visible FARO controls and rendered guidance in the authenticated FIU Capstone portal.
Purpose: Identify review candidates that may strengthen MIRA without copying private or generated content.

## Executive result

FARO is not one uniform knowledge surface. Two visible implementations were observed:

1. A full, same-origin side panel on Today, Board, Meetings, Inbox, and My work. It includes contextual help, three help-depth settings, Ask, Check my work, Ask a person, walkthroughs, and—in some contexts—curated vocabulary.
2. A smaller same-origin dialog on Projects this term, People, My rhythm, Recognition, and Profile and privacy. It contains only a question box, an Ask action, and an authenticated Inbox escalation link.

No iframe was present in the audited pages. FARO is embedded in the portal's rendered DOM and remains on `https://capstone.cs.fiu.edu`. FARO has dynamic and user-specific surfaces; it must not be treated as authoritative by default.

The best safe candidates are 15 unique, visible vocabulary definitions from Board and Meetings. They are recorded for review in `docs/faro-review-dataset.json`; they were not added to MIRA.

## FARO structure map

| Section | Subsection | Question count | Answer type | Source type | Access | MIRA value |
|---|---|---:|---|---|---|---|
| Full side panel | This page | 0 direct questions; contextual actions vary | Static curated plus user-specific next step | Rendered portal guidance | Authenticated | High for vocabulary and navigation; exclude next-step values |
| Full side panel | Ask | 5 unique suggested questions | Answer provenance not established until submitted | Dynamic question interface | Authenticated | Alias/intent review only |
| Full side panel | Check my work | 0 preloaded questions; 1 rubric action | Static instruction plus user-selected private item | Portal rubric tool | Authenticated | Process wording only; do not ingest selected work |
| Full side panel | Ask a person | 5 routing choices | Static routing instruction | Portal escalation workflow | Authenticated | High for escalation routing; no private history |
| Board context | Words on this page | 11 term/definition pairs | STATIC_CURATED | FARO contextual vocabulary | Authenticated | High |
| Board page | Ask FARO to explain status | 5 prompt buttons | UNKNOWN until invoked | Portal quick action | Authenticated | Intent aliases; do not copy an unverified answer |
| Meetings context | Words on this page | 5 pairs, 4 unique beyond Board | STATIC_CURATED | FARO contextual vocabulary | Authenticated | Medium/high |
| Meetings context | Walk me through | 4 walkthrough actions | Static navigation/process prompts | Portal UI guidance | Authenticated | Navigation aliases |
| Newer route dialog | Ask | 0 suggested questions | GENERATED or UNKNOWN if submitted | Minimal FARO dialog | Authenticated | Low; navigation to Inbox only |
| Learn more | Course/manual/Office Hours | 0 questions | Static labels; actions incomplete | FARO UI | Authenticated | Human review; actions returned “Not connected yet” |

## Visible architecture and modes

- Origin: `https://capstone.cs.fiu.edu`
- Audited routes: `/today`, `/board`, `/meetings`, `/inbox`, `/my-work`, `/this-term`, `/people`, `/me/rhythm`, `/recognition`, `/me/privacy`, and selected legacy `/portal#...` destinations.
- Embedded: yes, as a portal side panel or dialog.
- iframe: none observed.
- External origin: none for FARO itself.
- Full-panel modes: This page, Ask, Check my work, Ask a person.
- Help depth: Just the next step; Guide me; Teach me step by step.
- Input: text plus dictation on the full panel; text on the simple dialog.
- Output controls observed: Ask, Copy, Ask again, Read aloud, Helpful, Not helpful.
- Conversation controls: History and New conversation. History contents were not opened or inventoried.

## Built-in question inventory

The following are unique visible prompt triggers. No prompt was submitted during this audit.

| ID | Exact question | Category | Answer type | Authority | Recommendation |
|---|---|---|---|---|---|
| FARO-Q-001 | Brief me: what's due for me this week, and why? | Ask · often asked | UNKNOWN; likely dynamic and user-specific | Unknown | Exclude answer; keep private-intent boundary |
| FARO-Q-002 | How do I post a standup that counts? | Ask · often asked | UNKNOWN | Unknown | Add alias review; prefer current portal/source guidance |
| FARO-Q-003 | Why can't I move my card to Review? | Ask · often asked | UNKNOWN | Unknown | Add reusable card-transition intent after owner review |
| FARO-Q-004 | Write our retro for us | Ask · often asked | UNKNOWN | Unknown | Route to coaching/refusal pattern; do not write graded work |
| FARO-Q-005 | How do I ask our Product Owner a question? | Ask · often asked | UNKNOWN | Unknown | Add communication/navigation alias |
| FARO-Q-006 | Ask FARO to explain Backlog | Board status quick action | UNKNOWN | Portal instruction | Add status-explanation intent after review |
| FARO-Q-007 | Ask FARO to explain Ready | Board status quick action | UNKNOWN | Portal instruction | Add status-explanation intent after review |
| FARO-Q-008 | Ask FARO to explain In progress | Board status quick action | UNKNOWN | Portal instruction | Add status-explanation intent after review |
| FARO-Q-009 | Ask FARO to explain Review | Board status quick action | UNKNOWN | Portal instruction | Add status-explanation intent after review |
| FARO-Q-010 | Ask FARO to explain Done | Board status quick action | UNKNOWN | Portal instruction | Add status-explanation intent after review |

Total unique built-in/preloaded question triggers observed: **10**. The five “often ask” prompts were visible on more than one route but are counted once.

## Static curated content

The safe, directly visible curated set contains 15 unique terms:

- Board: Card, Size, Owner, Acceptance criteria, Evidence, Verify, Accept / Request changes, Blocked, Standup, Sprint review, Retro.
- Meetings: Find a time, Poll, Meet now, Calendar feed, and a second Sprint review definition.

The exact definitions and review metadata are in `docs/faro-review-dataset.json`. The second Sprint review definition is retained as supplemental evidence rather than a duplicate record.

## Dynamic, private, and unknown content

- A prior generated response on Today was user-specific and was excluded.
- User-specific next-step text was not copied into the dataset.
- FARO History was not opened; private prompts and responses were excluded.
- Check my work exposed a user-selected item surface; the item and any private content were excluded.
- No generated answer was promoted to source material.
- No source-backed dynamic answer was verified in this audit because submitting questions would create stored interactions.
- The underlying static FAQ source was not inspected. Browser security blocked a source-view attempt, and no workaround, raw debugging interface, hidden endpoint, or admin API was used.

## Content counts

Counts are for unique visible audit records, not a claim about hidden server data.

| Type | Count | Treatment |
|---|---:|---|
| Static curated term/definition candidates | 15 | Review dataset only |
| Source-backed dynamic answers verified | 0 | None submitted |
| Generated unsourced answers accepted | 0 | Excluded by policy |
| Private/user-specific surfaces excluded | 3 | Prior response/history, next-step status, selected work |
| Unknown-answer question triggers | 10 | Alias/intent review only |
| Static navigation/escalation choices | 5 person routes plus contextual actions | Review only |

## Ask a person routing

Visible routing choices:

- AI Anchor on the student's team
- another opted-in AI Anchor
- Team Leader
- Product Owner for project questions
- instructor

Visible guidance says the recipient receives the question, current page, and role; the response returns in FARO and notifications; after one business day FARO may offer escalation to the professor. This is useful routing language, but it should be reviewed by the portal owner before MIRA adopts it.

## Check my work boundary

Visible static instruction says FARO compares work against rubric criteria, identifies proven/weak/missing areas, and offers next steps and grader-style questions. It also says it explains rather than writes the work. MIRA should reuse the boundary, not the private work selector or any submitted artifact.

## FARO vocabulary and aliases

| Canonical term | Context | Safe aliases | Ambiguous / do not use | MIRA intent |
|---|---|---|---|---|
| Card | One sprint-sized work item | task card, sprint card, work item | assignment | board-card-status |
| Size | S/M/L effort label | story size, card size | priority | card-sizing |
| Owner | Person moving a card forward | assignee, card owner | Product Owner | card-assignment |
| Acceptance criteria | Conditions for Product Owner acceptance | acceptance conditions, done conditions | grade rubric | card-acceptance |
| Evidence | Link proving the work | proof, demo link, PR, test run | citation | card-evidence |
| Verify | Teammate check by someone other than owner | peer verify, peer check | approve, accept | card-verification |
| Accept / Request changes | Product Owner Review decisions | accept card, ask for changes | move to Done | product-owner-decision |
| Blocked | Waiting on an external dependency | blocker, waiting on | paused | card-blocker |
| Standup | Did / will do / blocked update | daily scrum, status update | meeting minutes | standup-guidance |
| Sprint review | End-of-sprint demo | review demo, sprint demo | code review | sprint-review |
| Retro | Retrospective | sprint retrospective | review | sprint-retro |
| Find a time | Availability heat grid | schedule meeting, common time | Office Hours | meeting-scheduling |
| Poll | Vote among proposed times | availability poll, meeting poll | survey | meeting-poll |
| Meet now | Immediate Zoom room | start team call, quick call | Office Hours | instant-meeting |
| Calendar feed | Private read-only ICS subscription | ICS feed, subscribe calendar | upload calendar | calendar-navigation |

## MIRA gap matrix

| Topic | MIRA current coverage | FARO coverage | Best source | What FARO adds | Proposed MIRA change |
|---|---|---|---|---|---|
| Card/status vocabulary | Navigation only / partial | Detailed curated vocabulary | Current portal plus owner review | Exact student-facing labels | Add reusable board workflow intent family |
| Acceptance criteria | Card-specific private data only; no global rule | Concise definition | Portal owner/instructor confirmation | Clear role of Product Owner | Add definition after review, not a universal checklist |
| Evidence | Weak | Examples: demo clip, pull request, test run | Portal owner/instructor | Concrete proof examples | Add aliases and examples after review |
| Verify | Known gap | Teammate, never owner, checks card | Portal owner/instructor | Role separation | Add only after authority confirmation |
| Review decision | Weak | Product Owner accepts or requests changes | Portal owner/instructor | Two explicit outcomes | Add card transition explanation |
| Standup fields | Strong from template | Did / will do / blocked | Template + current portal | Matches current UI vocabulary | Add aliases only |
| Standup cadence | Conflict-aware | Two or more a week | Instructor/current term | Aligns live Board and usage guide | Do not ingest until conflict is resolved |
| Sprint Review | Strong from template | Demo; filing closes sprint | Template + current portal | Closure behavior | Add current portal note after review |
| Sprint Retro | Strong | Keep/change shorthand | Official template | Student-friendly paraphrase | Alias only |
| Meetings | Navigation only | Scheduling, polls, availability, instant call | Current portal | New intent family | Add navigation intents, not personal availability data |
| Definition of Done | Explicitly limited | No direct definition observed | Instructor/official source | None | Keep limitation |
| Extensions | Published grace only | No curated guidance observed | Syllabus/instructor | None | Keep current escalation |
| Grades/Standing | Navigation/private boundary | FARO unavailable on role-inaccessible view | Portal | None | Keep navigation-only and role-aware messaging |
| Showcase/Templates/Canvas | Existing reviewed sources | No better curated FARO content observed | Existing public sources | None | No change |

## Known-weakness review

| Topic | FARO has content | Static curated | Source-backed | Better than MIRA | Action |
|---|---|---|---|---|---|
| Definition of Done | No | No | No | No | Keep MIRA limitation |
| Verify requirements | Yes, role definition | Yes | Not independently | Yes | Human review before adding |
| Acceptance criteria | Yes, definition | Yes | Not independently | Yes | Add reviewed definition only |
| Standup fields | Yes | Yes | Current UI corroborates | Similar | Add terminology aliases |
| Standup cadence | Yes | Yes | Conflicts with one official template | Not safely | Resolve conflict first |
| Sprint Review | Yes | Yes | Current portal corroborates | Adds closure detail | Review and add detail |
| Sprint Retrospective | Yes | Yes | Existing template is stronger | No | Alias only |
| Sprint submission/minutes | Partial | Yes | Current portal corroborates filing controls | Partial | Preserve source distinctions |
| Card evidence | Yes | Yes | Portal owner review needed | Yes | Add examples after approval |
| Current work/blockers | Navigation/context only | Mixed/private | No | No | Keep private-data boundary |
| Meetings | Yes | Yes | Current portal | Yes for navigation | Add meeting navigation intents |
| Extensions | No useful static content | No | No | No | No change |
| Grades | No safe content | No | No | No | Navigation only |
| Team changes | No safe static content | No | No | No | Human route only |
| Escalation/help | Yes | Yes | Portal workflow | Yes | Add reviewed routing language |
| Showcase | No better content | No | No | No | Existing source wins |
| Templates | No better content | No | No | No | Existing source wins |
| Canvas | No better content | No | No | No | Existing source wins |

## Navigation mappings

| Intent | Destination | Route | Access | Validation |
|---|---|---|---|---|
| Today's work | Today | `/today` | Authenticated | Active |
| Sprint cards / standups / review / retro | Board | `/board` | Authenticated | Active |
| Meeting schedule / availability / polls | Meetings | `/meetings` | Authenticated | Active |
| Messages / ask a person | Inbox | `/inbox` | Authenticated | Active; simple FARO dialog links here |
| Personal work | My work | `/my-work` | Authenticated | Active |
| Project catalog | Projects this term | `/this-term` | Authenticated | Active; simple FARO dialog |
| People | People | `/people` | Authenticated | Active; simple FARO dialog |
| Personal cadence | My rhythm | `/me/rhythm` | Authenticated | Active; simple FARO dialog |
| Recognition | Recognition | `/recognition` | Authenticated | Active; simple FARO dialog |
| Privacy | Profile and privacy | `/me/privacy` | Authenticated | Active; simple FARO dialog |

Legacy hash destinations for Grade, Standing, and Resources displayed “This page isn’t available for your role” in this session. MIRA should keep them navigation-only and avoid promising data or access.

## Link validation

- FARO itself remained same-origin.
- The simple dialog's `Ask in Inbox` link resolved to `https://capstone.cs.fiu.edu/inbox` and was not state-changing.
- Contextual Go, Show me where, walkthrough, project-context, course, and manual controls are JavaScript actions rather than exposed static URLs.
- The visible Course and Manual actions on Meetings returned `Not connected yet`; no destination was opened.
- No authoritative source/reference URL was shown with the static vocabulary definitions.
- No external FARO link was followed.

## Conflicts and staleness

| Conflict ID | Topic | MIRA value | FARO/current portal value | Source A | Source B | Current term | Recommendation |
|---|---|---|---|---|---|---|---|
| FARO-CONFLICT-001 | Standup cadence | MIRA discloses a conflict: Daily Scrum template says 5/week while usage guide says twice weekly | FARO says 2 or more/week; Board displays progress toward 2/week | Official linked Daily Scrum template | FARO + current Board + usage guide | Fall 2026 | Instructor/portal-owner decision required; do not silently replace MIRA content |
| FARO-CONFLICT-002 | Office Hours | Existing documents should use verified current schedule | Generic FARO Learn more says schedule to be confirmed while Meetings displays a weekday schedule | FARO Learn more | Meetings page | Fall 2026 | Treat generic copy as stale; use the current official source only after owner confirmation |

Possibly outdated items: **1** (generic Office Hours “schedule to be confirmed”).
Conflicts requiring human review: **2**.

## Priority summary

The proposed dataset scores 15 unique candidates:

- Tier 1: 5 — Acceptance criteria, Evidence, Verify, Accept/Request changes, Standup.
- Tier 2: 9 — Card, Size, Owner, Blocked, Sprint review, Retro, Find a time, Poll, Meet now.
- Tier 3: 1 — Calendar feed.
- Tier 4: 0.

Tier 1 means high review priority, not automatic authority. Standup remains blocked by a documented conflict.

## FARO-specific regression ideas

| Candidate | Exact wording | Paraphrase | Typo | Follow-up | Navigation request |
|---|---|---|---|---|---|
| Acceptance criteria | What are acceptance criteria? | What has to be true before the Product Owner accepts a card? | What are aceptance criteria? | Who decides that? | Open my Board |
| Evidence | What counts as evidence? | How do I prove my card works? | What counts as evidance? | Can a test run count? | Take me to my card |
| Verify | Who can verify a card? | Can the card owner verify their own work? | Who can varify a card? | What happens after verification? | Open Review on my Board |
| Review decision | What can the Product Owner do in Review? | Can the Product Owner ask for changes? | What can the PO do in reveiw? | What happens if changes are requested? | Open the Board |
| Standup | What goes in a standup? | What did I do, what will I do, and what is blocking me? | What goes in a standup updat? | How often this term? | Open my standup form |

## Recommended MIRA changes after approval

1. Add a reusable board-workflow intent family covering Card, Size, Owner, Acceptance criteria, Evidence, Verify, Review decisions, Blocked, and Done.
2. Add safe aliases from the vocabulary table; avoid “assignment” for Card and “Product Owner” for Owner.
3. Add meeting navigation intents for finding a time, meeting polls, instant calls, and calendar feeds.
4. Keep personal next steps, messages, grades, availability, history, and selected work out of public/shared retrieval.
5. Preserve existing public documents as the primary sources for Sprint Review, Retro, minutes, Showcase, branding, templates, and Canvas.
6. Resolve the standup cadence conflict with the instructor or portal owner before changing MIRA.
7. Have the portal owner connect or remove the FARO Course and Manual buttons and correct the Office Hours placeholder.
8. Make MIRA route guidance role-aware when a portal section reports that it is unavailable.

## Human review required

- Whether FARO's card workflow definitions are instructor-approved policy or only UI guidance.
- Whether a card owner is always prohibited from verification.
- Whether Product Owner accept/request-changes wording is the complete current workflow.
- The Fall 2026 standup cadence conflict.
- Whether filing Sprint Review always closes the sprint and whether Retro must be filed with it.
- Current Office Hours schedule and the stale FARO placeholder.
- Destinations and ownership of the disconnected Course and Manual actions.
- Whether Grade, Standing, and Resources routes should be visible for the current student role.

## Exclusions

Excluded records/surfaces: **13** total review exclusions — 3 private/user-specific surfaces and 10 question triggers whose answers were not proven static or authoritative. Generated answers, history, personal dashboard values, grades, messages, identifiers, availability details, and selected work were not added to the dataset.

## Safety declarations

NO MIRA INDEX CHANGES MADE: YES

NO FARO DATA MODIFIED: YES
