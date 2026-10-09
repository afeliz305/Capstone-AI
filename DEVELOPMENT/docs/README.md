# Project guides

Current rename/release authority: [MIRA rename and Supabase migration plan](MIRA_RENAME_AND_SUPABASE_MIGRATION.md). It records the `/MIRA/` package, read-only Supabase audit, Staff Queue profile design, exact post-approval migration sequence, tests, and actions intentionally not performed. Dated documents may retain old paths where historically accurate.

October 8 retrieval, context, current-portal-selector, visual-density, and support-validation work is recorded in the [19-issue team retest](TEAM_RETEST_2026-10-08.md). It is the current acceptance record for Michael's and Rome's reported cases. Publication remains a separate step.

## Upload and test

- [Supabase setup and MIRA password recovery](SUPABASE_SETUP.md#forgot-your-mira-staff-password) - exact recovery callback, pending dashboard/email-template owner actions, safe reset behavior, signed-in password change, and staff authorization boundary.

- [Proof-of-concept acceptance record](PROOF_OF_CONCEPT_ACCEPTANCE.md) - completed hosted MIRA, navigation, temporary-information, authenticated ticket, attachment, privacy, and stale-edit results; includes the final capability matrix and professor-ready statement.

- [Pre-integration proof-of-concept demo](PROOF_OF_CONCEPT_DEMO.md) - current three-mode capability boundary, browser-only shared information, five-minute presentation, privacy limits, and verification steps.

- [Supabase FileZilla upload checklist](OCELOT_SUPABASE_UPLOAD.md) - shared-queue package, exact remote paths, permissions and after-upload tests. Use this instead of the browser-only steps for the Supabase release.

- [Project rename and FileZilla checklist](PROJECT_RENAME.md) - new folders, repository and intended Ocelot URL; preserve old browser queues before switching addresses.

- [Supabase shared queue setup](SUPABASE_SETUP.md) - applied SQL setup, staff provisioning, private files, local candidate, and live acceptance before upload. Check its current verification status before deployment.

- [Local presentation demo](LOCAL_DEMO.md) — one-command/double-click launch, correct links, and a short presentation flow.

- [Ocelot upload guide](OCELOT_UPLOAD_GUIDE.md) — default browser-only demo, no PHP setup; upload the inner **Capstone - AI** folder only. Includes browser-storage limitations, export, and testing.
- [Optional PHP shared queue](OCELOT_PHP_GUIDE.md) — separate explicit build; private server-storage setup remains blocked on the reported Ocelot account.
- [VS Code and teammate setup](TEAM_SETUP_GUIDE.md) — download/run the separate local project and test features.
- [Alternative Node hosting](HOSTING.md) — server/private-file placement for the Node version, not the one-folder PHP upload.

## Feature reference

- [Portal context audit and adapters](PORTAL_CONTEXT_AUDIT.md) - October 9 route/selector map, privacy classifications, My work/My rhythm/Inbox boundaries, source routing, and session-only personal-context model.
- [FARO reviewed-knowledge integration](FARO_INTEGRATION.md) - bounded use of the 15 reviewed candidates, source precedence, provenance, exclusions, navigation aliases, conflicts, and tests.
- [FARO deep knowledge audit](FARO_DEEP_KNOWLEDGE_AUDIT.md) - read-only map of FARO's visible architecture, question prompts, curated vocabulary, conflicts, MIRA gaps, navigation, privacy exclusions, and human-review requirements. Its [review dataset](faro-review-dataset.json) remains the review record; only the explicitly documented safe subset and aliases affect MIRA.
- [MIRA source coverage and acceptance](MIRA_SOURCE_COVERAGE.md) - public/course/private scope map, source authority, fifteen-question results, verified destinations and unresolved workflow-policy gaps.
- [Local private portal connector](LOCAL_PORTAL_CONNECTOR.md) - Manifest V3 installation/pairing, exact permissions, five-minute refresh, message scope, full dashboard capability matrix, MCP fallback, privacy controls and restart behavior. Development only; never upload it.
- [Indexed website knowledge and navigation](WEBSITE_INDEX.md) - public crawler, persistent snapshots, source excerpts/actions, maintenance commands, configuration, tests and limitations.
- [Messages and dashboard navigation](PORTAL_NAVIGATION.md) - 19 portal shortcuts, test prompts, explicit live-data limits and future owner-approved API requirements.
- [Portal owner handoff](PORTAL_OWNER_HANDOFF.md) - verified deep-link matrix, owner-hosted bundle, adapter/login-continuation hooks, privacy decisions, tests, and rollback.
- [Syllabus search and dashboard guidance](SYLLABUS_AND_DASHBOARD.md) - reviewed Fall 2026 content, follow-ups, date conflicts, and the still-required read-only student-record integration.
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
