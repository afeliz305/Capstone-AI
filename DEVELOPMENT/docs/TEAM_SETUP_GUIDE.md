# Capstone - AI — teammate setup and testing guide

September 26 local portal connector: the normal private demo now uses the unpacked Manifest V3 extension in `DEVELOPMENT\portal-extension`; it no longer asks for Chrome remote-debugging approval. Run `npm.cmd install --include=dev`, then `npm.cmd run demo:portal`, load the extension through `chrome://extensions`, grant its optional Capstone portal access, and pair with the separate single-use extension code printed in the terminal. The app verifies the current FIU session independently of Overview and loads only the relevant authorized section on demand. Message text is off by default and is limited to a conversation the student deliberately opened. Private content remains in helper memory for five minutes. Use `npm.cmd run demo:portal:mcp` only for the explicit older development fallback. Full steps, permissions, coverage and limits are in [LOCAL_PORTAL_CONNECTOR.md](LOCAL_PORTAL_CONNECTOR.md). This local connector is not uploaded to Ocelot or included in the public package.

Project-owner release workflow: completed public application updates are tested, rebuilt into the sibling **Capstone - AI** Supabase upload folder, and committed/pushed to `origin/main`. Generated packages, tickets, attachments, credentials, local configuration and release archives are never pushed. FileZilla transfer to Ocelot remains a separate owner action.

September 25 syllabus PDF update: the single **Fall 2026 syllabus** link in the left sidebar now opens a 26-page public PDF copy of the owner-supplied syllabus in a new tab. The private Zoom join URL and mobile number are visibly removed, the replacement is flattened so those values are not hidden in text or annotations, and the original download remains unchanged. MIRA source cards continue to use the searchable reviewed HTML reference with page citations. The complete suite passed 260/260 runnable tests with the optional PHP hosted integration skipped. The current generated Supabase upload has 22 manifest-matched public files; upload the complete **Capstone - AI** folder because copying only `index.html` will leave the PDF missing.

September 25 MIRA group-test release: MIRA distinguishes public website evidence, the reviewed CIS 4951 RVC Fall 2026 syllabus, sign-in-required portal navigation, and local verified Overview information. Use the 15 exact questions in [MIRA_SOURCE_COVERAGE.md](MIRA_SOURCE_COVERAGE.md) as the acceptance set. A safe `link_only`/`partial` result can pass behavior while still counting as an answer-coverage gap; do not report Verify/Done/acceptance-criteria rules as implemented policy until an authorized source is supplied and read. The focused suite passed 51/51 and the complete suite passed 261/261. The generated Supabase **Capstone - AI** folder is prepared for FileZilla upload; the local connector remains excluded from Ocelot.

September 25 local private portal demo: install dependencies with `npm.cmd install --include=dev`, then run `npm.cmd run demo:portal` or double-click `scripts\Start Capstone Portal Demo.cmd`. Keep the terminal running and open `http://127.0.0.1:3005/Capstone%20-%20AI/` directly. Choose **Connect my portal**; the page normally establishes its local application session automatically, while the single-use terminal code remains under **Advanced setup**. Keep a dedicated signed-in Chrome Overview tab, manually enable/approve incoming debugging, select the intended tab, and verify it. Initial verification and **Verify again** reload that dedicated tab once. MIRA then loads Overview, the signed-in student's own Team, Standing, Grade, or Messages channel metadata only when the student deliberately asks for that section. **Refresh current section** and ordinary personal questions do not reload the page or extend the five-minute lease; public questions do not inspect the portal. Messages never opens a conversation. `ERR_CONNECTION_REFUSED` means the local process stopped. This adapter is separate from public Ocelot/Supabase staff login and never shares private excerpts with tickets. Focused tests passed 54/54 and the full project passed 263 with one hosted-PHP test skipped; real application retrieval is still pending because the Chrome connection handshake stopped at **Browser connection unavailable**. [Complete setup, coverage matrix, privacy, limits and evidence](LOCAL_PORTAL_CONNECTOR.md).
September 25 persistent website-index update: run `npm.cmd ci` after pulling these dependency changes, then `npm.cmd run index:site` and `npm.cmd run index:status` from DEVELOPMENT before starting Node or rebuilding the Supabase preview. Website chat searches saved public excerpts, not live pages or private dashboards. Try **How do I propose a project?**, then **Take me there**. The bounded live run indexed 34 pages/190 sections and a second refresh recognized them as unchanged; 237 tests passed and Chrome verified the real source anchor and preserved conversation. The source/isolated preview are updated, not the stable upload/Ocelot/GitHub. [Full setup, refresh/scheduling, architecture and limits](WEBSITE_INDEX.md). No environment variable or AI key is required for the default crawler; private generated index history is ignored by Git.

September 25 portal-navigation update: the homepage now has **Messages & dashboard** shortcuts and **More portal sections**; free-text questions route to all 19 sidebar options. A response opens the portal and tells students which section to select, without claiming live message counts or personal data. Try **Do I have any new messages?**, **Open my dashboard**, and **Check my Canvas messages**. **221 automated tests passed with no failures/skips**; Chrome checks passed for those responses. Restart Node or rebuild the isolated `npm.cmd run demo:supabase` preview and refresh. This is source/local-preview only, not yet in the stable upload folder, Ocelot or GitHub. [Full test flow and integration limits](PORTAL_NAVIGATION.md).

September 25 source-backup update: this change set includes the latest syllabus search/viewing, interactive follow-ups, staff password controls, optional seven-day sessions, roster changes and verified Ocelot deployment notes. **215 automated tests passed with no failures/skips**, including PHP compatibility. Git stores source, tests and guides—not live Supabase tickets/attachments, passwords, local configuration, generated uploads or archives. Existing teammates can pull the source update from the outer repository and run `npm.cmd ci` inside `DEVELOPMENT`; preserve their ignored configuration and never rerun migration 001 on the configured cloud project. The Ocelot-origin ticket-save test remains pending. Earlier “no GitHub push” notes describe those earlier feature/deployment steps; use Git history for the source-backup commit.

September 24 hosted update: the owner uploaded the Supabase release to [Ocelot](https://ocelot.aul.fiu.edu/~afeli016/Capstone%20-%20AI/). All 21 uploaded public files match the prepared release. Chrome checks passed for the Supabase banner, syllabus chat/follow-up and View syllabus. The hosted ticket submission/staff read-back/attachment flow still needs a fictional-data test; do not confuse a working chat with a verified save. No cloud data or remote files changed during this read-only verification and no GitHub push occurred. [Verification and next steps](OCELOT_SUPABASE_UPLOAD.md#uploaded-site-check--september-24-2026). This supersedes pre-upload status notes below.

September 24 Ocelot preparation: the current inner **Capstone - AI** upload folder is the 21-file **Supabase shared test queue** package. Use the [Supabase FileZilla checklist](OCELOT_SUPABASE_UPLOAD.md), not the older browser-only upload/login steps. Anthony's live staff access, existing fictional ticket/attachment read, edit, filtered requester preview and reload persistence were verified. The owner also showed the saved ticket in Chrome and VS Code. CAP-1001 now has a labeled test note/comment and is assigned to Anthony, In review. Remaining multi-staff/conflict/session and hosted checks are listed in the checklist; this is not production approval. The previous package is archived. No Ocelot upload or GitHub push has occurred; earlier dated unchanged-upload notes below are historical.

September 24 syllabus viewing: select **View syllabus** beneath the homepage introduction or in the chat header. It opens the reviewed Fall 2026 HTML reference in a new tab, leaving the conversation open. **Ask about syllabus** remains a separate chat prompt. This is a reviewed summary, not the original PDF; retrieve the original through your course. Refresh the local page or rebuild the isolated Supabase preview to see the buttons. No upload or GitHub push is included in this UI change.

September 24 syllabus update: the chat now searches 30 reviewed Fall 2026 syllabus topics, cites PDF pages, offers suggested follow-ups and remembers the current topic during the conversation. Try **Sprint 2**, then **When is it due?**. The homepage adds guided dashboard topics; personal grades/attendance/tasks/progress remain explicitly **not connected**. December date contradictions are flagged, and course work is correctly routed to the Capstone site rather than Canvas upload. Restart the local server/candidate and hard-refresh. **214 tests passed, none failed/skipped**, including PHP; key flows and source links were checked in Chrome. [Content provenance, test script and integration requirements](SYLLABUS_AND_DASHBOARD.md). No GitHub push or Ocelot upload was performed.

September 24 Remember me update: Supabase staff login now offers **Remember me for 7 days**, off by default. Refresh the rebuilt preview, then sign in with it checked on a personal computer. Already signed in? Sign out first to opt in on your next login. It remembers session tokens, **not passwords**, for up to seven days; Sign out ends it sooner. Local preview and Ocelot require separate sign-ins. Without the option, existing tab-scoped behavior is retained. [Usage, limitations and reopen test](SUPABASE_SETUP.md#remember-me-for-7-days). **203 automated tests passed with none failed/skipped**, including PHP; Chrome checkbox/layout checks passed. Actual remembered-login/reopen acceptance is still for the user to perform. The owner confirmed ordinary Chrome login works; no deployment or push was performed.

September 24 branding update: reopen your workspace's `DEVELOPMENT` in VS Code. The intended outer name is `Capstone - AI`; Windows is still blocking the owner's outer-folder rename, so use the existing `Capstone AI Chat/DEVELOPMENT` until it is completed. The generated inner folder is already renamed. The generic chat icon replaces the mascot; GitHub is now `afeliz305/Capstone-AI`. Follow [the rename checklist](PROJECT_RENAME.md) for changed URLs and old browser-ticket access. Historical test results below describe the builds tested on those dates, including the retired artwork.

Latest verification, September 24: **171 automated tests passed**, with PHP 8.4.25 enabled. `npm.cmd run test:branding:ui` also passed in headless Edge at desktop, 390px, and 320px widths, including keyboard opening/minimizing, focus and draft retention; screenshots were inspected. External requests were blocked and no tickets were created. This UI check requires a locally installed Edge browser (or set `CAPSTONE_BROWSER_CHANNEL` to another installed Playwright-supported channel). Automated tests explicitly select `test/*.test.js`; live Supabase writes remain a separate opt-in command. See [the verification record](PROJECT_RENAME.md#verification).

Last automated verification: September 24, 2026 · App version: 0.1.0. Browser checks are dated separately below.

**Show / Hide passwords:** the sign-in field and each Change password field now have independent visibility buttons. They reveal only what you type, not stored passwords. Passwords start hidden; submission, cancellation and sign-out reset visibility. Email-only demos continue to hide the whole password control. Refresh the rebuilt preview to get these controls; see [password instructions](SUPABASE_SETUP.md#change-your-staff-password).

Latest visibility verification, September 24: **189 tests passed, none failed/skipped**, with PHP enabled. Chrome confirmed Show/Hide with mouse and keyboard on the empty sign-in field after restarting the rebuilt Supabase preview. No account password was entered/read/changed; hosted credential-change acceptance remains pending. GitHub, Ocelot and the stable upload folder were not updated.

Latest release-preparation check, September 24: all five active staff Auth accounts now exist and are confirmed. Only Anthony currently has the required staff binding; explicit approval for the other four is pending. Supabase health is available, but the reported sign-in problem and end-to-end staff acceptance are not yet resolved. Do not upload the stable folder yet: it still selects browser-only mode. This supersedes earlier notes that Michael and Romelin had not created their accounts.

Latest password-option verification, September 24: **186 automated tests passed, zero failures/skips**, with PHP enabled. Password-flow and pinned SDK request checks used test doubles/mocked networking, not real credentials. The isolated Supabase candidate was rebuilt; Chrome showed the signed-out page. Signed-in browser/password-change acceptance remains an owner action. No hosted password was changed and the stable upload folder, GitHub and Ocelot were not updated.

**Change password (Supabase staff):** after signing in to the port-3004 Supabase preview, use **Change password** in the top navigation. Enter the current password and a matching new password twice, then select **Update password** and wait for confirmation. Use a unique project-only password, never your FIU password. This is a signed-in password change, not forgotten-password recovery; see [details and acceptance steps](SUPABASE_SETUP.md#change-your-staff-password). Passwords are not saved by the app. Node/PHP/browser-only alternatives do not show this option. Stop/restart `npm.cmd run demo:supabase` and refresh to pick up source changes; no GitHub push or Ocelot deployment is implied.

Latest Supabase verification, September 24: **173 local tests passed, none failed/skipped** with the optional PHP runtime configured. Approved hosted setup and a separate live test saved fictional ticket **CAP-1001** with its private TXT attachment; a fresh client retrieved the receipt and the dashboard confirmed finalization. Anthony Feliz's confirmed account is now bound to the staff roster. Staff browser acceptance, other teammates' provisioning, and Ocelot deployment remain pending; see [the evidence and setup guide](SUPABASE_SETUP.md). Earlier headless UI checks blocked external requests and did not create cloud records.

Use this guide to download the project, open it in **Visual Studio Code**, and test it on your own computer. It is a Markdown document: read it on GitHub, or open it in VS Code and press **Ctrl+Shift+V** to preview it. This is the team's maintained setup guide, not a one-time handout.

**For Ocelot group testers:** the default upload is now a browser-only demo, needing no PHP setup, GitHub download, or local installation. Tickets and documents stay in each browser, not on Ocelot and not shared across teammates' devices. Follow the [upload/testing guide](OCELOT_UPLOAD_GUIDE.md); actual hosted verification remains pending. The local Node instructions below are for maintainers or anyone running a separate server-backed copy. Use fictional information only.

**Repository:** [afeliz305/Capstone-AI](https://github.com/afeliz305/Capstone-AI)

**Access:** Public, verified September 14, 2026. Anyone can view or download the source without a GitHub invitation. Public access does not grant permission to push changes or provide access to anyone's local tickets, attachments, or passwords. The app still runs locally; this repository is not a hosted demo. The repository and its commit history are visible to everyone, not only people who receive the link.

**Important:** This is separate from HelpDesk INC. Professor email and real FIU login are not connected. Node tickets stay on the backend computer; browser-demo tickets stay in the browser's site storage. Temporary staff mode accepts an approved email without a password; it is not secure identity verification. Clearing browser site data can erase browser-demo tickets, so export a backup first.

## 1. Install the tools and get repository access

Current Supabase target (owner-selected September 24): `uoccyfcsalnancmdhnur`. Older `mkpkjmqjbfhkazxgpggg` bundles/settings target a different project. Use [the updated setup guide](SUPABASE_SETUP.md) and rebuild the Supabase candidate after changing local configuration. The default browser-demo upload is unchanged until cloud acceptance passes.

Connection-check follow-up: the diagnostic now accepts protected ticket tables when the public health RPC succeeds. Hosted health and anonymous requester sign-in pass, and migration 001 is installed. Do not rerun initial schema setup. The owner has privately created their staff account and approved its roster binding; complete staff testing before preparing the shared upload. CAP-1001 is retained for that inspection. Other teammates still need their own accounts and explicitly approved bindings.

**Supabase shared mode:** implemented as a separate candidate, not yet a verified hosted release. Follow [one-time setup and live testing](SUPABASE_SETUP.md), then run `npm.cmd run demo:supabase` on port 3004. It requires Node 22+, dependencies, a public-only local configuration, database migrations, enabled anonymous requester sign-in, and provisioned staff accounts. Staff use individual Supabase email/password accounts, not the old demo password. `npm.cmd run supabase:check` is read-only; a passing check is not a saved-ticket test. Default Node/browser demo behavior is unchanged.

September 24 sign-in wording: the Supabase preview now labels the field simply **Password**. Existing passwords and authentication requirements are unchanged. The label-change Chrome check and 174 automated tests passed. Anthony reported a successful sign-in. Zavier and Christopher have Auth accounts awaiting approved staff bindings; Michael and Romelin still need accounts. See the [account checklist](SUPABASE_SETUP.md).

September 24 roster update: five approved staff remain; Raul was removed from the Node/browser/PHP source rosters and disabled in the live Supabase roster with migration 003. Tickets, attachments and historical attribution were preserved. Refresh the Supabase queue to reload its staff list. Restart any older Node process after pulling this change, and rebuild/re-upload older browser/PHP packages to update those alternatives; an old browser-only demo is not secure access control. No GitHub push or Ocelot upload was performed by this update.

Latest removal verification: **176 automated tests passed, none failed/skipped**, with PHP enabled. Live Supabase checks confirmed five active staff and unchanged ticket/attachment metadata checksums. The port-3004 Supabase candidate was rebuilt without replacing the stable browser-demo upload folder.

**Already set up and just need the demo?** Double-click [Start Capstone Demo.cmd](../scripts/Start Capstone Demo.cmd), or run `npm.cmd run demo` from DEVELOPMENT. It rebuilds the browser-only package and starts the fixed [local demo address](http://127.0.0.1:3003/Capstone%20-%20AI/). No PHP/SSH setup is needed. See [the presentation checklist](LOCAL_DEMO.md). The original `npm.cmd start` command still runs the separate Node-backed app at localhost:3000.

You need:

- [Visual Studio Code](https://code.visualstudio.com/download), the desktop app.
- [Node.js](https://nodejs.org/en/download), using a currently supported **LTS** release. npm is included. This guide was checked with Node **24.15.0** and npm **11.12.1** on Windows; you do not need those exact patch versions. The pinned Supabase SDK now requires Node **22+** for local tooling/tests. Hosted testers need only a browser, not Node on Ocelot.
- [Git](https://git-scm.com/downloads), if you use the recommended clone method. Git is not required for Download ZIP.
- No GitHub account is required to view, clone over HTTPS, or download this public repository. To push changes to this repository, sign in with a GitHub account that the project owner has added as a collaborator.

Close and reopen VS Code after installing Node or Git so its terminal picks up the new commands. No paid AI account, API key, database installation, or special VS Code extension is required for this demo.

### Optional: PHP validation in VS Code

The message **“Cannot validate since a PHP installation could not be found”** concerns VS Code's local PHP syntax checker, not the Ocelot server. Browser-only testers do not need PHP installed, and `npm.cmd start` still uses Node.

For maintainers editing PHP, install/extract a supported PHP CLI runtime into a permanent local tools folder, outside the repository and upload website. Keep the complete runtime with its accompanying DLLs, not just `php.exe`. In VS Code, open **Preferences: Open User Settings (JSON)** from **Ctrl+Shift+P** and add `"php.validate.executablePath"` with the absolute path to your actual `php.exe`. Preserve the other settings. Use forward slashes, or doubled backslashes, in the JSON path. This user setting applies to your local VS Code workspaces; do not commit a personal machine path into shared project settings. See the [official PHP validation instructions](https://code.visualstudio.com/docs/languages/php#_linting).

Run **Developer: Reload Window** and reopen/save a PHP file. To verify the executable independently, run `& "C:/path/to/php/php.exe" --version` and `& "C:/path/to/php/php.exe" -l .\server\php\index.php` in PowerShell from `DEVELOPMENT`, replacing the example path with your installed location. If the warning remains, check for a workspace/profile override or a remote VS Code window, which needs its own runtime configuration.

On September 16, the owner's local PHP 8.4.25 runtime was copied out of temporary storage into a persistent user tools directory and configured in VS Code's user settings. PHP validation does not start a web server, configure Ocelot, or prove compatibility with its reported PHP 7.2 runtime. Setting `php.validate.executablePath` also does not add PHP to the terminal's PATH or set `CAPSTONE_PHP_BIN` for the optional integration test.

## 2. Download the project

### Recommended: clone in VS Code

1. Open VS Code. Choose **File → New Window** if another project is already open.
2. Press **Ctrl+Shift+P**, search for **Git: Clone**, and select it.
3. Paste this repository address:

   ```text
   https://github.com/afeliz305/Capstone-AI.git
   ```

4. Choose a parent folder for your projects, such as your Documents folder. Do not select the HelpDesk INC folder.
5. Reading this public repository does not require sign-in. If VS Code asks you to authenticate, you can use your GitHub account or use the Download ZIP method below. Signing in alone does not grant permission to push changes.
6. When cloning finishes, open **DEVELOPMENT** inside the cloned project with **File → Open Folder**. This is the application folder containing `package.json` and `index.html` directly. Git metadata remains at the outer repository root; Git commands from `DEVELOPMENT` still find it.

Cloning gives you a Git-connected copy that can receive updates later. These steps use VS Code's built-in Git support. [VS Code GitHub instructions](https://code.visualstudio.com/docs/sourcecontrol/github)

### Alternative: Download ZIP

1. Open the repository link above; sign-in is not required.
2. Select the **main** branch, then **Code → Download ZIP**.
3. Extract the ZIP to a separate project folder. Do not run the project from inside the ZIP.
4. In VS Code choose **File → Open Folder**, then select **DEVELOPMENT** inside the extracted repository. That folder directly contains `package.json`; the outer extracted folder is only an organizing container.

A ZIP is a snapshot, not a Git-connected checkout. You will download a new ZIP to get updates. [GitHub source archive instructions](https://docs.github.com/en/repositories/working-with-files/using-files/downloading-source-code-archives)

## 3. Confirm you opened the correct folder

Open **DEVELOPMENT**, not the outer folder or the generated website, in VS Code. Inside that application folder you should see:

```text
DEVELOPMENT/
  index.html                Student assistant homepage
  pages/staff.html          Staff login and ticket queue
  css/                      Stylesheets
    images/                 FIU mark and interface icons
    fonts/                  Mulish font
  js/
    chat/                   Chat and student request behavior
    staff/                  Staff views and ticket workspace
    shared/                 API client, contact and attachment rules
  docs/                     Setup, design, and integration guides
    licenses/               Bundled font license
  server/
    server.js               Node backend entry point
    lib/                    Authentication, search, and ticket helpers
  scripts/                  Password, sample-data, and upload-package commands
  data/                     Knowledge base and private local runtime data
  test/                     Automated tests and fictional fixtures
  package.json
  package-lock.json
  README.md
  AGENTS.md
```

The outer repository/folder name can differ. Open its **DEVELOPMENT** subfolder: `package.json` must be directly inside your selected VS Code folder. Do not open only `css`, `js`, or `server`, and do not create a blank `package.json` to work around an incorrect directory. Unless explicitly described as an outer-workspace path, paths and npm commands in this guide are relative to `DEVELOPMENT`. Documents live in `DEVELOPMENT/docs`; the sibling `Capstone - AI` folder is the generated upload website. Git metadata and a short start-here guide remain outside at the repository root.

The September 16 separation moved the whole editable app into `DEVELOPMENT`, including its root `index.html`, `server/server.js`, and complete `data/` folder. Local tickets, credentials, and attachments were preserved, not reset. Their paths relative to the app root are unchanged. Stop any old local process and restart with `npm.cmd start` from `DEVELOPMENT`; hard-refresh with Ctrl+Shift+R. Explicit environment variables pointing to old absolute file paths must be updated deliberately before use. The canonical staff page is `/pages/staff.html`; Node redirects old `/staff.html` bookmarks.

The local source checkout uses Node; the default generated Ocelot release is static HTML/CSS/JS with browser-only storage. PHP is an optional explicit build. The servers serve only public allowlists. Never expose the entire repository or upload private `data/`, `.env`, credentials, or exported browser backups into public webspace.

### Preparing an uploaded browser demo

The package explicitly selects browser transport. Search uses the same reviewed knowledge/ranking as Node; tickets and attachments are stored together in IndexedDB. No request is sent to the blocked PHP backend, and failed server requests never silently switch to this mode. Staff entry selects a demo identity; it does not verify ownership. Internal-note filtering is a UI demonstration, not secure access control on a browser's data.

From **DEVELOPMENT**, run **`npm.cmd run package:ocelot`**. Upload only the sibling **Capstone - AI** website folder into `public_html`. Do not upload `DEVELOPMENT` or the outer workspace. Previous websites are preserved under `DEVELOPMENT/dist/archive/ocelot/`; older packages are in `DEVELOPMENT/dist/archive/legacy/`; guides and checksums remain outside the website. See the [upload guide](OCELOT_UPLOAD_GUIDE.md). Because the requested name matches an existing remote full-project copy, privately preserve needed data and take that old copy out of the public directory before replacing it. Do not merge a clean website into old development files.

No server setup is needed for the default browser demo. Each browser/profile/site address has its own queue, initially empty. Keep the address unchanged across uploads. No existing server records are imported or erased. Use **Export browser tickets** while signed in to download tickets and attachments as JSON; keep backups private. Import/restore and synchronization are not implemented. Use HTTP/HTTPS rather than opening an HTML file directly.

**FileZilla permissions after upload:** for the clean public **Capstone - AI** website only, use `755` with **Apply to directories only**, then `644` with **Apply to files only**. Do not apply these recursively to private storage, the account home, or an old source upload. See the [upload guide](OCELOT_UPLOAD_GUIDE.md#upload-this-folder-only).

**Local static preview:** run `npm.cmd run preview:ocelot` after rebuilding, then open <http://127.0.0.1:3003/Capstone%20-%20AI/>. This serves only the generated public files. Its browser queue is separate from Ocelot and the Node app at localhost:3000.

**Optional shared PHP queue:** `npm.cmd run package:ocelot:php` explicitly replaces the generated website with the PHP variant (archiving the previous build). It needs approved private storage outside `public_html`; that remains blocked on the reported Ocelot account. Only this variant uses the SSH setup helper and `ocelot:check`. Follow [the PHP guide](OCELOT_PHP_GUIDE.md); do not use `777` or public ticket files. Rebuild with `package:ocelot` to return to browser mode.

**Subsequent browser-demo uploads:** rebuild/upload the complete public website at the same address, hard-refresh, and verify the **Browser-only test queue** notice and a fictional ticket. Do not run PHP health/setup or change `.capstone-chat-private`. Test the same-browser persistence and separate-browser empty queue described in the upload guide.

The optional PHP helper's confirmation accepts `yes` in any capitalization; blank cancels. It is not needed for the default browser release.

**Ocelot check, September 17:** the owner successfully ran the helper; it created the private base folder with mode 700, owned by afeli016 (UID 53930). Home is 711 and `public_html` is 755. A fresh live health check still returned HTTP 503, now `Private ticket storage is not writable by PHP.` This error covers failed PHP chmod or write-access checks, not a missing base folder. Do not repeat setup or use 777. Web PHP identity, host restrictions, private writes, sign-in, and shared persistence still need validation. Send the [prepared hosting-support request](OCELOT_UPLOAD_GUIDE.md#if-preparation-succeeds-but-php-still-cannot-use-storage); no support email has been sent automatically. Local PHP checks use 8.4.25, targeting 7.2 syntax for the reported terminal runtime; 7.2 is upstream end-of-life and official use requires a supported runtime. The local Windows Node setup is unchanged.

The alternative **`npm.cmd run package:upload`** runs from `DEVELOPMENT` and creates Node packages in its `dist/node/`. Keep their `private-app` outside the web root; they require a Node process and HTTPS proxy. See the [Node hosting guide](HOSTING.md) and [document index](README.md). All source, docs, tests, local data, and archives belong in `DEVELOPMENT`; only the sibling generated website belongs on Ocelot.

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
Capstone - AI is running at http://localhost:3000/
```

Keep this terminal open while testing. The command stays running; that is normal. Open these addresses in Chrome or another browser:

| Page | Local address |
| --- | --- |
| Student assistant | [localhost:3000](http://localhost:3000) |
| Local staff queue | [localhost:3000/pages/staff.html](http://localhost:3000/pages/staff.html) |
| Basic server check | [localhost:3000/api/health](http://localhost:3000/api/health) |

The server check should show `{"status":"ok","mode":"zero-token"}`. Each teammate runs their own local copy. Sending someone your `localhost` link does not share your running app or your tickets.

On the student page, the chat starts minimized as a compact generic speech-bubble icon with **Capstone - AI / Let's chat** in the bottom-right corner. Select the icon or label to open the popup. Its accessible name is **Open Capstone - AI chat**. The **Minimize chat** minus button, or **Escape** inside the chat, collapses it again. The sidebar's **Capstone - AI** button also opens it; selecting a popular topic opens it and asks that question. Mobile spacing keeps the last content scrollable above the button.

Minimizing does not clear messages or unsent text. They remain only for the current page session: refreshing or leaving the page resets the conversation and starts the chat minimized again. **Clear conversation** is a separate reset action.

### Keyword links to the Capstone site

After sending a question, **Related site links** shows clickable recognized keywords and their destination titles. For example, `sprint planning and tutorials` offers the reviewed Sprint Planning document and the Tutorials page. Keywords ignore capitalization, common singular/plural variants, and punctuation; longer phrases take precedence over overlapping broad terms. Repeated terms are grouped, with up to four topic links per question.

Links open in a new tab and show **Sign-in required** or **Public page**. The document link may download a file. Portal topics use the existing dashboard address when no reviewed section-specific URL is available; follow the answer's navigation instructions there. Your real FIU session is separate from this prototype.

These are navigation suggestions, not a claim that every part of the question has been answered. Answer confidence and **Create support request** / **I still need help** behavior are unchanged. There is no approved attendance-policy page in the current knowledge file, so attendance questions must not invent one. Matching is local and uses no paid AI tokens or live crawling. Maintainers can update `linkKeywords` alongside the reviewed source URL in `data/capstone-knowledge.json`; only HTTPS links on `capstone.cs.fiu.edu` are eligible. Never add private account data there.

Restart `npm.cmd start` after stopping the previous server with **Ctrl+C**, then refresh with **Ctrl+Shift+R**. The September 24 rename installs `css/images/capstone-chat.svg` and removes the mascot from the static allowlist and new packages. Old artwork is preserved only in ignored local archives. The compact speech bubble is drawn in SVG from basic geometry; it does not use Roary or an external image service.

**Use `npm.cmd start`, not a double-click on `index.html` or Live Server, to test the full project.** Relative asset paths let the HTML reference its CSS, images, fonts, and scripts in the new folders, but chat and tickets still require the Node server. A generic server must not expose the whole project folder.

On macOS/Linux, use the same local project folder and replace `npm.cmd` with `npm`:

```sh
npm install
npm start
```

The Windows commands were verified for this guide; the macOS/Linux equivalent has not been tested on those operating systems.

### Staff sign-in for the current testing phase

Open **Staff queue** and enter one of the [five approved staff emails](STAFF_ACCESS.md#approved-staff). The password field is hidden/disabled, and no password setup is needed. A warning appears on both sign-in and the queue. Your selected roster name and email appear, labeled as an unverified demo identity. An unlisted email still shows **Unauthorized access** with the return link and 15-second inactivity redirect. Use fictional tickets and documents only.

This mode comes from `staffLoginMode: "email-demo"` in `server/config.json`; it is not controlled by the browser. Existing password hashes are preserved but not checked. To restore passwords later, stop the server, change that setting to `password` (or set the server environment `CAPSTONE_STAFF_LOGIN_MODE=password`), configure each account, restart, and hard-refresh. Unknown mode values stop startup. No old sessions survive restart; saved tickets and attachments remain.

**Optional password-mode setup, only after restoring password checks:** in a second VS Code terminal, from the same project folder, run:

```powershell
npm.cmd run staff:password
```

Choose your name from the five approved staff accounts. Enter and confirm a **separate prototype password** of 12–128 characters; typing is hidden. Never use your FIU password or paste a password into chat/source code. No default passwords are supplied. To target Anthony's account directly, use `npm.cmd run staff:password -- afeli016@fiu.edu` (substitute your approved email as appropriate).

In password mode, sign in with that email and password. In the current email-only mode, use just the email. Both show your selected name and four prominent view buttons:

| View | Tickets shown |
| --- | --- |
| **All tickets** (default) | Every team ticket, grouped by assignee. Unassigned tickets appear first; named groups follow alphabetically. |
| **My tickets** | Tickets currently assigned to your signed-in email, including resolved tickets. |
| **All resolved** | Only resolved team tickets, grouped by their current assignee. |
| **My resolved** | Only resolved tickets currently assigned to your signed-in email. |

For new work, select **All tickets → Unassigned only** and optionally set Status to **Open**. Select **Claim ticket** or use **Assign to** to give it to a teammate. Personal views use current assignment, not the person who resolved a ticket in its historical notes.

Button counts and the summary totals describe the selected scope before extra filters; group counts and the “shown” message reflect the filtered results. Clicking a view clears search and extra filters. The resolved views lock Status to **Resolved**. **Refresh queue** keeps the current view and filters. Ticket updates move cards and refresh counts automatically. Refresh your browser with **Ctrl+Shift+R** after getting these interface changes; no data migration is needed.

The **Search tickets** bar is at the top of the staff queue. Start typing a ticket ID, student name/email, topic, question, detail, or resolution note: matching cards and the result count update immediately, without pressing Enter. It searches only the selected view and filters; choose **All tickets** to start a team-wide search. **Clear search** or Escape while in the field removes only the search text, keeps your other filters, and returns focus to the input.

Each local copy needs its own credentials only when password mode is enabled; credentials do not come from GitHub. The setup command resets a forgotten password but does not enable password enforcement by itself. Sessions expire after one hour or server restart; assignments and password hashes persist. See [staff access and the approved roster](STAFF_ACCESS.md).

When password mode is enabled, a **local-only, fictional-data test** can use `npm.cmd run staff:password -- afeli016@fiu.edu --local-test-only`, replacing the email if needed. The hidden prompts accept 8–128 characters. This marks only the chosen account as local-test-only; no default password is supplied. That password cannot authenticate from non-loopback addresses, through a hosted origin, or in production mode. Other accounts keep the normal password rule. Use the normal setup command without the flag and a 12–128-character password to remove this exception. These password restrictions do not protect email-only mode, which checks no passwords at all.

### Remembered staff email

Restart the server after this update and refresh `/pages/staff.html` with **Ctrl+Shift+R**. After a successful login (or recognition of a valid session), the app remembers the email accepted by the backend on this browser only. In email-only mode this is a selected demo identity, not a verified owner. Sign out and reload: the email is prefilled, but sign-in is still required. Password entry is required only in password mode. Edit the email to switch accounts; a successful sign-in replaces the saved address. A failed attempt does not replace the remembered address, though the attempted email remains editable when you choose **Try signing in again**.

The app saves only the email preference, not a password or session token, in browser storage. It does not provide automatic login or bypass any access checks. Browsers/password managers may separately offer password autofill. Other people using the same browser profile can see the saved email; sign out and clear this site's browser data to remove it. The preference is specific to the browser profile, site address/port, and app folder, not synced by the app to teammates. A saved localhost email will not appear on Ocelot. Private browsing or blocked storage may prevent remembering it across visits; sign-in still works normally. Blocked storage now produces an explanatory notice. A backend/HTML error does not count as a successful login and therefore cannot save a new email.

Manual check: sign in, sign out, reload, and confirm the email remains while the password is hidden in demo mode (or empty in password mode; disable password-manager autofill for that check). Try a failed login with an unlisted fictional email, then reload: the last successful email should still appear. Finally sign in with another approved staff account, sign out, and reload to confirm it replaces the saved email.

### Category tags

Every ticket card now shows a labeled **Category** tag beside its status, using the existing FIU palette. Tags are derived automatically from the saved topic, including Attendance and the three staff task topics; existing tickets get tags too. Missing categories display **Other**, and custom/legacy category names are preserved with a neutral tag. These are read-only labels, not separate editable tags or clickable filters. Search a category name in **Search tickets** to find matching cards. No data migration or server restart is needed for tags; refresh with **Ctrl+Shift+R**. The tag text, not color alone, identifies the category.

### Create a ticket from the staff queue

After updating this feature, stop the server with **Ctrl+C**, run `npm.cmd start`, refresh `/pages/staff.html` with **Ctrl+Shift+R**, and sign in again. Restarting clears staff sessions but preserves saved tickets and passwords.

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

Restart the app after updating this feature, refresh `/pages/staff.html` with **Ctrl+Shift+R**, and sign in again. Select a ticket number or **Open ticket** in any of the four views. This is a service-management-style form in the existing FIU design, not a ServiceNow integration.

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

Latest local-launcher follow-up, September 18: **155 tests passed, 0 failed**, including the optional PHP integration test. Four launcher tests were added to the 151-test browser-release suite described below. The running port-3003 preview also returned HTTP 200 for both pages, browser scripts, and Roary's PNG; interactive browser verification remains a separate manual step.

Open another terminal with **Terminal → New Terminal**, leaving the app's terminal running, and run:

```powershell
npm.cmd test
```

September 18 verification reported **151 tests passed, 0 failed, 0 skipped**, with `CAPSTONE_PHP_BIN` set to the local PHP 8.4.25 executable, Node 24.15.0, and npm 11.12.1. Without PHP configured, its integration test is explicitly skipped. Ten new browser-mode checks cover the generated bundle, zero backend requests, demo sessions, contact/document validation, serialized fixture saves, commit-failure handling, export contents, note filtering, revision conflicts, search parity, package exclusions, and an event-order IndexedDB adapter fixture. These fixtures are not real-browser IndexedDB verification; use the manual checklist.

The existing 141 tests remain passing: Node/PHP APIs, UI handlers, email remembering, uploads/rollback, queue views, notes, revisions, search, transparent Roary asset serving, packaging/archive preservation, and safe mocked SSH setup. Tests use fictional isolated data, never the user's runtime queue. Historical PHP/SSH evidence is in [the optional PHP guide](OCELOT_PHP_GUIDE.md).

Some tests deliberately simulate an unavailable account service and print `We could not check your account. Please try again.` with status `503`. During the automated test run, those messages are expected only when the final summary still reports zero failures. Do not ignore that error if it appears in the app during normal use.

The attachment rollback test deliberately blocks its temporary ticket file and can print an `EISDIR` error. This is also expected only during a passing automated test run. Test files are isolated from your local queue.

## 6. Manual testing checklist

Use sample information only. You can create several tickets, so the next ticket number may differ from examples. For the September 18 browser-only build, use the [browser acceptance checklist](OCELOT_UPLOAD_GUIDE.md#quick-acceptance-test-after-uploading). Browser controls were unavailable during implementation, so real IndexedDB persistence, downloads, layout, and live Ocelot verification remain manual checks; automated API tests use an isolated transactional store. Earlier browser results below do not verify this new mode.

September 17 Roary checks passed the 129-test suite with the same Node/npm/PHP versions listed below. Chrome checks on a separate loopback preview at port 3001 verified the transparent launcher on desktop and at 320 × 568, initial minimization, opening, the minimize button, Escape, keyboard reopening/focus, and unsent-draft retention. The mobile panel stayed within the viewport without horizontal page overflow. These are browser viewport checks, not a physical-phone or live Ocelot test; no tickets were submitted. An already-running port-3000 process needs a manual restart to load the updated asset allowlist.

September 16 checks used automated local HTTP/API requests and browser-script event-handler tests. The 128-test suite passed on Windows with Node 24.15.0, npm 11.12.1, and an isolated PHP 8.4.25 CLI runtime with mbstring. PHP files passed syntax checks on that runtime. PHP 7.2.24 runtime execution has not been locally tested. This is not a live Ocelot deployment, HTTPS/PHP-CGI test, Apache configuration test, or browser visual check. The checks in [OCELOT_UPLOAD_GUIDE.md](OCELOT_UPLOAD_GUIDE.md) remain required on the actual host.

Folder reorganization checks on September 15 used automated local HTTP requests and source-link checks, not a new browser/visual test. The page content and styling are unchanged apart from their file paths. Restart and hard-refresh before trying the manual flows below.

Keyword-link checks on September 15 passed the 108-test suite and a desktop Chrome check at localhost: the minimized launcher opened, submitting `sprint planning and tutorials` returned an answer with two clickable destinations and the correct access labels, and the chat remained usable. The updated server was restarted before this check. Responsive keyword-link layout and authentication/download behavior on the real FIU site still need teammate verification; no test data was submitted there.

Popup checks verified in Chrome on September 10, 2026: minimized on load, opening, draft retention, topic shortcuts, Escape handling, and support-form access. Desktop and a 320 × 568 viewport were checked; this is browser viewport testing, not a physical-phone test.

Attendance selection and staff document links were verified in Chrome. Document saving/downloading and byte-for-byte integrity were verified through the local API, with selection/removal covered by automated event-handler tests. Chrome's automation extension blocked setting a test file in the picker, so a complete manual picker-to-submit run still needs a teammate's check.

On September 14, staff authentication, assignment, creation/contact validation, owner classification, workspace, journal and requester-preview APIs passed automated tests, and the hidden-password setup command was verified with an isolated test file. The four views, tags, contact controls in both creation forms, and ticket workspace's real event handlers were tested with a DOM double; this is not a visual/browser test. Screen layout, keyboard/focus behavior, and responsive form/workspace behavior still need the manual checks below.

Staff creation attachments were also verified with isolated API and real-event-handler tests on September 14, including the full 10 MB combined limit, byte-for-byte downloads, save rollback, and session cleanup. The new staff file picker still needs a manual browser check; this is separate from earlier student-form checks.

| Test | What to do | Expected result |
| --- | --- | --- |
| Initial state | Restart the updated server and refresh the student page. | The **Capstone - AI / Let's chat** launcher and generic chat-bubble icon are visible at the bottom-right. The conversation is hidden until opened. |
| Open and minimize | Open the chat, ask a question, type another question without sending, then select **Minimize chat** and reopen it. | Messages and the unsent question remain. Focus returns to the chat input when reopened. |
| Topic shortcut | Minimize the chat, then select **Sprint minutes** on the page. | The popup opens with that question and its answer. |
| Keyboard | Press **Escape** inside the chat. Reopen it, open the support form, and press **Escape** again. | The first Escape minimizes the chat; the second closes only the support form. |
| Reviewed answer | Ask `Where can I find the sprint meeting minutes templates?` | A reviewed answer appears with a Capstone source link. |
| Keyword destinations | Send `sprint planning and tutorials`. | **Related site links** offers the Sprint Planning DOCX and Tutorials page. Links open in a new tab; the template is labeled Sign-in required. |
| Keyword variants and specificity | Send `TUTORIAL`, `stand-up`, `colours`, then `showcase judge`. | Reviewed destinations appear; showcase judge links to Become a Judge rather than the general showcase checklist. |
| Unknown keyword | Ask an attendance-policy question. | No invented policy or attendance link appears. Support escalation remains available. |
| Related choices | Ask `Which FIU logo and colors should I use?` | Related topics appear; selecting one shows its answer and source. |
| Unsupported question | Ask `Where can I park my car?` | The assistant says it cannot find the answer and offers **Create support request**. |
| Further help | Under a reviewed answer, select **I still need help**. | The support form opens with your question included. |
| Sample account autofill | In the form, select **Try sample signed-in account**. | Name becomes **Demo Student** and email becomes **demo.student@example.edu**. Both are read-only and labeled as a sample account. |
| Create a ticket | Fill **What would help?** with a test note, then select **Create request**. | A `CAP-...` ticket ID appears. It is saved locally; no email is sent. |
| Attendance | In the support form's **Topic** dropdown, select **Attendance** and create a fictional request. | The saved staff card is labeled **Attendance**. No claim about the actual course attendance policy is generated. |
| Add/remove documents | Under **Attach documents**, select `test/fixtures/attendance-note.txt`. Remove it, then select it again. | The filename/size appear in the selection list; **Remove** drops that selection. Closing/reopening the form retains it. |
| Save/download documents | Submit the request with the sample TXT file. Open its staff card and select the filename under **Documents**. | The original sample file downloads. Files remain available after refreshing or restarting the server. |
| File limits | Try an unsupported file extension or exceed the 3-file, 5 MB-per-file, or 10 MB-total limit. | A clear error appears. Existing valid selections remain. Nothing is uploaded until **Create request** is submitted. |
| Staff sign-in | Open **Staff queue** and sign in with an approved email; provide a password only if password mode has been restored. | Email-only mode hides the password and displays warnings before/after sign-in. The selected name/email appear; **All tickets** and four view buttons/counts are visible. |
| Remembered staff email | Sign in successfully, sign out, and reload. Edit the prefilled email to switch to another approved account and repeat. | The last successful email is remembered. It does not automatically sign in; a failed attempt does not replace it. Password entry is required only in password mode. |
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
| Unauthorized access | Sign out, then try an unlisted email (or an incorrect password when password mode is enabled). Do not interact for 15 seconds. | **Unauthorized access** appears with a return link, then automatically returns to the student assistant. **Try signing in again** cancels the countdown. |
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
- Existing staff password hashes remain in ignored `data/staff-credentials.json`, but the current email-only mode does not check them. Anyone who knows an approved email can read/change tickets and download files. This is not FIU SSO or secure authentication. Restoring password mode requires a server setting change and restart; setting a password alone is not enough.
- All five staff members can view all team tickets. **My tickets** and **My resolved** are work filters, not privacy restrictions. The privacy checkbox records a preference; instructor-only permissions are not implemented. Do not use real student data or expose this server publicly.
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
| Missing root index or old asset paths after updating | The homepage is now root `index.html`, with assets in `css/` and `js/`. Download the complete current source, stop/start the app with `npm.cmd start`, and hard-refresh. Do not mix the old `public/` layout with the new one. Static hosting alone cannot provide the backend APIs. |
| `node`, `npm.cmd`, or `git` is not recognized | Install the corresponding tool, then fully reopen VS Code and create a fresh terminal. Git is needed only for cloning/updating through Git. |
| VS Code says a PHP installation could not be found | Configure the local PHP CLI path using [PHP validation setup](#optional-php-validation-in-vs-code), then reload the VS Code window. This is an editor warning, separate from Ocelot's PHP execution and local Node startup. |
| Repository is missing, access denied, or clone fails | Check the exact repository URL and your network connection. The repository is public, so viewing or downloading does not require an invitation. Ask the owner if the URL or visibility has changed. Pushing changes still requires collaborator access. Never paste passwords or access tokens into this guide or a bug report. |
| Browser cannot reach `localhost:3000` | Confirm `npm.cmd start` is still running without an error. Also try `http://127.0.0.1:3000`. Use one hostname consistently during a sample-account test. |
| `EADDRINUSE` / port 3000 already in use | An app is already using that port. Stop your earlier Capstone server with Ctrl+C, or use the alternate-port commands below. Do not kill unrelated processes. |
| Page opens but chat or tickets fail | Use the address served by `npm.cmd start`, not a `file://` page or Live Server. Check the terminal error and the `/api/health` page. |
| `Unexpected token '<'` on an older copy, or “The Capstone backend is not available at this address” | The request received HTML instead of API JSON. Update all frontend files, including `js/shared/api-client.js`, and hard-refresh. Locally, use `npm.cmd start`. On a hosted folder, append `api/health` to that folder's address; configure the backend/proxy using [HOSTING.md](HOSTING.md). Resetting the password cannot repair missing API routes. |
| Last email is not prefilled on the hosted site | Sign in successfully at that address first. Remembering is separate for each browser/profile, origin/port, and app folder. Localhost preferences do not transfer to Ocelot. Failed logins do not save a new address; blocked storage now shows a notice. |
| Attendance or attachment controls are missing | Refresh with **Ctrl+Shift+R** after getting the latest code. Restart `npm.cmd start` too: document saving requires the updated server. |
| A document is rejected | Use a nonempty PDF, DOCX, or UTF-8 TXT within the displayed limits. Rename files with unsupported characters. Do not just rename an unsupported file's extension. Remove the rejected file and select a valid one. |
| A download says the file is missing | The ticket metadata exists, but its local file is absent. Keep `data/tickets.json` and `data/attachments/` together when intentionally backing up local test data; GitHub does not contain either. |
| Sample-account button is missing | Confirm you downloaded the current version, restarted the server, and refreshed. Use localhost/127.0.0.1. Sample mode is disabled with a portal adapter or production environment; those settings are not needed for normal teammate testing. |
| “Account changed or expired” | Review the refreshed form, select the sample account again if appropriate, then submit again. The warning prevents using stale account details. |
| “We could not check your account” in the form | Check the running server and any intentionally configured portal adapter. Normal demo setup does not require an adapter. Do not enter real account credentials to work around this. |
| A teammate's tickets are missing | Expected: each computer has a separate local queue. Tickets are not synchronized through GitHub. |
| Sample loader says the batch already exists | Expected on repeat runs: samples are not duplicated and your status/assignment edits are not reset. Clear queue filters to find them. |
| Staff sign-in says unauthorized | In email-only mode, use one of the five approved emails. In password mode, run `npm.cmd run staff:password` on the backend computer to configure/reset the approved account. Do not use FIU credentials. If the wrong mode is shown, check `server/config.json`, the server environment override, and restart/hard-refresh. |
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

Then open [localhost:3001](http://localhost:3001) and [localhost:3001/pages/staff.html](http://localhost:3001/pages/staff.html). After stopping the server, return to the default port in that terminal with:

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

Update this document in the **same change** as anything that affects installation, commands, ports, environment variables, login, storage, interface labels, or test behavior. The project guidance in [AGENTS.md](../AGENTS.md) reinforces this requirement for future coding work.

Before sharing a new version:

- [ ] Follow this guide from a clean copy of the files being shared.
- [ ] Verify install, startup, automated tests, and the manual checklist.
- [ ] Update the last-verified date, tested tool versions, and expected results where needed.
- [ ] Update the README link/quick-start if the entry point changes.
- [ ] Keep sample data, local tickets, and secrets out of the source backup.
- [ ] Push the guide and the matching application changes together when approved for sharing.
- [ ] Tell teammates to pull again or download a new ZIP.

This is a version-controlled document. It does not update itself while no one is working on the project; maintain it alongside future changes.
