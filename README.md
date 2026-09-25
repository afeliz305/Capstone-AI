# Capstone - AI — start here

Renamed September 24, 2026. The owner uploaded the **Supabase shared test queue** with the latest chat, syllabus and staff features. All 21 hosted public files match the prepared release, and live chat/syllabus checks passed. A ticket save/read-back from Ocelot still needs testing; no GitHub push has been performed. See the [Supabase checklist and verification](DEVELOPMENT/docs/OCELOT_SUPABASE_UPLOAD.md). Old browser-only tickets do not automatically follow a folder rename or migrate to Supabase; see [the rename checklist](DEVELOPMENT/docs/PROJECT_RENAME.md).

Owner's existing PC only: Windows is still blocking the outer desktop folder rename; it currently remains `Capstone AI Chat`. The inner upload folder is already **Capstone - AI**. This does not affect fresh clones or ZIP downloads. Keep working in the existing `DEVELOPMENT` until the outer folder can be renamed; do not create another copy.

There are two sections:

**First download:** install Node.js 22+ and open `DEVELOPMENT` in VS Code. Run `npm.cmd ci`. The generated upload folder is excluded from Git and is created by a build command; its absence immediately after cloning is expected. For the shared version, configure the public Supabase connection using [the setup guide](DEVELOPMENT/docs/SUPABASE_SETUP.md), then run `npm.cmd run demo:supabase`. See [the teammate setup guide](DEVELOPMENT/docs/TEAM_SETUP_GUIDE.md).

**Shared local preview:** run `npm.cmd run demo:supabase` from `DEVELOPMENT`, then open [the preview](http://127.0.0.1:3004/Capstone%20-%20AI/). Keep its terminal open. It builds an isolated candidate and does not replace the upload folder. The separate `demo` command / [Start Capstone Demo.cmd](DEVELOPMENT/scripts/Start Capstone Demo.cmd) builds browser-only mode and replaces that folder; do not run it when preparing a Supabase upload.

| Folder | What it contains | Upload to Ocelot? |
| --- | --- | --- |
| **Capstone - AI** | Supabase test website: `index.html`, `css`, `js`, and `pages` | **Yes — upload this inner folder only** |
| **DEVELOPMENT** | Editable source, guides in `docs`, tests, scripts, local tickets, and archived packages | **No — keep on your computer** |

In FileZilla, open the inner **Capstone - AI** folder on the left and confirm it contains `index.html`, `css`, `js`, and `pages`, not `package.json`, `server`, or `data`. Upload that whole inner folder into `public_html`. Do not upload this outer organizing folder. The default package no longer needs an `api` directory or PHP setup.

The verified remote entry point is `public_html/Capstone - AI/index.html`; [open the uploaded assistant](https://ocelot.aul.fiu.edu/~afeli016/Capstone%20-%20AI/index.html). The [Supabase upload instructions](DEVELOPMENT/docs/OCELOT_SUPABASE_UPLOAD.md) explain permissions and remaining hosted tests. Earlier screenshots showed a full-project upload under the former `Capstone AI Chat` name: privately preserve needed records before retiring that old copy outside the public web directory. Do not merge clean releases into old development files or blindly delete tickets/access-protection files.

For local development, open **DEVELOPMENT** in VS Code. Run npm commands there, not in this outer folder. To rebuild the upload website:

```powershell
cd .\DEVELOPMENT
npm.cmd run package:ocelot:supabase
```

The command refreshes the sibling **Capstone - AI** upload folder and archives the previous version without deleting it. Generated website files, local tickets, and archives are excluded from Git. The hidden Git files and `AGENTS.md` at this outer level are development metadata, not website files.

**No SSH/PHP setup is needed for this Supabase build.** Confirmed tickets/documents are shared online; provisioned staff require their project email/password. Local preview and Ocelot use the same Supabase project but need separate sign-ins. Existing browser/Node/PHP stores are preserved, not imported or synchronized. Shared storage is not an independent backup. See the setup guide for remaining access and release checks.

The original Node app remains available with `npm.cmd start` at <http://localhost:3000/>. The optional shared PHP variant can be built explicitly with `npm.cmd run package:ocelot:php`; its host storage restriction is unresolved. See [the PHP guide](DEVELOPMENT/docs/OCELOT_PHP_GUIDE.md). Neither switching versions nor uploading HTML creates a shared backend automatically.

[All documents](DEVELOPMENT/docs/README.md) · [VS Code setup](DEVELOPMENT/docs/TEAM_SETUP_GUIDE.md) · [Future official integration](DEVELOPMENT/docs/DEPLOYMENT_AND_INTEGRATION_PLAN.md)

This is fictional-data testing only. Supabase staff access requires Auth plus an active roster binding; it is not FIU SSO. The optional Node/browser/PHP demos still use email-only access. Local packaging does not upload, repair, or delete anything on Ocelot.
