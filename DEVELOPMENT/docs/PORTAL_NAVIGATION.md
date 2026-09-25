# Messages and dashboard navigation

September 25 follow-up: [public website indexing](WEBSITE_INDEX.md) now adds fetched public-site evidence to the chat. It explicitly excludes the authenticated portal and does not change the account-access limits in this guide. The portal shortcuts below remain separate from public indexed facts.

Updated September 25, 2026. Implemented and tested in source and the isolated local Supabase preview. **Not yet in the stable upload folder, Ocelot website or GitHub.** This change does not read private portal records or change any ticket, account, database or hosting setting.

## What students can do now

Ask **Do I have any new messages?**, **Open my dashboard**, **Who is on my team?**, **Show my grade**, or **Check my Canvas messages**. The chat supplies a portal link and the section to choose. The homepage's **Messages & dashboard** panel has four common prompts; **More portal sections** reveals the other options. Suggested follow-ups keep the conversation interactive without paid AI calls.

All 19 sidebar sections are covered: Overview, Messages, Start here, Team, Standing, Grade, Classmates, Alumni directory, Connections, Opportunities, Team contacts, AI Anchors, Record, Showcase, Letters, Request a letter, Resources, Brand & templates, and Canvas.

Navigation was reviewed in the signed-in portal on September 25. Visible section controls switch within `https://capstone.cs.fiu.edu/portal`; selecting Messages did not change that URL. No supported per-section deep link was established. Therefore **Open portal** opens that verified address in a new tab; the student then chooses the named sidebar or **Jump to** option. It does not automatically select a section. The new tab may ask the student to sign in.

## What it does not check

- A portal shortcut is labeled **LIVE DATA NOT CONNECTED**. It never claims a message count, a zero-message result, a personal grade, attendance, project status or current deadline.
- Portal **Messages** and **Canvas Inbox** are different destinations. Canvas questions point to Canvas, then Inbox; they do not claim access to either service.
- Opening the link does not send a message, mark one read, submit a letter request or change a record through this chatbot. Students perform any subsequent actions in the real portal.
- Course questions such as grading rules, attendance policy, sprint deadlines and showcase preparation still use reviewed course content. Syllabus dates are not live student deadlines.
- No private dashboard snapshot, message body, cookie or FIU credential is copied into the knowledge base, public bundle or Supabase. Supabase staff login only grants the configured prototype ticket access, not FIU portal access.

## Future live information: portal-owner integration required

Being signed in to FIU in another tab does not give this separately hosted application permission to read that tab. Different hosts have different origins; browsers restrict cross-origin reads. An iframe alone does not solve this. See [MDN's same-origin policy](https://developer.mozilla.org/en-US/docs/Web/Security/Defenses/Same-origin_policy).

Before implementing live checks, agree on an approved integration with the portal owner: either a same-origin component using the portal's authorized session, or a documented, narrowly scoped read-only API with approved authentication and CORS where applicable. These are requirements, **not endpoints implemented in this project**:

1. Verify the current student server-side and authorize each returned record for that student. Do not reuse prototype staff privileges, browser-supplied student IDs, exported cookies or a service-role key.
2. Start with only the requested data, such as unread count and an owner-supported message link. Include retrieval time. Message bodies, grades and other student records require separately approved scope and handling.
3. Distinguish a verified zero count from signed out, session expired, permission denied, unavailable or not connected. Do not invent answers from missing data.
4. Keep personal responses out of shared caches, static search data, logs and tickets by default. Define retention, audit and rate limits. Avoid background polling unless explicitly approved.
5. Keep checks read-only. Sending, marking read, changing records or submitting requests needs a separate explicit student action and server authorization.
6. Test two independent student accounts for cross-account isolation, logout/account switching, expiry, unavailable service and revoked access before official go-live.

No scraping bridge, API proxy, hidden endpoint, Canvas API credential, CORS change or new permissions were added by this feature.

## Teammate test flow

From `DEVELOPMENT`, run `npm.cmd run demo:supabase` with the existing public connection configuration, then open <http://127.0.0.1:3004/Capstone%20-%20AI/>. If a prior preview is running, stop that preview in its terminal before rebuilding. Refresh the browser after rebuilding. This isolated command does not replace the stable upload website. `npm.cmd start` also supports these navigation answers after restarting the local Node server.

1. Select **Check messages**. Confirm the answer says it cannot read/count messages and links to the portal with **then choose Messages**.
2. Select **Open my dashboard** in the follow-ups. Confirm it names Overview, without claiming personal information.
3. Ask **Check my Canvas messages**. Confirm it distinguishes Canvas Inbox from portal Messages.
4. Minimize chat, expand **More portal sections**, and choose a section. Confirm the answer names that section. Links open a new tab, leaving the chat intact.
5. Ask **How are grades calculated?**, choose **Sprint 2**, then ask **When is it due?**. Confirm course answers still cite the reviewed syllabus.

Verification: **221 automated tests passed, no failures or skips**, including Node, browser-demo, Supabase search and optional PHP checks with PHP 8.4.25. All 19 intents, follow-up boundaries, course-query regressions and safe source-card links are covered. Chrome confirmed the message/dashboard/Canvas responses and homepage controls. No hosted save or real inbox-read test is implied.

## Packaging and maintenance

Reviewed labels and navigation patterns live in `js/shared/portal-data.js`; `server/lib/knowledge.js` merges them with site and syllabus knowledge. Node, browser-demo, Supabase and optional PHP use the same reviewed entries. No change to private `data/`, public-file allowlists, SQL migrations or authentication is required. Node and PHP retain equivalent routing rules and regression tests.

When an upload update is requested, use `npm.cmd run package:ocelot:supabase`, then the [Supabase FileZilla checklist](OCELOT_SUPABASE_UPLOAD.md). Upload only the generated inner **Capstone - AI** folder. Do not copy this guide, source modules or `DEVELOPMENT` into `public_html`. Packaging preserves the previous release locally; it does not upload files or back up Supabase records.
