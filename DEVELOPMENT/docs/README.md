# Project guides

## Upload and test

- [Project rename and FileZilla checklist](PROJECT_RENAME.md) - new folders, repository and intended Ocelot URL; preserve old browser queues before switching addresses.

- [Supabase shared queue setup](SUPABASE_SETUP.md) - SQL migrations, staff provisioning, private files, local candidate, and live acceptance before upload. Source integration exists; hosted setup must still be completed.

- [Local presentation demo](LOCAL_DEMO.md) — one-command/double-click launch, correct links, and a short presentation flow.

- [Ocelot upload guide](OCELOT_UPLOAD_GUIDE.md) — default browser-only demo, no PHP setup; upload the inner **Capstone - AI** folder only. Includes browser-storage limitations, export, and testing.
- [Optional PHP shared queue](OCELOT_PHP_GUIDE.md) — separate explicit build; private server-storage setup remains blocked on the reported Ocelot account.
- [VS Code and teammate setup](TEAM_SETUP_GUIDE.md) — download/run the separate local project and test features.
- [Alternative Node hosting](HOSTING.md) — server/private-file placement for the Node version, not the one-folder PHP upload.

## Feature reference

- [Staff access and assignments](STAFF_ACCESS.md)
- [Account integration](ACCOUNT_INTEGRATION.md)
- [Document attachments](DOCUMENT_ATTACHMENTS.md)
- [Design reference](DESIGN_REFERENCE.md)
- [Generic chat icon](../css/images/capstone-chat.svg) - original, code-drawn speech bubble; no mascot image or external icon dependency. See the design reference.
- [Mulish font license](licenses/Mulish-OFL.txt)

## Planning and official integration

- [Project workflow and technology sheet](PROJECT_WORKFLOW.md) - diagrams, build tools, current storage, planned Supabase, and languages. [Printable PDF](output/pdf/Capstone_AI_Workflow.pdf).

- [Project plan](CAPSTONE_AI_PROJECT_PLAN.md)
- [Shared testing and future go-live](DEPLOYMENT_AND_INTEGRATION_PLAN.md)

## Folder rules

The outer workspace has two sections: **Capstone - AI** is the generated upload website; **DEVELOPMENT** holds everything else. Inside `DEVELOPMENT`, keep the source `index.html` at the app root, other pages in `pages/`, styles/images/fonts in `css/`, scripts in `js/`, backend code in `server/`, maintenance commands in `scripts/`, tests in `test/`, and documents in `docs/`. The entire private local `data/` folder moved intact here. The generated website also has its own root `index.html`; never upload the outer workspace or `DEVELOPMENT`.

Generated files have separate locations:

- `../Capstone - AI/` — the sibling generated website and the only folder to upload. It has no development guides or checksum manifest.
- `dist/archive/ocelot/` — previous current releases, retained intact when rebuilding.
- `dist/archive/legacy/` — the older randomly named PHP/Node packages moved during the September 16 cleanup. These are recoverable local copies, not current upload instructions.
- `dist/node/` — optional Node hosting packages.
- `dist/staging/` — temporary build work.
- `dist/release-records/` — build instructions and checksum manifests, kept outside the website. A failed publish may leave a candidate website here; do not upload it as the current release.

Generated releases/archives are ignored by Git and never served by the local Node app. Do not edit a generated release as the source of truth: edit the source and rebuild. Packaging never changes local runtime data or Ocelot's remote files. Before remote cleanup, privately preserve any needed records from older full-project uploads; do not delete tickets or remove access-protection rules blindly.
