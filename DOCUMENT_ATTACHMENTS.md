# Ticket document attachments

The local prototype accepts optional PDF, Word (.docx), and UTF-8 text (.txt) documents in both the student **Create a support request** form and **Staff queue → Create ticket**, for every topic including **Attendance**. The staff picker is labeled **Attach documents (optional)** below Details. No AI service reads the files; they are available as downloads on staff cards and in opened ticket workspaces. No professor email is sent. This feature attaches files during creation, not afterward while editing an existing ticket.

## Limits and behavior

- Up to 3 files per ticket, 5 MB each, 10 MB combined (MB here uses 1,048,576 bytes).
- Empty files, unsupported extensions, invalid filenames, mismatched sizes/encoding, and invalid basic file signatures are rejected on the server. Browser validation gives early feedback but is not trusted as the security boundary.
- Filenames are at most 180 characters, without path separators, control characters, or reserved punctuation. TXT must be UTF-8. Old `.doc` and macro-enabled `.docm` files are not supported.
- Both pickers can add files in multiple selections. **Remove** discards a pending selection. Closing/reopening the student form retains selections; cancelling the staff form clears its selections along with the rest of its draft. Submitting successfully or refreshing/leaving the page clears unsent selections. Staff logout/session loss clears the draft, and late file reads cannot submit it afterward.
- Failed submission preserves the selected files so the user can correct/retry. A failure to persist the ticket rolls back newly saved documents, leaving existing tickets/files unchanged. A process or machine crash can still leave orphan files; production needs transactional storage/reconciliation.
- Basic PDF/DOCX header checks are not full document parsing, file sanitization, or malware scanning. A file passing these checks is not guaranteed safe to open.

## Local storage and API

`POST /api/tickets` and the authenticated staff route `POST /api/staff/tickets` accept JSON with the existing account/session/origin checks. Both accept an optional `attachments` array of `{ name, size, data }`, where `data` is canonical base64. Server-generated IDs and MIME metadata replace any client-supplied IDs/types. These two routes have a 14 MB JSON body limit to accommodate encoding overhead; other mutation routes retain their 128 KB limit. Staff identity is still derived from the validated session, and file validation completes before any file is saved.

Files are written under random UUID names to `data/attachments/`, outside `public`. The JSON queue stores only `{ id, name, size, type }` metadata. Both `data/tickets.json` and `data/attachments/` are excluded from Git, so teammates have separate files/queues. Keep them together for any intentional local-data backup. Changing status does not remove files.

When `CAPSTONE_DATA_FILE` is set for a test/custom queue, files are stored in an `attachments` subdirectory beside that JSON file. No `.env` loader or additional dependency is needed. Automated tests use isolated temporary directories; they do not modify the user's queue.

`GET /api/tickets/:ticketId/attachments/:attachmentId` requires a valid staff password session and checks that the file belongs to that ticket, then serves it as a forced download with no-store, nosniff, sandbox, and same-origin resource headers. It never uses the original filename as a storage path. A missing file returns 404 without rewriting the ticket. Existing tickets without an attachments field continue to work.

## Before production

This remains a loopback-only demo. The staff queue and download route now require an approved staff account's local password session; see [staff access](STAFF_ACCESS.md). All six staff members can access all team tickets and downloads. Assignment and the instructor-privacy preference do not restrict access between staff. Do not upload real student records, medical absence notes, credentials, or other sensitive documents.

Before deployment, add per-ticket staff/student authorization, malware scanning and quarantine, appropriate content validation/sanitization, storage quotas and rate limits, HTTPS/CSRF protections, retention/deletion rules, and operational backup/recovery. The privacy checkbox is only a recorded preference. These safeguards follow the considerations in the [OWASP File Upload Cheat Sheet](https://cheatsheetseries.owasp.org/cheatsheets/File_Upload_Cheat_Sheet.html); this prototype is not a complete implementation of that guidance.
