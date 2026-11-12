# Reviewed public release index

`public-index.json` is the public projection of the approved crawler snapshot, version `2026-09-28T04-05-04-164Z-2df7f540`, indexed September 25–28, 2026. It preserves 34 public Capstone/FIU Brand pages and their source IDs, URLs, timestamps, passages, and citation anchors. Historical project/showcase pages retain their term labels; this snapshot is not current private portal information. Fall 2026 syllabus and reviewed FARO guidance remain separate curated sources.

The source was `loadPublicIndex()` from the local website-index store, which excludes inactive records and runtime bookkeeping. No authenticated crawl, browser session, staff queue, or private portal snapshot is included. CI reads only this versioned public projection, never the ignored runtime directory. `scripts/release-index.js` pins the canonical LF-normalized SHA-256 and validates schema/provenance. Missing or changed inputs fail the build.

Canonical SHA-256: `3b6ad9ad2e48c59cfb64c12226c411c23aad8a2f6f509e5c8eae1a645b22dbe4`.

Refreshes require review of public source changes and a deliberate checksum update. Do not run authenticated crawling in CI or copy the entire runtime directory here.
