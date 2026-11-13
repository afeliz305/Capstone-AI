> November 13 public AI update: owner approved anonymous visitor traffic within the existing $25 cumulative ceiling. See [public AI behavior, privacy and operator controls](PUBLIC_AI_OPERATIONS.md). Live mode requires the expiring durable activation gate; Course Knowledge remains the fallback. Earlier tester-only restrictions describe prior releases.

# MIRA browser-only experience

## Student guide

Open https://mira-9gg.pages.dev/ directly. No extension, pairing code, local helper or installation is required. Ask in the dashboard composer or floating chat; both use the same knowledge and source rendering.

Course/FARO answers use reviewed knowledge. Approved public Resources, Tutorials, Privacy, About and Engage pages can provide current excerpts with retrieval time and original links. Failed public retrieval falls back to labeled reviewed knowledge; it does not invent current facts.

Personal grades, current cards, submitted stand-ups, meetings, deadlines, standing and messages remain in the official authenticated FIU portal. Relevant answers link to the reviewed destination and explain the missing FIU-approved integration in a readable development note. Grades need separate grade-specific approval. No unusable connection button is offered.

Team Workspace contains a labeled historical snapshot. Its evidence checks, stand-up drafts, Sprint Review and Retrospective preparation are draft-only and do not submit or change portal records.

## Architecture and AI

Student browser → Cloudflare Pages → reviewed knowledge / approved public retrieval → sourced answer. An authorized, expiring demonstration session can use GPT-6.1 Sol through the existing server-side Function, encrypted secret, shared $25 ledger, atomic reservations, usage reconciliation, rate/token limits and operator kill switch. Ordinary public access remains deterministic/mock. No private portal information, grades or staff records may enter OpenAI.

The controlled AI demonstration does not depend on the portal connector. Its operator workflow and fixed approved public questions are documented in [the AI demo guide](INTEGRATED_AI_DEMO.md). No new billable calls are authorized by this browser-only release.

Supabase remains responsible for staff authentication, bound staff authorization, tickets and private attachments. Browser-only does not mean browser-local ticket storage or anonymous staff access.

## Future institutional integration

The official portal remains authoritative. A future portal-native or institution-approved read-only service must enforce the authenticated student's scope, freshness, revocation and account isolation. See [owner handoff](PORTAL_OWNER_HANDOFF.md) and [grade approval contract](GRADE_INTEGRATION_APPROVAL.md). No institutional permission is claimed.

The extension and loopback helper are retained as internal research tooling and evidence only. They are excluded from public packages and are not a student setup path. Earlier local-pairing instructions in development records are historical, not deployment requirements.

## Deployment and verification

Publish only reviewed source on `preview/mira-cloudflare`; preserve `main`, Supabase and Ocelot. Build using `npm ci` and `npm run package:cloudflare` with the approved public Cloudflare origin and public Supabase build variables. No private configuration, credentials or runtime records belong in the output. Verify the clean-build manifest against the actual immutable deployment before claiming success.

Acceptance must distinguish signed-out Staff Queue rendering and read-only Supabase connectivity from an attended authenticated queue test. Never substitute fictional fixtures for live private data. Current execution evidence is in the ignored release record under `dist/presentation/`.
