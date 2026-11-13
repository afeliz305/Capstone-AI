# Personalized retrieval: implementation and real acceptance

Baseline: 5837e4981518f56a6b6df3f47d19f8af2dd8c7c4, https://aafd4420.mira-9gg.pages.dev/. That immutable release remains available for rollback.

## Confirmed defects and repairs

The previous personal intent matcher recognized singular card/task but not plural cards/tasks; assigned-card questions could fall through to Today. Submission questions containing stand-up could select Board rather than My Rhythm. The read-only router now recognizes those variants, upcoming-deadline questions and team sprint progress. Team sprint progress covers the authorized Team view and own Board metadata, not a fabricated whole-team completion percentage.

Structured tools add `get_my_cards` as an alias and `get_my_team_standing`; the response distinguishes verified excerpts from unavailable data. No records is not inferred from missing content. Grade remains disabled, including when fictional grade records exist in a test fixture. Existing authenticated session, CSRF, identity, account-switch, generation and five-minute expiry controls are preserved. No private data enters the AI path.

Public retrieval adds `/about` and `/engage` to the previous exact allowlist. `/showcase` was inspected but not added: its usable public content was not reliably available to the bounded parser. Public follow-ups re-fetch a source identifier held only in browser memory for five minutes; new topics and conversation reset clear it. Excerpts are ranked with a preference for substantive paragraphs, duplicates suppressed, and every answer retains its exact source. Last-checked times use America/New_York with EST/EDT; a valid upstream Last-Modified is separately labeled. Date text in source excerpts is not converted into a personal deadline or inferred priority. Missing timezone/publication metadata remains unknown.

## Current capability matrix

AUTHORIZED SESSION-LOCAL READ below describes the existing owner-approved narrow connector capability, **not a newly verified live account result**. Current real acceptance remains BLOCKED until the owner pairs the extension and the selected account passes verification. The Cloudflare site never inherits that local session.

| Category | Classification | Source and permitted fields | Current real acceptance |
|---|---|---|---|
| Personal grade | REQUIRES PORTAL OWNER APPROVAL | Explicit grade-specific adapter and scope required | BLOCKED; disabled |
| Grade breakdown | REQUIRES PORTAL OWNER APPROVAL | Same restriction | BLOCKED; disabled |
| Current team membership | AUTHORIZED SESSION-LOCAL READ | Own Team / safe People relationships | BLOCKED; no verified pairing |
| Assigned sprint cards | AUTHORIZED SESSION-LOCAL READ | Own Board / My work metadata | BLOCKED; no verified pairing |
| Card statuses | AUTHORIZED SESSION-LOCAL READ | Own card lane/status | BLOCKED; no verified pairing |
| Acceptance criteria | AUTHORIZED SESSION-LOCAL READ | Approved visible count/text only | BLOCKED; no verified pairing |
| Evidence and verification state | AUTHORIZED SESSION-LOCAL READ | Visible own-card evidence presence; no official acceptance inference | BLOCKED; no verified pairing |
| Submitted stand-ups | AUTHORIZED SESSION-LOCAL READ | Own My Rhythm count/history; not all message bodies | BLOCKED; no verified pairing |
| Meetings | AUTHORIZED SESSION-LOCAL READ | Safe title/time/status; no private notes, URLs or feed secrets | BLOCKED; no verified pairing |
| Upcoming deadlines | AUTHORIZED SESSION-LOCAL READ | Explicit Today / My work / Meetings values | BLOCKED; no verified pairing |
| Sprint progress | AUTHORIZED SESSION-LOCAL READ | Own cards plus approved Team summary only | BLOCKED; no verified pairing |
| Team standing | AUTHORIZED SESSION-LOCAL READ | Own Standing view | BLOCKED; no verified pairing |
| Team announcements | REQUIRES PORTAL OWNER APPROVAL | Current Inbox scope is metadata only; no announcement bodies | BLOCKED |
| Public course resources | PUBLIC LIVE READ | Exact anonymous Resources, Tutorials, Privacy, About, Engage | Real runtime checks; hosted evidence in release record |
| Reviewed FARO knowledge | NOT AVAILABLE as live FARO | Existing reviewed static guidance remains operational | Static retrieval passes; no live FARO sync claimed |

All local private sources remain memory-only for at most five minutes, are revalidated against the paired account, and clear on disconnect, expiry or account change. No public index, Supabase, Cloudflare private-data logs or OpenAI receives their values. Source links remain supplementary to actual authorized excerpts. The two chat composers use one search path.

## Owner-controlled connection gate

An interactive terminal running `npm.cmd run demo:portal` has been prepared. Open `http://127.0.0.1:3005/MIRA/`, pair the installed MIRA Portal Connector using the terminal's single-use extension code, select the owner's signed-in Capstone tab, then choose Connect my portal. Do not send codes or credentials in chat. The helper is loopback-only; it is not a public tunnel or Cloudflare integration. A changed server build needs a deliberate restart and fresh pairing before testing that new code.

Real acceptance must compare the selected account's permitted team, own cards, rhythm, meetings, explicit deadlines and standing against their official visible sections. Do not save values/screenshots in Git, slides, logs or release records; record only category, timestamp and pass/fail. Do not mutate portal records to simulate a refresh, sign in to another student's account, or test grades. Account-switch/expiry failures can be tested using fictional isolated fixtures without changing official sessions.

No approved hosted API, portal-native installation or institutional grade scope was supplied or established. A browser login and MIRA Supabase staff session are not such authorization. The required hosted contract remains documented in LIVE_INFORMATION.md. Official portal authentication/CORS/CSP and grade exclusions have not been changed or bypassed.

## Verification and presentation

Focused tests exercise the real local service with fictional adapter records for own-card/rhythm/standing routing, account changes, cross-user rejection, expiry and disabled grades. Public browser acceptance exercises both composers, exact links, follow-up refresh, Eastern checked-time labels, stale response rejection, source failure and no AI call. Fixture results do not count as real owner-portal verification.

The full suite, clean-checkout build, exact deployed commit, 32 downloadable asset hashes, hosted public source checks, responsive/security checks and remaining blockers are recorded in ignored `dist/presentation/PORTAL_COMPLETION_RELEASE.json`. Public capture only; no actual private portal values are included. The updated class presentation differentiates public live retrieval, curated knowledge, historical cards, previously verified restricted AI, and session-local personal information pending connection. Its offline fallback is reviewed static knowledge and the self-contained slide deck.

Public paid AI and portal submissions remain disabled. Main, remote Ocelot, Supabase configuration/data, FARO and official portal records remain unchanged.
