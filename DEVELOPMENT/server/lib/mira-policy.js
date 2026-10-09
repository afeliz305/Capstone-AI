"use strict";

// MIRA's policy router selects reviewed evidence; it does not contain course
// facts. Factual text always comes from the reviewed knowledge entries passed
// in by the active transport. Safety/coverage sentences describe app limits.
const normalize = value => String(value || "").toLowerCase().normalize("NFKD")
  .replace(/[\u0300-\u036f]/g, "").replace(/[^a-z0-9]+/g, " ").trim();

const navigationText = /^(?:take me there|open it|open that|open this section|show me (?:the )?instructions|show me that section|where does it say that|where does that say that|where do i get it|where can i get it|open the (first|second|third) source)$/;

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
  if(/(?:another|other) student|classmate/.test(text) && /card|work|task|board|project/.test(text)) return result(entries,toPublic,{
    status:"privacy_restricted",ids:["grades-privacy","contact-help"],accessScope:"public-course-policy",
    missingEvidence:"Another student's private work is never searched or indexed.",
    answer:entry=>"I cannot retrieve, list, compare, or infer another student's cards, work, project records, or private status. "+entry.answer
  });
  if(/(?:another|other) student|classmate/.test(text) && /grade|score|feedback/.test(text)) return result(entries,toPublic,{
    status:"privacy_restricted",ids:["syllabus-grading","contact-help"],accessScope:"public-course-policy",
    missingEvidence:"Another student's grading record is private and is never searched.",
    answer:entry=>"I cannot retrieve, compare, infer, or explain another student's private grade or circumstances. "+entry.answer+" Discuss only your own feedback with the instructor through the verified course contact route."
  });
  if(/(?:read|show|list|give me).*(?:all )?(?:inbox )?(?:messages?|conversations?|threads?)|open all.*(?:messages?|conversations?|threads?)|message bodies/.test(text)) return result(entries,toPublic,{
    status:"privacy_restricted",ids:["portal-messages"],accessScope:"authenticated-navigation-only",
    missingEvidence:"Inbox access is metadata-only; message bodies and bulk conversation history are excluded.",
    answer:entry=>"MIRA cannot read, list, or retain Inbox message bodies or conversation history. "+entry.answer
  });
  if(/(?:show|read|list|open|give me).*(?:faro )?(?:history|conversations?|private prompts?)/.test(text)) return result(entries,toPublic,{
    status:"privacy_restricted",ids:["grades-privacy"],accessScope:"public-course-policy",
    missingEvidence:"Private FARO history and generated conversations are excluded from MIRA.",
    answer:entry=>"MIRA cannot retrieve or expose private FARO history, prompts, or generated conversations. "+entry.answer
  });
  if(/(?:everyone|all (?:students?|people)|class roster|student directory).*(?:class|course|portal)?|(?:give|show|list).*(?:everyone|class roster|student directory)/.test(text)) return result(entries,toPublic,{
    status:"privacy_restricted",ids:["portal-classmates","grades-privacy"],accessScope:"authenticated-navigation-only",
    missingEvidence:"Broad student directories and unrelated people are excluded.",
    answer:entry=>"MIRA cannot compile or expose a class roster or broad student directory. "+entry.answer
  });
  if(/(?:save|store|remember|retain|keep|use).*(?:portal|private|personal).*(?:permanent|forever|future users?|other users?|shared|later)|(?:future users?|other users?).*(?:private|personal|portal) data/.test(text)) return result(entries,toPublic,{
    status:"privacy_restricted",ids:["syllabus-data-policy","grades-privacy"],accessScope:"public-course-policy",
    missingEvidence:"Personal portal context is session-scoped and cannot be added to shared knowledge or retained for future users.",
    answer:entry=>"MIRA will not save personal portal context permanently or reuse it for future users. "+entry.answer
  });
  const context=find(entries,String(contextId||""));
  if(context?.provenance==="FARO_CURATED" && /^(?:tell me more|what does that mean|how do i use that)$/.test(text)) return result(entries,toPublic,{
    status:"answered",ids:[context.id],accessScope:"authenticated-portal-guidance"
  });
  if(context?.id==="faro-board-acceptance-criteria" && /who decides (?:that|whether it is accepted)|who approves (?:that|it)$/.test(text)) return result(entries,toPublic,{
    status:"answered",ids:["faro-board-review-decision"],accessScope:"authenticated-portal-guidance"
  });
  if(context?.id==="faro-board-evidence" && /(?:does|would) (?:that|it) mean (?:the card is )?done|does (?:that|it) prove (?:approval|acceptance)/.test(text)) return result(entries,toPublic,{
    status:"answered",ids:["faro-board-evidence"],accessScope:"authenticated-portal-guidance"
  });
  if(context?.id==="faro-board-verify" && /what happens after (?:verify|verification)|who decides (?:after that|next)/.test(text)) return result(entries,toPublic,{
    status:"answered",ids:["faro-board-review-decision"],accessScope:"authenticated-portal-guidance"
  });
  if(/(?:approve|mark|move).*(?:card)?.*done|approve my card/.test(text)) return result(entries,toPublic,{
    status:"escalation",ids:["faro-board-review-decision","contact-help"],accessScope:"authenticated-portal-guidance",
    missingEvidence:"MIRA cannot inspect enough private state to decide that a card is accepted or Done, and it cannot perform a Product Owner action.",
    answer:entry=>entry.answer+" Ask the Product Owner or course staff if an official decision is still needed."
  });
  if(/(?:move|switch|transfer|change).*(?:another|different|new).*(?:team)|(?:another|different|new).*team/.test(text)) return result(entries,toPublic,{
    status:"escalation",ids:["contact-help"],
    missingEvidence:"No reviewed source documents a team-change procedure or promises approval.",
    answer:entry=>"MIRA is read-only and cannot change team membership. I could not verify a published team-change procedure. "+entry.answer
  });
  if(/what grade will i receive|predict (?:my )?grade|guess (?:my )?grade|just guess.*grade|future grade/.test(text)) return result(entries,toPublic,{
    status:"partial",ids:["syllabus-grading","portal-grade"],
    missingEvidence:"A future or unofficial personal grade cannot be verified or predicted. The connected Grade section can report posted components only.",
    answer:entry=>"I cannot predict or promise your sprint grade. "+entry.answer+" For a posted official result, open the portal Grade section or contact the instructor about your own feedback."
  });
  if(/extension|extra time|extend.*assignment/.test(text)) return result(entries,toPublic,{
    status:"partial",ids:["syllabus-late-work","contact-help"],
    missingEvidence:"Only the instructor can decide an individual request; MIRA cannot grant or submit one.",
    answer:entry=>entry.answer+" MIRA cannot grant, promise, or send an extension request. Use the verified instructor contact route if the documented grace period is not enough."
  });
  if(/\b(?:evidence|proof)\b/.test(text) && !/what still needs evidence/.test(text)) return result(entries,toPublic,{
    status:"answered",ids:["faro-board-evidence"],accessScope:"authenticated-portal-guidance"
  });
  if(/acceptance criteria|success conditions|\bac\b|criteria.*(?:satisfy|complete)|(?:satisfy|complete).*criteria/.test(text)) return result(entries,toPublic,{
    status:"answered",ids:["faro-board-acceptance-criteria"],accessScope:"authenticated-portal-guidance"
  });
  if(/definition of done|what does done mean|card.*\bdone\b|\bdone\b.*card/.test(text)) return result(entries,toPublic,{
    status:"partial",ids:["faro-board-review-decision","faro-board-acceptance-criteria","faro-board-evidence"],accessScope:"authenticated-portal-guidance",
    missingEvidence:"The reviewed FARO vocabulary distinguishes criteria, evidence, verification and Product Owner decisions, but it does not define a complete official course Definition of Done.",
    answer:()=>"MIRA did not find a complete official course Definition of Done. Acceptance criteria, evidence, teammate verification, and Product Owner acceptance are separate steps; none alone proves that the card is Done. MIRA cannot approve or move the card."
  });
  if(/(?:move|enter|ready).*(?:to )?verify|verification now|before.*verif(?:y|ication)|(?:missing|required|need).*before.*verif(?:y|ication)|verify requirements/.test(text)) return result(entries,toPublic,{
    status:"partial",ids:["faro-board-verify","faro-board-acceptance-criteria","faro-board-evidence"],accessScope:"authenticated-portal-guidance",
    missingEvidence:"FARO provides reviewed terminology but not a complete course-wide checklist for entering Verify.",
    answer:entry=>entry.answer+" Review the criteria and evidence recorded on your own card, then ask course staff if the transition requirement remains unclear."
  });
  if(/^(?:verify|how (?:do|can|should) i verify|what does verify mean|who can verify a card|can the card owner verify their own work)$/.test(text)) return result(entries,toPublic,{
    status:"answered",ids:["faro-board-verify"],accessScope:"authenticated-portal-guidance"
  });
  if(/who decides whether (?:this|it|a card) is accepted|what can the product owner do in review|can the product owner (?:ask for|request) changes/.test(text)) return result(entries,toPublic,{
    status:"answered",ids:["faro-board-review-decision"],accessScope:"authenticated-portal-guidance"
  });
  if(/can (?:mira|you) approve (?:it|this)|is (?:this|my|the) (?:card )?accepted|has (?:this|my|the) card been accepted/.test(text)) return result(entries,toPublic,{
    status:"partial",ids:["faro-board-review-decision","portal-board"],accessScope:"authenticated-navigation-only",
    missingEvidence:"MIRA cannot see or decide the current official acceptance state of a private card.",
    answer:entry=>entry.answer+" Open your Board to review the current card state."
  });
  if(/what is (?:a )?(?:sprint )?card|what does card mean/.test(text)) return result(entries,toPublic,{
    status:"answered",ids:["faro-board-card"],accessScope:"authenticated-portal-guidance"
  });
  if(/what (?:do|does) (?:s m and l|s m l) mean|what is (?:a )?(?:card|story) size|how are cards sized/.test(text)) return result(entries,toPublic,{
    status:"answered",ids:["faro-board-size"],accessScope:"authenticated-portal-guidance"
  });
  if(/who owns a card|what is a card owner|who is the assignee/.test(text)) return result(entries,toPublic,{
    status:"answered",ids:["faro-board-owner"],accessScope:"authenticated-portal-guidance"
  });
  if(/what does blocked mean|what is a blocker|why is a card blocked/.test(text)) return result(entries,toPublic,{
    status:"answered",ids:["faro-board-blocked"],accessScope:"authenticated-portal-guidance"
  });
  if(/what information.*standup|what.*(?:put|include|write|go(?:es)?|belong(?:s)?).*standup|standup (?:fields|template|content)/.test(text)) return result(entries,toPublic,{
    status:"answered",ids:["daily-scrum","minutes-usage-guide"],accessScope:"authenticated-linked-documents"
  });
  if(/how often.*(?:standup|status update)|(?:standup|status update).*frequency|finish.*standup/.test(text)) return result(entries,toPublic,{
    status:"partial",ids:["daily-scrum","minutes-usage-guide","syllabus-attendance"],
    missingEvidence:"The linked Daily Scrum template and its usage guide conflict on cadence and submission wording.",
    answer:entry=>entry.answer+" Because the two current linked documents disagree, MIRA will not choose a cadence silently. Confirm the active requirement with the instructor."
  });
  const asksBrandColors=/\b(?:fiu|official|brand)\b.*\b(?:colors?|colours?|palette|hex)\b|\b(?:colors?|colours?|palette|hex)\b.*\b(?:fiu|official|brand)\b/.test(text);
  const asksBrandLogo=/\b(?:fiu|official|brand)\b.*\b(?:logo|logos|mark|lockup)\b|\b(?:logo|logos|mark|lockup)\b.*\b(?:fiu|official|brand)\b/.test(text);
  if(asksBrandColors && asksBrandLogo) return result(entries,toPublic,{
    status:"clarification_needed",ids:["brand-logo","brand-colors"],accessScope:"public-brand-guide",
    missingEvidence:"The question covers two separate official brand references."
  });
  if(asksBrandColors) return result(entries,toPublic,{status:"answered",ids:["brand-colors"],accessScope:"public-brand-guide"});
  if(asksBrandLogo) return result(entries,toPublic,{status:"answered",ids:["brand-logo"],accessScope:"public-brand-guide"});
  if(!/^open (?:portal )?brand (?:and )?templates$/.test(text) && /\b(?:brand|branding|powerpoint|presentation|letterhead)\b.*\b(?:templates?|downloads?)\b|\b(?:templates?|downloads?)\b.*\b(?:brand|branding|powerpoint|presentation|letterhead)\b/.test(text)) return result(entries,toPublic,{
    status:"answered",ids:["brand-downloads"],accessScope:"public-brand-guide"
  });
  if(/\b(?:sprint|scrum|ceremony|team meeting)\b.*\b(?:minutes|records|notes|templates?)\b|\b(?:minutes|records|notes|templates?)\b.*\b(?:sprint|scrum|ceremony|team meeting)\b/.test(text)) return result(entries,toPublic,{
    status:"answered",ids:["minutes-overview"],accessScope:"public-linked-document"
  });
  if(/sprint retrospective|\bretro\b|process improvement/.test(text)) return result(entries,toPublic,{
    status:"answered",ids:["sprint-retrospective-template","syllabus-sprint-retrospective"],accessScope:"authenticated-linked-document"
  });
  if(/sprint review|review meeting|sprint demo/.test(text) && !/showcase/.test(text)) return result(entries,toPublic,{
    status:"answered",ids:["sprint-review-template","syllabus-sprint-review"],accessScope:"authenticated-linked-document"
  });
  if(/\bweekly assignment\b/.test(text)&&/\b(?:where|how|submit|upload|turn in|hand in)\b/.test(text)) return result(entries,toPublic,{
    status:"answered",ids:["canvas-assignments"],accessScope:"course-syllabus"
  });
  if(/(?:where|how).*(?:sprint work|course work|work|assignment).*(?:submit|document|upload)|(?:where|how).*(?:submit|document|upload).*(?:sprint work|course work|work|assignment)|(?:submit|upload).*(?:sprint work|course work|assignment)/.test(text)) return result(entries,toPublic,{
    status:"partial",ids:["minutes-usage-guide","canvas-assignments"],missingEvidence:"The linked minutes guide distinguishes Capstone-site ceremony/board filing from Canvas weekly assignments. The exact destination depends on the specific work item."
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
