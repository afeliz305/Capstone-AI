# Signed-in account integration

September 25 local prototype: an application-owned, read-only Chrome existing-session connector is implemented separately under `demo:portal`. After a fresh Overview identity check, it lazily reads only a deliberately requested approved section: Overview, own Team, Standing, own Grade, or Messages channel metadata. It does not supply identity to ticket creation, and live application acceptance is still pending the Chrome handshake. [Local setup, section coverage, privacy controls and actual verification status](LOCAL_PORTAL_CONNECTOR.md). The ordinary hosted modes and production contract below remain unconnected to FIU authentication.
## Portal navigation versus account access

September 25: the chatbot can guide students to Messages, Overview and the other portal sections using [reviewed navigation shortcuts](PORTAL_NAVIGATION.md). These links do not access a portal session or read personal data. Supabase staff authentication also does not connect the FIU account. The integration contract below is separate from this navigation feature; no live FIU adapter has been configured. See the navigation guide for future read-only message/dashboard requirements.

## What works now

When the support form opens, it calls `GET /api/session` on this app's origin. A connected account fills in the student's name and email, which are read-only. On `POST /api/tickets`, the server checks the session again and gets identity from that session, ignoring name, email, account ID, or identity-source values supplied by the browser. Only the help details come from the form.

Tickets save `accountId`, `name`, `email`, and an `identitySource` of `portal-session`, `demo-session`, or `manual`. Session cookies and identity-context tokens are not saved in tickets. The staff queue labels the identity source.

If the account changes after opening the form, submission returns HTTP 409. The form refreshes the account details and preserves the user's question/details for review and resubmission. An expired or logged-out portal session returns HTTP 401; an unavailable or incomplete account profile returns HTTP 503. Neither case falls back to manually entered identity in connected mode.

## What is not connected

The prototype does **not** have FIU session/API credentials or portal source code. It cannot read the portal's login cookies from `localhost`. No FIU authentication endpoint has been assumed or implemented.

The sample session is an explicitly labeled demonstration using fictional data. It uses a random, one-hour, HttpOnly/SameSite=Strict cookie with server-side session state. It is available only on loopback, only without a portal adapter, and never with `NODE_ENV=production`. Restarting the server clears sample sessions. It is not a production login system.

## Contract for the project owner

The portal team must provide a trusted way for this server to validate the current user's existing session and obtain the account's stable ID, display name, and email. Mounting the assistant/API under the portal's origin is a possible integration approach; cookie scope and session validation still need to be configured by the owner. A separate-origin deployment would require a deliberate authenticated integration, not just an iframe or script include.

Create a CommonJS module that exports one async function:

```js
module.exports = async function resolveAccount(request) {
  // REQUIRED: use the portal's actual server-side session validation here.
  // Return null when no valid session exists.
  // Return { id: "stable-account-id", name: "Display Name", email: "user@fiu.edu" }
  // only after validating that the session belongs to this user.
  // Throw if the identity provider is unavailable.
  throw new Error("Portal session validation has not been implemented.");
};
```

No generic FIU implementation is supplied because the portal's authentication contract is unknown. Do not return identity from query parameters, ticket JSON, localStorage, scraped page text, or unverified headers. Never copy a student's browser cookies into source code or configuration.

Set the adapter's absolute path before starting the server:

```powershell
$env:CAPSTONE_SESSION_ADAPTER = "C:\path\to\portal-session-adapter.cjs"
npm.cmd start
```

This variable is read from the process environment; `.env` files are not loaded automatically. The adapter must return `null` or an object with nonempty string `id`, `name`, and valid `email` fields. Extra account fields are discarded. Configuring an adapter disables manual identity fallback and sample accounts.

`identityContext` in the session response is an opaque account-change guard, not authentication. Clients send it with the ticket; the server still resolves the session on every submission. API mutations require JSON and reject cross-origin browser requests. These checks do not replace portal session validation, authorization, or production CSRF protections.

## Staff access is separate

The current temporary mode accepts an approved email without a password and labels it an unverified demo identity. Password mode can be restored through server configuration. Ticket listing, updates/assignments, and attachment downloads require a server-issued staff session, but email-only mode is not secure identity verification. The student sample account and portal session adapter do not grant staff access. See [staff access](STAFF_ACCESS.md). Current Ocelot group testing uses fictional data; institutional account integration belongs to the separate [official go-live plan](DEPLOYMENT_AND_INTEGRATION_PLAN.md).

## Before production

- Replace or integrate local staff password provisioning with institutional identity and role management. Preserve server-side protection for listing, updates, and downloads.
- Enforce student/instructor ticket access rules, rather than relying on the privacy checkbox.
- Add ticket-level/instructor-only authorization, malware scanning, quotas, and retention. The current five staff accounts can access all team tickets and their attachments. See [document upload notes](DOCUMENT_ATTACHMENTS.md).
- Agree on HTTPS, session cookie scope, trusted proxy/origin handling, logout/expiry behavior, and CSRF protection with the portal owner. The Node prototype now supports an explicit `CAPSTONE_PUBLIC_ORIGIN` and app-folder cookie paths; the actual proxy and identity integration still require configuration and deployment testing.
- Replace local JSON storage as appropriate, define retention/consent, and configure professor email delivery separately.
- Keep real account data, tickets, secrets, and session credentials out of GitHub. Only sample/test data belongs in the demo.

## Verification

`npm.cmd test` covers manual fallback, sample-session isolation, identity spoofing, server-side revalidation, account changes, logout, adapter failures, persistence, cross-origin rejection, and sample-session restrictions. Tests use temporary storage and do not alter the demo's local ticket queue.
# Dashboard personalization status (September 24, 2026)

The new guided chat covers project, task, deadline, progress, attendance and grade **questions**, but does not have access to actual FIU/Canvas student records. Syllabus policies and user-selected sprint guidance are not personal account data. Existing name/email autofill and Supabase staff authentication do not supply this access. See [the read-only dashboard integration requirements](SYLLABUS_AND_DASHBOARD.md#personal-dashboard-records-not-connected); no student-record adapter has been implemented or authorized from a website link alone.
