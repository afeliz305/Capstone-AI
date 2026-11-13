// Reviewed non-personal classroom evidence. Tests enforce parity with course knowledge.
export const catalog = {
  "done": {
    "prompt": "What do I need to complete before a sprint card is considered Done?",
    "task": "explain-criteria",
    "context": "Fictional classroom example. No actual card or student record.",
    "sources": [
      {
        "id": "faro-board-acceptance-criteria",
        "title": "Acceptance criteria",
        "url": "https://capstone.cs.fiu.edu/board",
        "excerpt": "Acceptance criteria are the conditions that must be true for the Product Owner to accept a card. Evidence supports those conditions; Verify is a teammate check; Product Owner acceptance is the official decision. Meeting criteria or adding evidence does not by itself mean the card is accepted or Done. MIRA can explain the terms but cannot approve or move a card."
      },
      {
        "id": "faro-board-evidence",
        "title": "Card evidence",
        "url": "https://capstone.cs.fiu.edu/board",
        "excerpt": "Evidence is a link that helps prove the work functions, such as a demo clip, pull request, or test run. Evidence supports review, but it does not automatically mean the acceptance criteria are satisfied or that the card is verified, accepted, or Done. MIRA cannot make those decisions."
      },
      {
        "id": "faro-board-verify",
        "title": "Card verification",
        "url": "https://capstone.cs.fiu.edu/board",
        "excerpt": "The reviewed FARO Board guidance describes Verify as a teammate check and says the card owner does not perform that check. It does not provide a complete course-wide transition checklist. Evidence, Verify, Product Owner acceptance, and Done remain separate, and MIRA cannot move or approve the card."
      },
      {
        "id": "faro-board-review-decision",
        "title": "Product Owner review decision",
        "url": "https://capstone.cs.fiu.edu/board",
        "excerpt": "The reviewed Board guidance describes Accept and Request changes as the Product Owner's two decisions for a card in Review. MIRA can explain that workflow, but it is not the Product Owner, cannot determine a private card's current acceptance state, and cannot accept, approve, reject, move, or mark a card Done."
      }
    ]
  },
  "evidence": {
    "prompt": "What evidence should I prepare for that?",
    "task": "explain-criteria",
    "context": "Follow-up to: What do I need to complete before a sprint card is considered Done?",
    "sources": [
      {
        "id": "faro-board-acceptance-criteria",
        "title": "Acceptance criteria",
        "url": "https://capstone.cs.fiu.edu/board",
        "excerpt": "Acceptance criteria are the conditions that must be true for the Product Owner to accept a card. Evidence supports those conditions; Verify is a teammate check; Product Owner acceptance is the official decision. Meeting criteria or adding evidence does not by itself mean the card is accepted or Done. MIRA can explain the terms but cannot approve or move a card."
      },
      {
        "id": "faro-board-evidence",
        "title": "Card evidence",
        "url": "https://capstone.cs.fiu.edu/board",
        "excerpt": "Evidence is a link that helps prove the work functions, such as a demo clip, pull request, or test run. Evidence supports review, but it does not automatically mean the acceptance criteria are satisfied or that the card is verified, accepted, or Done. MIRA cannot make those decisions."
      }
    ]
  },
  "standup": {
    "prompt": "Help me draft a stand-up for a fictional card where I finished the UI but still need testing.",
    "task": "prepare-standup",
    "context": "Fictional classroom example. No actual card or student record.",
    "sources": [
      {
        "id": "daily-scrum",
        "title": "Daily Scrum template",
        "url": "https://capstone.cs.fiu.edu/static/templates/Daily_Scrum_Minutes_Template.docx",
        "excerpt": "The current Daily Scrum template asks for Team, Sprint, Date, start/end time, Attendees, and one update per attending member with Hours, Worked on, Next, and Blockers. It also asks for a team summary covering completed work, next work, and blockers. Keep its labels unchanged. The template and the separate usage guide currently disagree about cadence, so confirm the current posting frequency with the instructor rather than choosing one silently."
      }
    ]
  },
  "review": {
    "prompt": "How do I prepare both Sprint Review and Retrospective?",
    "task": "draft-review",
    "context": "Fictional classroom example. No actual card or student record.",
    "sources": [
      {
        "id": "sprint-review-template",
        "title": "Sprint Review template requirements",
        "url": "https://capstone.cs.fiu.edu/static/templates/Sprint_Review_Minutes_Template.docx",
        "excerpt": "The Sprint Review template asks for Team, Sprint, Date, start/end time, Attendees, each committed story with points and done/in-progress status, delivered points versus committed velocity, whether the sprint goal was met, demo notes, and Product Owner or stakeholder feedback and acceptance decisions."
      },
      {
        "id": "sprint-retrospective-template",
        "title": "Sprint Retrospective template requirements",
        "url": "https://capstone.cs.fiu.edu/static/templates/Sprint_Retrospective_Minutes_Template.docx",
        "excerpt": "The Sprint Retrospective template asks for Team, Sprint, Date, start/end time, Attendees, What Went Well, What Didn’t Go Well, and concrete next-sprint Action Items under Tasks with an owner for each action."
      }
    ]
  }
};
