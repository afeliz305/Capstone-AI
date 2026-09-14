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

The roster lives server-side in `lib/staff-auth.js`. Emails are trimmed and compared case-insensitively. A matching email alone does not grant access: its configured password must also match. Display names always come from the approved roster, not user-submitted names.

## One-time password setup (and password resets)

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

1. Open `/staff.html`. Ticket data stays hidden until the server confirms a staff session.
2. Sign in with the configured email/password. The queue shows the roster name and email, your assigned count, and unassigned count.
3. **Assigned to me** is the initial filter. Choose **Unassigned tickets** to claim work or **All team tickets** to review the team queue.
4. **Claim ticket** assigns an unassigned ticket to the signed-in staff member. **Assign to** supports any of the six staff members or **Unassigned**. A stale assignment update is rejected instead of silently overriding another staff member's change.
5. **Sign out** clears the session and visible ticket data. Sessions expire after one hour; restarting the server also clears them.

Unlisted emails, wrong/unconfigured passwords, forged/expired sessions, and unauthorized API access are rejected. Failed login shows **Unauthorized access**, a link back to the student assistant (`/`), and a countdown. After **15 seconds of no keyboard or pointer response in that panel**, the browser returns to `/`. Activity resets the countdown; **Try signing in again** cancels it and reopens sign-in. Rate limits/service failures show their own recoverable error rather than pretending a sign-in succeeded.

## Server-side protection and persistence

- `POST /api/staff/login`: checks roster and password, rotates a random opaque session token, and returns the display identity/roster. Failed reauthentication clears the prior session.
- `GET /api/staff/session`: validates the session and current password version. It does not expose password records or hashes.
- `POST /api/staff/logout`: invalidates the session and expires its cookie.
- `GET /api/tickets`, `PATCH /api/tickets/:id`, and attachment downloads require a valid staff session on the server. Removing HTML `hidden` attributes or calling APIs directly does not bypass this.
- Student search, student account integration, and ticket creation remain available without staff sign-in. A client cannot preassign a ticket at creation.
- Cookies are HttpOnly, SameSite=Strict, scoped to `/api`, with Secure on direct HTTPS. Credentials are not stored in browser storage. Login has a per-process, per-address limit of 10 failed attempts per 15 minutes; restart clears that limit. This is not a production distributed abuse-control system.
- New tickets have `assignedTo: null`; legacy tickets with no assignment field are treated as unassigned. Assignments add `assignedBy` and `assignedAt`; updates record `updatedBy`. These fields persist in the existing ignored ticket JSON.
- PATCH accepts `status` and/or `assignedTo`. Assignment updates also require `expectedAssignee` (email or null) for conflict detection. Server validation permits only approved staff emails or null.

## Fictional queue examples

The optional local sample loader creates 12 resolved examples with resolution notes (two assigned to each approved staff member) and five open, unassigned requests. Generated tickets are labeled **Sample · fictional**; they do not describe verified FIU site defects or actual staff work. See the [teammate setup guide](TEAM_SETUP_GUIDE.md) for the stop/load/restart commands.

Sample resolution notes are displayed and searchable, but are not editable through the queue. Changing status does not generate a resolution note. Rerunning the loader preserves existing tickets and staff edits without duplicating this batch. This is an offline local administration command, not a public ticket-creation endpoint or a way around staff sign-in.

## Boundaries and verification

All six staff members have the same team-level rights to view, download, update, claim, and reassign tickets. **Assigned to me is not an access-control boundary.** The instructor privacy checkbox remains a preference, now labeled **Instructor privacy requested** in the queue. It does not hide a ticket from other staff.

This is local prototype authentication, not FIU single sign-on, email ownership verification, or a production identity system. Before deployment, arrange institutional authentication, administrator provisioning, role and instructor-only permissions, HTTPS/reverse-proxy handling, stronger abuse controls, auditing, retention, and the upload safety work described in [document attachments](DOCUMENT_ATTACHMENTS.md). The design uses server-side checks and protected session cookies consistent with the [OWASP session guidance](https://cheatsheetseries.owasp.org/cheatsheets/Session_Management_Cheat_Sheet.html), but does not implement every production recommendation.

Automated tests cover all six accounts, wrong/unlisted passwords, hashed storage, unauthorized API access, session expiry/logout/reset, origin checks, assignment validation/persistence/conflicts, personal filters, and the idle timer. The password-setup terminal flow is also verified with an isolated fictional credential file. Browser interaction/visual testing of the new sign-in flow remains a manual checklist item; no real passwords were configured during implementation.
