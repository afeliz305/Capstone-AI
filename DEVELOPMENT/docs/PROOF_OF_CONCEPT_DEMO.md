# Capstone - AI pre-integration proof of concept

Updated September 28, 2026. This is the current demonstration guide and capability boundary. It does not require portal source code, a portal API, a browser extension, or professor-side installation for the public Ocelot demonstration. The completed acceptance evidence is recorded in [PROOF_OF_CONCEPT_ACCEPTANCE.md](PROOF_OF_CONCEPT_ACCEPTANCE.md).

Final local verification: the complete suite discovered 298 tests, with **297 passed, 0 failed, and 1 optional hosted-PHP integration test skipped**. The generated Supabase Ocelot website contains **24 manifest-matched public files (4,923,599 bytes)**; its checksum record is `dist/release-records/ocelot-upload-mfovxi/`. The hosted/public, fictional authenticated-support, attachment, privacy, and concurrency results are documented separately in the acceptance record. The current packaging verification did not upload files, change deployment, mutate Supabase, or modify the professor portal.

## What the demonstration proves

The current proof of concept demonstrates three separate capabilities. Do not describe all three as live account access.

| Capability | Works independently today | Source and retention | What it does not claim |
| --- | --- | --- | --- |
| **A. Public/course answers and navigation** | Yes, in the generated Ocelot package | Reviewed public site index, Fall 2026 syllabus, and the central portal destination map | It does not read private dashboard values. Opening a portal link does not mark MIRA as live connected. |
| **B. Use information I share** | Yes, in the generated Ocelot package | Plain text deliberately pasted by the user; application memory only; each source expires no later than five minutes after import | It is not a live account connection, identity verification, complete dashboard index, or automatic synchronization. |
| **C. Local live prototype** | Yes, when the existing presenter connector is available and authorized | The presenter’s approved local browser/helper lifecycle; private snapshots remain local and temporary | It is not connected to the public Ocelot website and is not available to hosted testers. |
| **Future portal-native integration** | No; preserved for later owner review | Existing owner handoff package and adapter contract | It is not a prerequisite for this demonstration and is not installed in the portal. |

Use this exact description in the presentation:

> The current demo proves retrieval, source-grounded answers, and navigation. Automatic hosted account access is a later integration.

## Hosted tester flow

The hosted application is zero-install. A tester needs only the Ocelot URL and a browser. The hosted MIRA experience does not use the local helper, extension, Chrome debugging, the presenter’s browser, or changes to the Capstone portal.

### Public and course answers

Ask a public or course question. MIRA answers from reviewed evidence and shows its source. Portal shortcuts are navigation only. The central destination map contains the tested signed-in destinations:

- Grade: `https://capstone.cs.fiu.edu/portal#mygrade`
- Messages: `https://capstone.cs.fiu.edu/portal#messages`
- Team: `https://capstone.cs.fiu.edu/portal#team`
- Standing: `https://capstone.cs.fiu.edu/portal#compare`

The portal handles its own sign-in, including its one-time email flow. MIRA never asks for the verification code. If the portal returns to Overview after login, choose the intended section or reopen the MIRA shortcut. The prototype does not claim to fix that portal behavior.

### Use information I share

1. Open MIRA and select **Use information I share**.
2. Read the warning. Use fictional or redacted information for the demonstration.
3. Choose **Task**, **Sprint**, **Grade**, **Team**, **Course instructions**, or **Other**.
4. Enter a short title and optional term/sprint context.
5. Paste only the selected plain text MIRA should use. Remove unnecessary personal details.
6. Select **Use this information** and ask a question.
7. Inspect the evidence excerpt and source label. Use **Where does it say that?** for the cited text or **Take me there** for a suggested, separately labeled portal destination.
8. Use **Remove this source**, **Clear shared information**, or **Start a new demo session** before handing the device to another person.

Each source has a random local ID, user-selected title/category, supplied text, time added, optional term/sprint context, expiration time, and the label **User-provided, unverified text**. “Added” is not a portal publication or retrieval time. A suggested portal link does not mean its current contents were checked.

Multiple snippets can be loaded. MIRA retrieves relevant excerpts by keywords and reviewed paraphrase terms, identifies each source, and maintains source context for follow-ups. If a copied table has lost its columns, MIRA asks for clarification instead of assigning numbers to labels. If the snippets do not support an answer, MIRA says what is missing and may offer the related verified portal section; it does not claim the information is absent from the real account.

### Fictional sample mode

Select **Load fictional sample** when nobody should paste personal information. The banner must say **Sample data — not your account**. Sample data, user-shared text, public knowledge, and local live records are separate source sets. Samples are never loaded automatically and never replace a failed live connection.

## Privacy and data-handling boundary

User-shared sources and their dependent personal conversation stay in application memory and expire at most five minutes after import. The shared-information route does not call Supabase, ticket submission, hosted search, an AI provider, analytics, session replay, or error reporting. It does not store private content in localStorage, sessionStorage, IndexedDB, files, saved chat history, or service-worker caches. Shared questions and answers are excluded from the optional ticket transcript.

MIRA uses plain-text rendering. Markup, links, scripts, and instructions inside pasted text are evidence, not executable content. Credential-like text is rejected, but this is a precaution rather than complete secret detection. Do not paste login codes, passwords, cookies, access/refresh tokens, or another person’s records.

Memory-only handling is not an isolated security boundary from every script running on the same origin. The public build still includes the application’s normal Supabase ticket/staff client code. The private retrieval route is prevented from calling it, but production use with sensitive education records still requires owner security/privacy review, an approved threat model, content-security controls, and institutional data-handling approval. Use fictional or deliberately redacted content for this demonstration.

The manual-sharing mode cannot detect logout or account switching in a separate portal tab. It cannot prove the pasted text belongs to the signed-in account or that it is current.

## Five-minute presentation script

### Minute 1 — grounded public/course answer

Open the Ocelot build, open MIRA, and ask **What is required for a Sprint Review?** Show the answer, evidence excerpt, and reviewed source. Explain that this is indexed public/course content and uses no paid AI model.

### Minute 2 — verified navigation

Ask **Open my grade** or **Open my team**. Use the offered portal destination. Explain that the portal performs its own sign-in and may return to Overview before the student selects/reopens the destination. State that this is a verified navigation shortcut, not a dashboard read.

### Minute 3 — temporary personalized question

Select **Load fictional sample**. Point out **Sample data — not your account**. Ask **Which acceptance criteria mention testing?** Show that the answer begins **Based on the information you shared** and cites the fictional source.

### Minute 4 — follow-up, evidence, and destination

Select **Where does it say that?**, inspect the evidence excerpt, then select **Take me there**. Explain that the destination is suggested from the central reviewed navigation map and that the current page contents were not checked. Optionally show an unclear copied score table and the clarification response.

### Minute 5 — separate presenter-only live prototype

Only if the existing local connector is available, show it under this label:

> Local live prototype — not connected to the public Ocelot website.

Verify the authorized account, ask one supported non-sensitive personal question, ask a contextual follow-up, show its source, and open the actual destination. If the connector is unavailable, say so and end with the distinction between today’s proof and a future owner-installed integration. Never substitute sample data while calling it live.

## Fifteen-question acceptance interpretation

The exact automated acceptance set remains in `test/mira-acceptance.test.js`. Results are intentionally not all “live account verified.”

| Questions | Current interpretation |
| --- | --- |
| Sprint Review, Sprint Retrospective, stand-up fields | Supported public/course answers with reviewed sources. |
| Current sprint due date | Needs a named sprint or authorized context; otherwise clarification. A shared snippet can answer only when it states the deadline. |
| Per-member stand-up frequency, Sprint submission/documentation | Partial because reviewed sources conflict or the destination depends on the work item. |
| Verify, Definition of Done, global acceptance-criteria policy | Navigation/source gap; MIRA does not invent a rule. A pasted card-specific excerpt can answer only from that excerpt. |
| Unanswered question, team change, card approval | Correct escalation/read-only limitation; MIRA performs no change. |
| Extension and future sprint grade | Published policy/criteria only; no approval or grade prediction. |
| Another student’s grade | Privacy restricted. |

## Verification commands

Run from `DEVELOPMENT` in PowerShell:

```powershell
npm.cmd install
node --test test/shared-information.test.js test/chat-popup.test.js test/portal-navigation.test.js test/mira-acceptance.test.js
npm.cmd test
npm.cmd run package:ocelot:supabase
npm.cmd run preview:ocelot
```

Open the printed preview URL and test the generated sibling **Capstone - AI** folder, not source files through a generic file server. Test with the helper and extension unavailable. The packager preserves the previous generated release for rollback and does not upload Ocelot files.

## Remaining limitations

- Hosted MIRA cannot automatically read a student’s messages, grades, team, standing, tasks, or deadlines.
- Pasted information is manual, temporary, user-provided, and unverified.
- Lexical retrieval handles common wording and reviewed paraphrases but is not a general reasoning model.
- The five-minute limit is enforced in browser application memory; a page reload also discards the sources.
- A same-origin security review is still required before allowing sensitive real records.
- The existing presenter connector remains local development tooling and may be unavailable at demonstration time.
- Official integration still requires portal-owner approval, identity/authorization design, privacy review, and an approved data interface or portal-native installation.

The preserved portal-owner package is future work. Do not upload it to Ocelot and do not make it a requirement for the current proof of concept.
