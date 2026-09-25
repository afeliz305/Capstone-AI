# Local private portal connector

Updated September 25, 2026. **Development-only implementation; live portal acceptance is still pending.** This work does not deploy to Ocelot, change the FIU portal, write to Supabase, or modify tickets/accounts/private `data/`.

## What this connection is

The Capstone chatbot and FIU portal are separate applications. The prototype uses an application-owned, read-only Chrome DevTools MCP connection to the signed-in Chrome session that the tester explicitly approves. It does not ask for an FIU password, copy browser cookies, read browser databases, or invent a portal API.

- Portal: `https://capstone.cs.fiu.edu/portal`
- Public Ocelot site: `https://ocelot.aul.fiu.edu/~afeli016/Capstone%20-%20AI/`
- Ordinary Supabase preview: `http://127.0.0.1:3004/Capstone%20-%20AI/`
- Private local portal demo: **`http://127.0.0.1:3005/Capstone%20-%20AI/`**

Only the port-3005 local demo can access the approved local browser connection. Public Ocelot visitors cannot access the developer's Chrome session. The applications having FIU-related addresses does not make their login sessions interchangeable.

## Start and connect

Requirements: Node 22.12 or newer, npm, the installed development dependencies, and a current Chrome version that supports approved existing-session connections.

From the **DEVELOPMENT** folder:

```powershell
cd "C:\Users\afeli\Desktop\Capstone AI Chat\DEVELOPMENT"
npm.cmd install --include=dev
npm.cmd run demo:portal
```

For later launches, double-click `scripts\Start Capstone Portal Demo.cmd` or run only the final command. Keep its terminal open. The launcher starts the local app and helper on port 3005; it does not install software, enable browser debugging, or approve Chrome for the user.

1. Close unrelated sensitive Chrome tabs. Browser debugging permission is broader than the narrow operations this app uses.
2. Sign in to the Capstone portal using its normal email one-time-code flow.
3. Leave a dedicated portal **Overview** tab open with no unfinished edits.
4. In Chrome, open `chrome://inspect/#remote-debugging` and enable incoming debugging connections yourself.
5. Open the port-3005 address printed by the launcher and choose **Connect my portal**.
6. Review and approve Chrome's connection prompt if it appears.
7. Select the listed Capstone portal tab and choose **Verify selected Overview**. The selected Overview reloads once to establish fresh identity evidence.
8. Confirm the UI shows **Connected** and the account display name returned by the portal.
9. Ask one of the suggested questions, then choose **Open in portal** or ask **Take me there**.
10. Finish with **Disconnect and clear private data**, then stop the terminal with Ctrl+C. Disable incoming debugging when it is no longer needed.

Normally, no terminal code is entered. A direct top-level visit to the local demo receives a short-lived, HttpOnly, single-use bootstrap credential. The browser exchanges it for a 15-minute local application session protected by a SameSite cookie and CSRF value. The fallback code printed in the terminal is under **Advanced setup** only; it expires after 15 minutes, is single-use, is guess-limited, and becomes invalid when automatic setup or fallback pairing succeeds. It is not an FIU login code and must not be shared, photographed, placed in a URL, or committed.

No environment variable, Supabase key, or AI credential is needed for this mode.

## Connection states and recovery

The UI distinguishes these cases instead of calling all failures “Not connected”:

| State | Meaning and recovery |
| --- | --- |
| Local helper unavailable | Start `npm.cmd run demo:portal` from DEVELOPMENT and keep that terminal open. `ERR_CONNECTION_REFUSED` means the process is not listening. |
| Automatic setup expired | Reload the local page directly. If needed, open **Advanced setup** and use the new single-use fallback code from the current terminal. |
| Browser approval required | Keep Chrome open, enable incoming debugging yourself, approve the prompt, and retry. The app cannot bypass approval. |
| Browser connection unavailable | Confirm the approved Chrome profile is running and no conflicting debugging session owns it. |
| No eligible portal tab | In the approved Chrome profile, sign in and open the exact `/portal` Overview page, then retry. |
| Choose a portal tab | More than one eligible tab exists; select the intended one. The app never guesses. |
| FIU sign-in required | Complete the portal's normal email-code sign-in, return to Overview, and verify again. |
| Choose Overview | Return the selected tab to Overview and finish any editing before retrying. |
| Identity verification failed | The fresh page did not expose an unambiguous current name/email. No old private answer is used. |
| Overview information unavailable | Identity was verified, but no approved visible Overview information could be extracted. |
| Portal account changed / verification expired / connection lost | Private records and visible private chat are cleared. Select and verify the current account again. |

If Chrome reports `ERR_BLOCKED_BY_CLIENT`, do not disable security software to bypass it. Confirm the local health address responds and then resolve the browser or administrator restriction. Passing fixtures or inspecting the portal with a separate coding tool does not prove that this application's connector works.

## Refresh and verification behavior

There is **no 20-second page-reload loop**.

- Initial connection and **Verify again** explicitly reload only the selected dedicated Overview tab. A successful verification requires a new document, a successful network response with transferred bytes, and no service-worker substitution.
- **Refresh information** reads the currently visible approved Overview without reloading. It confirms that the selected browser context and account binding still match, but it does not extend the five-minute verification deadline.
- Personal questions and **Open in portal** perform the same non-reloading account/context check before releasing data. They do not extend the deadline.
- The UI shows real **Last verified** and **Information retrieved** timestamps.
- The local application session lasts 15 minutes. Personal data has a five-minute absolute verification lease. When the lease expires, the app clears it and requires **Verify again**.
- Hiding the local page clears visible personal chat and stops unnecessary status work. Showing it again checks the local session before any personal information can be displayed.

Periodic checks cannot guarantee instant detection of a portal logout. The app therefore uses a short explicit lease, checks binding before every personal result/navigation, rejects late results, and fails closed when verification is stale or ambiguous.

## Approved Overview information

The current reader is intentionally limited to the signed-in account display and approved visible Overview content: project summary, own-team information, Product Owner, visible dates/assignment guidance, sprint summary, and a Messages sidebar indicator only when it is visibly present. Suggested questions are generated only for kinds actually extracted.

The connector does not expand collapsed cards, open conversations, mark messages read, read grades/attendance/Canvas/directories/other-team records, or inspect hidden application state. “Not found in the approved Overview” does **not** mean the information does not exist in the account.

Private excerpts are searched with the project's local deterministic retrieval engine. Results include source title, excerpt, retrieval time, coverage, and a validated destination. **Open in portal** opens the exact observed `/portal` address; it does not guess an unobserved internal route. Public website/syllabus knowledge remains separate and may appear as a separately labeled public result for mixed questions.

## Privacy and security boundaries

- The server listens only on `127.0.0.1`, requires the exact Host and Origin, rejects forwarded/cross-site requests, accepts same-origin JSON operations only, applies request/guess limits, and uses an HttpOnly SameSite=Strict cookie plus CSRF protection.
- Chrome MCP and its SDK are pinned development dependencies. Usage statistics, CrUX, source maps, network/input/performance/emulation/memory tool categories, and network-header output are disabled using supported options. Raw browser-tool output and errors are not logged.
- The browser adapter permits only page listing, fixed DOM evaluation, and explicit reload. The Chrome URL allowlist is limited to the Capstone origin; the app additionally requires the exact `/portal` page. Chat text cannot provide JavaScript, selectors, URLs, account IDs, or arbitrary browser commands.
- Private records remain in server memory and are bound to the local application session, selected browser context, verified identity, generation, source, and expiry. They are never inserted into the shared public index.
- Account change, sign-in loss, ambiguous identity, failed verification, tab loss, connector loss, expiry, hiding, and disconnect clear private state or visible private chat as appropriate. Old source IDs and late results are rejected.
- The local client does not use localStorage/sessionStorage for credentials or personal content. Responses are `no-store`; there is no service worker.
- Personal questions and excerpts are handled only by the same-origin local helper. This mode does not call Supabase, an AI/model provider, analytics, or the ticket API. Ticket creation and transcript sharing are disabled in the port-3005 preview.

These are application-enforced restrictions. Approving Chrome debugging grants broader browser permission than the app uses. This owner-run prototype does not defend against malware, administrator access, a compromised browser/portal, or a person who can access the unlocked computer.

## Tests and current evidence

Commands executed from DEVELOPMENT:

```powershell
node --check server/portal-local/http.js
node --check server/portal-local/service.js
node --check server/portal-local/browser-adapter.js
node --check js/local/portal-client.js
node --test test/portal-local.test.js test/chat-popup.test.js
$env:CAPSTONE_PHP_BIN='C:/Users/afeli/AppData/Local/CapstoneAIChat/tools/php-8.4.25/php.exe'
npm.cmd test
```

Results on September 25: connector/chat focus **34/34 passed**; full project **252/252 passed**, with zero failures, skips, or cancellations. Tests cover helper/pairing/CSRF restrictions, invalid and expired codes, single-use bootstrap, supported/unsupported answers, source navigation, no automatic reload timer, account switching, expiry, connector loss, two synthetic-user isolation, late-result rejection, and absence of private traffic to the ordinary hosted pipelines. Synthetic fixtures are not displayed as live portal data.

**Live application verification remains incomplete.** The updated port-3005 app was started and the direct-page bootstrap succeeded without entering the terminal code. Chrome 154.0.8037.57 was running, the stable-profile `DevToolsActivePort` file was present, and the signed-in `/portal` tab was open. The application-owned `list_pages` connection still timed out at **Browser connection unavailable**, so it did not enumerate/select that tab and no real identity, Overview answer, or source navigation was released. This points to the Chrome approval/handshake boundary rather than a missing helper, expired pairing code, absent Chrome version, or missing portal tab. The code and tests passing do not change that fact. In Chrome, keep `chrome://inspect/#remote-debugging` enabled, review/approve the pending incoming debugging request, return to the already-open local page, and choose **Connect my portal** again. Record only whether each step passed—do not copy personal Overview content into a bug report.

## Production boundary

Never upload this connector, `DEVELOPMENT`, its terminal fallback code, or a browser-debugging endpoint to Ocelot. An official launch should use portal-owner-provided server-side identity and narrowly authorized per-user data services, with reviewed scopes, retention, audit, logout/account-switch events, and safe navigation semantics. The local browser connector is a development bridge, not the production authentication design.
