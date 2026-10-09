"use strict";

// Review and test metadata only. This module is not imported by the public
// browser runtime, so unresolved values and exclusion labels stay out of the
// generated MIRA package.
const vocabulary = Object.freeze([
  ["faro-board-card", "knowledge", ["card", "task card", "sprint card", "work item"]],
  ["faro-board-size", "knowledge", ["size", "card size", "story size", "s m l"]],
  ["faro-board-owner", "knowledge", ["owner", "card owner", "assignee"]],
  ["faro-board-acceptance-criteria", "knowledge", ["acceptance criteria", "acceptance conditions", "card requirements"]],
  ["faro-board-evidence", "knowledge", ["evidence", "proof", "supporting evidence"]],
  ["faro-board-verify", "knowledge", ["verify", "verification", "peer check"]],
  ["faro-board-review-decision", "knowledge", ["accept", "request changes", "product owner review"]],
  ["faro-board-blocked", "knowledge", ["blocked", "blocker", "external dependency"]],
  ["faro-board-standup", "official-source-alias-only", ["standup", "stand-up", "stand up", "daily update", "daily scrum", "status update"]],
  ["faro-board-sprint-review", "official-source-alias-only", ["sprint review", "review demo", "sprint demo"]],
  ["faro-board-retro", "official-source-alias-only", ["retro", "retrospective", "sprint retrospective"]],
  ["faro-meetings-find-a-time", "navigation-only", ["find a time", "common time", "availability grid"]],
  ["faro-meetings-poll", "navigation-only", ["meeting poll", "availability poll", "vote on times"]],
  ["faro-meetings-meet-now", "navigation-only", ["meet now", "start team call", "quick call"]],
  ["faro-meetings-calendar-feed", "help-navigation-only", ["calendar feed", "ics feed", "calendar subscription"]]
].map(([id, action, aliases]) => Object.freeze({ id, action, aliases:Object.freeze(aliases) })));

const conflicts = Object.freeze([
  Object.freeze({
    id: "faro-conflict-standup-frequency",
    topic: "Stand-up frequency",
    faroValue: "2 or more a week",
    currentMiraValue: "The linked Daily Scrum template and usage guide conflict, so MIRA does not choose a cadence.",
    faroAuthority: "FARO static curated Board vocabulary",
    currentSourceAuthority: "official linked Daily Scrum template and official usage guide",
    term: "Fall 2026",
    status: "HUMAN_REVIEW_REQUIRED",
    userVisibleOnlyWhenAsked: true
  }),
  Object.freeze({
    id: "faro-conflict-office-hours",
    topic: "Office Hours wording",
    faroValue: "schedule to be confirmed",
    currentMiraValue: "No FARO schedule is asserted; use an approved current source or the instructor contact route.",
    faroAuthority: "generic FARO Learn more copy",
    currentSourceAuthority: "current term official source required",
    term: "Fall 2026",
    status: "HUMAN_REVIEW_REQUIRED",
    userVisibleOnlyWhenAsked: true
  })
]);

const navigationAliases = Object.freeze({
  board: Object.freeze(["open my board", "take me to my card", "open review on my board", "show my sprint cards"]),
  meetings: Object.freeze(["open find a time", "open the meeting poll", "start a team call", "open my calendar feed"])
});

const excluded = Object.freeze([
  "generated FARO responses", "FARO history", "private prompts", "personal status",
  "grades", "message content", "selected private work", "account identifiers"
]);

module.exports = { vocabulary, conflicts, navigationAliases, excluded };
