# Messages and dashboard navigation

Updated October 8, 2026. The reviewed map now contains 26 navigation destinations and recognizes the current standalone Today, Inbox, Board, Meetings, Projects this term, People, My rhythm, Recognition, and Privacy routes in addition to working legacy sections. Hosted Ocelot remains navigation-only. Only the separate local/owner-reviewed connector can read authorized display data, and Inbox extraction is metadata-only.

| Current section | Route | Hosted behavior |
| --- | --- | --- |
| Today | `/today` | Open verified destination; no hosted private read |
| Inbox | `/inbox` | Open verified destination; no hosted inbox read |
| Board | `/board` | Open verified destination; no hosted card read |
| Meetings | `/meetings` | Open verified destination; no hosted meeting read |
| Projects this term | `/this-term` | Open verified destination |
| People | `/people` | Navigation only |
| My rhythm | `/me/rhythm` | Open verified destination; no hosted private read |
| Recognition | `/recognition` | Open verified destination |
| Privacy | `/me/privacy` | Navigation only; no secret values read |

Updated September 26, 2026. This document separates verified portal navigation from personal-data access.

## What works now

Ocelot MIRA uses centralized destinations from `js/shared/portal-navigation.js`. The live portal router accepts registered view identifiers in the URL hash after authenticated startup. Grade, Messages, Team, and Standing were opened in a signed-in test tab without changing records. Grade also survived refresh, and browser back/forward restored Grade and Team.

| Section | Observed mechanism | Signed-in verified | Login return verified | Link/limitation |
| --- | --- | --- | --- | --- |
| Grade | Router view `mygrade` | Yes | No | `https://capstone.cs.fiu.edu/portal#mygrade` |
| Messages | Router view `messages` | Yes; no conversation opened | No | `https://capstone.cs.fiu.edu/portal#messages` |
| Team | Router view `team` | Yes | No | `https://capstone.cs.fiu.edu/portal#team` |
| Standing | Router view `compare` | Yes | No | `https://capstone.cs.fiu.edu/portal#compare` |
| Other internal sidebar sections | Live control `data-v`/`setView` plus hash router | Mechanism observed, not all opened | No | Centralized allowlisted hash destinations |
| Canvas | Portal-generated external link | Link observed | Separate Canvas login | Portal-provided course link |

The login page's successful email-code and second-factor paths currently set `location.href = "/portal"`. The unauthenticated portal boot path also redirects to `/login` without preserving the hash. Consequently an already signed-in tester reaches the intended section directly; a signed-out tester completes login and chooses the section once. MIRA says this explicitly and does not label login continuation as verified.

## What Ocelot does not do

- It does not read grades, unread counts, message bodies, account identifiers, tasks, attendance, or project records.
- It does not receive portal cookies, tokens, or private answers.
- It does not send or change messages, submit forms, mark conversations read, or request letters.
- It uses ordinary user-clicked links. Personal destinations do not depend on an automatic popup.
- Canvas remains a separate authenticated service.

Public website indexing and reviewed syllabus search remain available without paid AI credentials. Personal questions return a short boundary plus the best verified destination.

## Portal-native next step

The owner-review bundle and exact adapter/login-continuation requirements are in [PORTAL_OWNER_HANDOFF.md](PORTAL_OWNER_HANDOFF.md). Until the owner mounts that component inside the authenticated portal and connects real authorized data/router hooks, live personal answers remain unavailable in hosted MIRA.

## Local checks

Run from `DEVELOPMENT`:

```powershell
npm.cmd test
npm.cmd run portal-native:build
```

The build writes owner-review assets under ignored `dist/portal-native-review/`; it does not update the Ocelot upload folder, deploy the portal, or push Git.
