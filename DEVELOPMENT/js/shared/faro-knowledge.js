"use strict";

// Reviewed secondary knowledge only. The source audit intentionally excludes
// FARO history, generated answers, private account state and selected work.
const BOARD_URL = "https://capstone.cs.fiu.edu/board";
const MEETINGS_URL = "https://capstone.cs.fiu.edu/meetings";
const REVIEWED_AT = "2026-10-09";

function boardEntry({ id, title, question, answer, content, aliases, keywords, intents, followUps = [] }) {
  return Object.freeze({
    id,
    title,
    canonicalQuestion: question,
    answer,
    content,
    category: "Board workflow",
    section: "Board workflow",
    provenance: "FARO_CURATED",
    sourceKind: "faro-curated",
    sourceTitle: "Capstone portal · Board workflow",
    url: BOARD_URL,
    faroSourceTitle: "FARO contextual vocabulary · Board",
    faroSourceUrl: BOARD_URL,
    underlyingOfficialSource: Object.freeze({
      title: "Capstone portal · Board",
      url: BOARD_URL,
      authority: "current portal instruction"
    }),
    authorityLevel: "reviewed secondary portal guidance",
    term: "Fall 2026 / generic workflow",
    applicability: "Fall 2026 / generic workflow",
    aliases: Object.freeze(aliases),
    keywords: Object.freeze(keywords),
    intents: Object.freeze(intents),
    navigationTarget: BOARD_URL,
    access: "authenticated",
    audience: "student",
    reviewedAt: REVIEWED_AT,
    reviewRequired: false,
    followUps: Object.freeze(followUps)
  });
}

const entries = Object.freeze([
  boardEntry({
    id: "faro-board-card",
    title: "Sprint card",
    question: "What is a card?",
    answer: "A card is one piece of work small enough to finish in a sprint. Card, acceptance criteria, evidence, Verify, Product Owner acceptance, and Done are separate concepts; MIRA will not treat one as proof of another.",
    content: "FARO defines a Card as one piece of work small enough to finish in a sprint.",
    aliases: ["task card", "sprint card", "work item"],
    keywords: ["card", "task card", "sprint card", "work item", "board"],
    intents: ["what is a card", "what is a sprint card", "what does card mean"],
    followUps: ["What are acceptance criteria?", "What counts as evidence?", "Open my Board"]
  }),
  boardEntry({
    id: "faro-board-size",
    title: "Card size",
    question: "What do S, M, and L mean on a card?",
    answer: "The reviewed Board guidance describes card sizes as S: a day or two; M: most of a week; and L: split it if you can. Size estimates effort; they do not prove priority, approval, acceptance, or Done status.",
    content: "FARO's visible Size definition is: S a day or two; M most of a week; L split it if you can.",
    aliases: ["card size", "story size", "S M L"],
    keywords: ["card size", "story size", "small", "medium", "large", "S M L"],
    intents: ["what do s m and l mean", "what is card size", "how are cards sized"],
    followUps: ["What is a card?", "Open my Board"]
  }),
  boardEntry({
    id: "faro-board-owner",
    title: "Card owner",
    question: "Who is the owner of a card?",
    answer: "The reviewed Board guidance describes the card owner as the one person who moves the card forward. A card owner is not the same role as the Product Owner, and ownership alone does not approve the work.",
    content: "FARO defines Owner as the one person who moves the card forward.",
    aliases: ["card owner", "assignee"],
    keywords: ["owner", "card owner", "assignee", "assigned", "board"],
    intents: ["who owns a card", "what is a card owner", "who is the assignee"],
    followUps: ["Who can verify a card?", "Who decides whether a card is accepted?", "Open my Board"]
  }),
  boardEntry({
    id: "faro-board-acceptance-criteria",
    title: "Acceptance criteria",
    question: "What are acceptance criteria?",
    answer: "Acceptance criteria are the conditions that must be true for the Product Owner to accept a card. Evidence supports those conditions; Verify is a teammate check; Product Owner acceptance is the official decision. Meeting criteria or adding evidence does not by itself mean the card is accepted or Done. MIRA can explain the terms but cannot approve or move a card.",
    content: "FARO defines Acceptance criteria as what must be true for the Product Owner to accept the card. Criteria remain distinct from evidence, Verify, acceptance and Done.",
    aliases: ["acceptance conditions", "done conditions", "card requirements", "success conditions"],
    keywords: ["acceptance criteria", "acceptance conditions", "card criteria", "card requirements", "criteria complete", "satisfy criteria"],
    intents: [
      "what are acceptance criteria", "how do i use acceptance criteria", "what does this card need to satisfy",
      "how do i know whether criteria are complete", "what criteria do i have to satisfy"
    ],
    followUps: ["What counts as evidence?", "Who can verify a card?", "Who decides whether it is accepted?", "Open my Board"]
  }),
  boardEntry({
    id: "faro-board-evidence",
    title: "Card evidence",
    question: "What counts as evidence on a card?",
    answer: "Evidence is a link that helps prove the work functions, such as a demo clip, pull request, or test run. Evidence supports review, but it does not automatically mean the acceptance criteria are satisfied or that the card is verified, accepted, or Done. MIRA cannot make those decisions.",
    content: "FARO defines Evidence as a link that proves the work functions and gives a demo clip, pull request and test run as examples.",
    aliases: ["proof", "proof of completion", "supporting evidence", "demo link", "pull request", "test run"],
    keywords: ["evidence", "proof", "supporting evidence", "proof of completion", "demo clip", "pull request", "test run"],
    intents: [
      "what counts as evidence", "how do i prove my card works", "what evidence should i attach",
      "does adding evidence mean the card is done", "what does evidence establish"
    ],
    followUps: ["Does evidence mean the card is Done?", "What are acceptance criteria?", "Who can verify a card?", "Open my Board"]
  }),
  boardEntry({
    id: "faro-board-verify",
    title: "Card verification",
    question: "Who can verify a card?",
    answer: "The reviewed FARO Board guidance describes Verify as a teammate check and says the card owner does not perform that check. It does not provide a complete course-wide transition checklist. Evidence, Verify, Product Owner acceptance, and Done remain separate, and MIRA cannot move or approve the card.",
    content: "FARO defines Verify as a teammate, never the owner, checking the card. This reviewed secondary wording is not a complete transition checklist.",
    aliases: ["peer verify", "peer check", "card verification", "teammate check"],
    keywords: ["verify", "verification", "peer verify", "peer check", "teammate check", "card owner"],
    intents: [
      "who can verify a card", "what does verify mean", "can the card owner verify their own work",
      "what happens before a card goes to verify", "what should i verify before moving a card forward"
    ],
    followUps: ["What counts as evidence?", "What happens after verification?", "Open my Board"]
  }),
  boardEntry({
    id: "faro-board-review-decision",
    title: "Product Owner review decision",
    question: "Who decides whether a card is accepted?",
    answer: "The reviewed Board guidance describes Accept and Request changes as the Product Owner's two decisions for a card in Review. MIRA can explain that workflow, but it is not the Product Owner, cannot determine a private card's current acceptance state, and cannot accept, approve, reject, move, or mark a card Done.",
    content: "FARO labels Accept and Request changes as the Product Owner's two choices for a card in Review.",
    aliases: ["accept card", "request changes", "Product Owner review", "official decision"],
    keywords: ["product owner", "accept", "accepted", "request changes", "review decision", "approve", "approval"],
    intents: [
      "who decides whether this is accepted", "what can the product owner do in review", "can the product owner ask for changes",
      "can mira approve it", "can you approve this", "is this accepted", "can this be marked done"
    ],
    followUps: ["What are acceptance criteria?", "What counts as evidence?", "Open my Board"]
  }),
  boardEntry({
    id: "faro-board-blocked",
    title: "Blocked card",
    question: "What does Blocked mean?",
    answer: "The reviewed Board guidance defines Blocked as waiting on something outside the team. A blocker describes an impediment; it does not by itself change ownership, approval, acceptance, or Done status.",
    content: "FARO defines Blocked as waiting on something outside the team.",
    aliases: ["blocker", "waiting on", "external dependency"],
    keywords: ["blocked", "blocker", "waiting on", "external dependency", "impediment"],
    intents: ["what does blocked mean", "what is a blocker", "why is a card blocked"],
    followUps: ["Open my Board", "What should go in my standup?"]
  })
]);

// Review-only conflict values and exclusion labels intentionally live outside
// this browser-bundled module so the public package contains only safe runtime
// knowledge. See server/lib/faro-review-metadata.js.
module.exports = { entries, REVIEWED_AT, BOARD_URL, MEETINGS_URL };
