# Cloudflare integrity repair — November 12, 2026

Candidate only; no commit, push, deployment, Supabase change, or provider activation.

## Reproduced bundle cause

The approved local Supabase bundle is 1,121,912 bytes. The hosted bundle is 387,311 bytes with SHA-256 `7c5587f2a45d50c83c88f5b933563a1ffd977495f4ea2e2f56b46247b30abb19`.

Calling the existing bundler with the same public configuration and an explicit null website index reproduces the hosted bytes exactly. Local packaging implicitly reads the ignored `server/website-index/runtime/current.json`; a clean Git checkout lacks it and previously substituted null. The outputs are not semantically equivalent: the hosted bundle lacks the local indexed website evidence. Curated course/FARO guidance still works.

Packaging now fails explicitly when this index is absent. This prevents silent knowledge loss but intentionally blocks clean CI builds until a reviewed, reproducible public-index input is supplied. Do not publish the entire runtime directory. The owner must approve a sanitized public snapshot or a controlled build-artifact supply process with a pinned checksum. This repair does not revise the manifest to bless reduced knowledge.

## Reproduced recovery cause

The immutable deployment returns 308 from `/pages/recover.html` to `/pages/recover`. The 308 has `Cache-Control: no-store`; the final static 200 has `public, max-age=0, must-revalidate`. The source has only an API AI Function, with no recovery Function or middleware. The exact extensionless route was missing from `_headers`.

The generated headers now cover both routes. Hosted confirmation must wait for a separately approved correction deployment. No recovery callback or authentication code is changed.

## Remaining release gates

- Independently inspect the Cloudflare full commit SHA, deployment ID, branch, build command/root/environment and logs using authenticated dashboard access. The browser access host and CLI credentials were unavailable during prior verification.
- Approve and supply the reviewed public index to clean CI, preserving source provenance and excluding private records.
- Verify both recovery response hops after deployment.
- Complete attended Staff Queue and remaining hosted acceptance. Do not send reset emails.

## Follow-on restoration

The owner authorized a versioned public-only index. `knowledge/public-index.json` now preserves the exact approved public projection; `scripts/release-index.js` validates its pinned checksum, schema, required page count, source URLs and timestamps. Cloudflare packaging uses this input independently of local runtime files. Both recovery routes retain the no-store correction. No reduced-knowledge manifest is accepted.

OpenAI remains mock-only. Credential ownership, project authorization, financial responsibility, actual model availability, budget enforcement and external processing approval remain owner-controlled prerequisites. No credential is requested in chat or configured by this change. The existing per-isolate limiter is not a durable global cap. A separately provisioned centralized limiter/accounting service and provider-side limits require validation before activation.

Generated text assets are normalized to LF to eliminate Windows checkout line-ending differences. An isolated clone with freshly installed lockfile dependencies and only the intended repair overlay produced the same 33-file, 5,168,275-byte package as local development. Manifest SHA-256: `f624d3c3cf89b665fb70541e9b3383150610e362e4e522a2a6040c47fe3eb3f0`.

The owner confirms that the classmate owns the OpenAI project and authorizes MIRA use. Payment responsibility, maximum budget, accessible model, monitoring/limits, exact workload authorization and permitted data remain unconfirmed. Live calls must remain disabled. The actual Pages Function is exercised locally with mock requests and an external-fetch tripwire; no key is needed for these tests.

Authenticated Cloudflare configuration inspection and hosted acceptance remain pending access. The current task authorizes correction publication after local checks; no new permission is needed to push the correction branch. Live AI activation is a separate decision.
