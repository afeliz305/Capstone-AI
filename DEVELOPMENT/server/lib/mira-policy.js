"use strict";

// MIRA's policy router selects reviewed evidence; it does not contain course
// facts. Factual text always comes from the reviewed knowledge entries passed
// in by the active transport. Safety/coverage sentences describe app limits.
const normalize = value => String(value || "").toLowerCase().normalize("NFKD")
  .replace(/[\u0300-\u036f]/g, "").replace(/[^a-z0-9]+/g, " ").trim();

const navigationText = /^(?:take me there|open it|open that|open this section|show me (?:the )?instructions|show me that section|where does it say that|where does that say that|open the (first|second|third) source)$/;

function find(entries, id) { return entries.find(entry => entry.id === id); }

function clone(entry, answer) {
  return entry ? { ...entry, ...(answer ? { answer } : {}) } : null;
}

function result(entries, toPublic, spec) {
  const selected = spec.ids.map(id => find(entries, id)).filter(Boolean);
  if (!selected.length) return null;
  const matches = selected.map((entry, index) => toPublic(clone(entry, index === 0 ? spec.answer?.(entry) : null), 1));
  return {
    status: spec.status === "clarification_needed" ? "choices" : "matched",
    answerStatus: spec.status,
    responseStatus: spec.status,
    matches,
    links: [],
    supportingSourceIds: matches.map(match => match.id),
    courseContext: spec.context || { course:"CIS 4951", section:"RVC", term:"Fall 2026" },
    missingEvidence: spec.missingEvidence || "",
    accessScope: spec.accessScope || "course",
    navigationRequested: false
  };
}

function courseNavigation(entries, question, contextId, toPublic) {
  const text = normalize(question);
  if (!navigationText.test(text)) return null;
  const ids = String(contextId || "").split(",").filter(id => /^[a-z0-9-]+$/.test(id)).slice(0, 5);
  const selected = ids.map(id => find(entries, id)).filter(entry => entry && entry.sourceKind !== "prototype");
  if (!selected.length) return null;
  const ordinal = /open the (first|second|third) source/.exec(text)?.[1];
  const position = ordinal ? { first:0, second:1, third:2 }[ordinal] : null;
  if (position !== null) {
    if (!selected[position]) return result(entries, toPublic, {status:"clarification_needed",ids:selected.map(entry=>entry.id),missingEvidence:"The requested source number was not part of the previous answer."});
    const match=toPublic(selected[position],1);
    return {status:"matched",answerStatus:"answered",responseStatus:"answered",matches:[match],links:[],supportingSourceIds:[match.id],navigationRequested:true,missingEvidence:"",accessScope:match.access};
  }
  if (selected.length !== 1) return result(entries, toPublic, {status:"clarification_needed",ids:selected.map(entry=>entry.id),missingEvidence:"The previous answer had more than one verified destination."});
  const match=toPublic(selected[0],1);
  return {status:"matched",answerStatus:"answered",responseStatus:"answered",matches:[match],links:[],supportingSourceIds:[match.id],navigationRequested:true,missingEvidence:"",accessScope:match.access};
}

function routeMira(entries, question, contextId, toPublic) {
  const text=normalize(question);
  const navigation=courseNavigation(entries,question,contextId,toPublic);
  if(navigation) return navigation;

  // Privacy and non-authoritative action requests are checked before general
  // navigation so an overbroad portal shortcut can never expose or imply them.
  if(/(?:another|other) student|classmate/.test(text) && /grade|score|feedback/.test(text)) return result(entries,toPublic,{
    status:"privacy_restricted",ids:["syllabus-grading","contact-help"],accessScope:"public-course-policy",
    missingEvidence:"Another student's grading record is private and is never searched.",
    answer:entry=>"I cannot retrieve, compare, infer, or explain another student's private grade or circumstances. "+entry.answer+" Discuss only your own feedback with the instructor through the verified course contact route."
  });
  if(/(?:approve|mark|move).*(?:card)?.*done|approve my card/.test(text)) return result(entries,toPublic,{
    status:"escalation",ids:["portal-resources","contact-help"],accessScope:"authenticated-navigation-only",
    missingEvidence:"No reviewed source identifies an official card approver or approval checklist, and MIRA is read-only.",
    answer:()=>"MIRA cannot approve a card or change its status. I could not verify the official Done-approval process from the available content. Open the authenticated portal Resources area for current workflow instructions, or ask the instructor through Canvas Inbox."
  });
  if(/(?:move|switch|transfer|change).*(?:another|different|new).*(?:team)|(?:another|different|new).*team/.test(text)) return result(entries,toPublic,{
    status:"escalation",ids:["contact-help"],
    missingEvidence:"No reviewed source documents a team-change procedure or promises approval.",
    answer:entry=>"MIRA is read-only and cannot change team membership. I could not verify a published team-change procedure. "+entry.answer
  });
  if(/what grade will i receive|predict (?:my )?grade|guess (?:my )?grade|just guess.*grade|future grade/.test(text)) return result(entries,toPublic,{
    status:"partial",ids:["syllabus-grading","portal-grade"],
    missingEvidence:"A future or unofficial personal grade cannot be verified or predicted; Grade is outside the approved Overview-only connector scope.",
    answer:entry=>"I cannot predict or promise your sprint grade. "+entry.answer+" For a posted official result, open the portal Grade section or contact the instructor about your own feedback."
  });
  if(/extension|extra time|extend.*assignment/.test(text)) return result(entries,toPublic,{
    status:"partial",ids:["syllabus-late-work","contact-help"],
    missingEvidence:"Only the instructor can decide an individual request; MIRA cannot grant or submit one.",
    answer:entry=>entry.answer+" MIRA cannot grant, promise, or send an extension request. Use the verified instructor contact route if the documented grace period is not enough."
  });
  if(/acceptance criteria|success conditions|\bac\b/.test(text)) return result(entries,toPublic,{
    status:"link_only",ids:["portal-resources","contact-help"],accessScope:"authenticated-navigation-only",
    missingEvidence:"No reviewed public/syllabus source defines how card acceptance criteria control Verify or Done for this course.",
    answer:()=>"I could not verify course-specific acceptance-criteria instructions from the available indexed content. Do not treat criteria as satisfied without evidence or official review. Open the authenticated portal Resources area for the current workflow guidance; ask course staff if the card or policy remains unclear."
  });
  if(/definition of done|what does done mean|card.*\bdone\b|\bdone\b.*card/.test(text)) return result(entries,toPublic,{
    status:"link_only",ids:["portal-resources","contact-help"],accessScope:"authenticated-navigation-only",
    missingEvidence:"No reviewed public/syllabus source contains the course's Definition of Done or approval rule.",
    answer:()=>"I could not verify the course's Definition of Done from the available indexed content. A commit or student assertion alone is not verified approval. Open the authenticated portal Resources area for the current workflow instructions, or ask course staff. MIRA will not change the card."
  });
  if(/(?:move|enter|ready).*(?:to )?verify|verification now|before.*verify|verify requirements/.test(text)) return result(entries,toPublic,{
    status:"link_only",ids:["portal-resources","contact-help"],accessScope:"authenticated-navigation-only",
    missingEvidence:"No reviewed public/syllabus source contains the exact transition requirements for Verify.",
    answer:()=>"I could not verify the evidence, checks, fields, or review steps required before entering Verify. Verify and Done are different states, and MIRA will not move the card. Open the authenticated portal Resources area for the current workflow instructions, or ask course staff."
  });
  if(/what information.*stand ?up|what.*(?:put|include).*(?:stand ?up|daily scrum)|stand ?up (?:fields|template|content)/.test(text)) return result(entries,toPublic,{
    status:"link_only",ids:["daily-scrum","portal-resources"],accessScope:"authenticated-source-unverified",
    missingEvidence:"The portal lists a Daily Scrum template, but its current field contents were not readable in the approved Overview scope.",
    answer:()=>"The authenticated portal lists a Daily Scrum minutes template, but I could not verify its current required fields from the approved Overview-only scope. Open the template in portal Resources and treat its labels as authoritative; MIRA will not invent mandatory fields."
  });
  if(/how often.*(?:stand ?up|status update)|(?:stand ?up|status update).*frequency|finish.*stand ?up/.test(text)) return result(entries,toPublic,{
    status:"partial",ids:["syllabus-attendance"],
    missingEvidence:"The syllabus states the team's meeting frequency and individual participation basis, but not an exact per-member posting frequency.",
    answer:entry=>entry.answer+" This source does not establish that every member must post a separate update at that same cadence. Use the current course instructions or ask the instructor if posting frequency is distinct from meeting participation."
  });
  if(/sprint retrospective|\bretro\b|process improvement/.test(text)) return result(entries,toPublic,{
    status:"partial",ids:["syllabus-sprint-retrospective","portal-resources"],accessScope:"public-summary-plus-authenticated-navigation",
    missingEvidence:"The syllabus establishes the ceremony but does not provide its detailed checklist in the reviewed text. The portal destination is a navigation lead, not verified policy evidence."
  });
  if(/sprint review|review meeting|sprint demo/.test(text) && !/showcase/.test(text)) return result(entries,toPublic,{
    status:"partial",ids:["syllabus-sprint-review","portal-resources"],accessScope:"public-summary-plus-authenticated-navigation",
    missingEvidence:"The syllabus establishes the ceremony but does not provide its detailed checklist in the reviewed text. The portal destination is a navigation lead, not verified policy evidence."
  });
  if(/where.*(?:sprint work|work).*(?:submit|document|upload)|where.*(?:submit|document|upload).*(?:sprint work|work)|upload our sprint work/.test(text)) return result(entries,toPublic,{
    status:"answered",ids:["canvas-assignments"],answer:entry=>entry.answer
  });
  if(/(?:mira|you).*(?:cannot|can t|don t|doesn t|do not).*(?:answer|know)|who should i ask.*(?:don t|do not|cannot|can t) know|question.*(?:cannot|can t).*(?:answer|find)/.test(text)) return result(entries,toPublic,{
    status:"escalation",ids:["contact-help"],answer:entry=>entry.answer+" Include the course/term, sprint or assignment, the page/section you checked, and the specific point that remains unclear. No message or support request is sent automatically."
  });
  if((/current sprint|this sprint/.test(text) && /due|deadline|finish|end/.test(text)) && !/sprint\s+[1-5]/.test(text)) {
    const context=find(entries,String(contextId||""));
    if(context && /^syllabus-sprint-[1-5]$/.test(context.id)) return result(entries,toPublic,{status:"answered",ids:[context.id],answer:entry=>entry.answer});
    return result(entries,toPublic,{status:"clarification_needed",ids:["syllabus-sprint-1","syllabus-sprint-2","syllabus-sprint-3","syllabus-sprint-4","syllabus-sprint-5"],missingEvidence:"The public course sources do not identify the student's active sprint. Connect an authorized current Overview or specify Sprint 1-5."});
  }
  return null;
}

module.exports={routeMira,courseNavigation,normalize};
