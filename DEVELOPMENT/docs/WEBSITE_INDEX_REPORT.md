# Public website index acceptance report

Date: September 28, 2026

Scope: local release-candidate validation only. No Ocelot upload, Git push, Supabase mutation or portal-account access occurred.

## Result

The public retrieval snapshot was refreshed successfully. High-value student resources and the reviewed public FIU brand references are searchable within the bounded crawl. Large project and term archives no longer consume the priority portion of the crawl.

| Metric | Earlier snapshot | Current snapshot |
| --- | ---: | ---: |
| URLs discovered | 142 | 953 |
| Pages fetched in the run | 35 maximum | 50 |
| Active searchable pages | 34 | 34 |
| Active searchable sections | 190 | 422 |
| High-value URLs skipped | Not reported | 0 |
| Last successful refresh | September 25, 2026 | September 28, 2026 at 04:05:47 UTC |

The active-page total remains 34 because the current snapshot adds reviewed student/brand sources while changing 23 older project-catalog pages to `deprioritized`. Those records remain in the private audit index but are excluded from chat retrieval.

## Current crawl accounting

- Configured fetch limit: 50 pages.
- Configured discovery limit: 1,200 URLs.
- Discovered: 953 URLs.
- Fetched: 50 pages.
- Published: 34 active pages and 422 active sections.
- Skipped by category budget: 37.
- Skipped after the page limit: 866.
- High-value skipped: 0.
- Duplicate aliases: 3 (`index.html` aliases of the three brand pages).
- Excluded during fetch: 10. These were login/no-index pages or non-HTML image assets.
- Failures: 2. The video-guidelines and sponsor-start URLs redirected outside the approved safe scope and were blocked.

`npm.cmd run index:status` is the authoritative machine-readable report. Counts can change when the source websites change.

## Priority and source findings

The crawl gives explicit priority to the Capstone homepage, Resources, Tutorials, Showcase, About, Engage, Sponsor and Judge pages. Project-detail pages are capped at 12 and project-result query pages at 4. Remaining term/archive permutations are reported instead of silently consuming the crawl budget.

The current public index also permits only these external FIU Brand paths:

- `https://brand.fiu.edu/visual-styles/colors/`
- `https://brand.fiu.edu/logos/`
- `https://brand.fiu.edu/downloads/`

Other `brand.fiu.edu` paths, lookalike hosts, HTTP links, credentials in URLs, portal pages and private paths remain rejected.

The Capstone public Resources HTML does not expose the sprint-minute files as normal page content. The application therefore uses explicit reviewed public-document entries for the official Sprint Planning, Daily Scrum, Sprint Review and Sprint Retrospective Word templates plus the Capstone usage guide. Each document returned HTTP 200 with a Word document content type during this acceptance pass. The answer does not claim an unsupported Backlog Grooming template.

Natural questions about FIU colors, logos, brand downloads, PowerPoint templates and presentation templates route to reviewed public FIU Brand sources before generic indexed retrieval. The authenticated **Open Brand & templates** request remains a separate portal-navigation shortcut.

## Safety boundaries

- Public HTTP GET requests only; no browser cookies, portal session, Authorization header or form submission.
- No portal messages, grades, team records, personal dashboard data or Canvas records are indexed.
- No Supabase reads or writes are needed for public content search.
- Source URLs are validated again before the chat renders a link.
- The live website is never crawled in response to an end-user question; the packaged client uses the frozen reviewed snapshot.
- This is extractive keyword retrieval with reviewed intent routing, not a paid model or semantic embedding service.

## Acceptance checks

The release candidate must pass:

```powershell
npm.cmd run index:status
npm.cmd test
npm.cmd run package:ocelot:supabase
```

Then serve the generated **Capstone - AI** folder locally and verify the popular-topic buttons, natural FIU brand questions, sprint questions, showcase/resources answers, portal navigation-only shortcuts, favicon, mobile layout and absence of console/network errors. Deployment and Git publication require a separate explicit instruction.

Final local result:

- Full suite: 298 tests discovered; 297 passed, 0 failed, and 1 optional PHP-host integration test skipped.
- Generated Supabase/Ocelot package: `dist/release-records/ocelot-upload-mfovxi` (24 files, 4,923,599 bytes, all checksums verified).
- Browser acceptance: Sprint minutes, Brand & templates, natural color/logo/presentation questions, Showcase, Sprints 1-5, Grade/Team/Standing/Messages navigation, Brand portal navigation and the fictional shared-information sample all returned the expected reviewed result.
- Favicon: HTTP 200 with `image/svg+xml`.
- Mobile viewport: 390-pixel viewport and 390-pixel document width; no horizontal overflow.
- Browser diagnostics: no console errors, page errors, failed requests or HTTP errors during the acceptance path.
