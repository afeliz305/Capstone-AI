# Capstone - AI — start here

Renamed September 24, 2026. See [the rename and FileZilla checklist](DEVELOPMENT/docs/PROJECT_RENAME.md) before switching URLs: browser-only tickets do not automatically follow a folder rename. The current upload is still the browser demo, not an activated Supabase release.

Owner's existing PC only: Windows is still blocking the outer desktop folder rename; it currently remains `Capstone AI Chat`. The inner upload folder is already **Capstone - AI**. This does not affect fresh clones or ZIP downloads. Keep working in the existing `DEVELOPMENT` until the outer folder can be renamed; do not create another copy.

There are two sections:

**First download:** install Node.js 22+ and open `DEVELOPMENT` in VS Code. Run `npm.cmd ci`, then `npm.cmd run demo`. The generated upload folder is excluded from Git and is created by the demo/build command; its absence immediately after cloning is expected. See [the teammate setup guide](DEVELOPMENT/docs/TEAM_SETUP_GUIDE.md).

**Local demo:** double-click [Start Capstone Demo.cmd](DEVELOPMENT/scripts/Start Capstone Demo.cmd), or run `npm.cmd run demo` from `DEVELOPMENT`. Then open [the demo](http://127.0.0.1:3003/Capstone%20-%20AI/). It rebuilds and starts the browser-only version; keep its terminal open. [Presentation checklist](DEVELOPMENT/docs/LOCAL_DEMO.md).

| Folder | What it contains | Upload to Ocelot? |
| --- | --- | --- |
| **Capstone - AI** | Browser-only test website: `index.html`, `css`, `js`, and `pages` | **Yes — upload this inner folder only** |
| **DEVELOPMENT** | Editable source, guides in `docs`, tests, scripts, local tickets, and archived packages | **No — keep on your computer** |

In FileZilla, open the inner **Capstone - AI** folder on the left and confirm it contains `index.html`, `css`, `js`, and `pages`, not `package.json`, `server`, or `data`. Upload that whole inner folder into `public_html`. Do not upload this outer organizing folder. The default package no longer needs an `api` directory or PHP setup.

The intended remote entry point is `public_html/Capstone - AI/index.html`; it has not been uploaded or verified by this update. The detailed [upload instructions](DEVELOPMENT/docs/OCELOT_UPLOAD_GUIDE.md) explain permissions and the browser test. Earlier screenshots showed a full-project upload under the former `Capstone AI Chat` name: privately preserve needed records before retiring that old copy outside the public web directory. Do not merge the clean release into old development files or blindly delete tickets/access-protection files.

For local development, open **DEVELOPMENT** in VS Code. Run npm commands there, not in this outer folder. To rebuild the upload website:

```powershell
cd .\DEVELOPMENT
npm.cmd run package:ocelot
```

The command refreshes the sibling **Capstone - AI** upload folder and archives the previous version without deleting it. Generated website files, local tickets, and archives are excluded from Git. The hidden Git files and `AGENTS.md` at this outer level are development metadata, not website files.

**No SSH/PHP setup is needed for this default browser demo.** Tickets and documents stay in each browser at the same site address; teammates do not share one queue. Clearing browser data can erase them. Use **Export browser tickets** to download a backup. The existing Node/PHP stores are preserved, not imported or synchronized. For local static testing run `npm.cmd run preview:ocelot` from `DEVELOPMENT`, then open <http://127.0.0.1:3003/Capstone%20-%20AI/>.

The original Node app remains available with `npm.cmd start` at <http://localhost:3000/>. The optional shared PHP variant can be built explicitly with `npm.cmd run package:ocelot:php`; its host storage restriction is unresolved. See [the PHP guide](DEVELOPMENT/docs/OCELOT_PHP_GUIDE.md). Neither switching versions nor uploading HTML creates a shared backend automatically.

[All documents](DEVELOPMENT/docs/README.md) · [VS Code setup](DEVELOPMENT/docs/TEAM_SETUP_GUIDE.md) · [Future official integration](DEVELOPMENT/docs/DEPLOYMENT_AND_INTEGRATION_PLAN.md)

This is fictional-data testing only. Staff access is temporarily email-only, not verified FIU authentication. Local organization does not upload, repair, or delete anything on Ocelot.
