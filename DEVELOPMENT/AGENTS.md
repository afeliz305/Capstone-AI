# Capstone - AI project guidance

## Project boundary

This is the standalone Capstone - AI project. Do not place its files inside HelpDesk INC or change that project's files for Capstone work.

## Folder layout and serving boundary

This file governs the `DEVELOPMENT/` application source. The outer workspace now contains only the generated `Capstone - AI/` website, this `DEVELOPMENT/` folder, and top-level guides/Git metadata. In the instructions below, application/project root means `DEVELOPMENT/`; run npm commands here. The entire local `data/` directory moved here intact as part of the user's explicit separation request; do not change its contents or move individual runtime files during further organization.

- Keep `index.html` at the root; additional HTML pages belong in `pages/`.
- Stylesheets belong in `css/`, images in `css/images/`, and fonts in `css/fonts/`.
- Browser scripts belong in `js/chat/`, `js/staff/`, or `js/shared/`; server code belongs in `server/` and `server/lib/`.
- Guides belong in `docs/`. Keep this instruction file and the GitHub entry-point `README.md` at the root.
- The npm start command runs `server/server.js`. Keep private `data/` paths and ignored files unchanged during organization work.
- The Node server uses an explicit static-file allowlist. Update it and its route tests when adding public assets; never serve the entire repository root.
- Source `index.html` uses the Node backend. The default Ocelot package explicitly selects browser-demo transport and bundles reviewed search plus IndexedDB ticket/document storage. It is not shared or secure staff authentication. Never silently fall back from a failed Node/PHP save to browser storage. Do not expose the whole checkout through a generic file server; use `preview:ocelot` for the public-only package.
- The optional Ocelot PHP variant lives in `server/php/`, packaged with `package:ocelot:php`. Maintain its frontend API contracts alongside Node/browser changes. Never bundle runtime data; PHP storage must stay outside `public_html` and fail closed on unsafe/unwritable storage. Maintain `docs/OCELOT_UPLOAD_GUIDE.md` with packaging/storage changes and keep optional PHP instructions in `docs/OCELOT_PHP_GUIDE.md`. Node and PHP login configurations are separate; PHP is currently email-demo only.
- Keep generated output separate from source: one current Ocelot website in the sibling `../Capstone - AI/` folder, prior packages preserved in `dist/archive/`, optional Node builds in `dist/node/`, build records in `dist/release-records/`, and temporary builds in `dist/staging/`. Do not put guides, manifests, npm files, tests, or local runtime data in the upload website. Use the packager to refresh it; never edit generated releases as source or delete old packages without direction. Keep `docs/README.md` as the guide index. Preserve `index.html` at the application root and the private `data/` paths relative to that root.

## Supabase mode

- Preserve the Node/browser/PHP alternatives. `package:ocelot:supabase` is explicit; failed cloud saves must never fall back to local storage. `demo:supabase` uses an isolated candidate on port 3004 and does not change the current upload folder.
- Database migrations belong in `server/supabase/`; keep them out of the public package. Migration 001 is initial-only and must abort on existing Capstone objects; do not rewrite it once applied remotely. Add subsequent migrations for deployed changes. Do not create/reset tables during app startup.
- Staff need both Supabase Auth and a manually provisioned roster user ID. No client-controlled email or metadata can grant staff access. Students use a separate anonymous Auth session on submission. Tickets and final attachments are staff-only, including internal notes; requester preview is still a staff-only filtered view.
- The ignored `server/supabase.local.json` contains only the URL and publishable key. Build validation rejects privileged keys. Shared queue code uses SDK session tokens, never persisted passwords. Keep the readiness checker read-only; cloud tests must use clearly labeled fictional data and never delete existing records.
- Use Node 22+ for the pinned Supabase SDK. PGlite tests exercise actual PostgreSQL application SQL with simulated Auth/Storage structures; headless UI checks block external requests. Neither replaces a live Supabase saving and second-session acceptance test. Maintain `docs/SUPABASE_SETUP.md`.

## Keep teammate documentation current

The user explicitly requested an ongoing guide for teammates to download, run, and test this project in VS Code.

- Treat `docs/TEAM_SETUP_GUIDE.md` as the canonical teammate onboarding/testing document.
- Maintain `docs/DEPLOYMENT_AND_INTEGRATION_PLAN.md` alongside hosting, identity, storage, integration, and release-readiness changes. Keep Ocelot fictional-data group testing separate from future official go-live requirements; distinguish implemented/verified behavior from pending work. Browser-only testers should not be required to install the project or use GitHub once hosted testing is ready.
- For changes affecting requirements, installation, scripts, ports, environment variables, authentication, ticket storage, UI labels used by the guide, or test expectations, update the guide in the same change.
- Keep README startup instructions and links consistent with the guide. Avoid personal machine paths in teammate instructions.
- Recheck the documented commands and relevant sample flows. Update the last-verified date and tested versions only for checks actually completed; report untested platforms honestly.
- Document Windows PowerShell commands with `npm.cmd` and preserve the missing-`package.json` troubleshooting guidance.
- Preserve the distinction between the local sample account and real FIU authentication, local tickets and professor email, and a recorded privacy preference and actual authorization.
- Keep test tickets, real student data, cookies, credentials, and `.env` files out of Git. Use fictional data for verification.
- The owner has given standing authorization to keep the project synchronized after completed updates. After a source change, run relevant tests, refresh the sibling `../Capstone - AI/` folder with `npm.cmd run package:ocelot:supabase` whenever public/package inputs changed, then commit and push the matching source, tests, and guides to `origin/main` unless the owner explicitly says not to. Generated releases, runtime data, tickets, attachments, credentials, local configuration, and archives remain excluded from Git.
- This standing workflow authorizes preparation of the local upload folder and GitHub backup only. It does not authorize silently transferring files to Ocelot, changing Supabase data/schema/roles, or deploying to production. FileZilla transfer remains an explicit owner action unless a separately approved deployment mechanism is configured.

Do not claim the document updates automatically in the background. Maintain it as part of future project work.
