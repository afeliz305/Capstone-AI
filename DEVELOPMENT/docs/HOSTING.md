# Run locally and host a shared Capstone queue

**Current scope:** The project owner confirmed that Ocelot is for group testing with fictional data only. The goal is one shared browser link without requiring teammates to use GitHub or install the app. Temporary testing exceptions and the separate official integration/go-live requirements are recorded in [the deployment and integration plan](DEPLOYMENT_AND_INTEGRATION_PLAN.md). Production readiness is not being claimed or required to demonstrate fictional workflows; a working backend and private test storage are still needed.

## Ocelot runtime discovery — September 16, 2026

**One-folder PHP upload is implemented:** run `npm.cmd run package:ocelot` from **DEVELOPMENT**, then follow the [Ocelot upload guide](OCELOT_UPLOAD_GUIDE.md). Upload only the generated sibling **Capstone - AI** website, which contains `index.html` directly, into `public_html`. Source, guides, tests, archives, and local data remain in `DEVELOPMENT`. Preserve the old remote full-project copy privately before replacing it; do not merge it with the clean release. Actual Ocelot PHP execution, private writes, and concurrent storage still need verification. The Node instructions below are an alternative, not PHP bundle requirements.

The project owner successfully signed into Ocelot over SSH and reported that `node` and `npm` are not available in the current shell. `php --version` reports PHP 7.2.24 (cgi-fcgi); the reported modules include JSON, sessions, PDO SQLite, fileinfo, mbstring, and ZIP. This establishes terminal availability, **not PHP execution through the website or private storage permissions**. The Node deployment procedure below is therefore not ready to use on that account as-is. The new PHP package is prepared locally but has not been uploaded or verified on Ocelot; the local Node app remains usable.

PHP 7.2 reached upstream end of life on November 30, 2020. Ask FIU support whether an updated, supported web runtime is available before any real deployment. We have not verified vendor backports or host maintenance. Do not put real student data on this prototype. Sources: [PHP unsupported branches](https://www.php.net/eol.php), [currently supported versions](https://www.php.net/supported-versions.php).

### One-file website execution check

1. In the local source checkout, locate `scripts/capstone-hosting-check.php`.
2. Using FileZilla, upload **only that file**, not the whole `scripts/` folder or repository, into your existing public app folder beside `index.html`. Do not overwrite another existing file with that name without checking it first.
3. Open your HTTPS app address followed by `capstone-hosting-check.php`. For this project's current folder, that is `https://ocelot.aul.fiu.edu/~afeli016/Capstone%20-%20AI/capstone-hosting-check.php`.
4. A working PHP handler displays JSON containing `"check": "capstone-php-check-v1"` and `"phpExecuted": true`. Share that output. If the file downloads, shows PHP source, or produces a 403/404/500 error, stop and report that result; do not upload any real backend or credentials. Do not add executable-handler rules or change broad permissions to work around it without host guidance.
5. After the result is reviewed, remove **only the uploaded diagnostic file** using FileZilla. The local source remains available if another check is needed.

The optional probe only reports the PHP version and a few extension-presence flags. It reads no application data, credentials, cookies, environment variables, or private paths. It creates no files, database, or session. It does not prove that private storage is writable and is deliberately omitted from upload packages. The new package's `api/index.php?route=%2Fhealth` replaces it for release acceptance: that endpoint executes the actual PHP backend and checks/initializes private storage. Neither endpoint has yet been successfully verified on Ocelot.

## Existing Node application and deployment requirements

**Everything below describes the Node variant only.** For the single-folder PHP variant, including its different data location, sessions, limits, and troubleshooting, use [OCELOT_UPLOAD_GUIDE.md](OCELOT_UPLOAD_GUIDE.md).

The same application supports a local address such as `http://localhost:3000/` and a hosted folder such as `/~yourUserName/Capstone%20-%20AI/`. API requests and document downloads stay inside that folder. Tickets and sessions remain server-managed; there is no browser-storage fallback for tickets.

**Temporary email-only testing:** `server/config.json` currently sets `staffLoginMode` to `email-demo`, so password checks and the password field are disabled. The server still checks the six-email roster and issues an expiring session, but anyone who knows an approved email can access every ticket and attachment. Names are selected demo identities, not verified users. Do not use real student data. Set `CAPSTONE_STAFF_LOGIN_MODE=password` or change the config to `password`, configure fresh passwords, and restart to restore password checks. The mode is never selected by browser input.

**Uploading HTML does not start the backend.** A shared queue requires one running Node application, private writable storage, and an approved HTTPS reverse proxy. These changes prepare the files; they do not deploy or configure Ocelot. Until that setup is complete, the hosted interface explains that the backend is unavailable instead of showing `Unexpected token '<'`.

## 1. Local Windows testing

Open the project folder containing `package.json` in VS Code. Run each command separately in its terminal:

```powershell
npm.cmd install
npm.cmd test
npm.cmd start
```

Open [the local assistant](http://localhost:3000/) or [staff sign-in](http://localhost:3000/pages/staff.html). Keep the terminal running. In the current email-only mode, enter an approved staff email without a password. If password mode is restored, set a separate prototype password with `npm.cmd run staff:password -- your-approved-email@fiu.edu`. Do not use your FIU password. The [teammate guide](https://github.com/afeliz305/Capstone-AI/blob/main/DEVELOPMENT/docs/TEAM_SETUP_GUIDE.md) covers first-time setup and troubleshooting. Run tests in the full source checkout; the deployment-only `private-app/` package omits tests and development guides.

No hosting environment variables are needed locally. After changing the server code, stop the previous Capstone server with Ctrl+C, start it again, and refresh with Ctrl+Shift+R. Do not use Live Server or double-click the HTML file to test login or tickets.

### FileZilla and where tickets will be stored

FileZilla transfers files; it does not run this application's backend. Keep `private-app/` outside `public_html`, and have the host administrator configure the Node process and HTTPS routing described below. If your only access is file upload, that server setup remains a blocker; uploading this package alone does not enable saving.

Once the backend is actually running on Ocelot, both student and staff creation requests save to Ocelot's private `data/tickets.json` (or `CAPSTONE_DATA_FILE`). Documents save in `attachments/` beside that JSON file. The server confirms success only after the write completes. Other staff using the same hosted instance read the same queue, and tickets survive browser logout and backend restarts. Localhost remains a separate queue and does not automatically upload or synchronize tickets with Ocelot.

Keep server data outside the public web directory and, preferably, outside versioned application-release folders. Never overwrite it during FileZilla updates. The generated upload package contains no runtime ticket file, credentials, or uploaded documents. Refreshing/redeploying the interface must not delete or replace the hosted data. Do not manually upload a browser-generated JSON file as a substitute for the backend.

## 2. Prepare a clean upload package

From the local **DEVELOPMENT** application folder:

```powershell
npm.cmd run package:upload
```

Each run prints a new Node package under `DEVELOPMENT/dist/node/capstone-hosting-*`. Older packages are preserved in `DEVELOPMENT/dist/archive/legacy/`. These are not the current sibling **Capstone - AI** PHP upload website. The Node package contains:

| Item | Purpose / placement |
| --- | --- |
| `public/` | Only the homepage, staff page, approved CSS/images/fonts/browser scripts, and defensive `.htaccess`. These are the only files eligible for a public web folder. |
| `private-app/` | Clean application source, reviewed knowledge, password-setup tools, and hosting guide. Keep this entire folder **outside `public_html` and every other public web root**. Node serves its own approved public files. |
| `READ-BEFORE-UPLOADING.md` | A copy of this guide. Read locally before transferring anything. |
| `manifest.json` | File list, byte counts, and SHA-256 checksums for checking the package. Not needed on the public website. |

The package excludes local credentials, tickets, uploaded documents, `.git`, `.env`, dependency folders, and backups. This is a source-delivery package, **not a backup of your existing queue**. Keep any intentional data backup private and separate.

Do not upload the whole project, the whole generated package, or `private-app` into `public_html`. If using a separate public static folder, copy only the **contents** of `public/` to a new empty destination. That alone displays the interface but does not enable sign-in, search, or tickets.

### If the complete repository was already uploaded

Take that public copy offline before continuing. Uploading new files on top does not remove old private files. Preserve any needed data privately, then remove public copies of `data/`, `.git/`, `.env` files, backend scripts, credentials, and backups. Set fresh staff passwords; do not reuse credentials whose hashes were publicly accessible. Restart the backend to invalidate old sessions. Local changes do not remove anything from the existing remote folder.

The bundled Apache `.htaccess` attempts to deny private directories and dotfiles and disable directory listing. It is defense in depth only: it depends on the host's Apache settings and has not been verified on Ocelot. If overrides are disabled, it cannot protect files. If directives are unsupported, Apache may return a configuration error. Physical separation from the public web root is required regardless.

## 3. Hosting requirements — confirm these before uploading

Ask the hosting administrator whether your account may run a persistent Node process and whether they can route your HTTPS app folder to its assigned loopback port. FIU's [support page](https://www.cis.fiu.edu/support/) describes account/web-hosting support, but does not establish permission for this particular Node deployment.

The required configuration is:

- One persistent Node process, running from `private-app/` outside the public web root. Do not run multiple instances against the same JSON queue.
- A private writable data directory and restricted filesystem permissions. Staff password hashes, ticket JSON, and attachments are not web assets.
- HTTPS on the public address. Route the app's complete folder prefix to Node, preserving the prefix and query string. Alternatively, serve only `public/` statically and proxy every request beneath the matching `api/` prefix to the same Node process.
- Forward request methods, bodies, cookies, and responses correctly; never cache API responses or protected downloads. Allow the prototype's document request sizes (up to 10 MB of files plus JSON/base64 overhead).
- A supervisor managed through the host's approved process controls, so the app survives an SSH disconnect and restarts after failures. A public file upload or an interactive terminal alone is not that setup.

No cross-origin API URL, browser-stored password, or client-side allowlist is used. The backend stays on `127.0.0.1`; a trusted HTTPS proxy provides public access. If Ocelot only permits static files for your account, a host-approved backend deployment is still needed. The temporary email-only mode does not fix a missing backend and must not be treated as secure authentication.

## 4. Configure the hosted backend

Use the hosting service's environment settings (or its approved process supervisor). The app does not automatically load `.env` files.

| Setting | Hosted value |
| --- | --- |
| `NODE_ENV` | `production` |
| `PORT` | The loopback port assigned/approved by the administrator; local default is `3000`. |
| `CAPSTONE_BASE_PATH` | Your public folder, for example `/~yourUserName/Capstone - AI`. Encoded spaces also work; omit the final slash. Leave empty only for a dedicated app at the site root. |
| `CAPSTONE_PUBLIC_ORIGIN` | The exact HTTPS origin, for example `https://ocelot.aul.fiu.edu`. Do not include the folder path. This is trusted configuration for origin checks and Secure cookies; arbitrary forwarded headers are not trusted. |
| `CAPSTONE_STAFF_LOGIN_MODE` | `password` to restore password checks; `email-demo` only for the intentionally insecure fictional-data test. If omitted, `server/config.json` currently selects `email-demo`. |

Install using `npm ci`. Email-only mode needs no credential file. Before restoring `password` mode, set each approved staff member's password using `npm run staff:password -- your-approved-email@fiu.edu` on the host. Use a new separate 12–128-character password at the hidden prompt. The short `--local-test-only` password mode is not available through the configured hosted origin or in production. The local sample student account is also disabled there.

Start using `npm start` through the approved process supervisor, with those settings applied. The proxy must forward the same folder prefix configured in `CAPSTONE_BASE_PATH`; it must not strip it. The private app includes all assets, so a proxy for the entire prefix does not require a second static copy.

By default, hosted records are written under that private app's `data/`. For persistent storage separate from deployed code, `CAPSTONE_DATA_FILE` selects the private ticket JSON path and `CAPSTONE_STAFF_CREDENTIALS_FILE` selects the private credentials path. Uploaded files use an `attachments/` directory beside the ticket JSON file. Use the same credential setting for the password command and the server. Retain these directories across releases; GitHub and the generated package do not contain runtime data. Consult [account integration](https://github.com/afeliz305/Capstone-AI/blob/main/DEVELOPMENT/docs/ACCOUNT_INTEGRATION.md) and [staff access](https://github.com/afeliz305/Capstone-AI/blob/main/DEVELOPMENT/docs/STAFF_ACCESS.md) before changing identity behavior.

Everyone signing into the same hosted instance sees that instance's shared queue. Your separate localhost app still has its own queue; it does not synchronize with the hosted instance. This remains a prototype: use fictional test data, not real student records. Institutional sign-on, instructor-only privacy, retention, abuse controls, and production review are not implemented. For real deployment, use an institution-approved isolated origin; folder paths on a shared web-hosting origin are not a security boundary against other applications on that origin.

## 5. Verify the deployed setup

These are **required deployment checks**, not claims that the live host has already passed:

1. Open `YOUR_APP_ADDRESS/api/health` (append `api/health` to the folder's trailing slash). It must return JSON with `status: "ok"`, not an HTML page, login redirect, or proxy error.
2. Before signing in, `YOUR_APP_ADDRESS/api/staff/session` must return JSON with HTTP 401. An HTML response means the proxy/backend is still incorrect.
3. Check that private URLs such as `data/staff-credentials.json`, `data/tickets.json`, `.git/config`, and `server/server.js` return 403 or 404 with no private contents. Use status/header checks; do not download exposed private files as a test.
4. Sign in with an approved email (plus a freshly configured password only in password mode), create a fictional ticket, and sign in from a second browser with a second staff account. Confirm the same queue and saved assignment appear. In email-only mode, the password field must be hidden and the identity-not-verified warning visible before and after sign-in. Refresh the queue to see teammate updates; live push updates are not implemented.
5. Verify a fictional attachment downloads only while authenticated. Verify logout removes access and another origin cannot submit staff changes. The staff session cookie must have Secure, HttpOnly, SameSite=Strict, and the correct app-folder API path.
6. Sign out, refresh at the **same** site address in the **same** browser profile, and confirm the email is prefilled without automatically opening the queue. A password is required only in password mode. Check that no password or token is placed in local storage.
7. Restart the supervised backend and confirm saved fictional tickets/documents remain. Sessions intentionally expire on restart; sign in again.

## Remembered email and useful errors

The app saves the email accepted by the server only after a successful sign-in (or recognition of a valid session). Email-only mode confirms only roster membership, not email ownership. Failed logins never replace the saved value. The preference is scoped to browser profile, site origin/port, and app folder. A saved localhost email will not appear on Ocelot or another device. Clearing site data or using private browsing may clear it. If storage is blocked, the sign-in page now explains why remembering is unavailable.

If you see **The Capstone backend is not available at this address**, the response was HTML or another unexpected format. Check the backend/proxy, not the password. **Cannot reach the Capstone backend** indicates a transport failure; after an uncertain ticket save, check the queue before retrying. **Unauthorized access** is reserved for an actual authorization rejection from the backend.
