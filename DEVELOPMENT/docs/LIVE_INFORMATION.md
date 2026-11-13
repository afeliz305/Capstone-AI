# Read-only information in MIRA

Baseline rollback: 47115193c34ab35a40eac3b27bff06755de5446f / https://2ebb644e.mira-9gg.pages.dev/.

## Public retrieval

Cloudflare-only GET `/api/public-information?source=resources|tutorials|privacy` fetches exact anonymous public pages on capstone.cs.fiu.edu. It checks robots.txt, rejects redirects, limits bodies to 128 KiB (robots 16 KiB), and aborts after six seconds. No inbound cookies, authorization headers, question text or arbitrary URL are forwarded. Browser timeout is eight seconds. Only main-content plain-text excerpts are rendered, with a source link and checked time; no model is called. Linked templates or videos are not fetched.

Questions mentioning resources, showcase prep, presentation materials, tutorials or privacy use this route in the Cloudflare package. Sensitive/personal phrasing and the local connector are excluded. Other questions retain reviewed course/FARO search. This is bounded public-source retrieval, not a general web crawler or semantic live search. Failure, malformed content or stale result uses explicitly labeled reviewed-knowledge fallback. The build flag is absent from Node and Ocelot packages.

Anonymous source checks on 2026-11-13 returned HTTP 200 for all three pages, with `private, no-store` and anonymous cookies. Cookies are discarded. All responses and excerpts are **no-store**, with no cache, index ingestion, Supabase storage or AI forwarding. `checkedAt` is fetch completion, not publication time; `sourceUpdatedAt` remains unknown. Scripts, forms and hidden elements are removed. Retrieved text is untrusted evidence, never executable instructions or authority to act. Pattern checks are defense in depth, not a complete prompt-injection detector; no retrieved content enters an AI prompt.

## Capability matrix

No current authenticated portal connection was established in this task. The local helper was unreachable at its approved loopback address. Accordingly, no personal category is labeled LIVE READ AVAILABLE. Existing connector capabilities below are implementation/fixture coverage, not proof of current owner data.

| Information | Current classification | Actual source and authorization | Freshness / privacy restriction |
|---|---|---|---|
| Personal grade | APPROVAL REQUIRED | Grade is intentionally excluded by the current DOM reader; requires an approved portal-owner interface | No grade read or guessed |
| Current team | APPROVAL REQUIRED | Own Team/People through locally paired, identity-verified extension | Memory-only, at most five minutes; no unrelated directory |
| Sprint cards | APPROVAL REQUIRED | Own Board/My work through same local session | Visible own-card metadata only |
| Card status | APPROVAL REQUIRED | Board lanes and own card metadata | No mutation controls |
| Acceptance criteria | APPROVAL REQUIRED | Approved visible Board excerpt | Criteria count/available text only; missing detail not inferred |
| Evidence state | APPROVAL REQUIRED | Board evidence-presence metadata | Presence is not proof of acceptance or Done |
| Submitted stand-ups | APPROVAL REQUIRED | Own My rhythm counts/history | No submission, no inferred individual posting when absent |
| Meetings | APPROVAL REQUIRED | Approved Meetings view | Safe title/time/status only; no notes, private URLs or feed secrets |
| Personal deadlines | APPROVAL REQUIRED | Today/My work/Meetings | Only explicit visible dates; no invented weekly deadlines |
| Team standing | APPROVAL REQUIRED | Own Standing view | Session-scoped; no shared index or model |
| Messages | APPROVAL REQUIRED | Inbox channel metadata/unread indicators | No thread opening or message-body reading |
| Course resources | PUBLIC READ AVAILABLE | Anonymous exact `/resources`, `/tutorials`; robots checked | Fetch timestamp; authenticated linked files excluded |
| Public policies | PUBLIC READ AVAILABLE | Anonymous exact `/privacy`; reviewed syllabus/FARO fallback | Live privacy page; other policy snapshots retain their own provenance |

APPROVAL REQUIRED means the hosted bridge/institutional interface is not established; existing owner-approved local read-only testing is still allowed once securely paired. It does not imply a new generic request for owner consent. No documented institutional API or hosted integration authorization has been established by the reviewed project inventory. Do not probe undocumented authenticated endpoints.

## Structured local tools and integration contract

`POST /__portal/information` accepts only `{ "tool": "get_my_team" }` and the six allowlisted names in `server/portal-local/information-tools.js`: get_my_grade, get_my_team, get_my_sprint_cards, get_my_standups, get_my_meetings, get_my_deadlines. Grade deliberately returns unavailable. The rest delegate to the existing deterministic search and its strict scoped extraction. The current chat already routes personal questions through that same service.

The server derives the owner from its paired HttpOnly session, requires same-origin JSON and CSRF verification, checks the active owner, and rechecks identity, expiry and generation through the existing service. No caller-supplied account ID is accepted. Tools cannot be enabled by a model schema. The local client rejects results after a connection-generation change. Private snapshots expire within five minutes and never enter durable storage. These routes/modules are excluded from public packages.

For hosted integration, the portal owner must supply an approved same-user read-only interface or portal-native installation: server-verified identity, per-section authorization, minimal response fields, source URLs, retrieved/updated timestamps, expiry, logout/account-switch revocation, and explicit error states. No password/cookie collection, cross-user lookup, write operation, message-body access, or OpenAI processing is included. The Cloudflare site cannot borrow a student's FIU login.

## Validation and remaining real-data gate

`node --test test/public-information.test.js test/portal-local.test.js` covers anonymous public extraction, exact allowlist, methods/unknown fields, robots denial, malformed/auth pages, bounded input, injection rejection, actual Workers HTML parsing, owner mismatch and expired/absent session. Existing connector regressions exercise identity switches, stale generations, expiry, excluded sections and local-only packaging. Full suite and hosted checks are recorded under ignored `dist/presentation/INFORMATION_RELEASE.json` after publication.

For real personal acceptance, start the documented `npm.cmd run demo:portal`, personally pair the approved extension and select the owner's tab, then compare allowed own-card/team/rhythm/meeting fields without saving private evidence. Grade stays blocked. No real personal-value comparison has passed in this task. Never describe a fixture or historical snapshot as live.

Main, remote Ocelot, Supabase configuration/data, FARO and portal records are unchanged. Live AI remains disabled; no paid call is required for these tools.
