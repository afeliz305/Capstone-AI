# Capstone AI Chat — teammate setup and testing guide

Last automated verification: September 14, 2026 · App version: 0.1.0. Earlier browser checks are dated separately below.

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

Open **Staff queue** and sign in with that email and password. You will see your name and **Assigned to me**. For a newly created test ticket, choose **Unassigned tickets** or **All team tickets** first. You can select **Claim ticket** or use **Assign to** to give it to a teammate.

Each local copy needs its own password setup; credentials do not come from GitHub. The setup command also resets a forgotten password. Sessions expire after one hour or server restart; assignments and password hashes persist. See [staff access and the approved roster](STAFF_ACCESS.md).

### Optional: populate your queue with fictional test tickets

Stop the running app with **Ctrl+C** before loading samples. Run these commands separately from the project folder:

```powershell
npm.cmd run tickets:seed -- --server-stopped
npm.cmd start
```

The command adds **12 resolved examples**, including visible resolution notes and two assignments per staff member, plus **5 open, unassigned requests**. Scenarios cover attendance, navigation, templates, videos, project information, uploads, and other support topics. Their issues and resolutions are fictional; no changes are made to the live FIU site and no email is sent.

After signing in, select **All team tickets** to see the batch, or **Unassigned tickets** to claim new work. Each generated card is labeled **Sample · fictional**. Resolved examples show **Example resolution**; search includes those notes. These notes are prewritten sample history, not an automatic fix or a resolution editor: changing a ticket's status does not create a new resolution note.

Existing tickets and attachments are preserved. Before changing an existing queue, the command saves its original contents to `data/tickets.json.seed-backup-*`. Repeating it skips existing sample scenarios and preserves subsequent staff edits. Each teammate must load their own local samples; the queue and backups are not included in GitHub.

Do not run the loader while a server is writing to the same queue. `--server-stopped` is your confirmation, not an automatic server shutdown. The command is disabled in production. If intentionally using `CAPSTONE_DATA_FILE`, it loads that custom queue instead; keep custom data and backups outside tracked source.

## 5. Run the automated tests

Open another terminal with **Terminal → New Terminal**, leaving the app's terminal running, and run:

```powershell
npm.cmd test
```

At the last verification, the summary reported **44 tests passed, 0 failed**. This includes sample ticket counts, preservation/backups, duplicate prevention, resolution search, staff password/session checks, blocked ticket/download access, claiming/reassignment, personal filters, the 15-second idle timer, and the previous chat/upload tests. The count can grow as the project changes; the important result is zero failures and a successful exit.

Some tests deliberately simulate an unavailable account service and print `We could not check your account. Please try again.` with status `503`. During the automated test run, those messages are expected only when the final summary still reports zero failures. Do not ignore that error if it appears in the app during normal use.

The attachment rollback test deliberately blocks its temporary ticket file and can print an `EISDIR` error. This is also expected only during a passing automated test run. Test files are isolated from your local queue.

## 6. Manual testing checklist

Use sample information only. You can create several tickets, so the next ticket number may differ from examples.

Popup checks verified in Chrome on September 10, 2026: minimized on load, opening, draft retention, topic shortcuts, Escape handling, and support-form access. Desktop and a 320 × 568 viewport were checked; this is browser viewport testing, not a physical-phone test.

Attendance selection and staff document links were verified in Chrome. Document saving/downloading and byte-for-byte integrity were verified through the local API, with selection/removal covered by automated event-handler tests. Chrome's automation extension blocked setting a test file in the picker, so a complete manual picker-to-submit run still needs a teammate's check.

On September 14, staff authentication/assignment APIs and countdown/filter logic passed automated tests, and the hidden-password setup command was verified with an isolated test file. The new staff login/assignment screens have not yet been manually browser-tested; follow the checks below.

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
| Staff sign-in | After local password setup, open **Staff queue** and sign in with your approved email and prototype password. | Your name/email appear; **Assigned to me** is selected. An empty personal view is normal before assignment. |
| Unauthorized access | Sign out, then try an unlisted email or incorrect password. Do not interact for 15 seconds. | **Unauthorized access** appears with a return link, then automatically returns to the student assistant. **Try signing in again** cancels the countdown. |
| Staff review | Sign in, choose **All team tickets**, find the test ticket ID, and inspect its details. | The question, help details, sample contact, and **Sample account · demo only** label appear. |
| Claim and reassign | In **Unassigned tickets**, select **Claim ticket**. Switch to **Assigned to me**, then use **Assign to** to assign it to another configured staff account. | The ticket appears under its current assignee. Signing in as that teammate shows it in their personal view. Refresh/restart preserves the assignment. |
| Sign out | Select **Sign out**, then try opening the ticket list/download API directly. | The queue clears and sign-in is required; protected APIs return unauthorized without ticket/file contents. |
| Filtering and status | Search for that ticket ID. Change its status to **In review**, then use the status filter. | The card and summary counts reflect the change. Refreshing keeps the saved status. |
| Resolved sample history | Load the optional samples, sign in, select **All team tickets**, and filter to **Resolved**. | The batch contributes 12 fictional cards with example resolution notes, initially two assigned per staff member. Existing resolved tickets also remain visible. |
| New sample work | After loading samples, choose **Unassigned tickets** and filter to **Open**. | Five new fictional requests are available to claim, unless someone has already changed them. Existing unassigned tickets remain. |
| Resolution search | Choose **All team tickets**, clear the status filter, and search `UTF-8 filename`. | The example about an accented attachment filename appears because its resolution note matches. |
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
- All six staff members can view all team tickets. **Assigned to me** is a work filter, not a privacy restriction. The privacy checkbox records a preference; instructor-only permissions are not implemented. Do not use real student data or expose this server publicly.
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
| Too many sign-in attempts | Wait 15 minutes before trying again; do not keep guessing. If needed, use the local password-setup command to reset the account first. |
| My personal queue is empty | New and older unassigned tickets appear under **Unassigned tickets** or **All team tickets**. Claim one or ask a teammate to assign it to you. |
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
