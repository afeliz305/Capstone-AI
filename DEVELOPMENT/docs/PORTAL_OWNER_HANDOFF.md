# Portal owner handoff: portal-native MIRA

Updated September 26, 2026. This is an owner-review package, not a claim that MIRA has been installed in the live portal.

> Existing portal section links now work for authenticated users. Two owner-side tasks remain:
> 1. Preserve the requested section through email-code login.
> 2. Mount MIRA and connect its session/data/navigation adapter.

The current Ocelot release remains navigation-only. It does not receive portal cookies, personal questions, grades, messages, account identifiers, or portal answers.

## What is ready in this repository

- `portal-native/host-adapter.js` defines the narrow, fail-closed host contract.
- `portal-native/navigation-continuation.js` validates section destinations and the optional assistant request.
- `portal-native/mira-service.js` provides evidence-based retrieval and expires private snapshots five minutes after retrieval.
- `portal-native/component.js` provides the accessible portal-native launcher and chat panel.
- `css/portal-native-mira.css` supplies isolated component styling.
- `npm.cmd run portal-native:build` produces the unminified review bundle and CSS in `dist/portal-native-review/`.
- `npm.cmd run package:portal-owner` creates a sanitized, timestamped folder and ZIP in `dist/portal-owner-releases/`. It contains the reviewed assets, this handoff, adapter/continuation sources, a fictional adapter, standalone contract tests, a manifest, and checksums.

The owner package does not contain the repository, Ocelot website, extension, local helper, credentials, configuration, private data, or runtime state. These owner-only assets are excluded from the Ocelot upload. Implemented library behavior and synthetic fixtures are ready for review; the real portal adapter and login continuation remain owner work.

## Verified live navigation findings

The sidebar and Jump-to controls use registered view identifiers. The router reads a URL hash after authenticated application initialization. Read-only inspection established these results:

| Section | Observed view | Signed-in activation | Refresh | Login return |
| --- | --- | --- | --- | --- |
| Grade | `mygrade` | Verified: `/portal#mygrade` opened Grade | Verified | Not supported by current login |
| Messages | `messages` | Verified: `/portal#messages` opened Messages without opening a conversation | Not separately verified | Not supported by current login |
| Team | `team` | Verified: `/portal#team` opened Team | Not separately verified | Not supported by current login |
| Standing | `compare` | Verified: `/portal#compare` opened Standing | Not separately verified | Not supported by current login |

Back and forward navigation between Grade and Team restored the intended views. The remaining sidebar destinations were mapped from observed portal controls/router identifiers but were not all individually activated, refreshed, or tested through login. `js/shared/portal-navigation.js` records those evidence levels separately.

The current login sends successful email-code and second-factor completions to `/portal`. An unauthenticated `/portal#...` request redirects to `/login` without preserving the section. Ocelot therefore tells signed-out users to choose the section after login or open the shortcut again.

## Six required portal-owner hooks

Mount MIRA only after the authenticated portal application is ready. These signatures are the integration contract, not claims about existing professor-side function names. `portal-native/examples/synthetic-host-adapter.js` demonstrates the shape using fictional records only.

### `getVerifiedSession()`

- **Purpose:** bind every read to the portal's currently authenticated account.
- **Output:** `{state:"verified", binding}` or an explicit signed-out, expired, or unverified state. `binding` is opaque.
- **Authorization:** derive the binding from the server-validated session. Never accept an email, student ID, cookie, token, or account selector from chat text.
- **Synthetic example:** the fixture returns `synthetic-session-a` and can emit a different synthetic binding for account-switch testing.
- **Still needed from the portal:** the authenticated application-ready signal and supported current-session validation mechanism.

### `listAccessibleSources({binding})`

- **Purpose:** return the capability map for sections this same account may read.
- **Output:** `[{id, section, label, readable, messageContentReadable?}]` using opaque source IDs.
- **Authorization:** revalidate the binding and omit unauthorized, admin-only, unrelated-student, and unavailable sources.
- **Synthetic example:** the fixture exposes only fictional Grade and Team sources.
- **Still needed from the portal:** the per-user section/access model and the existing loaders that enforce it.

### `readAuthorizedSection({sourceId, section, messageContent, purpose})`

- **Purpose:** retrieve the minimum fresh evidence needed for one answer.
- **Output:** `{sessionBinding, section, records:[{kind, heading, text, subview, sourceTimestamp?}], coverage}`.
- **Authorization:** validate the current session, binding, source, and section on every call. Use only non-mutating loaders. Message content remains denied unless the owner confirms a read that does not mark messages read or trigger presence/composer behavior.
- **Synthetic example:** the fixture returns a fictional current-term grade or sprint record with the same synthetic binding.
- **Still needed from the portal:** real read-only loader signatures, field meanings, course/term/team/sprint context, and message read-side effects.

### `resolveSourceDestination({sourceId, section})`

- **Purpose:** obtain the safe destination associated with cited evidence.
- **Output:** `{capability:"exact-section"|"parent-only"|"unavailable", url, label}`.
- **Authorization:** resolve only sources available to the current session and return same-origin, allowlisted portal destinations.
- **Synthetic example:** Grade resolves to `https://capstone.cs.fiu.edu/portal#mygrade`.
- **Still needed from the portal:** the registered-view lookup and section-level authorization check.

### `openAuthorizedSection({sourceId, section, purpose})`

- **Purpose:** implement “Take me there” using the existing router.
- **Output:** the same destination shape after successful activation.
- **Authorization:** verify the session and source again, then activate the registered view idempotently. Never click submit, approve, move, send, or edit controls.
- **Synthetic example:** the fixture validates its fictional source and returns the observed Grade hash destination.
- **Still needed from the portal:** the real safe view-activation function and application-ready/history behavior.

### `subscribeToSessionChanges(callback)`

- **Purpose:** immediately invalidate private memory on logout, expiry, or account switch.
- **Output:** an unsubscribe function; callbacks provide an explicit session state and, when verified, the new opaque binding.
- **Authorization:** events must come from the authoritative session lifecycle, not a displayed name or browser-provided account ID.
- **Synthetic example:** the fixture emits signed-out and synthetic account-switch events.
- **Still needed from the portal:** logout, session-expiry, refresh-failure, and account-change events.

The portal source for these hooks was not supplied. Please provide owner-authorized access to the relevant router, login-continuation, session-validation, and read-only data-loading code in a test environment. Do not provide passwords, student records, cookies, or verification codes. No new public API, API key, OAuth provider, or FIU SSO is assumed.

## Where to mount

Host the reviewed JS and CSS as versioned assets on `capstone.cs.fiu.edu` under the existing Content Security Policy. Add a portal-owned mount element to the authenticated shell, then call:

```html
<link rel="stylesheet" href="/static/mira/0.1.0/mira-portal-native.css">
<div id="mira-portal-root"></div>
<script src="/static/mira/0.1.0/mira-portal-native.bundle.js"></script>
<script>
  CapstonePortalNativeMira.mount({
    root: document.getElementById("mira-portal-root"),
    adapter: window.PortalMiraHostAdapter
  });
</script>
```

The owner must implement `window.PortalMiraHostAdapter`. Do not deploy with the synthetic adapter or mark MIRA connected when a hook is unavailable. The assets should be reviewed, versioned, and hosted by the portal rather than fetched as remotely changing third-party code.

## Destination and email-code continuation

Already signed-in users can use the verified hashes immediately. To preserve a destination through the existing email-code login, the owner must connect `navigation-continuation.js` to the real router and login flow:

1. Read only an allowlisted section identifier before redirecting to login.
2. Keep a validated relative continuation such as `/portal?section=grade&assistant=1#mygrade`; reject external return URLs and executable values.
3. After email-code/second-factor success, validate it again and return to that relative destination instead of hardcoding `/portal`.
4. Wait for authenticated application readiness, authorize the section for the current account, activate the existing registered view, and clear the pending continuation.
5. Send unknown or unauthorized destinations to normal Overview with a clear notice.
6. Preserve refresh and browser history. Never put credentials, account IDs, or private data in the URL.

URL fragments are not sent in HTTP requests, so the server cannot recover `#mygrade` automatically. The owner must select a portal-supported, short-lived continuation mechanism carrying only the validated section identifier. The query form above is a proposed contract, not a currently working login link, and Ocelot does not emit it.

## Privacy and security decisions requiring owner approval

- Which existing authorized data loaders are safe for each student-facing section.
- Whether message metadata or content can be read without marking anything read or triggering presence.
- Which nested resources are in scope; Canvas remains separately authenticated.
- CSP paths for the self-hosted versioned assets.
- Error/audit rules that exclude private excerpts, questions, answers, account bindings, cookies, and tokens.
- Session binding/revocation and server-side authorization for every read.

MIRA remains read-only. It must not submit, approve, move, send, edit, predict, or access another student's records. Private extracts and personal chat stay in page memory for at most five minutes; searches do not extend that lifetime. Logout, account switch, lost verification, expiry, or a late response clears them. No private content is relayed to Ocelot, Supabase, tickets, external AI/search services, analytics, files, or persistent browser storage.

## Owner verification and rollback

Test in an owner-approved environment with two synthetic accounts:

1. Signed in: open Grade, refresh, and use back/forward.
2. Signed out: request Grade, complete the normal email-code flow, and confirm Grade is restored.
3. Ask current versus previous-term grade questions, current sprint deadline, a contextual follow-up, and a nested template question. Confirm citations and “Take me there” use the same source.
4. Switch accounts during a delayed read, log out during a delayed read, and wait past five minutes. Confirm no old answer appears.
5. Confirm message reads do not mark anything read and no composer/presence action is triggered.
6. Confirm no extension, helper, remote debugging, copied credential, Supabase relay, Ocelot relay, or external AI key is required.

Rollback: remove the MIRA mount call and its two versioned asset references. The existing router, email-code authentication, and data loaders remain authoritative; the adapter requires no schema migration or record mutation.

## Current acceptance status

- **A - existing portal:** authenticated Grade, Messages, Team, and Standing activation verified; Grade refresh and selected history behavior verified. Login return is not supported.
- **B - Ocelot:** verified links and truthful navigation-only/private-data boundaries are implemented and packaged separately.
- **C - owner fixture:** adapter, continuation allowlist, session isolation, expiry, late-response, and package-boundary tests are implemented with synthetic data.
- **D - owner-installed end to end:** pending. No hosted portal-native installation or live personal-data integration has been verified.

Smallest next owner action: review this package and identify the actual current-session, accessible-source, authorized-read, router, and login-continuation hooks in a non-production test environment.
