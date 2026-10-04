# MIRA rename and Supabase migration plan

Last verified locally: September 29, 2026.

## Project and release target

- Active name: **MIRA**
- Full name: **Messaging, Information & Resolution Assistant**
- Generated upload folder: `../MIRA/`
- Ocelot target folder: `public_html/MIRA/`
- Home: <https://ocelot.aul.fiu.edu/~afeli016/MIRA/>
- Staff Queue: <https://ocelot.aul.fiu.edu/~afeli016/MIRA/pages/staff.html>
- Password recovery: <https://ocelot.aul.fiu.edu/~afeli016/MIRA/pages/recover.html>

The existing `public_html/Capstone - AI/` deployment must be retained during migration as a rollback copy. It is not the target for new primary releases. Do not merge the new package into the old folder.

## Reference classification

The rename was not performed as a blind text replacement.

| Class | Treatment |
| --- | --- |
| User-facing branding | Current pages, titles, metadata, Staff Queue, recovery UI, local helpers, and active guides use MIRA. |
| Active application URL/path | Current production, recovery, preview, package, and test paths use `/MIRA/`. |
| Supabase configuration | The application recovery callback is the new MIRA URL. Live dashboard changes are deferred to the sequence below. |
| Browser storage compatibility | Only the harmless last-successful-email preference may be read once from the old path and copied to the MIRA preference key. Auth tokens and Remember Me records are never copied. |
| Internal technical identifier | `capstone-ai`, `CapstoneApi`, `CapstoneStaffView`, `capstone-*` database objects, storage bucket names, environment variables, and similar implementation names remain intentionally unchanged. |
| Historical documentation | Dated incident reports and completed acceptance records may retain the name and URL that were true at that time. |
| Test fixture | Current URL/package fixtures use MIRA. Legacy fixtures remain only where a test deliberately verifies rejection or compatibility. |
| Legacy compatibility path | The local preview recognizes the old path only to support old browser-demo export. A production old-to-new redirect is a post-approval migration step. |

No service worker or web-app manifest controls the hosted application, so there is no application cache scope or `start_url` to migrate. The Chrome development connector manifest is a separate local development artifact and is not uploaded to Ocelot.

## Read-only Supabase audit

This records the last read-only dashboard/application audit. No Supabase setting or record was changed during this implementation pass.

### Auth URL configuration

- Current Site URL: `https://ocelot.aul.fiu.edu/~afeli016/Capstone%20-%20AI/`
- Current saved Redirect URLs: none were shown in the dashboard audit.
- Localhost redirect: not configured.
- Old recovery URL: not separately allowlisted; the old deployment is still the current Site URL.
- New MIRA recovery URL: not yet allowlisted.

### Auth email configuration

- Current recovery subject: `Reset your password`.
- Current recovery template uses Supabase's secure `{{ .ConfirmationURL }}` value.
- The audited template did not contain a hardcoded localhost or Ocelot callback.
- The dashboard indicated that editing the subject/body requires the applicable Supabase email/SMTP configuration. No template was changed.

Preferred subject after approval: **Reset your MIRA staff password**.

Preferred opening: **We received a request to reset the password for your MIRA staff account.**

Required clarification: **This changes your MIRA staff password only. It does not change your FIU password.**

Continue using `{{ .ConfirmationURL }}`; never place a recovery token manually in a template or document.

### Auth users and staff authorization

- Five current teammate Auth users were present and confirmed.
- Anthony Feliz's Auth user was bound to the active staff record.
- Four other active roster entries existed but were not bound to Auth users in the audited state.
- Raul Alvarenga remained inactive, unbound, and without an Auth account.
- Authorization uses the stable Auth UUID, normalized email, and the active staff flag through the private staff-members data and `capstone_staff_session` RPC.
- A password reset changes a credential only; it does not create or reactivate a staff binding.

### Data and storage

- Read-only queue health showed two existing fictional CAP-style records at audit time.
- The private attachment bucket and staff-only storage path were reachable through the existing authorized workflow.
- Existing ticket IDs, assignments, comments, internal notes, attachment references, RLS, functions, and storage remain in the same Supabase project.

Counts are a point-in-time audit, not a promise that a shared test queue will never change.

## Exact Supabase changeset

### Current

Site URL:

`https://ocelot.aul.fiu.edu/~afeli016/Capstone%20-%20AI/`

### Target

Site URL:

`https://ocelot.aul.fiu.edu/~afeli016/MIRA/`

Redirect URL to add before deployment:

`https://ocelot.aul.fiu.edu/~afeli016/MIRA/pages/recover.html`

Temporarily keep the old production recovery destination during the transition if it is added or currently relied on. Remove it only after the new deployment and a newly generated recovery link are verified and previously issued links have had an appropriate stability window.

### No change

Do not recreate, rename, reset, rotate, or migrate the Supabase project reference, project URL, publishable key, secret keys, Auth users, UUIDs, database schema, tables, columns, RLS policies, RPCs, storage bucket, staff bindings, tickets, ticket IDs, comments, internal notes, attachments, or SQL migration history.

The Supabase technical project name does not have to match the application name. No separate display-only Auth application-name setting was confirmed during the audit, so no project rename is proposed. If Supabase later exposes a distinct email/UI display name, set only that display field to **MIRA** after review.

## Staff Queue profile design

Authenticated staff now use a top-right profile trigger showing generated initials and the verified session name. At narrow widths the trigger becomes initials-only.

The profile menu contains the MIRA Staff Account heading, verified session name and email, Settings, and Sign out. It never displays Auth UUIDs, binding IDs, tokens, or database IDs. Settings shows read-only verified name/email and the statement that the MIRA password is separate from the FIU password.

Change password is available only through **Profile -> Settings -> Change password** in Supabase mode and reuses the existing current-password verification and password-clearing logic. Forgot password remains on the signed-out screen only. Sign out remains the existing session-clearing operation and overrides Remember Me.

The menu supports keyboard activation, `aria-expanded`, Escape, outside-click close, and focus return. Settings and the password dialog preserve modal focus behavior. Real-browser checks passed at desktop, 390 px, and 320 px without horizontal overflow.

## Session and path behavior

Supabase remains the identity/session authority. Because the SDK storage namespace includes the application path, `/MIRA/` starts with its own application session namespace. The implementation does not copy access tokens, refresh tokens, Supabase SDK records, or seven-day Remember Me metadata from the old path.

For convenience only, MIRA can read a valid last-successful-staff-email preference from the old path and save that email under the new path's preference key. The value cannot grant access and a failed login never replaces it. Explicit sign out still clears the active/remembered authenticated session according to the existing model.

## Local build verification

Command:

```powershell
npm.cmd run package:ocelot:supabase
```

Verified package:

- Output: `C:\Users\afeli\Desktop\Capstone AI Chat\MIRA`
- Files: 26
- Bytes: 4,953,116
- Release record: `dist/release-records/mira-upload-XhWgUH/`
- Manifest: `manifest.json` in that release-record directory
- Checksum result: all 26 generated files matched their recorded SHA-256 and byte counts
- The old sibling `Capstone - AI` folder remained present for rollback.

The public folder contains no development directory, Git metadata, test files, backend source, local connector, portal-owner package, runtime tickets, or local credentials. The bundle contains the intended Supabase project URL and publishable configuration. Build validation rejects privileged key formats; no service-role key, database password, or secret server key is configured by this package.

## Local test record

- Complete automated suite: 322 discovered, 321 passed, 0 failed, 1 optional hosted-PHP integration test skipped.
- Profile behavior: passed.
- Desktop, 390 px, and 320 px real-browser profile/Settings layout: passed.
- Password change and visibility tests: passed.
- Recovery URL, recovery session, and password-reset tests: passed.
- Staff binding/authorization, inactive/unbound denial, case normalization, Remember Me, and logout tests: passed.
- Ticket persistence, attachment, public/internal comment separation, and stale-edit regression tests: passed.
- Active legacy-URL scan: passed. The only packaged old hosted path is the intentional last-email compatibility read documented above.

These are local and isolated tests. They do not claim that the new path is already deployed or that a real recovery email was sent.

## Post-approval deployment sequence

1. In Supabase Auth URL Configuration, add `https://ocelot.aul.fiu.edu/~afeli016/MIRA/pages/recover.html` while keeping the current working Site URL and any necessary legacy recovery destination.
2. Upload only the generated `MIRA/` folder into `public_html/`, producing `public_html/MIRA/`. Keep the old deployment unchanged for rollback.
3. Verify the new MIRA home, Staff Queue, and recovery page over HTTPS. Confirm static assets, public chat, signed-out Forgot password, and sensitive-path 404 behavior.
4. Change the Supabase Site URL to `https://ocelot.aul.fiu.edu/~afeli016/MIRA/`.
5. Review the recovery email subject/body for MIRA wording while retaining `{{ .ConfirmationURL }}`.
6. Test normal staff sign-in with an existing bound Auth user. Confirm the same UUID/binding and the existing queue.
7. Generate one new controlled Forgot Password request for the approved staff test account.
8. Confirm the link lands on `/MIRA/pages/recover.html`, the new password works, the old password does not, staff authorization is unchanged, Remember Me remains opt-in, and Change password remains in Settings.
9. Verify existing fictional tickets, CAP-style IDs, attachments, assignments, comments, internal notes, requester filtering, and stale-edit protection.
10. Add a minimal old `/Capstone - AI/` to `/MIRA/` compatibility redirect only after confirming Ocelot's supported mechanism. If `.htaccess` is not supported, use a minimal safe compatibility page. Do not maintain two evolving full application copies.
11. After a stability period, remove obsolete old Supabase recovery redirects and retire the old public deployment while retaining a private rollback copy as approved.

## Actions intentionally not performed

- Ocelot upload: **No**
- Supabase settings changed: **No**
- Auth email template changed: **No**
- Recovery email sent: **No**
- Real password changed: **No**
- Database, storage, ticket, or staff-binding mutation: **No**
- Git commit or push: **No**
