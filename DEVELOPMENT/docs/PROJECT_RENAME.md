# Capstone - AI rename and upload

September 24, 2026. The project replaces its mascot launcher with an original generic chat-bubble SVG. The project and generated upload folder are now **Capstone - AI**; the GitHub repository is [afeliz305/Capstone-AI](https://github.com/afeliz305/Capstone-AI). The repository rename does not commit or push local source changes.

## Local project

**Outer folder rename pending on the owner's PC:** Windows denied renaming the desktop `Capstone AI Chat` workspace while it was in use. The inner upload folder is already `Capstone - AI`. Until the outer rename is completed, keep using `Capstone AI Chat/DEVELOPMENT`; do not create a duplicate project or move its private data separately. Close windows using the old workspace, then rename only the outer folder to `Capstone - AI` in File Explorer. The final layout will be:

```text
Capstone - AI/             outer workspace: do not upload
  Capstone - AI/           upload this generated website only
    index.html
    css/
    js/
    pages/
  DEVELOPMENT/             source, documents, tests, private data
```

Reopen the `DEVELOPMENT` folder in VS Code after renaming. Run `npm.cmd start` there for the Node app at <http://localhost:3000/>, or `npm.cmd run demo` for [the browser-only demo](http://127.0.0.1:3003/Capstone%20-%20AI/). Restart old terminals rather than running commands from their former path.

Private Node tickets, attachments, credentials, and Supabase configuration stay unchanged inside DEVELOPMENT. Stored email-key prefixes and database identifiers are deliberately unchanged; they are compatibility identifiers, not visible branding. The rename does not reset, migrate, or synchronize tickets.

## Ocelot: FileZilla steps

No Ocelot files were renamed or uploaded by this change: non-interactive SSH authentication was unavailable.

1. Connect with your usual FileZilla Quickconnect and open `public_html` on the remote side.
2. Before changing the old address, export any browser-only tickets there with **Export browser tickets**. Keep the export privately; it may contain attachments. Automated import/restore is not implemented.
3. On the local side, open the outer workspace (still `Capstone AI Chat` until Windows allows its rename) and upload only its inner **Capstone - AI** website folder. The current generated release is the browser-only demo. It does not activate shared Supabase storage.
4. Upload into a new remote `public_html/Capstone - AI` folder. If that name already exists, inspect and privately preserve it before replacing anything. Do not merge with an old development/source upload, and do not delete tickets or access-protection files.
5. For this public website only, use directories `755` and files `644`; never `777`.
6. Open [the new assistant address](https://ocelot.aul.fiu.edu/~afeli016/Capstone%20-%20AI/) and [staff queue](https://ocelot.aul.fiu.edu/~afeli016/Capstone%20-%20AI/pages/staff.html). These are the intended addresses, **not a verified deployment**. Hard-refresh and follow the upload-guide test checklist.
7. After preserving needed data and verifying the new site, retire the old remote copy outside `public_html`. Keep any old PHP storage private and unchanged. Updating bookmarks is separate from moving server data.

## Existing tickets and the old address

Browser-demo data is scoped by origin and folder URL. The new folder starts a separate queue; an empty list does not mean the old records were deleted. The local preview keeps the old [browser-demo address](http://127.0.0.1:3003/Capstone%20AI%20Chat/) available, without redirecting it, so that the same browser can export its old queue. Use the exact original host/port/browser profile. This compatibility route does not create an Ocelot redirect or import data at the new address.

An optional PHP deployment uses a folder-specific private store. Renaming its public folder is not a data migration. Supabase table names, Auth roster bindings, bucket names, and migrations were not changed by this branding update; hosted saving remains unverified until the [Supabase acceptance steps](SUPABASE_SETUP.md) pass.

## Retired artwork

The old mascot PNG and HTML preview are archived locally under ignored `DEVELOPMENT/dist/archive/branding/`. They are no longer in the active public asset allowlist or new upload packages. Older release archives and existing Git history are preserved. The FIU header mark remains unchanged and still needs institutional review before official use.

## Verification

September 24: `npm.cmd test` passed **171 tests, zero failures/skips**, including optional local PHP checks with PHP 8.4.25. Tests use fictional isolated stores. `npm.cmd run test:branding:ui` passed in headless Edge at 1280px, 390px, and 320px: new SVG loading, names, initial minimization, keyboard opening, minimize/Escape, focus restoration, draft retention, layout bounds, staff title, and retired asset exclusion. Screenshots were inspected. All external requests were blocked; no test tickets or cloud accounts were created. `npm.cmd test` now explicitly selects `test/*.test.js`, so it does not discover the opt-in live Supabase command as an automated test.

The renamed workflow PDF was rebuilt and visually checked. These checks do not prove live Ocelot deployment, shared Supabase saving, or automatic data backup.
