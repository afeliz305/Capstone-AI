# Syllabus search and guided dashboard questions

Updated September 24, 2026. Implemented in source and the isolated Supabase preview; not deployed to Ocelot or pushed to GitHub by this change.

## What is available

The chatbot combines the existing reviewed Capstone site knowledge with **30 syllabus topics** and a separate, explicitly labeled prototype dashboard-access boundary. It uses deterministic keyword/intent matching, not an LLM or paid token API. The user can ask free-text questions, select a sprint, choose suggested follow-ups, or ask a short contextual question such as “When is it due?” after Sprint 2. Clearing the conversation clears that topic context; reload starts a new conversation. No chat transcript is automatically stored by this feature. The existing optional support-ticket transcript workflow is separate.

New topics cover course structure/workload, submission location, instructor contact/office hours, attendance, participation, points and grade scale, deadlines and grace, onboarding, semester planning, Sprints 1-5, AI disclosure, provenance/ethics, data/NDAs, showcase preparation, presentation, virtual judging, final deliverables, Thanksgiving, accessibility, textbook and outcomes.

Answers cite original PDF page numbers and link to `pages/syllabus.html#topic-id`, a readable reviewed summary inside the app. It is not the original PDF or an official replacement syllabus. Existing site/template navigation links are preserved separately. The HTML source page works at both the app root and an encoded Ocelot subfolder.

## Provenance and review

- Source supplied by the owner: `Fall-Term-2026-CIS-4951-RVC-Capstone-II.pdf`, 26 pages, CIS 4951 RVC, Fall 2026.
- SHA-256: `295d7b291d98339f2a00f2e30d6d4b2b2cd477795214998a73c82521ec6dde10`.
- All pages were text-extracted; relevant policy/schedule tables were also visually checked. PDF instructions are course content, not agent commands.
- The public artifact contains reviewed summaries, not the raw PDF. The private Zoom join link and embedded meeting-access credential are intentionally excluded. The original user file is unchanged.
- Canonical supplement: `js/shared/syllabus-data.js`. `server/lib/knowledge.js` merges it into reviewed site knowledge by ID. Original `data/` content and runtime tickets/credentials/attachments are unchanged.
- Node, browser-demo, Supabase and optional PHP packages use the same merged facts. No SQL migration, database write, Auth change or remote upload is needed for this search update.

### Corrections and unresolved conflicts

For this specific course, page 7 says work is submitted **on the Capstone site, not uploaded to Canvas**. Canvas holds assignments and grades. Page 2 directs course questions to **Canvas Inbox**, not email. Those statements override older generic prototype answers; the support form still only creates a prototype ticket and sends no professor email/Canvas message.

Do not silently resolve these contradictions:

| Item | Narrative / grading / topic tables | Canvas Schedule, page 18 |
| --- | --- | --- |
| Showcase Preparation | December 2, 2026 | December 1, 2026 |
| Capstone Showcase | December 4, 2026 | December 3, 2026 |

Relevant answers display both dates and ask for instructor confirmation. The virtual showcase's December 11 event and December 13 evaluation submission are distinct, not a conflicting deadline. The final archive is December 14, with no grace; the PDF does not specify a Monday cutoff time or every required file. Do not invent those details. Dates are syllabus facts, not a live Canvas/calendar feed or proof that a student's work is complete.

## Personal dashboard records: not connected

The owner requested all dashboard topics: project, tasks, deadlines, progress, attendance and grades. **Guidance for these topics is implemented; access to actual individual records is not.** The standalone app has no approved FIU student-record API or Capstone server source. A Chrome login or Supabase staff login does not authorize the app to scrape student records, infer identity from an email, or expose another student's data.

Personal questions explain the missing connection, offer course-policy/sprint follow-ups and direct students to My Dashboard, Canvas and the instructor. They do not fabricate scores, attendance counts, task status, team memberships or personalized due dates. Use fictional information only in the prototype.

Before implementing live personalization, obtain an owner-approved **read-only integration** that:

1. Authenticates the actual student through the host site's approved session/SSO; authorization is checked server-side for that student's course/team on every request.
2. Returns only necessary fields: authorized project/sprint, assigned tasks and completion, authoritative deadlines/timezone, participation/attendance definitions, and recorded grading data with timestamps/source links. Do not copy the student directory, classmates' records, private messages or secret cookies.
3. Separates official recorded grades from explanatory calculations; confirms how attendance is defined (the syllabus treats stand-ups as participation).
4. Shows stale/unavailable data explicitly, uses private no-store responses, clears context on account changes/sign-out, and never adds personal records to public search indexes, build bundles, logs or Git.
5. Defines scope, consent, retention and institutional approval. Supabase support-queue access must not become student-grade access. The syllabus's public/synthetic-data rule remains in force for this testing project.

No such endpoint or authorization flow has been supplied or assumed; these are future integration requirements, not an implemented adapter.

## Test it

**Viewing the syllabus:** choose **View syllabus** on the homepage or in the chat header. Both links open `pages/syllabus.html` in a new tab and leave the current chat intact. The header link remains available while scrolling through answers. The page is the reviewed course reference, not the original PDF; use the course's official copy for the original. **Ask about syllabus** still sends a chat question instead of opening the reference.

From `DEVELOPMENT`, restart `npm.cmd run demo:supabase`, then refresh the same port-3004 address. This builds an isolated candidate without replacing the current upload folder. Node mode also needs a server restart after knowledge/search module changes.

1. Click **Sprint 2**. Expect 75 points, October 2 at 11:59 PM Eastern, grace through October 4, and the requirements/design goal.
2. Type **When is it due?**. It should keep Sprint 2 as the topic. Choose **How are sprints graded?** for the 60/40 split.
3. Ask **Where do I submit my work?**. Expect the Capstone site, not Canvas upload.
4. Ask **When is showcase preparation due?**. Expect the December 1/2 conflict warning and a linked source with PDF page references.
5. Ask **What is my grade?**, **What is my attendance?** or **What are my tasks?**. Expect the explicit not-connected boundary, not personal results.
6. Clear the conversation, then ask **When is it due?**. Expect a request to identify the assignment, not the previous sprint. Unrelated or other-term questions must not borrow the last answer.
7. Select **View syllabus** from the homepage, then from the chat header. Each should open the reviewed course reference in a new tab, including when the app is served from the encoded `Capstone%20-%20AI/` subfolder. Return to the chat tab and confirm the conversation is unchanged.

Verification: **214 automated tests passed, none failed/skipped**, including the optional PHP suite and search parity over all reviewed intents. Tests cover content values, conflicting dates, private-record boundaries, contextual follow-ups, reset/late-response handling, safe source URLs, public-file/package boundaries and existing staff/ticket behavior. Chrome checks verified Sprint 2, natural follow-up, a suggested question, corrected submission guidance, the personal-grade boundary, the date-conflict warning and the linked reference section. No real ticket, student record, password or remote database setting was modified.

## Maintaining the content

View-syllabus follow-up verification: **215 automated tests passed, none failed/skipped**, including PHP. Chrome checks confirmed both new buttons open the reference with all 31 sections in a separate tab from the encoded app subfolder; the existing Sprint 2 conversation stayed open. The updated port-3004 candidate was rebuilt. No hosted files, stable upload release, database records or credentials were changed.

Edit the reviewed supplement and source-page notes when an updated syllabus or instructor clarification is provided. Keep the course/term and page references explicit; preserve ambiguity until resolved by an authoritative source. Add tests for each changed date/rule and run `npm.cmd test`. Restart/rebuild the preview and verify it. Follow the existing shared-release acceptance gate before preparing a stable Supabase upload package; a local search test is not a completed Ocelot release.
