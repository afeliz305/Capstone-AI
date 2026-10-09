# MIRA portal context audit and adapter map

Read-only audit completed October 9, 2026 against an authorized signed-in Capstone session. No form was submitted, card moved, message sent/opened for testing, grade changed, privacy setting changed, or portal record mutated.

The selectors below are development adapter selectors. MIRA responses expose only the human-readable source label, such as `My rhythm — current portal`; they never expose selectors or implementation details.

| Label | Exact route | Current reviewed selector | Class | Safe read | Navigation only | Excluded content |
| --- | --- | --- | --- | --- | --- | --- |
| Today | `/today` | `main`, `[data-ob-project]`, `.card` with `Your cards`/current-sprint summaries | Personal | Current sprint/project labels, own next step/card summary, safe ceremony/deadline labels | No | Team-board preview, controls, drafts, unrelated cards |
| Board | `/board` | `#pxstage #bcols .col[data-col] .kc[data-card]` | Personal/team | Verified user's card ID, title, lane, owner, size, blocked state, safe badges, criteria count and evidence-presence status | No | Other owners' cards, forms, card moves, evidence submission, mutation buttons |
| Meetings | `/meetings` | `#pxstage .mt-s`, headings such as `Up next` and `Office Hours` | Personal/team | Title, date/time, status, type, safe location label | No | Private notes/content, Zoom secrets, availability controls, secret calendar feed |
| Inbox | `/inbox` | `nav[aria-label="Conversations"] .ibc`, `.ibc.un`, `aria-label` | Personal | Needs-reply/unread indicators and safe channel/category labels | No | Message bodies, threads, composers, reactions, read-state changes, send controls |
| My work | `/my-work` | `#tdpage`, current `Sprint … In progress / Open` summary | Personal | Current sprint filing/status, safe due-date metadata, current open work summary | No | Earlier grade values, unrelated records |
| Projects this term | `/this-term` | Route only; current project comes from verified Today/Team context | General directory | Current project metadata only when identified in personal context | Yes for directory page | Other teams, broad student roster, unrelated project descriptions |
| People | `/people` | Safe role cards containing `Product Owner`, `Team Leader`, `Office Hours`, or `your team` | Personal relationship | Signed-in user's team/support relationships and role labels | No | Classmate/alumni browsing, unrelated students, broad directory |
| My rhythm | `/me/rhythm` | `[aria-label^="Standups per week:"]`, `[aria-label^="Cards moved per week:"]`, current summary, `One next step` card | Personal | Own weekly counts/history, next-step label, next-step deadline | No | Class rank/range, names, inferred performance or grades |
| Recognition | `/recognition` | Route only | Mixed/sensitive | None in the connector | Yes | Teammate recognition, kudos targets, evaluation/threshold data, mutation controls |
| Profile and privacy | `/me/privacy` | Route only | Sensitive settings | None | Yes | Identifiers, contact details, account data, privacy choices, credentials |
| Grade | `/portal#mygrade` (`/portal?classic=1#mygrade` menu link) | `button.nav-item[data-v="mygrade"]` | Personal/sensitive | Existing project policy remains navigation-only | Yes | Grade values and other students' grades |
| Standing | `/portal#compare` (`/portal?classic=1#compare` menu link) | `button.nav-item[data-v="compare"]`, active Standing cards | Personal/sensitive | Own authorized standing/trend explanation, five-minute session only | No | Other students, shared/public indexing, ranking inference |
| Team | `/portal#team` (`/portal?classic=1#team` menu link) | `button.nav-item[data-v="team"]`, `.myteam`, `.myteam-row` | Personal/team | Own team members and Product Owner/Team Leader relationships | No | Other teams and workflow controls |
| Resources | `/portal#resources` (`/portal?classic=1#resources` menu link) | `button.nav-item[data-v="resources"]` | General/authenticated | Approved resource/template cards | No | Form values or unrelated account data |
| Start here | `/portal#orientation` | `button.nav-item[data-v="orientation"]` | Personal/general | Approved onboarding cards | No | Unsaved inputs |
| Classmates | `/portal#netclass` | `button.nav-item[data-v="netclass"]` | Directory | None | Yes | Broad student directory |
| Alumni directory | `/portal#netdir` | `button.nav-item[data-v="netdir"]` | Directory | None | Yes | Broad alumni directory |
| Connections | `/portal#netconn` | `button.nav-item[data-v="netconn"]` | Personal | Own approved connection cards | No | Other accounts/private details |
| Opportunities | `/portal#netopp` | `button.nav-item[data-v="netopp"]` | Personal/general | Approved opportunity cards | No | Application forms and drafts |
| Team contacts | `/portal#netteam` | `button.nav-item[data-v="netteam"]` | Personal/team | Own approved team-contact cards | No | Broad directory |
| AI Anchors | `/portal#aidir` | `button.nav-item[data-v="aidir"]` | General/relationship | Approved role/contact cards | No | Private directory data |
| Record | `/portal#caprecord` | `button.nav-item[data-v="caprecord"]` | Personal | Own approved record summary | No | Credentials and unrelated records |
| Showcase | `/portal#myshowcase` | `button.nav-item[data-v="myshowcase"]` | Personal | Own approved readiness summary | No | Grades, drafts, mutation controls |
| Letters | `/portal#myletters` | `button.nav-item[data-v="myletters"]` | Personal | Own approved letter status | No | Letter bodies or other users' requests |
| Request a letter | `/portal#reqletter` | `button.nav-item[data-v="reqletter"]` | Personal workflow | Guidance only | No | Form drafts and submission controls |
| Brand & templates | `/portal#brandhub` | `button.nav-item[data-v="brandhub"]` | General/authenticated | Approved linked brand resources | No | Forms/account data |

## Context model

The connector produces allowlisted records only:

```text
portalContext
├─ page: active allowlisted section
├─ studentContext: verified session binding only (not a chat-selectable identity)
├─ today: sprint/project/next-step summaries
├─ board: own visible cards and safe completion metadata
├─ myWork: current sprint/open-work summary
├─ meetings: safe schedule metadata
├─ inbox: unread/channel metadata only
├─ rhythm: own counts/history/next step
├─ projects: current project reference; directory excluded
├─ people: own support/team relationships
├─ recognition: navigation only
├─ grade: navigation only in the current connector
└─ standing: own authorized session-scoped explanation
```

Personal context expires five minutes after retrieval, is cleared on logout/account change, and is never merged into the public/shared knowledge index. Hosted Ocelot remains navigation-only unless the portal owner installs the separate portal-native integration.

## Source routing

- Course rules and definitions use the current syllabus/instructor/public Capstone sources, then reviewed FARO curated guidance.
- Current work uses My work and Board.
- Stand-up counts use My rhythm.
- Next action combines Today, My work, Board, and My rhythm.
- Meetings use Meetings; unread status uses Inbox metadata.
- Product Owner/team relationship questions use Team or the narrow People adapter.
- Card-readiness questions combine current Board metadata with reviewed acceptance/evidence guidance. MIRA never moves or approves a card.

The personal statement “your second standup this week” is treated as current account state. It is not converted into a universal course rule without a separate current authoritative general source.
