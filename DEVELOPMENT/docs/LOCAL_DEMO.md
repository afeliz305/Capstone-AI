# Run the local Capstone demo

Updated September 18, 2026. This is **Capstone - AI**, not HelpDesk INC. Node.js must be installed locally; PHP and SSH are not needed.

## Start with one command or double-click

In File Explorer, open `DEVELOPMENT/scripts` and double-click **Start Capstone Demo.cmd**. It finds the correct project folder itself and does not use PowerShell's blocked `npm.ps1` script.

Or open a VS Code terminal in `DEVELOPMENT` and run:

```powershell
npm.cmd run demo
```

The launcher rebuilds the current **browser-only** release, archives the previous upload folder, and starts a loopback-only preview. It does not change server tickets, browser records, or Ocelot. This deliberately selects browser mode even if the last generated release was PHP. It does not migrate data between modes.

Open these links yourself after the terminal says the demo is running:

- [Student assistant](http://127.0.0.1:3003/Capstone%20-%20AI/)
- [Staff queue](http://127.0.0.1:3003/Capstone%20-%20AI/pages/staff.html)

Use `afeli016@fiu.edu` for Anthony's demo staff identity; **no password**. Use fictional requester data only. This is not verified FIU login.

Keep the terminal that started the server open. Ctrl+C stops it. Running the launcher again recognizes this project's preview at the same address, refreshes its files, and reuses it. An unknown/older process or a different project on port 3003 produces an explanatory error; the launcher never stops it or silently chooses a new port. It does not interfere with HelpDesk.

## Short presentation flow

1. Open the assistant; confirm **Browser-only test queue** at the top. Click **Let's chat** and ask: **Where can I find the sprint meeting minutes templates?** Show the reviewed answer/source links.
2. Open the staff queue and sign in. Choose **Create ticket**. Use topic **Attendance**, title **DEMO — Attendance page needs review**, and fictional details. Assign it to yourself. Optionally attach `test/fixtures/attendance-note.txt` from DEVELOPMENT.
3. Show **All tickets** and **My tickets**, then search for `DEMO`. Open the ticket and add an internal work note plus an additional comment. Save, then use requester preview to show that only the additional comment appears there.
4. Resolve the ticket and show **All resolved** / **My resolved**. Refresh and confirm the saved record/document remains. Sign out and confirm the last accepted email is remembered.
5. Use **Export browser tickets** while signed in to keep a private JSON backup. Do not upload the backup into the website or Git.

A new browser queue starts empty. Previous Node/PHP tickets are untouched, not copied into this demo. The demo does not seed, reset, or delete existing tickets automatically.

## Storage and troubleshooting

- Tickets belong to this browser/profile and **this exact address**. `localhost`, `127.0.0.1`, different ports, and Ocelot use separate storage. Use the links above consistently. This is not a shared team queue.
- Do not use a private/incognito window for records you want to keep. Clearing site data or losing the browser profile can erase tickets and documents. Export first; automatic import/restore is not implemented.
- **Page cannot be reached:** start the launcher and keep its terminal open. Nothing listens at localhost just because files exist on disk.
- **Old page/PHP error:** run the launcher, open the exact port-3003 link, and press **Ctrl+Shift+R**. Do not double-click `index.html` or use the optional PHP package for this demo.
- **Port already in use:** use the existing confirmed Capstone preview if identified. Otherwise inspect/close the conflicting preview's own terminal if appropriate; do not kill unrelated applications. The launcher deliberately avoids switching ports and appearing to lose your browser queue.
- **Node.js not found:** follow [the setup guide](TEAM_SETUP_GUIDE.md), then reopen the launcher. No npm install is needed for this dependency-free demo on an already configured machine.
- **Prefer the server-backed local app?** Run `npm.cmd start` from DEVELOPMENT and use <http://localhost:3000/>. Its tickets remain in private local server storage. It is a different testing mode, not the Ocelot browser demo.

Verification on September 18: all **155 automated tests passed** with the optional PHP test enabled. A running local preview returned HTTP 200 for the assistant, staff page, browser bundle, API adapter, and transparent Roary image. Launcher tests cover rebuild/start, reuse, port conflicts, build failures, private-file exclusions, and asset serving. These checks do not replace checking the actual browser interface and persistence before presenting.
