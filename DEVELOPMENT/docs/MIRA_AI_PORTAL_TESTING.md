# MIRA AI and portal-context testing

Status: local owner-review candidate, November 12, 2026. No deployment, paid AI call, portal write, Supabase change, commit, or push is part of this test plan.

## Safety boundary

- Public/FARO retrieval is reviewed, source-linked, and safe for the deterministic or mock assistant.
- The local portal connector is development-only, read-only, user-selected, memory-only, and time-limited.
- Portal-derived context is marked `externalEligible: false`. The browser gateway refuses to send it to `/api/ai`, even if gateway mode is requested.
- No assistant action submits a stand-up, changes a card, approves evidence, verifies work, or moves status.
- Live OpenAI remains disabled unless both provider gates are deliberately enabled in an approved environment.

## Local commands

From `DEVELOPMENT`:

```powershell
npm.cmd install
npm.cmd start
node --test test/team-workspace.test.js test/ai-gateway.test.js test/mira-personal-context.test.js test/portal-local.test.js test/cloudflare-package.test.js
npm.cmd run test:workspace:ui
npm.cmd test
```

Use `npm.cmd run demo:portal` only for an attended local connector test. It is not part of the public package.

## Workspace acceptance

1. Open the Sprint Workspace and switch between team and individual views.
2. Filter cards and select an allowed card.
3. Confirm description, sprint, owner, status, dependency, blocker, review requirement, evidence, and reviewed sources are visible.
4. Confirm the six progress stages are distinct: work completed, evidence prepared, evidence submitted, verified, accepted, and done.
5. Exercise all seven draft actions: explain, next steps, progress, missing items, evidence preparation, teammate handoff, and review readiness.
6. Confirm every result remains a draft or recommendation and never claims portal approval or mutation.
7. Draft a stand-up, Sprint Review, and Retrospective; confirm no submit control exists.

## Local portal refresh acceptance

1. With no connector, confirm **Refresh current authorized context** is disabled and the audited snapshot remains labeled as a snapshot.
2. Connect an approved portal tab through the existing local connector.
3. Confirm the button becomes available and retrieves only the deliberately requested, authorized context.
4. Confirm the result is temporary, source-labeled, and not merged into public search or the static card snapshot.
5. Disconnect or let the five-minute lease expire; confirm the temporary result clears.
6. Confirm no portal-derived content reaches the AI gateway, Supabase, tickets, logs, or files.

## AI gateway acceptance

The default and preview modes are mock/deterministic. Test accepted tasks, citation allowlisting, malformed inputs, private-data rejection, external-ineligible short-circuiting, body limits, timeouts, output-token limits, throttling, and deterministic failure fallback.

The function's in-memory per-isolate throttle reduces accidental bursts but is not a global hard budget. Before live activation, require a MIRA-owned OpenAI project, provider-side project budget/usage limits, Cloudflare abuse controls or durable accounting, monitoring, and an owner-approved incident/rotation plan.

## Expected result

Both assistant entry points use the same reviewed retrieval and draft logic. Course/FARO guidance remains grounded. Personal data remains local-only. Failure returns deterministic guidance, never a false success or hidden portal write.
