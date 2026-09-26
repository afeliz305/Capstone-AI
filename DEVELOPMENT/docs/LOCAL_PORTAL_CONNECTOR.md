# Private portal connector

Updated September 26, 2026. The read-only Chrome extension now supports both the local MIRA preview and the owner's hosted Ocelot MIRA page. It does not modify the FIU portal or send private portal content, private questions, or private answers to Supabase, tickets, analytics, an AI provider, or files.

## Hosted Ocelot mode

The generated Supabase package includes `js/hosted/portal-client.bundle.js`. That browser-only client talks to the installed extension through an isolated content-script bridge; no local Node helper is required for hosted use.

1. Load or reload the unpacked `DEVELOPMENT\portal-extension` folder in `chrome://extensions`.
2. Open the extension and grant **Portal access** and **Hosted MIRA access**. Chrome permissions are origin-wide, while the extension additionally restricts requests to the exact portal page and the exact `https://ocelot.aul.fiu.edu/~afeli016/Capstone%20-%20AI/` application path.
3. Reload the portal and Ocelot tabs once after a first grant or extension update.
4. Keep the signed-in `https://capstone.cs.fiu.edu/portal` tab open. On Ocelot, choose **Connect my portal**.
5. The hosted page keeps private records and private chat results only in that tab's JavaScript memory for five minutes. A reload, tab close, disconnect, account change, authentication failure, or expiry clears them. Public help and ticket operations continue through their existing transport, but personal questions are intercepted locally before the Supabase search path.

The hosted permission is deliberately limited to Anthony's Capstone application path by application checks. Other Ocelot user directories cannot request portal data through this extension. The extension must be installed on each tester's own computer; an ordinary website cannot silently install or grant it.

## Normal mode: Chrome extension

Normal use is now a portal-specific Manifest V3 Chrome extension. It does **not** use `chrome.debugger`, a remote-debugging port, Chrome DevTools MCP, cookies exported from Chrome, or broad all-sites access. The earlier MCP adapter remains available only when the developer explicitly starts `demo:portal:mcp`.

Prerequisites:

- Node.js 22 or newer.
- Google Chrome.
- A normal signed-in tab at exactly `https://capstone.cs.fiu.edu/portal`.
- The project's dependencies installed with `npm.cmd install --include=dev`.

Start and install:

1. In VS Code, open `DEVELOPMENT` and run `npm.cmd run demo:portal`.
2. The command builds `portal-extension/content.bundle.js`, starts the loopback helper at `http://127.0.0.1:3005/Capstone%20-%20AI/`, and prints a separate single-use **extension pairing code**. Keep that terminal open.
3. In Chrome, open `chrome://extensions`, enable **Developer mode**, choose **Load unpacked**, and select the repository's `DEVELOPMENT\portal-extension` folder. This installation is a manual browser action.
4. Open the extension popup. Choose **Grant portal access**. Chrome grants origin-level access to `https://capstone.cs.fiu.edu/*`; the extension additionally enforces the exact `/portal` path with no query string.
5. Enter the extension pairing code from the terminal. The code is single use and expires after 15 minutes.
6. Sign in through the portal's normal email one-time-code flow and keep the exact `/portal` tab open.
7. Open the local MIRA address, choose **Connect my portal**, select the listed tab, and choose **Verify selected portal**.
8. Ask a personal question. MIRA retrieves only the relevant supported section on demand. It does not crawl the entire dashboard for each question.
9. Use **Disconnect and clear private data** when finished. To revoke browser site access too, remove the portal permission in Chrome's extension settings or remove the extension.

The extension can remain installed between sessions. A helper restart creates a new in-memory trust authority, so the extension must be paired again; this is intentional. A Chrome restart can reuse unexpired extension/helper trust if the same helper process is still running. A computer or helper restart requires re-pairing.

## Permissions and why they are needed

| Permission | Reason |
| --- | --- |
| `alarms` | Wake a suspended Manifest V3 service worker so it can poll the local helper. |
| `scripting` | Register the reviewed content script only after the user grants portal access. |
| `storage` | Store only the local bridge token, replay sequence, trust expiration, and explicit-disconnect flag. Access is restricted to trusted extension contexts. No portal content is stored. |
| `http://127.0.0.1:3005/*` | Reach the loopback helper. The helper binds only to loopback and validates the exact host. |
| Optional `https://capstone.cs.fiu.edu/*` | Let the user explicitly grant portal access. Browser permissions are origin-wide; application checks still require exactly `/portal`. |
| Optional `https://ocelot.aul.fiu.edu/*` | Let the user explicitly connect the hosted MIRA page. Browser permission is origin-wide; application checks accept only `/~afeli016/Capstone - AI/` and its `index.html`. |

The extension does not request `debugger`, `tabs`, cookies, downloads, native messaging, `<all_urls>`, or access to Canvas/SharePoint. A linked external site needs a separate reviewed integration and permission; portal access does not imply access elsewhere.

## Four independent states

1. **Portal site permission** — granted or revoked by Chrome.
2. **Extension-to-helper trust** — authenticated with a single-use pairing code, a random token held as a hash by the helper, a monotonic replay counter, exact extension origin, and a maximum seven-day trust lifetime.
3. **Current FIU authentication** — revalidated by a no-cache request to the exact portal page using the signed-in browser session. A stale account name in the DOM is not accepted by itself.
4. **Private content freshness** — extracted records live only in helper memory for five minutes from verification. Searches do not extend that deadline.

After five minutes, MIRA purges names, records, sources, and bindings but keeps valid extension permission/trust. The next personal question revalidates the current FIU account and reloads only the relevant source. FIU logout, account switch, lost verification, explicit disconnect, or a stale response clears private data and rejects in-flight results.

The extension worker may suspend. Chrome alarms, startup/install events, and portal-tab updates resume polling. The service worker is never assumed to remain alive. If the helper is unavailable, personal answers fail closed while public course help remains usable.

## Message-content scope

Message bodies are off by default. In MIRA's connection panel, enable **Read only the conversation I deliberately opened** to allow extraction of messages already visible in the currently selected conversation.

MIRA never selects an unread conversation, opens a thread, scrolls hidden history, changes read state, types, sends, reacts, edits, deletes, or acknowledges. If the user has not deliberately opened the conversation, MIRA reports the limitation and opens only the Messages destination. The connector never claims that visible content is the complete conversation history.

## Dashboard coverage

| Section/source | Discovered | Inspected | Extraction | Search/navigation | Limit |
| --- | --- | --- | --- | --- | --- |
| Overview | Yes | Yes | Supported | On demand; verified parent route | Visible profile/project/date/assignment/team/Product Owner/sprint content only. |
| Messages | Yes | Yes | Metadata; visible selected conversation only when opted in | On demand; manual conversation selection | No auto-open, hidden history, threads, composer, reactions, or actions. |
| Start here | Yes | Yes | Supported | On demand; parent route | Visible onboarding instructions/status; forms excluded. |
| Team | Yes | Yes | Supported | On demand; parent route | Own team, members, leadership, sprint cards, descriptions, owner/size/status, visible criteria and evidence/history. All mutations excluded. |
| Standing | Yes | Yes | Supported | On demand; parent route | Visible standing/trend and disclosed explanation only. |
| Grade | Yes | Yes | Supported | On demand; parent route | Own posted components and temporarily disclosed past-term details; no prediction or other student data. |
| Connections | Yes | Yes | Supported | On demand; parent route | Signed-in student's visible connection summary. |
| Opportunities | Yes | Yes | Supported | On demand; parent route | Visible listings/instructions; no application action. |
| Team contacts | Yes | Yes | Supported | On demand; parent route | Contacts shared with the student's team only. |
| AI Anchors | Yes | Yes | Supported | On demand; parent route | Visible guidance/results; search controls are not operated. |
| Record | Yes | Yes | Supported | On demand; parent route | Signed-in student's visible Capstone record. |
| Showcase | Yes | Yes | Supported | On demand; parent route and verified same-origin links | No submission or external-origin access. |
| Letters | Yes | Yes | Supported | On demand; parent route | Own visible letter status only. |
| Request a letter | Yes | Yes | Static guidance only | On demand; parent route | Form/draft values excluded; no request submitted. |
| Resources | Yes | Yes | Visible descriptions and same-origin links | On demand; exact verified document links retained | Known DOCX templates were separately reviewed into public course knowledge; arbitrary document crawling is not enabled. |
| Brand & templates | Yes | Yes | Visible guidance and same-origin links | On demand | External destinations require separate authorization. |
| Classmates | Yes | Structure only | Intentionally excluded | Navigation not offered by MIRA | Unrelated student directory records. |
| Alumni directory | Yes | Structure only | Intentionally excluded | Navigation not offered by MIRA | Unrelated alumni directory records. |
| Canvas and other external links | Yes | Destination only | Not extracted | Exact destination may be shown | Separate origin, permission, and authentication are required. |

The capability map is kept separately from short-lived private records. A source can remain known/supported after its content has expired.

## Linked templates and unresolved rules

The authorized Resources links were downloaded locally for structural review without retaining student data. MIRA now supports the Daily Scrum, Sprint Review, Sprint Retrospective, and minutes-usage-guide contents, including headings/table relationships and exact document destinations.

- Daily Scrum fields are known: Team, Sprint, Date, start/end time, Attendees, per-attendee Hours/Worked on/Next/Blockers, and a team summary.
- Review fields are known: stories/points/status, delivered points versus velocity, goal result, demo notes, and Product Owner/stakeholder feedback and acceptance.
- Retrospective fields are known: attendees, went well, did not go well, and owned action items.
- The Daily Scrum template and usage guide conflict on cadence/submission wording. MIRA flags the conflict and does not choose a rule.
- A global Verify transition rule, official Definition of Done, and course-wide acceptance-criteria policy were **not found after inspecting** Team, Resources, and the available linked templates. A student's own card may still expose card-specific criteria/evidence.

## Development fallback

Run `npm.cmd run demo:portal:mcp` only when deliberately testing the previous Chrome DevTools MCP adapter. That mode still requires Chrome's remote-debugging consent and a dedicated portal tab. Normal `demo:portal` never silently falls back to MCP or triggers its approval prompt.

## Verification commands

```powershell
cd "<path-to-cloned-repository>\DEVELOPMENT"
npm.cmd install --include=dev
npm.cmd run extension:build
node --test test/portal-extension.test.js test/portal-local.test.js test/mira-acceptance.test.js test/syllabus.test.js test/chat-popup.test.js
npm.cmd test
```

Persistent regression tests use synthetic data. Live comparisons must remain local and redacted. Installing the unpacked extension, granting its optional portal access, signing in, and selecting the intended portal tab are manual actions.

### Live acceptance — September 26, 2026

The normal `demo:portal` mode was verified with the MCP adapter disabled. Chrome loaded the unpacked extension, granted the optional portal permission, paired it to the current helper, discovered the exact signed-in `/portal` tab, verified the current account without requiring Overview, loaded the visible Overview source, and returned a private source-backed answer with a **View in portal** action. No private value is copied into this report. Because the portal tab was already open when the extension was first installed, it required one ordinary reload so Chrome could attach the newly registered content script. Repeated debugging approval was not used.

## Production boundary

Do not upload `portal-extension`, the loopback helper, pairing codes, or private connector files to Ocelot. An official portal launch should use portal-owner-approved identity and narrowly authorized server-side data services. End users should not be required to install a development extension in production.
