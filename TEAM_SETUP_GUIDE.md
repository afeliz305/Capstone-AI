# Capstone AI Chat — teammate setup and testing guide

Last automated verification: September 15, 2026 · App version: 0.1.0. Earlier browser checks are dated separately below.

Use this guide to download the project, open it in **Visual Studio Code**, and test it on your own computer. It is a Markdown document: read it on GitHub, or open it in VS Code and press **Ctrl+Shift+V** to preview it. This is the team's maintained setup guide, not a one-time handout.

**Repository:** [afeliz305/Capstone-AI-Chat](https://github.com/afeliz305/Capstone-AI-Chat)

**Access:** Public, verified September 14, 2026. Anyone can view or download the source without a GitHub invitation. Public access does not grant permission to push changes or provide access to anyone's local tickets, attachments, or passwords. The app still runs locally; this repository is not a hosted demo. The repository and its commit history are visible to everyone, not only people who receive the link.

**Important:** This is a separate project from HelpDesk INC. Keep its folder separate. Use fictional information when testing: tickets stay on your own computer and professor email is not connected. Staff access requires a locally configured password; your actual FIU login is not connected to this demo.

## 1. Install the tools and get repository access

You need:

- [Visual Studio Code](https://code.visualstudio.com/download), the desktop app.
- [Node.js](https://nodejs.org/en/download), using a currently supported **LTS** release. npm is included. This guide was checked with Node **24.15.0** and npm **11.12.1** on Windows; you do not need those exact patch versions. The app currently declares Node 18+ in `package.json`, but that minimum is not a recommendation to install an older, unsupported release.
- [Git](https://git-scm.com/downloads), if you use the recommended clone method. Git is not required for Download ZIP.
- No GitHub account is required to view, clone over HTTPS, or download this public repository. To push changes to this repository, sign in with a GitHub account that the project owner has added as a collaborator.

Close and reopen VS Code after installing Node or Git so its terminal picks up the new commands. No paid AI account, API key, database installation, or special VS Code extension is required for this demo.

## 2. Download the project

### Recommended: clone in VS Code

1. Open VS Code. Choose **File → New Window** if another project is already open.
2. Press **Ctrl+Shift+P**, search for **Git: Clone**, and select it.
3. Paste this repository address:

   ```text
   https://github.com/afeliz305/Capstone-AI-Chat.git
   ```

4. Choose a parent folder for your projects, such as your Documents folder. Do not select the HelpDesk INC folder.
5. Reading this public repository does not require sign-in. If VS Code asks you to authenticate, you can use your GitHub account or use the Download ZIP method below. Signing in alone does not grant permission to push changes.
6. When cloning finishes, select **Open**. The project folder should contain `package.json` and `server.js` directly inside it.

Cloning gives you a Git-connected copy that can receive updates later. These steps use VS Code's built-in Git support. [VS Code GitHub instructions](https://code.visualstudio.com/docs/sourcecontrol/github)

### Alternative: Download ZIP

1. Open the repository link above; sign-in is not required.
2. Select the **main** branch, then **Code → Download ZIP**.
3. Extract the ZIP to a separate project folder. Do not run the project from inside the ZIP.
4. In VS Code, select **File → Open Folder** and select the extracted folder that directly contains `package.json`. It is usually named `Capstone-AI-Chat-main`; extraction may create an extra outer folder, so check inside it.

A ZIP is a snapshot, not a Git-connected checkout. You will download a new ZIP to get updates. [GitHub source archive instructions](https://docs.github.com/en/repositories/working-with-files/using-files/downloading-source-code-archives)

## 3. Confirm you opened the correct folder

In VS Code's Explorer, you should see these files and folders at the top level:

```text
Capstone-AI-Chat/
  package.json
  package-lock.json
  server.js
  README.md
  TEAM_SETUP_GUIDE.md
  data/
  lib/
  public/
  test/
```

The folder name can differ; the important part is that **`package.json` is directly inside the folder you opened**. Do not open only `public`, and do not create a blank `package.json` to work around a missing-file error.

Select **Terminal → New Terminal**. On Windows, use a PowerShell terminal. VS Code normally starts the integrated terminal in the opened workspace folder. [VS Code terminal instructions](https://code.visualstudio.com/docs/terminal/basics)

Run these commands one line at a time:

```powershell
Get-Location
Test-Path .\package.json
node --version
npm.cmd --version
```

`Test-Path` must return **True**, and the last two commands should print version numbers. If the path is `C:\WINDOWS\system32`, or the check returns **False**, use **File → Open Folder** to open the actual project, then create a new terminal before continuing.

Copy only the commands in code blocks. Do not paste terminal prompts such as `PS C:\...>` or `>>`. If PowerShell gets stuck at a `>>` continuation prompt, press **Ctrl+C** and enter the command again.

## 4. Install and start the app

In that project terminal, run:

```powershell
npm.cmd install
```

Wait for it to finish successfully, then run:

```powershell
npm.cmd start
```

The expected message is:

```text
Capstone AI Chat is running at http://localhost:3000
```

Keep this terminal open while testing. The command stays running; that is normal. Open these addresses in Chrome or another browser:

| Page | Local address |
| --- | --- |
| Student assistant | [localhost:3000](http://localhost:3000) |
| Local staff queue | [localhost:3000/staff.html](http://localhost:3000/staff.html) |
| Basic server check | [localhost:3000/api/health](http://localhost:3000/api/health) |

The server check should show `{"status":"ok","mode":"zero-token"}`. Each teammate runs their own local copy. Sending someone your `localhost` link does not share your running app or your tickets.

On the student page, the chat starts as a **Chat with Capstone** button in the bottom-right corner. Select it to open the popup. The **Minimize chat** minus button, or **Escape** while focus is inside the chat, collapses it again. The sidebar's **Capstone Assistant** button also opens it; choosing a popular topic opens it and asks that question.

Minimizing does not clear messages or unsent text. They remain only for the current page session: refreshing or leaving the page resets the conversation and starts the chat minimized again. **Clear conversation** is a separate reset action.

**Do not double-click `index.html` or use Live Server for this project.** The chat and tickets require the Node server started by `npm.cmd start`.

On macOS/Linux, use the same local project folder and replace `npm.cmd` with `npm`:

```sh
npm install
npm start
```

The Windows commands were verified for this guide; the macOS/Linux equivalent has not been tested on those operating systems.

### Set up your staff password before reviewing tickets

In a second VS Code terminal, from the same project folder, run:

```powershell
npm.cmd run staff:password
```

Choose your name from the six approved staff accounts. Enter and confirm a **separate prototype password** of 12–128 characters; typing is hidden. Never use your FIU password or paste a password into chat/source code. No default passwords are supplied. To target Anthony's account directly, use `npm.cmd run staff:password -- afeli016@fiu.edu` (substitute your approved email as appropriate).

Open **Staff queue** and sign in with that email and password. You will see your name and four prominent view buttons:

| View | Tickets shown |
| --- | --- |
| **All tickets** (default) | Every team ticket, grouped by assignee. Unassigned tickets appear first; named groups follow alphabetically. |
| **My tickets** | Tickets currently assigned to your signed-in email, including resolved tickets. |
| **All resolved** | Only resolved team tickets, grouped by their current assignee. |
| **My resolved** | Only resolved tickets currently assigned to your signed-in email. |

For new work, select **All tickets → Unassigned only** and optionally set Status to **Open**. Select **Claim ticket** or use **Assign to** to give it to a teammate. Personal views use current assignment, not the person who resolved a ticket in its historical notes.

Button counts and the summary totals describe the selected scope before extra filters; group counts and the “shown” message reflect the filtered results. Clicking a view clears search and extra filters. The resolved views lock Status to **Resolved**. **Refresh queue** keeps the current view and filters. Ticket updates move cards and refresh counts automatically. Refresh your browser with **Ctrl+Shift+R** after getting these interface changes; no data migration is needed.

The **Search tickets** bar is at the top of the staff queue. Start typing a ticket ID, student name/email, topic, question, detail, or resolution note: matching cards and the result count update immediately, without pressing Enter. It searches only the selected view and filters; choose **All tickets** to start a team-wide search. **Clear search** or Escape while in the field removes only the search text, keeps your other filters, and returns focus to the input.

Each local copy needs its own password setup; credentials do not come from GitHub. The setup command also resets a forgotten password. Sessions expire after one hour or server restart; assignments and password hashes persist. See [staff access and the approved roster](STAFF_ACCESS.md).

For a short password in a **local-only, fictional-data test**, run `npm.cmd run staff:password -- afeli016@fiu.edu --local-test-only`, replacing the email if needed. The hidden prompts accept 8–128 characters. This marks only the chosen account as local-test-only; no default password is supplied. That account cannot sign in from non-loopback addresses, through a non-localhost request host, or in production mode. Other accounts keep the normal rule. Use the normal setup command without the flag and a 12–128-character password to remove this exception. Restart the server after updating to this code and refresh the sign-in page.

### Remembered staff email

Refresh `/staff.html` with **Ctrl+Shift+R**; this update does not require a server restart. After a successful login (or recognition of an existing valid session), the app remembers the server-confirmed staff email on this browser only. Sign out and reload the page: the email is prefilled, but a password is still required. Edit the email to switch accounts; a successful sign-in replaces the saved address. A failed attempt does not replace the remembered address, though the attempted email remains editable when you choose **Try signing in again**.

The app saves only the email preference, not a password or session token, in browser storage. It does not provide automatic login or bypass any access checks. Browsers/password managers may separately offer password autofill. Other people using the same browser profile can see the saved email; sign out and clear this site's browser data to remove it. The preference is specific to the browser profile and site address/port, not synced by the app to teammates. Private browsing or blocked storage may prevent remembering it across visits; sign-in still works normally.

Manual check: sign in, sign out, reload, and confirm the email remains while the password field is empty (disable separate password-manager autofill for this check). Try a failed login with a different fictional email, then reload: the last successful email should still appear. Finally sign in with another configured staff account, sign out, and reload to confirm it replaces the saved email.

### Category tags

Every ticket card now shows a labeled **Category** tag beside its status, using the existing FIU palette. Tags are derived automatically from the saved topic, including Attendance and the three staff task topics; existing tickets get tags too. Missing categories display **Other**, and custom/legacy category names are preserved with a neutral tag. These are read-only labels, not separate editable tags or clickable filters. Search a category name in **Search tickets** to find matching cards. No data migration or server restart is needed for tags; refresh with **Ctrl+Shift+R**. The tag text, not color alone, identifies the category.

### Create a ticket from the staff queue

After updating this feature, stop the server with **Ctrl+C**, run `npm.cmd start`, refresh `/staff.html` with **Ctrl+Shift+R**, and sign in again. Restarting clears staff sessions but preserves saved tickets and passwords.

1. Select **Create ticket** beneath your signed-in name/email.
2. **Created by** uses your staff account automatically. It is read-only and verified on the server, not taken from the student demo account.
3. Choose **Workflow and improvements**, **Testing and updates**, or **Implementation and testing**. Existing support topics, including **Attendance**, remain available in this staff form.
4. Enter a **Title** (up to 500 characters) and **Details** (up to 3,000). Both are required; use fictional test notes only.
5. Optionally use **Attach documents (optional)** below Details to select PDF, Word (.docx), or UTF-8 TXT files. Add files in multiple selections and use **Remove** to drop a pending file. Limits: 3 files, 5 MB each, 10 MB total. Use `test/fixtures/attendance-note.txt` for a harmless sample.
6. Leave **Assign to** as **Unassigned**, select yourself (marked **you**), or choose a teammate. Select **Create ticket** to save.

The saved ticket starts **Open**, records your staff identity, and appears in **All tickets** with updated counts and a confirmation ID. Saving switches to that view and clears its filters so a previously selected resolved/personal view cannot hide the new ticket. It persists in the same ignored `data/tickets.json`; attached files are saved in ignored `data/attachments/`. Download them under **Documents** on the card or inside the opened ticket. No professor email or external update is sent. This form creates staff tasks, not requests on behalf of students. The student form's document attachments remain available unchanged.

**Cancel** or Escape closes and clears an unsaved form, including selected files. While reading/uploading files or saving, repeat submission, file changes, and dismissal are disabled. A read/save error keeps your draft and file selection and restores the controls; after an uncertain network failure, check the queue before retrying to avoid a duplicate. Signing out or losing the session closes and clears the form; finishing a file read afterward cannot submit the old draft. Server validation rejects invalid files, and a ticket-write failure removes only that request's newly saved files. Files are not malware-scanned; use trusted fictional documents only. This modal follows the existing FIU-styled queue and uses the project's existing local authentication/storage, not a new hosting service.

### Preferred contact and project-owner tags

After updating this feature, stop/start the app, hard-refresh both pages with **Ctrl+Shift+R**, and sign in to staff again. Both student and staff ticket creation include **Preferred method of contact**:

- **Email** (default): use the requester email already on the form, or the signed-in account email. Common ASCII email syntax is checked, including the local part, domain labels, and a domain suffix. The check does not prove the inbox exists or belongs to the requester.
- **Phone**: a required **Contact number** field appears. U.S./Canada numbers accept 10 digits, optional `1`/`+1`, and familiar formatting, such as `(305) 555-0123`. Outside that format, use `+` followed by country code and number (8–15 total digits), such as `+44 20 7946 0958`, with spaces/dots/hyphens if needed. Extensions and letters are rejected. International checks are format/length checks, not full country numbering-plan verification; no check proves a number is active or owned by the requester.

Requester email is still required for the ticket record even with Phone selected. Phone preferences are manually entered, not extracted from FIU accounts. Invalid contact input is rejected by the server as well as the form. The selected preference persists as `contact: { method, value }`; phone values normalize to `+` and digits. Switching back to Email does not save the unused phone. Successful creation clears the phone draft; switching the student account also clears the previous contact preference/number. A failed submission retains the draft unless the account changed.

Preferred contact is shown on staff cards and as a read-only field in the ticket workspace. Legacy tickets without a preference display their requester email without a data migration. Contact details remain in ignored local ticket storage and are not included in the staff-only requester preview. Selecting a contact preference does **not** initiate calls, SMS, or email.

For owner-originated requests, staff can set **Project-owner tag → Created by a project owner — staff marked** during staff creation or in an existing ticket workspace. Save an edited ticket to apply/remove it. Cards show **Project owner · Staff marked** alongside the category and status; searching `project owner` finds tagged tickets in the selected view. Only mark it when you know the request originated from a project owner. No owner roster or automatic identity check is configured. This is explicitly a staff classification, not a verified account role; it does not replace the recorded creator/requester or grant any permission. Staff creation still records the logged-in staff creator.

Student requests cannot self-assign an owner tag. Staff classification changes record the marking staff email/time; workspace changes also append a field-update activity entry. Existing tickets and attachments are preserved, and the tag can be removed by selecting **Not marked** and saving. No credentials, contacts, or owner tickets are pushed to Git.

### Open and work a ticket

Restart the app after updating this feature, refresh `/staff.html` with **Ctrl+Shift+R**, and sign in again. Select a ticket number or **Open ticket** in any of the four views. This is a service-management-style form in the existing FIU design, not a ServiceNow integration.

- **Read-only:** ticket number, requester name/email, and opened time. Staff do not overwrite requester identity.
- **Editable fields:** title, description, resolution notes, and Category, Status, Priority, and Assigned to dropdowns. Priority defaults to Normal for older tickets; available choices are Low, Normal, High, and Urgent.
- **Work notes — internal only:** append a staff-only note of up to 4,000 characters. Do not use Additional comments for private troubleshooting or handoff information.
- **Additional comments — requester-visible:** append a separate requester-facing comment of up to 4,000 characters. **Delivery is not connected yet.** The staff-only **Preview requester view** button shows the saved requester-facing fields and comments, with internal notes, transcript, staff emails, and internal resolution notes removed on the server. There is no public ticket lookup or email delivery.
- **Activity history:** each saved note/comment has a staff name and server timestamp. Earlier journal entries cannot be edited; add a correction as a new entry. Field updates record the changed field names, not a full before/after audit. The history is distinct from the editable current resolution summary.

Select **Save changes** to persist the fields and append both entered notes in one update. Successful saves clear the journal inputs, refresh history/category tags/counts, and keep the workspace open with your queue view and filters unchanged. Changing assignment or status can move a ticket out of the current queue filter when you return. Saved notes remain after refresh/restart. **Documents** and the original chat are available within the staff workspace; existing download protections still apply.

**Back to queue** and Escape ask before discarding unsaved changes. **Reload latest** also warns before discarding a draft. A failed save retains your draft; retrying the exact same attempted save uses its identifier to avoid duplicate notes. Another staff update causes a conflict instead of overwriting newer work. Copy any unsaved text you want to keep before choosing Reload latest, review the new fields, and apply your edits again. Sign-out/session expiry forcibly closes and clears internal drafts and loaded data.

No migration, seed reset, paid AI service, or new package is required. The existing ignored `data/tickets.json` stores the journals and revision information. All approved staff can read internal work notes; “internal” means hidden from requesters, not from other staff.

### Optional: populate your queue with fictional test tickets

Stop the running app with **Ctrl+C** before loading samples. Run these commands separately from the project folder:

```powershell
npm.cmd run tickets:seed -- --server-stopped
npm.cmd start
```

The command adds **12 resolved examples**, including visible resolution notes and two assignments per staff member, plus **5 open, unassigned requests**. Scenarios cover attendance, navigation, templates, videos, project information, uploads, and other support topics. Their issues and resolutions are fictional; no changes are made to the live FIU site and no email is sent.

After signing in, select **All tickets** to see the batch, or **All tickets → Unassigned only** to claim new work. Use **All resolved** for the example history. Each generated card is labeled **Sample · fictional**. Resolved examples show **Example resolution**; search includes those notes. These are prewritten fictional scenarios, not automatic fixes. Open a ticket to edit its current resolution summary or append work notes; changing status alone does not generate resolution text.

Existing tickets and attachments are preserved. Before changing an existing queue, the command saves its original contents to `data/tickets.json.seed-backup-*`. Repeating it skips existing sample scenarios and preserves subsequent staff edits. Each teammate must load their own local samples; the queue and backups are not included in GitHub.

Do not run the loader while a server is writing to the same queue. `--server-stopped` is your confirmation, not an automatic server shutdown. The command is disabled in production. If intentionally using `CAPSTONE_DATA_FILE`, it loads that custom queue instead; keep custom data and backups outside tracked source.

## 5. Run the automated tests

Open another terminal with **Terminal → New Terminal**, leaving the app's terminal running, and run:

```powershell
npm.cmd test
```

At the last verification, the summary reported **91 tests passed, 0 failed**. This includes staff attachment selection/removal, upload/download integrity and limits, validation/access rejection, rollback, draft recovery and logout-during-read protection; remembered staff email across logout/reload and account changes, failed attempts and unavailable storage without password persistence; email/phone format rules, conditional contact fields and contact persistence, staff-only owner tagging/search/removal; workspace field/journal persistence, server-owned note authors, requester-preview privacy, conflict/retry protection, draft recovery and logout/expiry cleanup; automatic category tags and legacy fallbacks; staff creation validation and assignments; live search and all four queue views; the local-only password exception; sample data preservation/backups; staff password/session checks; the 15-second idle timer; and the previous chat/upload tests. The count can grow as the project changes; the important result is zero failures and a successful exit.

Some tests deliberately simulate an unavailable account service and print `We could not check your account. Please try again.` with status `503`. During the automated test run, those messages are expected only when the final summary still reports zero failures. Do not ignore that error if it appears in the app during normal use.

The attachment rollback test deliberately blocks its temporary ticket file and can print an `EISDIR` error. This is also expected only during a passing automated test run. Test files are isolated from your local queue.

## 6. Manual testing checklist

Use sample information only. You can create several tickets, so the next ticket number may differ from examples.

Popup checks verified in Chrome on September 10, 2026: minimized on load, opening, draft retention, topic shortcuts, Escape handling, and support-form access. Desktop and a 320 × 568 viewport were checked; this is browser viewport testing, not a physical-phone test.

Attendance selection and staff document links were verified in Chrome. Document saving/downloading and byte-for-byte integrity were verified through the local API, with selection/removal covered by automated event-handler tests. Chrome's automation extension blocked setting a test file in the picker, so a complete manual picker-to-submit run still needs a teammate's check.

On September 14, staff authentication, assignment, creation/contact validation, owner classification, workspace, journal and requester-preview APIs passed automated tests, and the hidden-password setup command was verified with an isolated test file. The four views, tags, contact controls in both creation forms, and ticket workspace's real event handlers were tested with a DOM double; this is not a visual/browser test. Screen layout, keyboard/focus behavior, and responsive form/workspace behavior still need the manual checks below.

Staff creation attachments were also verified with isolated API and real-event-handler tests on September 14, including the full 10 MB combined limit, byte-for-byte downloads, save rollback, and session cleanup. The new staff file picker still needs a manual browser check; this is separate from earlier student-form checks.

| Test | What to do | Expected result |
| --- | --- | --- |
| Initial state | Refresh the student page. | Only **Chat with Capstone** is visible at the bottom-right; the conversation is hidden until opened. |
| Open and minimize | Open the chat, ask a question, type another question without sending, then select **Minimize chat** and reopen it. | Messages and the unsent question remain. Focus returns to the chat input when reopened. |
| Topic shortcut | Minimize the chat, then select **Sprint minutes** on the page. | The popup opens with that question and its answer. |
| Keyboard | Press **Escape** inside the chat. Reopen it, open the support form, and press **Escape** again. | The first Escape minimizes the chat; the second closes only the support form. |
| Reviewed answer | Ask `Where can I find the sprint meeting minutes templates?` | A reviewed answer appears with a Capstone source link. |
| Related choices | Ask `Which FIU logo and colors should I use?` | Related topics appear; selecting one shows its answer and source. |
| Unsupported question | Ask `Where can I park my car?` | The assistant says it cannot find the answer and offers **Create support request**. |
| Further help | Under a reviewed answer, select **I still need help**. | The support form opens with your question included. |
| Sample account autofill | In the form, select **Try sample signed-in account**. | Name becomes **Demo Student** and email becomes **demo.student@example.edu**. Both are read-only and labeled as a sample account. |
| Create a ticket | Fill **What would help?** with a test note, then select **Create request**. | A `CAP-...` ticket ID appears. It is saved locally; no email is sent. |
| Attendance | In the support form's **Topic** dropdown, select **Attendance** and create a fictional request. | The saved staff card is labeled **Attendance**. No claim about the actual course attendance policy is generated. |
| Add/remove documents | Under **Attach documents**, select `test/fixtures/attendance-note.txt`. Remove it, then select it again. | The filename/size appear in the selection list; **Remove** drops that selection. Closing/reopening the form retains it. |
| Save/download documents | Submit the request with the sample TXT file. Open its staff card and select the filename under **Documents**. | The original sample file downloads. Files remain available after refreshing or restarting the server. |
| File limits | Try an unsupported file extension or exceed the 3-file, 5 MB-per-file, or 10 MB-total limit. | A clear error appears. Existing valid selections remain. Nothing is uploaded until **Create request** is submitted. |
| Staff sign-in | After local password setup, open **Staff queue** and sign in with your approved email and prototype password. | Your name/email appear; **All tickets** is selected. All four view buttons and counts are visible. |
| Remembered staff email | Sign in successfully, sign out, and reload. Edit the prefilled email to switch to another configured account and repeat. | The last successful email is remembered on this browser. Password is required; a failed attempt does not replace the saved email. The app does not save passwords or grant access from this preference. |
| Staff creation attachments | In **Staff queue → Create ticket**, attach `test/fixtures/attendance-note.txt`. Remove and reselect it, fill the required fields, and save. Open the saved ticket and download it under **Documents**. | Filename/size appear before saving; Remove drops the selection. The saved file downloads with its original content. Cancel/sign-out clears unsent selections, while a read/save error preserves them for correction. |
| Category tags | Look at existing tickets in all four views. Create a fictional Attendance or staff-task ticket, then search its category name. | Each card has one labeled category tag distinct from status. New tickets receive it immediately. Long labels wrap on narrow screens, and category search finds matching cards. |
| Ticket workspace | Select a ticket number or Open ticket. Change its category, status, priority, or assignee and Save changes. | The populated form opens with requester identity read-only. Save updates the ticket, category tag, and queue counts without closing the workspace or changing the selected queue view. |
| Contact validation | In each creation form choose Phone, try `123`, then a fictional example such as `(305) 555-0123`. On the student form also try an email with consecutive dots or no domain suffix. | Invalid formats cannot save. Correct input saves the preferred contact, shown on the card and workspace. Email remains required; no call/message is sent. |
| Contact switching | Select Phone and enter a number, then select Email and create a fictional ticket. | The phone field hides and is not required or saved. The recorded preference is the requester email. |
| Owner tag | Create a staff test ticket with the Project-owner tag, or mark an existing fictional ticket and save. Search `project owner`, then open it and remove the mark. | The staff-marked badge appears/searches correctly and disappears after removal. The requester identity and access rights do not change; students have no owner-tag control. |
| Internal vs requester notes | Enter fictional, clearly different text in Work notes and Additional comments. Save, then select Preview requester view. | Activity history shows both as separate dated entries. The preview shows only the additional comment, not the work note, internal resolution, or transcript. It is a staff-only preview, not delivery to the requester. |
| History and persistence | Add a second note, save, close, and reopen. Restart and sign in again. | Earlier entries remain intact; the new entry is appended. Fields and notes survive restart. |
| Unsaved workspace | Type an internal draft, then select Back to queue, Escape, or Reload latest. Cancel the confirmation, then repeat and confirm. | Cancelling keeps the draft. Confirming discards it. A connection/save error keeps the draft; session loss clears private information. |
| Teammate conflict | Open the same fictional ticket in two tabs. Save an update in one, then attempt a change from the older view. | The older save is rejected and its draft retained. Copy needed text, Reload latest, and reapply changes. Exact retries of an already saved note do not append it twice. |
| Create staff ticket | Choose **My resolved**, then **Create ticket**. Select each new topic in separate fictional tests, enter a title/details, and save. | Your staff identity is automatic. Each ticket starts Open; All tickets appears with the new ID and updated counts. No email is sent. |
| Initial assignment | Create fictional staff tickets as Unassigned, assigned to yourself, and assigned to a teammate. | Each appears in the correct assignee group. My tickets includes only your assignments; refresh/restart retains them. |
| Staff form validation/cancel | Try submitting blank fields or spaces, then fill a draft and Cancel. Reopen and repeat with Escape. | Blank requests are rejected. Cancellation clears the draft without creating a ticket and returns focus to Create ticket. |
| Staff save failure/session | With an unsaved fictional draft, stop the server and try saving. Restart and retry only after checking whether a ticket was saved. | A connection error preserves the draft. After restart, the expired session closes/clears the form and requires sign-in. No private draft reappears after login. |
| Unauthorized access | Sign out, then try an unlisted email or incorrect password. Do not interact for 15 seconds. | **Unauthorized access** appears with a return link, then automatically returns to the student assistant. **Try signing in again** cancels the countdown. |
| Staff review and grouping | Sign in, choose **All tickets**, find the test ticket ID, and inspect its details. | Unassigned work is grouped first, then tickets under named staff groups. The question, help details, and sample contact label appear. |
| Claim and reassign | In **All tickets → Unassigned only**, select **Claim ticket**. Switch to **My tickets**, then use **Assign to** to assign it to another configured staff account. | The ticket appears under its current assignee and counts update. Signing in as that teammate and selecting **My tickets** shows it. Refresh/restart preserves the assignment. |
| My resolved | Select **My resolved**. Change a disposable fictional ticket's status to **Open** if one is present. | Only resolved tickets currently assigned to your email appear. Reopening one removes it from this view and updates counts; it remains in **My tickets**. |
| Switching views | In **All tickets**, enter a search with no matches and check **Unassigned only**. Then click **My tickets** and **All resolved**. | Each click clears extra filters. My tickets shows only your assignments. All resolved shows team-wide resolved work, with the status selector locked to Resolved. |
| Sign out | Select **Sign out**, then try opening the ticket list/download API directly. | The queue clears and sign-in is required; protected APIs return unauthorized without ticket/file contents. |
| Filtering and status | Search for that ticket ID. Change its status to **In review**, then use the status filter. | The card and summary counts reflect the change. Refreshing keeps the saved status. |
| Resolved sample history | Load the optional samples, sign in, and select **All resolved**. | The batch contributes 12 fictional cards with example resolution notes, initially two assigned per staff member and grouped by assignee. Existing resolved tickets also remain visible. |
| New sample work | After loading samples, choose **All tickets → Unassigned only** and filter to **Open**. | Five new fictional requests are available to claim, unless someone has already changed them. Existing unassigned tickets remain. |
| Resolution search | Choose **All resolved** and search `UTF-8 filename`. | The example about an accented attachment filename appears because its resolution note matches. |
| Live search at the top | In **All tickets**, type part of a known ticket ID into **Search tickets**, one character at a time without pressing Enter. Then type an unmatched phrase. | The matching cards, groups, and result count update as you type. An unmatched phrase shows zero results, not an error. |
| Clear search | Choose **My resolved**, type a search, and select **Clear search**. Repeat and press Escape inside the field. | Only search text is cleared. My resolved and its Resolved constraint remain selected, the matching cards return, and the input keeps focus. |
| Manual contact fallback | Open another support form and select **Stop using sample account**. | Account fields clear and become editable. Use fictional contact details if you submit. |
| Smaller screen | Narrow the browser window, open the popup, then open the support form. | The popup fits the viewport, its messages scroll, and the composer/minimize button remain reachable. The support form can scroll vertically. |

Some source links open pages on the real FIU site that require sign-in. That is separate from the local app. Do not submit testing content into the real FIU portal.

### Current demo boundaries

- Answers come from a reviewed local knowledge file, not a live site crawl or a paid AI model.
- The sample account is not your FIU account. A real account connection requires the portal owner's integration; see [account integration](ACCOUNT_INTEGRATION.md).
- The sample session lasts one hour. Restarting the server clears sample sessions, but saved tickets remain. Use the sample-account button again if needed.
- Tickets are stored in `data/tickets.json`. That file is created after the first ticket and is excluded from Git. Other teammates will not see your queue.
- Documents are stored in `data/attachments/`, also excluded from Git. Supported formats are PDF, Word (.docx), and UTF-8 text (.txt). Up to 3 files, 5 MB each, 10 MB combined; see [document upload notes](DOCUMENT_ATTACHMENTS.md).
- Attachments are not malware-scanned. Downloads require staff sign-in. Use only trusted fictional files, never medical absence notes or sensitive student records. The bot does not read attached documents to generate answers.
- Staff passwords are stored only as salted hashes in ignored `data/staff-credentials.json`. Sign-in is local prototype authentication, not FIU SSO. Anyone trusted to administer this project folder can set/reset local passwords.
- All six staff members can view all team tickets. **My tickets** and **My resolved** are work filters, not privacy restrictions. The privacy checkbox records a preference; instructor-only permissions are not implemented. Do not use real student data or expose this server publicly.
- No professor email is sent. The staff queue is the temporary escalation destination.

## 7. Stop, restart, and get updates

### Stop and restart

To stop the app, select its running terminal and press **Ctrl+C**. If a Windows batch-job confirmation appears, confirm that you want to stop it. To start again from the same project folder, run `npm.cmd start`.

After changing or downloading server code, restart the server. After changing front-end files, refresh the browser. Use **Ctrl+Shift+R** if old styling remains.

### Update a cloned copy

1. Stop the running app.
2. In the project terminal, run:

   ```powershell
   git status --short
   ```

3. If it prints changes, stop and preserve your work with help from the team before updating. Do not discard changes or use a hard reset just to pull.
4. If the working tree is clean, run these commands individually, stopping if any command fails:

   ```powershell
   git switch main
   git pull --ff-only origin main
   npm.cmd install
   npm.cmd test
   npm.cmd start
   ```

5. Refresh the browser and reread this guide if the setup has changed. If Git reports a conflict, diverged branches, or a failed fast-forward, ask the team before proceeding.

### Update a ZIP download

Stop the old server, download and extract a new ZIP into a **new folder**, then open that new folder in VS Code and repeat the setup steps. Keep the old folder if it contains work or test tickets you want to retain. Do not overwrite it blindly. The new copy starts with its own empty ticket queue.

## 8. Troubleshooting

| Problem | What to do |
| --- | --- |
| `npm.ps1 cannot be loaded because running scripts is disabled` | Use `npm.cmd install`, `npm.cmd start`, and `npm.cmd test` in Windows PowerShell. You do not need to change the machine's execution policy. |
| `ENOENT` or `Could not read package.json` | You are in the wrong folder, or the source was not fully downloaded. Open the folder containing `package.json` and confirm `Test-Path .\package.json` returns **True**. Check for a second nested folder after ZIP extraction. |
| `node`, `npm.cmd`, or `git` is not recognized | Install the corresponding tool, then fully reopen VS Code and create a fresh terminal. Git is needed only for cloning/updating through Git. |
| Repository is missing, access denied, or clone fails | Check the exact repository URL and your network connection. The repository is public, so viewing or downloading does not require an invitation. Ask the owner if the URL or visibility has changed. Pushing changes still requires collaborator access. Never paste passwords or access tokens into this guide or a bug report. |
| Browser cannot reach `localhost:3000` | Confirm `npm.cmd start` is still running without an error. Also try `http://127.0.0.1:3000`. Use one hostname consistently during a sample-account test. |
| `EADDRINUSE` / port 3000 already in use | An app is already using that port. Stop your earlier Capstone server with Ctrl+C, or use the alternate-port commands below. Do not kill unrelated processes. |
| Page opens but chat or tickets fail | Use the address served by `npm.cmd start`, not a `file://` page or Live Server. Check the terminal error and the `/api/health` page. |
| Attendance or attachment controls are missing | Refresh with **Ctrl+Shift+R** after getting the latest code. Restart `npm.cmd start` too: document saving requires the updated server. |
| A document is rejected | Use a nonempty PDF, DOCX, or UTF-8 TXT within the displayed limits. Rename files with unsupported characters. Do not just rename an unsupported file's extension. Remove the rejected file and select a valid one. |
| A download says the file is missing | The ticket metadata exists, but its local file is absent. Keep `data/tickets.json` and `data/attachments/` together when intentionally backing up local test data; GitHub does not contain either. |
| Sample-account button is missing | Confirm you downloaded the current version, restarted the server, and refreshed. Use localhost/127.0.0.1. Sample mode is disabled with a portal adapter or production environment; those settings are not needed for normal teammate testing. |
| “Account changed or expired” | Review the refreshed form, select the sample account again if appropriate, then submit again. The warning prevents using stale account details. |
| “We could not check your account” in the form | Check the running server and any intentionally configured portal adapter. Normal demo setup does not require an adapter. Do not enter real account credentials to work around this. |
| A teammate's tickets are missing | Expected: each computer has a separate local queue. Tickets are not synchronized through GitHub. |
| Sample loader says the batch already exists | Expected on repeat runs: samples are not duplicated and your status/assignment edits are not reset. Clear queue filters to find them. |
| Staff sign-in says unauthorized | Run `npm.cmd run staff:password` on this computer to configure/reset your approved account. Use the separate prototype password, not FIU credentials. Password hashes are not downloaded from GitHub. |
| A short local test password does not work | It requires explicit setup with `--local-test-only`, the updated/restarted server, and a refreshed sign-in page. Use localhost, not a shared hostname or production mode. For regular use, reset with the normal command and a 12–128-character password. |
| Too many sign-in attempts | Wait 15 minutes before trying again; do not keep guessing. If needed, use the local password-setup command to reset the account first. |
| My personal queue is empty | Use **All tickets → Unassigned only** to find new and older unassigned tickets. Claim one or ask a teammate to assign it to you. **My resolved** is empty until a ticket currently assigned to you has Resolved status. |
| Only my tickets are visible, or the view buttons are missing | Refresh the staff page with **Ctrl+Shift+R** after updating. Choose **All tickets** to see Unassigned and other staff groups. Clicking a view also clears narrower filters. |
| Another staff member changed the assignment | Refresh the queue before assigning again. The warning protects a teammate's newer assignment. |
| Staff sign-in is temporarily unavailable | Ask the local project owner to inspect credential-file access/format. Do not share its contents, disable authentication, or expose the server to work around it. |
| Git says “not a git repository” | You may have downloaded a ZIP or opened the wrong folder. Use the ZIP update instructions, or open your cloned project root. |

To use port 3001 in Windows PowerShell instead of 3000:

```powershell
$env:PORT = "3001"
npm.cmd start
```

Then open [localhost:3001](http://localhost:3001) and [localhost:3001/staff.html](http://localhost:3001/staff.html). After stopping the server, return to the default port in that terminal with:

```powershell
Remove-Item Env:PORT -ErrorAction SilentlyContinue
npm.cmd start
```

Normal setup needs no `.env` file and no `CAPSTONE_SESSION_ADAPTER` setting. Advanced environment options are documented in [account integration](ACCOUNT_INTEGRATION.md).

## 9. Report a problem to the team

Record the following in the team's usual bug tracker or discussion:

```text
Date:
Operating system and browser:
Node version (node --version):
Project revision (git rev-parse --short HEAD), or ZIP download date:
Steps to reproduce:
Expected result:
Actual result:
Exact terminal/browser error:
Test ticket ID, if applicable:
Screenshot with private information removed:
```

Do not include passwords, cookies, tokens, real student records, or the contents of another student's ticket.

## 10. Keep this guide current

Update this document in the **same change** as anything that affects installation, commands, ports, environment variables, login, storage, interface labels, or test behavior. The project guidance in [AGENTS.md](AGENTS.md) reinforces this requirement for future coding work.

Before sharing a new version:

- [ ] Follow this guide from a clean copy of the files being shared.
- [ ] Verify install, startup, automated tests, and the manual checklist.
- [ ] Update the last-verified date, tested tool versions, and expected results where needed.
- [ ] Update the README link/quick-start if the entry point changes.
- [ ] Keep sample data, local tickets, and secrets out of the source backup.
- [ ] Push the guide and the matching application changes together when approved for sharing.
- [ ] Tell teammates to pull again or download a new ZIP.

This is a version-controlled document. It does not update itself while no one is working on the project; maintain it alongside future changes.
