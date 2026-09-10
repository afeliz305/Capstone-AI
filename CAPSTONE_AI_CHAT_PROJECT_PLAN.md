# Capstone AI Chat — Project Plan

## 1. Project goal

Build a standalone proof of concept for the FIU KFSCIS Capstone portal that helps users find answers from approved content already published on `https://capstone.cs.fiu.edu/`.

The prototype will use a chat-style interface, but it will not call a paid large-language-model API. It will retrieve curated answers from a local knowledge base, show the supporting page for every answer, and offer a support-request form when it cannot answer confidently or the user still needs help.

## 2. Product decision

For the first version, build a **retrieval-first support assistant**, not an open-ended generative chatbot.

This choice provides:

- no per-message AI-token cost;
- answers restricted to approved Capstone content;
- predictable responses that can be tested and reviewed;
- visible source links for trust and verification;
- a simpler privacy story for authenticated portal content;
- a clean upgrade path to a local model or hosted LLM later, if the owner wants one.

The pitch should describe it accurately as a zero-token, site-grounded support agent. It will feel conversational, but it will not invent new answers.

## 3. Findings from the current site

The prototype should reflect the site's existing information architecture and visual language.

### Public content areas

- Home
- Live Event
- Showcases
- Projects and project archive
- Engage
- Alumni
- Student Resources
- Tutorials
- About and Privacy
- Sponsor and Judge information

### Authenticated portal areas

- Overview and current-term guidance
- Messages
- Start Here / onboarding
- Team, Standing, and Grade
- Classmates, Alumni Directory, Connections, Opportunities, Team Contacts, and AI Anchors
- Record, Showcase, Letters, and Request a Letter
- Resources and Brand & Templates
- External Canvas link

### Existing support pattern

The dashboard already has a persistent **I need help** button. Its form asks what is wrong, what would help, and whether the request should remain between the student and instructor. The proposed assistant should sit immediately before this form in the support flow:

`I need help → search approved answers → confirm whether solved → create support request when unresolved`

The separate HelpDesk INC project demonstrates a useful ticket pattern, but Capstone AI Chat will not depend on that repository. This project will include its own minimal demo ticket queue instead of sending real professor emails.

## 4. MVP scope

### Included

- A standalone page styled to resemble the FIU Capstone portal.
- A floating **Capstone Assistant** button and accessible chat panel.
- Suggested starter topics such as deadlines, onboarding, sprint templates, showcase preparation, branding, tutorials, and contacting the instructor.
- A local, versioned knowledge-base file containing approved Capstone content.
- Deterministic intent matching for the most common questions.
- Ranked full-text retrieval for questions outside the predefined intents.
- Short, curated answers with the source page title and link.
- A **Did this answer your question?** step.
- One clarifying question when the match is uncertain.
- An escalation form prefilled with the user's unresolved question and relevant conversation summary.
- Creation of a ticket in this project's own local demo support queue.
- A confirmation containing the new ticket ID.
- Responsive, keyboard-accessible behavior.

### Excluded from the first version

- Direct changes to the production Capstone site.
- Automated FIU single sign-on.
- Reading or answering from a student's grades, private messages, team contacts, or directory data.
- Live synchronization with Canvas.
- Automatic email to the professor.
- Free-form answer generation or any paid AI API.
- Background crawling with a user's authenticated session.

Private or personalized portal content can be represented with sanitized demo data. Production access would require an owner-approved API or export and an explicit privacy review.

## 5. User experience

### Happy path

1. The user opens the assistant.
2. The assistant offers starter topics and accepts a typed question.
3. The question is normalized and matched against intents and indexed knowledge entries.
4. A high-confidence result returns a concise approved answer and source link.
5. The assistant asks whether the answer solved the problem.
6. If yes, the conversation closes or offers another question.

### Uncertain path

1. If several results are close, show up to three titled choices.
2. If confidence is low, ask one clarifying question.
3. If confidence remains low, state that the answer was not found on the approved Capstone pages and offer support escalation.

### Escalation path

1. The support form asks for name, FIU email, subject/category, what is wrong, and what would help.
2. It shows the question and conversation summary that will be attached.
3. The user chooses whether to include the transcript and confirms submission.
4. The prototype sends the request to `POST /api/tickets`.
5. The user receives a ticket ID; the request appears in this project's staff demo view.

No ticket or email should be created without an explicit submit action.

## 6. Technical design

### Front end

- Plain HTML, CSS, and JavaScript to keep the standalone prototype lightweight and easy to run.
- Chat state managed in the browser.
- Semantic HTML, focus trapping, Escape-to-close, readable status announcements, and mobile layout.
- FIU styling based on the portal's current palette, while using official brand assets only if the project owner approves their use.

### Knowledge base

Store reviewed content in a file such as `data/capstone-knowledge.json`. Each entry should contain:

```json
{
  "id": "resources-meeting-minutes",
  "title": "Meeting minutes templates",
  "url": "https://capstone.cs.fiu.edu/portal",
  "section": "Resources",
  "audience": ["student"],
  "access": "authenticated",
  "answer": "Use one template per Scrum ceremony...",
  "content": "Approved searchable source text...",
  "keywords": ["minutes", "scrum", "planning", "retro"],
  "lastReviewed": "YYYY-MM-DD"
}
```

Use curated entries rather than storing a raw copy of every authenticated page. Do not include names, grades, messages, contact lists, or other student-specific information.

### Retrieval pipeline

1. Normalize case, punctuation, common abbreviations, and spelling variants.
2. Check exact intent rules for high-value FAQs.
3. Expand a small approved synonym map, such as `retro → retrospective` and `slides → presentation`.
4. Rank knowledge entries with a local BM25-style or weighted term-frequency search.
5. Apply a confidence threshold:
   - high: show the curated answer;
   - medium: show two or three possible topics;
   - low: clarify once, then escalate.
6. Render only stored answer text and stored links. Do not compose unsupported factual claims.

This entire path runs locally and requires no model, API key, embedding service, or token budget.

### Server and ticketing

- Add a minimal Node server owned by this project.
- Provide `POST /api/tickets` for demo escalations.
- Add a Capstone-specific category and a field or activity note identifying the assistant as the source.
- Store only submitted escalations, not every chat session.
- Treat real email delivery as a later adapter so the demo does not contact the professor.

## 7. Initial knowledge topics

The first reviewed dataset should cover approximately 30–50 answer entries across:

- getting started and onboarding;
- team and Capstone terminology;
- sprint planning, standups, reviews, retrospectives, and meeting-minutes templates;
- project and showcase navigation;
- poster, slide, documentation, and video preparation;
- official brand colors, logo use, and template selection;
- tutorials by audience;
- sponsor, judge, alumni, and engagement paths;
- where Canvas is required instead of the Capstone portal;
- privacy boundaries and how to request instructor help.

Current-term dates should be clearly tagged and reviewed each semester. If a date is absent or stale, the assistant should link to the relevant page or Canvas rather than guess.

## 8. Delivery plan

### Phase 1 — Content and test inventory (1 day)

- Finalize the public and authenticated-page allowlist.
- Create the knowledge schema and initial approved entries.
- Write 25–40 representative student questions with expected answers and sources.

### Phase 2 — Search engine and answer rules (1–2 days)

- Implement normalization, synonyms, intent rules, ranking, and confidence thresholds.
- Add automated tests for exact, paraphrased, ambiguous, and unsupported questions.

### Phase 3 — Chat interface (1–2 days)

- Build the floating chat window and conversation states.
- Add starter prompts, source cards, result choices, feedback buttons, and accessibility behavior.
- Match the Capstone portal's visual style for the pitch.

### Phase 4 — Escalation workflow (1 day)

- Connect unresolved chats to the project's local ticket API.
- Prefill the request without submitting automatically.
- Display ticket confirmation and verify it in the staff demo queue.

### Phase 5 — QA and pitch preparation (1–2 days)

- Run the question suite and fix weak matches.
- Test desktop, mobile, keyboard, empty-state, offline, and server-error behavior.
- Prepare a short demo script showing a successful answer, an ambiguous question, and an escalation.

Estimated MVP effort: **6–8 focused development days**, depending mainly on how much portal content is approved for the demo.

## 9. Acceptance criteria

- No external AI or embedding API is called during a conversation.
- Every factual answer includes at least one Capstone source link.
- The assistant never answers from outside the approved knowledge file.
- At least 85% of the agreed question suite returns the expected answer as the first result.
- Unsupported questions never produce a made-up answer.
- After at most one clarification, an unresolved user can open the support form.
- The form is not sent without explicit user submission.
- A submitted request appears in the shared agent queue with the question and selected context.
- No private student data is included in the knowledge base.
- The chat is usable by keyboard and at common mobile and desktop widths.

## 10. Risks and controls

| Risk | Control |
| --- | --- |
| Site content changes each term | Store `lastReviewed`, version the dataset, and run the question suite after updates. |
| Keyword search misses natural phrasing | Add synonyms and reviewed intent examples from failed tests. |
| Authenticated content exposes personal data | Curate only generic guidance; require an approved production API for personalized information. |
| Users assume the bot is generative AI | Explain that answers come from reviewed Capstone content and always show the source. |
| A malicious page injects instructions | Fetch only approved URLs during content preparation and store plain reviewed text; never execute page content. |
| Email creates unwanted messages during demos | Route MVP escalations to the existing ticket queue; add email only after owner approval. |

## 11. Future implementation path

If the prototype is approved, the next production discussion should cover:

- a supported widget insertion point in the Capstone codebase;
- an owner-approved content export or API;
- FIU SSO and role-aware access;
- automated semester content review;
- professor or staff notification through an approved mail service;
- retention, consent, audit, and privacy requirements;
- optional local embeddings or a self-hosted small model if deterministic retrieval proves insufficient.

## 12. Recommended first build target

Build this standalone repository as a single demo with two views:

1. **Student view:** a Capstone-styled page with the assistant and escalation form.
2. **Staff view:** a small Capstone support queue showing escalated requests.

The first vertical slice should answer five topics well—onboarding, sprint minutes, showcase preparation, brand templates, and tutorials—then escalate one unknown question into a visible ticket. That is enough to validate the concept with the project owner before expanding the content set.
