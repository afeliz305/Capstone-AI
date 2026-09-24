# Capstone - AI workspace

This outer folder is an organizing container, not the app server root. Keep this project separate from HelpDesk INC.

- `Capstone - AI/` is the generated, upload-ready website. The default is an explicitly labeled browser-only test queue; `package:ocelot:php` builds the optional PHP shared queue instead. Its `index.html` is at that folder's root. This is the only folder to upload into Ocelot's `public_html`.
- `DEVELOPMENT/` contains the editable source, local Node app, documents, tests, scripts, private local data, and generated archives. Read [DEVELOPMENT/AGENTS.md](DEVELOPMENT/AGENTS.md) before editing it. Run npm commands from `DEVELOPMENT`, where `package.json` lives.
- Keep `.git`, `.gitignore`, this guidance, and the short README at the outer root. Preserve Git history. Keep both private runtime data and generated output ignored.
- Do not edit the upload folder as source. Rebuild it with `npm.cmd run package:ocelot` from `DEVELOPMENT`; the packager preserves the previous release under `DEVELOPMENT/dist/archive/ocelot/`.
- Supabase is a separate explicit mode: `demo:supabase` builds an isolated candidate on port 3004 without changing the upload folder; `package:ocelot:supabase` prepares the shared version after live acceptance. Follow `docs/SUPABASE_SETUP.md`. Never claim a local SQL/unit test proves a hosted save. Keep secret keys/passwords out of all bundles; only the publishable key and project URL may be embedded.
- Keep `DEVELOPMENT/docs/TEAM_SETUP_GUIDE.md`, `DEVELOPMENT/docs/OCELOT_UPLOAD_GUIDE.md`, and `DEVELOPMENT/docs/DEPLOYMENT_AND_INTEGRATION_PLAN.md` current with relevant changes. Do not claim background automatic document updates.
- Never upload the outer workspace or `DEVELOPMENT`. Never delete or publish runtime tickets, credentials, attachments, or old packages during organization work. Remote cleanup/deployment and Git pushes require user direction.
