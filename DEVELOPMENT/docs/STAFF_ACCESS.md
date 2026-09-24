# Staff sign-in and assignments

Implemented and tested locally on September 14, 2026. This extends the existing FIU-styled queue. The source repository is now public, but the app is not publicly hosted: staff authentication and ticket data remain local to each installation. Publishing the source does not publish passwords, tickets, or attachments.

## Approved staff

| Name | Email |
| --- | --- |
| Zavier Richardson | zrich010@fiu.edu |
| Christopher Hernandez | chern563@fiu.edu |
| Michael Alvarez | malva517@fiu.edu |
| Romelin Charnel | rchar044@fiu.edu |
| Raul Alvarenga | ralva037@fiu.edu |
| Anthony Feliz | afeli016@fiu.edu |

The roster lives server-side in `server/lib/staff-auth.js`. Emails are trimmed and compared case-insensitively. Display names always come from the approved roster, not user-submitted names. This does not prove who owns the email.

## Temporary email-only mode — September 16 update

At the project owner's request, `server/config.json` now sets `staffLoginMode` to `email-demo`. The normal startup command uses that setting unless `CAPSTONE_STAFF_LOGIN_MODE` overrides it. No password entry/setup is needed in this mode. The backend checks the roster, creates an expiring session, and returns `loginMode` so the page hides/disables the password field. Warnings remain visible on sign-in and in the queue. Newly staff-created tickets are labeled `identitySource: "staff-email-demo"` and display **Staff email-only demo · identity unverified**.

**Anyone who knows an approved email can impersonate that staff member, read internal notes, change tickets, and download attachments.** This is for fictional testing only, not secure staff access. Assignment/audit names in this mode are selected demo identities and cannot be relied on as proof of authorship. Existing password hashes are not deleted or overwritten; email-only sessions do not consult them, so resetting a password does not revoke an email-only session. Logout, expiry, or restarting the server does.

To restore passwords, stop the server, set `staffLoginMode` to `password` in `server/config.json` (or set `CAPSTONE_STAFF_LOGIN_MODE=password`), configure passwords as described below, then restart and hard-refresh. All prior sessions end; saved tickets and files remain. Invalid mode values stop startup. Request JSON cannot enable email-only mode on a password-configured server. Password enforcement, password-version revocation, and wrong-password checks below apply **only in password mode**.

The mode/password configuration above applies to the **Node variant**. The new [Ocelot PHP upload](OCELOT_UPLOAD_GUIDE.md) implements only temporary email-demo access, with the same server-side six-email roster in `server/php/index.php`. It does not read Node configuration or passwords. Its sessions persist in private server storage until logout or one-hour expiry; PHP worker restarts do not revoke them. Tickets/documents persist separately from replaceable app files, shared by staff on that instance. No live Ocelot deployment has been verified. A secure PHP identity integration remains future work.

## Password-mode setup (and password resets)

From your local project folder in the VS Code terminal:

```powershell
npm.cmd run staff:password
```

Choose the staff number, then enter and confirm a new **prototype-only** password of 12–128 characters. Typing is hidden. You can target an account directly:

```powershell
npm.cmd run staff:password -- afeli016@fiu.edu
```

There are no default passwords and no web self-registration/reset endpoint. Do not put passwords in command arguments, chat, email, source code, or Git. Do not reuse FIU credentials. The same local command resets a password and invalidates that account's existing sessions when they are next checked. Run one setup command at a time.

Each teammate's cloned/ZIP copy has separate credentials, tickets, and files. A teammate needs to configure their own account on their own local copy; configuring all six is only necessary when testing all six accounts on one computer. Someone who controls this computer/project directory can run the setup command, so it is a trusted local administration action, not proof of FIU account ownership.

Only randomly salted scrypt password hashes are saved in `data/staff-credentials.json`, which is ignored by Git (including its temporary write file). Filesystem permissions depend on the operating system; protect access to the computer and this directory. Backing up source does not back up credentials. `CAPSTONE_STAFF_CREDENTIALS_FILE` can override the file for isolated tests or a controlled local setup; keep any custom path outside tracked source. `.env` files are not loaded automatically.

## User flow

### Optional local-only test password

For fictional-data testing on your own computer, add `--local-test-only` to the setup command:

```powershell
npm.cmd run staff:password -- afeli016@fiu.edu --local-test-only
```

This explicitly permits 8–128 characters for the selected account; it does not set a shared or default password. Enter your chosen password at the hidden prompts. Other staff accounts and the normal setup command retain the 12-character minimum. Only a salted hash and a `localTestOnly` marker are saved in the ignored credentials file.

The server rejects that account in `NODE_ENV=production`, from non-loopback network addresses, or when the request host is not localhost/a loopback literal. Forwarded headers do not bypass this check. This is not suitable for shared hosting or real student data. To remove the exception, rerun the normal setup command without the flag and set a 12–128-character password; existing sessions are invalidated. Restart after updating the code, then refresh the sign-in page. The login field permits eight characters, while the server enforces the appropriate account policy.

### Signing in and reviewing work

1. Open `/pages/staff.html`. Ticket data stays hidden until the server confirms a staff session.
2. Enter an approved email; enter its configured password only if password mode is enabled. The queue shows the roster name and email, your assigned count, and unassigned count. Email-only mode labels the identity as unverified.
3. **All tickets** is the initial view, grouped by current assignee with Unassigned first. Choose **My tickets** for everything currently assigned to the signed-in email, **All resolved** for resolved team tickets grouped by assignee, or **My resolved** for resolved tickets currently assigned to that email. To find work to claim, use **All tickets → Unassigned only** (optionally set Status to Open).
4. **Claim ticket** assigns an unassigned ticket to the signed-in staff member. **Assign to** supports any of the six staff members or **Unassigned**. A stale assignment update is rejected instead of silently overriding another staff member's change.
5. **Sign out** clears the session and visible ticket data. Sessions expire after one hour; restarting the server also clears them.

Unlisted emails, wrong/unconfigured passwords, forged/expired sessions, and unauthorized API access are rejected. Failed login shows **Unauthorized access**, a link back to the student assistant (`/`), and a countdown. After **15 seconds of no keyboard or pointer response in that panel**, the browser returns to `/`. Activity resets the countdown; **Try signing in again** cancels it and reopens sign-in. Rate limits/service failures show their own recoverable error rather than pretending a sign-in succeeded.

The four view counts and summary totals are calculated before extra filters. Group counts and the “shown” message reflect the filtered results. Selecting any view clears search, status, and Unassigned only; resolved views lock Status to Resolved. Refresh queue retains the current selection. Claiming, reassigning, or reopening a ticket updates its group, membership, and counts immediately. **My resolved** means current assignee, not the person recorded as having resolved it historically. Logging out clears the displayed tickets and counts.

**Search tickets** appears at the top of the authenticated queue. Typing immediately filters the visible cards and updates the result count in that bar; it does not submit a form or make a new server request for each character. Search matches ticket IDs, student names/emails, topics, questions, details, and resolution notes inside the current view and filters. **Clear search** or Escape in the field restores that view's filtered results and keeps keyboard focus in the input. It does not clear the chosen status or Unassigned only filter.

## Server-side protection and persistence

Preferred contact is validated by shared format rules in both creation forms and again on the server. The ticket retains its requester email/identity even when Phone is preferred; `contact` stores the selected email or normalized phone number. Staff can read it on cards and in the workspace, but this preference triggers no outbound contact and is excluded from the requester preview. Missing legacy preferences fall back to requester email.

**Project owner · Staff marked** is a staff-applied classification, not an authenticated owner role. Staff creation/workspace saves accept only a boolean `projectOwnerTicket`; server-owned `projectOwnerMarkedBy`/`projectOwnerMarkedAt` record who marked or unmarked it. Workspace changes participate in the existing revision/conflict and journal flow. The student creation endpoint ignores forged owner-tag/marking metadata. There is no automatic owner roster, self-service owner role, or extra permission associated with this tag, and the recorded creator/requester is unchanged.

- `POST /api/staff/login`: checks the roster (and password in password mode), rotates a random opaque session token, and returns the display identity/roster and `loginMode`. Failed reauthentication clears the prior session.
- `GET /api/staff/session`: validates the session and, in password mode, current password version. It does not expose password records or hashes. An unauthenticated 401 response includes the configured login mode so the form can render correctly.
- `POST /api/staff/logout`: invalidates the session and expires its cookie.
- `GET /api/tickets`, `PATCH /api/tickets/:id`, and attachment downloads require a valid staff session on the server. Removing HTML `hidden` attributes or calling APIs directly does not bypass this.
- `POST /api/staff/tickets` requires a valid staff session and creates a staff task. The server validates the topic, title/details, and assignee; derives name, email, and `createdBy` from the session; labels `identitySource: "staff-session"`; and always starts the ticket Open. Submitted identity, status, privacy, and resolution fields do not override server-owned values. Optional attachments use the same validation and limits as student creation: up to 3 PDF/DOCX/TXT files, 5 MB each, 10 MB combined, inside a 14 MB JSON body. File IDs/types are server-generated, not trusted from the request. Downloads remain staff-only, and failed ticket persistence rolls back the new files. See [document upload notes](DOCUMENT_ATTACHMENTS.md).
- Student search, student account integration, and student ticket creation remain available without staff sign-in. The student endpoint cannot preassign tickets or act as the staff creator.
- Cookies are HttpOnly, SameSite=Strict, scoped to `/api`, with Secure on direct HTTPS. Passwords and session tokens are not stored in browser storage. Only the last server-confirmed staff email is saved in `localStorage` under `capstone-ai-chat:last-staff-email`, as a non-authoritative form preference. It survives logout, does not grant access, and is replaced only after a successful login or valid session check. Failed attempts do not replace it. If storage is unavailable, sign-in still works but the email may not survive a reload. Clear this site's browser data to remove it; on shared browsers, other users can see the saved email. Browser password-manager behavior is separate from this app. Login has a per-process, per-address limit of 10 failed attempts per 15 minutes; restart clears that limit. This is not a production distributed abuse-control system.
- Student tickets and staff tickets created without an assignee have `assignedTo: null`; legacy tickets with no assignment field are treated as unassigned. Staff creation can set an approved initial assignee. Assignments add `assignedBy` and `assignedAt`; updates record `updatedBy`. These fields persist in the existing ignored ticket JSON.
- PATCH accepts `status` and/or `assignedTo`. Assignment updates also require `expectedAssignee` (email or null) for conflict detection. Server validation permits only approved staff emails or null.
- `GET /api/tickets/:id` opens a ticket and requires a current staff session. `PATCH /api/tickets/:id/work` saves validated fields and appends work notes/additional comments atomically. It requires the current `expectedRevision` and a UUID `requestId`. Authors, timestamps, journal types, and revisions are server-owned. Client-supplied requester identity or activity arrays do not replace saved records.
- Both workspace saves and quick queue changes increment revision. Stale workspace saves return 409 without changing records. The most recent 50 workspace save identifiers/fingerprints are retained for safe exact retries; older replays are still rejected by stale revision. Different payloads/staff cannot reuse a saved identifier.
- `GET /api/tickets/:id/requester-preview` is also staff-only. Its server-side allowlist returns only requester-facing ticket fields and additional comments. It never returns internal work notes, internal resolution notes, transcript, assignee/audit information, or staff email addresses. There is no end-user ticket page or comment delivery yet; a separate authorized requester-access workflow is required before comments can actually be read by end users.
- Journals persist in `data/tickets.json`. All approved staff can read internal entries. Internal vs requester-facing journal types are not controlled by a client visibility checkbox. A note correction is a new entry, not an edit to history.

## Fictional queue examples

Signed-in staff can also choose **Create ticket** beneath their identity. The staff form includes **Workflow and improvements**, **Testing and updates**, **Implementation and testing**, and the existing support topics. It uses the selected session identity, accepts a title/details and optional documents, and allows Unassigned, self-assignment, or a teammate. It does not create a student request on someone else's behalf. Saving switches to All tickets with cleared filters; errors preserve the draft, while Cancel, Escape, sign-out, or session loss clears it. Repeated submission/dismissal is disabled while saving. No email is sent. See the [teammate guide](TEAM_SETUP_GUIDE.md#create-a-ticket-from-the-staff-queue).

The optional local sample loader creates 12 resolved examples with resolution notes (two assigned to each approved staff member) and five open, unassigned requests. Generated tickets are labeled **Sample · fictional**; they do not describe verified FIU site defects or actual staff work. See the [teammate setup guide](TEAM_SETUP_GUIDE.md) for the stop/load/restart commands.

Sample resolution notes are displayed and searchable. Open a ticket to edit its current staff-only resolution summary or append journal entries. Changing status does not generate a resolution note. Rerunning the loader preserves existing tickets and staff edits without duplicating this batch. This is an offline local administration command, not a public ticket-creation endpoint or a way around staff sign-in.

## Boundaries and verification

Workspace tests also verify field/journal persistence, server-owned author identity, append-only notes, version conflicts, exact-save retry protection, rejected unauthorized/invalid writes, and the requester preview's exclusion of internal data. Workspace event handlers run against a DOM double in tests; browser layout and interaction checks remain on the teammate checklist. End-user delivery is intentionally not claimed by these preview tests.

All six staff members have the same team-level rights to create, view, download, update, claim, and reassign tickets. **My tickets and My resolved are not access-control boundaries.** The instructor privacy checkbox remains a preference, now labeled **Instructor privacy requested** in the queue. It does not hide a ticket from other staff.

This is local prototype authentication, not FIU single sign-on, email ownership verification, or a production identity system. Before deployment, arrange institutional authentication, administrator provisioning, role and instructor-only permissions, HTTPS/reverse-proxy handling, stronger abuse controls, auditing, retention, and the upload safety work described in [document attachments](DOCUMENT_ATTACHMENTS.md). The design uses server-side checks and protected session cookies consistent with the [OWASP session guidance](https://cheatsheetseries.owasp.org/cheatsheets/Session_Management_Cheat_Sheet.html), but does not implement every production recommendation.

Automated tests cover all six accounts, wrong/unlisted passwords, hashed storage, unauthorized API access, session expiry/logout/reset, origin checks, assignment validation/persistence/conflicts, all four queue views and grouping, filter resets and live count changes, the idle timer, and the local-only password exception (including production/remote rejection and returning to normal setup). Remembered-email tests cover successful login/session checks, logout/reload, account switching, failed attempts, unavailable/malformed storage, and no password persistence or automatic access. Staff creation tests cover all displayed topics, required fields, forged identities, initial assignments, concurrent IDs, persistence, errors/draft recovery, repeated submits, and logout/expiry cleanup. The hidden-password terminal flow and local sign-in/session/logout APIs are verified. View and form event handlers are tested with a DOM double, not a browser; browser interaction/visual testing of sign-in, the views, and the creation dialog remains a manual checklist item. Local test passwords are never included in the source or guide.
