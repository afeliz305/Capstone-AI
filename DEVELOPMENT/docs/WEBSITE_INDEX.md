# Indexed website knowledge and source navigation

Updated September 25, 2026. This feature is implemented in development and the isolated Supabase preview. **The stable upload folder, Ocelot website and GitHub have not been updated for this feature.** Existing tickets, attachments, staff accounts and private `data/` were not changed.

## Scope and current verification

The request's `[WEBSITE_URL]` placeholder is interpreted as **https://capstone.cs.fiu.edu/**, the previously selected project site. Only anonymously accessible, configured public pages are indexed. This does **not** connect the logged-in portal, private messages, personal grades or Canvas records. The 19 [portal shortcuts](PORTAL_NAVIGATION.md) remain navigation-only.

The first successful bounded live crawl on September 25 saved **34 active public pages and 190 sections**, reaching its 35-page request limit. One `/go/attend` destination was excluded for login/no-index content. The crawl discovered 142 URLs, so this is **not a complete index of every project/archive page**. Use `index:status` for the current run rather than treating these recorded counts as permanent.

The final full suite passed **237 tests, zero failures and zero skips**, including optional PHP integration with PHP 8.4.25, on Node 24.15.0/npm 11.12.0. Deterministic fixtures cover retrieval and lifecycle behavior separately from the live smoke test. Chrome verified: type a project-proposal question, view its extracted passage/date, click the source link, and type **Take me there**. Both navigation actions opened `https://capstone.cs.fiu.edu/engage#lanes`, whose existing container includes the proposal heading; the original chat remained open. No portal form was submitted. A second live refresh completed at 12:31:49 UTC and recognized all 34 pages as unchanged; the active section count remained 190. It again excluded the login/no-index destination and reported no fetch failures.

## Architecture and files

`public website → owner-run crawler → versioned disk index → existing chat search → source excerpts + validated navigation`

This is **extractive keyword retrieval**, not AI answer generation or embedding-based semantic search. No AI provider is configured, no embeddings are fabricated, no model/API key is required, and no paid AI tokens are used. Configurable aliases and limited spelling tolerance improve lexical retrieval but do not amount to semantic search. Prices, dates and availability in source excerpts are historical indexed statements, not live checks.

| Component | Location and purpose |
| --- | --- |
| Crawl configuration | `server/website-index/config.json`: one site, origin/path/query allowlists, exclusions, budgets, aliases and thresholds |
| Safe HTTP policy | `server/website-index/policy.js`: HTTPS GET only, public-address DNS checks/pinning, request deadlines and URL validation |
| HTML/XML extraction | `server/website-index/extract.js`: titles, descriptions, headings, lists, tables, FAQ data, breadcrumbs, verified anchors and source text |
| Refresh lifecycle | `server/website-index/crawl.js`: robots, nested sitemaps, links, concurrency/backoff, validators, hashes and status transitions |
| Durable storage | `server/website-index/store.js`: validation, exclusive refresh lock, retained versions, atomic publication and safe public projection |
| Retrieval | `server/lib/index-search.js`, integrated through `server/lib/search.js`: shared pure snapshot search and source-ID resolution |
| Chat UI | `js/chat/capstone-chat.js` and `css/styles.css`: plain-text excerpts, citations, dates, choices and navigation actions |
| Mode integration | Node server; browser/Supabase adapters and bundlers; optional PHP `js/shared/php-search-entry.js` |
| Maintenance commands | `scripts/website-index.js`; npm commands in `package.json` |
| Regression tests | `test/website-index.test.js`, `test/fixtures/indexed-site.js`, and indexed UI cases in `test/chat-popup.test.js` |

Added pinned dependencies: **cheerio 1.2.0** for HTML/XML parsing, **robots-parser 3.0.1** for robots rules, and **ipaddr.js 2.5.0** for special/private address classification. Existing Node APIs provide HTTPS, files, hashing and scheduling; existing esbuild packages the shared code. There is no new database or Supabase migration. References: [Cheerio parsing](https://cheerio.js.org/docs/basics/loading/), [robots-parser](https://github.com/samclarke/robots-parser), [ipaddr.js](https://github.com/whitequark/ipaddr.js).

## Configure, index, refresh, run and test

Open **DEVELOPMENT** in VS Code. These commands require Node 22+ and an authenticated OS account with write access to the private index directory. They do not require a browser login or FIU password.

```powershell
Test-Path .\package.json
npm.cmd ci
npm.cmd run index:site
npm.cmd run index:status
npm.cmd start
```

The first command must return **True**. Run commands separately and stop on errors. Open <http://localhost:3000/>. The Node runtime reads the currently published disk snapshot on each search; it never fetches the website in response to a student question. Existing course-specific syllabus rules and explicit disconnected-account guidance remain separate reviewed sources. Other website questions use the active crawl index once one has been built. If no snapshot exists, the older reviewed knowledge search still works; it is not evidence that crawling succeeded.

```powershell
# Owner-authorized incremental refresh and status
npm.cmd run index:refresh
npm.cmd run index:status

# Isolated Supabase preview; does not replace the stable upload folder
npm.cmd run demo:supabase

# Full deterministic regression suite
npm.cmd test

# Index/security/retrieval tests only
node --test test/website-index.test.js test/chat-popup.test.js
```

Open the shared-mode preview at <http://127.0.0.1:3004/Capstone%20-%20AI/>. Stop an older agent/demo terminal with Ctrl+C before rebuilding on that port, and refresh the browser after rebuilding. Existing Supabase configuration is still needed for this preview; indexing itself does not require it.

### Environment variables

**None are required** for the default FIU public-site crawl. Defaults use the tracked configuration and the ignored `server/website-index/runtime/` directory, which the web server does not serve.

- `CAPSTONE_INDEX_CONFIG`: optional absolute path to an owner-controlled JSON configuration copied from `server/website-index/config.json`.
- `CAPSTONE_INDEX_DIR`: optional absolute path to a dedicated private index directory, outside `public_html`. Use a distinct directory for a different site. Do not point it at ticket storage or a broad workspace root.
- `CAPSTONE_PHP_BIN`: existing optional test variable for a PHP executable; not needed to crawl or run the Node/Supabase search.

See [the placeholder environment example](../.env.example). `.env` files are **not loaded automatically**; set `$env:CAPSTONE_INDEX_CONFIG = 'C:\path\to\config.json'` in PowerShell if needed. Never put passwords, cookies, bearer tokens or privileged Supabase keys in this configuration. It is not an authenticated crawler.

### Authorized refresh and scheduling

The manual refresh mechanism is deliberately an **owner-only command**, authorized through the operating-system account/SSH session and filesystem permissions. There is **no public indexing/admin HTTP endpoint**. The prototype's email-only staff mode cannot invoke refreshes remotely. Keep the maintenance directory inaccessible to untrusted users.

For an optional scheduler process:

```powershell
npm.cmd run index:watch
```

It runs a refresh, then repeats at `refreshHours` from configuration (24 hours by default), while the process remains running. Stop with Ctrl+C. Nothing installs a Windows task, cron entry, service or background job automatically. A deployment owner can run `index:refresh` with their approved OS scheduler instead. Concurrent refreshes fail on the exclusive lock; a stale lock after a killed process requires checking that no job still owns it before removing only that empty lock folder.

## Crawl and storage behavior

- Discovers configured seeds, robots-listed sitemaps, `/sitemap.xml`, nested sitemap indexes and public internal/navigation links. Default budget: 35 pages, 8 sitemaps, depth 3, two workers, 800-ms request spacing, 12-second fetch/DNS deadlines, one retry, and 2-MB responses. Larger robot crawl delays are honored; a delay/retry request exceeding this bounded job's limit defers work.
- HTTPS origins are explicitly allowlisted; default scope is the FIU Capstone host. Private portal/API/login/account paths and obvious state-changing action paths are excluded. Only GET is issued: no forms, submissions, clicks, purchases or writes to the source site.
- Tracking parameters are removed. Allowed content-changing parameters are retained and sorted. Unknown query parameters cause the destination to be excluded, **not silently collapsed into another page**. Extend the allowlist only after reviewing their meaning.
- No cookie jar, browser session or Authorization header is used. Public DNS answers are checked, including mixed/private/mapped-address responses, and pinned to the HTTPS connection. Each redirect is scope-checked and subject to robots. No TLS bypass or anti-bot workaround is implemented.
- Reads robots before crawling; failures other than missing robots stop that origin. Honors robots disallow, nofollow and noindex metadata/headers. HTTP `Cache-Control` controls HTTP caching, not whether a public document is included in this application index; anonymously fetched content still must pass scope and noindex/login checks. The source site currently sends `private, no-store` even on its anonymous homepage. No session-derived content is indexed.
- Server HTML is parsed without running scripts. Scripts, styles, forms, navigation, footer/cookie boilerplate and hidden nodes are excluded from body evidence. Navigation labels are retained separately. Tables keep headers and rows; lists keep item boundaries. Parent introductory context is retained with child sections. FAQ JSON-LD is parsed as data, not executed.
- Uses IDs observed on headings or their containing sections. It does not invent heading slugs. If no suitable unique ID exists, the link opens the verified page and the UI names the section to look for. A canonical-link declaration is retained as a hint; source destinations use the actual allowed final fetched URL, not an unverified canonical override.
- Retains original cleaned source text, blocks, hierarchy, IDs, URL, description/tags, content hash, version, successful-fetch/index timestamps, and genuine HTTP modification timestamps if provided. A changing source's current truth is not inferred from an old snapshot.
- Conditional HTTP validators are sent when available; equal extracted hashes keep the previous content's indexing timestamp. Changed pages are replaced in a new snapshot. A confirmed 404/410 retires a page; timeout is **unavailable**, never **deleted**. Configured/robots/noindex exclusions retire content from active retrieval. Redirect and content-duplicate records remain available in private audit versions.
- Missing pages in an incomplete crawl are not considered deleted. Previously indexed URLs are revisited within the configured budget. Increase the budget or narrow scope/seeds if the status report says `limited: true`.
- Refresh builds a separate version, validates it, writes it durably and atomically replaces `current.json`; old versions remain under `versions/`. Chat continues using the previous snapshot during the job. A run with only fetch failures leaves the previous snapshot published. Confirmed removals/exclusions still retire content even if other pages are temporarily unavailable. `last-run.json` reports exclusions/failures independently. There is no answer cache to invalidate; static builds retain their explicitly frozen snapshot until rebuilt.

The runtime index/history is ignored by Git and is separate from private `data/`. Retained versions can grow; no automatic history deletion is performed. Review and back up this directory privately as needed. It is **not a ticket or Supabase backup**.

## Retrieval and response contract

Queries are bounded to 500 characters and 32 retrieval groups. Weighted lexical matching uses headings, exact names/phrases, titles, tags and source body, plus configured aliases and one-character spelling tolerance for longer nonnumeric terms. Numbers, quoted exact names and protected qualifiers are preserved. Returns, refunds, exchanges and cancellation are not globally equated. Scores indicate relevance, not proof; answers remain labeled original excerpts, with conditions and exceptions rather than generated yes/no claims.

Thresholds (`minScore`, `minCoverage`, `maxResults`) are configurable and exercised by fictional fixtures. Multi-part queries can return **partial** support and identify missing parts. Close alternatives ask for clarification. Differing high-relevance passages under the same heading produce a possible-conflict warning; this lexical check is **not a comprehensive contradiction detector**. Long blocks are not cut mid-sentence/table/list; truncated results warn readers to open the full source.

The existing `status: matched/choices/unmatched` contract is preserved. Indexed results add:

```text
indexed: true
mode: extractive-keyword
semanticSearch: false
answerStatus: answered | partial | clarification_needed | not_found
answer: introductory response or missing-information explanation
sources: id, pageId, siteId, pageTitle, sectionTitle, URL, anchor,
         original excerpt, indexed_at, last_fetched_at, source_modified_at, version
navigation: label, targetSourceId, validated URL
navigationRequested: true only for an explicit source-navigation follow-up
```

The source resolver only accepts IDs present in the active stored snapshot. Source text and URLs cannot be invented by a model because no model generates them. Node resolves IDs against disk-backed records; packaged clients resolve against the validated read-only public snapshot. Link metadata is checked again by the UI. Source text is rendered with `textContent`, never interpreted as Markdown/HTML or tool instructions. Likely prompt-injection sections are quarantined; even an undetected instruction has no tool/model execution path. Untrusted configuration or local filesystem modification is outside this public-content threat boundary.

**Where does it say that?**, **Show me that section**, **Take me there**, **Open it** and **What about the annual plan?** use source-ID context rather than treating prior assistant prose as evidence. Multiple remembered sources cause a choice, not a guessed redirect. Ordinary answers only offer links. Explicit navigation can open the validated source in a new tab; if the browser blocks a popup, the ordinary link remains available. The chat stays on its page. External sites cannot be highlighted or controlled by this app; no such claim is made. Standard links/buttons are keyboard-accessible, and no new animation or smooth scrolling is introduced.

## Hosting modes and release workflow

- **Node:** reads the current validated index locally during each question; no website/network fetch in chat. Owner refreshes take effect without restarting the server.
- **Browser-only and Supabase:** packaging embeds only active public evidence in their existing bundles. No new authentication/storage permission is added. Cloud ticket search and staff access remain unrelated to site-content retrieval.
- **Optional PHP:** the generated `php-search.bundle.js` handles website-index queries in the frontend with the same resolver; ticket requests still go to PHP. The raw PHP `/search` endpoint retains its older reviewed-content implementation. Do not claim that raw endpoint independently implements the new index. This avoids adding Node, a second search engine or PHP extensions to Ocelot.
- **Node hosting package:** includes the owner maintenance source and a validated initial index in the private backend package, never in the public directory. Keep the backend outside `public_html`.

After review and when an upload update is requested:

```powershell
npm.cmd run index:refresh
npm.cmd run index:status
npm.cmd test
npm.cmd run package:ocelot:supabase
```

Follow [the Supabase upload checklist](OCELOT_SUPABASE_UPLOAD.md). Transfer only the generated inner **Capstone - AI** folder. Never upload `DEVELOPMENT`, crawler config/history, npm files or private ticket data. Static Ocelot cannot run this Node crawler; refresh/rebuild on the owner's computer or an approved Node host, then upload. Refreshing locally alone does not change the already-uploaded website. Git backup and remote deployment require separate user direction.

## Examples and remaining limits

Live saved-index examples verified during implementation:

- **How do I propose a project?** → [Engage, proposal/mentor section](https://capstone.cs.fiu.edu/engage#lanes).
- **How do I become a judge?** → [Engage, Judge section](https://capstone.cs.fiu.edu/engage#lanes).
- **Presentation materials** → [Resources](https://capstone.cs.fiu.edu/resources), with the heading identified because no unique section ID was found.
- **How can I sponsor a team?** → choices between relevant sponsorship sections, including [Sponsor a team](https://capstone.cs.fiu.edu/sponsor#pkgheading).
- **Mars spaceship fuel quota** → “I couldn’t find that information in the indexed website content.”

Refund/annual-plan examples exist **only in fictional automated fixtures**, not as claimed FIU policies. Private Scrum/branding materials unavailable to anonymous crawling may not be in this public index; portal shortcuts and reviewed syllabus guidance are separate.

Remaining limitations: the bounded crawl is not exhaustive; no semantic embeddings or generative provider is enabled; broader conflict/paraphrase handling needs evaluation. A JavaScript-only page without meaningful server HTML is explicitly reported as needing an approved rendered-content/CMS source. No browser-rendering crawler or CMS credentials are configured, and no authenticated content is substituted. That extension remains unverified if such a source becomes necessary. Official portal owner approval/content review, production retention, hosted deployment checks and private account integration remain separate go-live work.
