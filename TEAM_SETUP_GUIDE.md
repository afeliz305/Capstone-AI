# Capstone AI Chat — teammate setup and testing guide

Last verified: September 10, 2026 · App version: 0.1.0

Use this guide to download the project, open it in **Visual Studio Code**, and test it on your own computer. It is a Markdown document: read it on GitHub, or open it in VS Code and press **Ctrl+Shift+V** to preview it. This is the team's maintained setup guide, not a one-time handout.

**Repository:** [afeliz305/Capstone-AI-Chat](https://github.com/afeliz305/Capstone-AI-Chat)

**Important:** This is a separate project from HelpDesk INC. Keep its folder separate. Use fictional information when testing: tickets stay on your own computer, professor email is not connected, and the staff queue has no access controls yet. Your actual FIU login is not connected to this demo.

## 1. Install the tools and get repository access

You need:

- [Visual Studio Code](https://code.visualstudio.com/download), the desktop app.
- [Node.js](https://nodejs.org/en/download), using a currently supported **LTS** release. npm is included. This guide was checked with Node **24.15.0** and npm **11.12.1** on Windows; you do not need those exact patch versions. The app currently declares Node 18+ in `package.json`, but that minimum is not a recommendation to install an older, unsupported release.
- [Git](https://git-scm.com/downloads), if you use the recommended clone method. Git is not required for Download ZIP.
- A GitHub account with access to the private repository. Ask the project owner to invite your GitHub username, then accept the invitation. If the repository shows **404 / Not Found**, confirm you are signed in with the invited account; do not change the repository to public.

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
5. Complete GitHub sign-in if prompted, using the account with repository access.
6. When cloning finishes, select **Open**. The project folder should contain `package.json` and `server.js` directly inside it.

Cloning gives you a Git-connected copy that can receive updates later. These steps use VS Code's built-in Git support. [VS Code GitHub instructions](https://code.visualstudio.com/docs/sourcecontrol/github)

### Alternative: Download ZIP

1. Sign in to GitHub and open the repository link above.
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

**Do not double-click `index.html` or use Live Server for this project.** The chat and tickets require the Node server started by `npm.cmd start`.

On macOS/Linux, use the same local project folder and replace `npm.cmd` with `npm`:

```sh
npm install
npm start
```

The Windows commands were verified for this guide; the macOS/Linux equivalent has not been tested on those operating systems.

## 5. Run the automated tests

Open another terminal with **Terminal → New Terminal**, leaving the app's terminal running, and run:

```powershell
npm.cmd test
```

At the last verification, the summary reported **16 tests passed, 0 failed**. The count can grow as the project changes; the important result is zero failures and a successful exit.

Some tests deliberately simulate an unavailable account service and print `We could not check your account. Please try again.` with status `503`. During the automated test run, those messages are expected only when the final summary still reports zero failures. Do not ignore that error if it appears in the app during normal use.

## 6. Manual testing checklist

Use sample information only. You can create several tickets, so the next ticket number may differ from examples.

| Test | What to do | Expected result |
| --- | --- | --- |
| Reviewed answer | Ask `Where can I find the sprint meeting minutes templates?` | A reviewed answer appears with a Capstone source link. |
| Related choices | Ask `Which FIU logo and colors should I use?` | Related topics appear; selecting one shows its answer and source. |
| Unsupported question | Ask `Where can I park my car?` | The assistant says it cannot find the answer and offers **Create support request**. |
| Further help | Under a reviewed answer, select **I still need help**. | The support form opens with your question included. |
| Sample account autofill | In the form, select **Try sample signed-in account**. | Name becomes **Demo Student** and email becomes **demo.student@example.edu**. Both are read-only and labeled as a sample account. |
| Create a ticket | Fill **What would help?** with a test note, then select **Create request**. | A `CAP-...` ticket ID appears. It is saved locally; no email is sent. |
| Staff review | Open **Staff queue**, find that ID, and inspect its details. | The question, help details, sample contact, and **Sample account · demo only** label appear. |
| Filtering and status | Search for that ticket ID. Change its status to **In review**, then use the status filter. | The card and summary counts reflect the change. Refreshing keeps the saved status. |
| Manual contact fallback | Open another support form and select **Stop using sample account**. | Account fields clear and become editable. Use fictional contact details if you submit. |
| Smaller screen | Narrow the browser window and reopen the support form. | The layout fits without horizontal clipping; the form can scroll vertically. |

Some source links open pages on the real FIU site that require sign-in. That is separate from the local app. Do not submit testing content into the real FIU portal.

### Current demo boundaries

- Answers come from a reviewed local knowledge file, not a live site crawl or a paid AI model.
- The sample account is not your FIU account. A real account connection requires the portal owner's integration; see [account integration](ACCOUNT_INTEGRATION.md).
- The sample session lasts one hour. Restarting the server clears sample sessions, but saved tickets remain. Use the sample-account button again if needed.
- Tickets are stored in `data/tickets.json`. That file is created after the first ticket and is excluded from Git. Other teammates will not see your queue.
- The privacy checkbox records a preference; it does not enforce access permissions. The staff page is not protected by a staff login. Do not use real student data or expose this server publicly.
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
| Repository is missing, access denied, or clone fails | Sign in with the GitHub account invited to the private repository and accept the invitation. Ask the owner to verify access. Never paste passwords or access tokens into this guide or a bug report. |
| Browser cannot reach `localhost:3000` | Confirm `npm.cmd start` is still running without an error. Also try `http://127.0.0.1:3000`. Use one hostname consistently during a sample-account test. |
| `EADDRINUSE` / port 3000 already in use | An app is already using that port. Stop your earlier Capstone server with Ctrl+C, or use the alternate-port commands below. Do not kill unrelated processes. |
| Page opens but chat or tickets fail | Use the address served by `npm.cmd start`, not a `file://` page or Live Server. Check the terminal error and the `/api/health` page. |
| Sample-account button is missing | Confirm you downloaded the current version, restarted the server, and refreshed. Use localhost/127.0.0.1. Sample mode is disabled with a portal adapter or production environment; those settings are not needed for normal teammate testing. |
| “Account changed or expired” | Review the refreshed form, select the sample account again if appropriate, then submit again. The warning prevents using stale account details. |
| “We could not check your account” in the form | Check the running server and any intentionally configured portal adapter. Normal demo setup does not require an adapter. Do not enter real account credentials to work around this. |
| A teammate's tickets are missing | Expected: each computer has a separate local queue. Tickets are not synchronized through GitHub. |
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
