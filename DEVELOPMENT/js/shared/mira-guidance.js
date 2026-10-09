(function(root,factory){
  const api=factory();
  if(typeof module==='object'&&module.exports)module.exports=api;
  if(root)root.MiraGuidance=api;
})(typeof window!=='undefined'?window:globalThis,function(){
  'use strict';

  const DEPTHS=Object.freeze(['quick','guide','step']);
  const LABELS=Object.freeze({quick:'Quick',guide:'Guide me',step:'Step by step'});

  function normalizeDepth(value){return DEPTHS.includes(String(value||'').toLowerCase())?String(value).toLowerCase():'quick';}
  function depthLabel(value){return LABELS[normalizeDepth(value)];}
  function clean(value,max=20000){return String(value||'').replace(/\r/g,'').replace(/[ \t]+/g,' ').replace(/\n{3,}/g,'\n\n').trim().slice(0,max);}

  function checkWork({text='',criteria='acceptance',customCriteria=''}={}){
    const value=clean(text),lower=value.toLowerCase(),custom=clean(customCriteria,1000);
    if(value.length<20)throw new Error('Add enough fictional or redacted work for MIRA to review.');
    const signals={
      outcome:/\b(result|outcome|completed|implemented|fixed|delivered|demonstrat(?:e|ed)|works?)\b/.test(lower),
      criteria:/\b(acceptance criteria|requirement|must|should|definition of done|expected)\b/.test(lower)||!!custom,
      evidence:/\b(evidence|screenshot|test|log|recording|link|attachment|commit|pull request|verified|validation)\b/.test(lower),
      testing:/\b(test|tested|verify|verified|validation|pass(?:ed)?|fail(?:ed)?)\b/.test(lower),
      blocker:/\b(blocked|blocker|risk|dependency|waiting|issue|limitation)\b/.test(lower),
      next:/\b(next step|next|follow[- ]?up|remaining|todo|to do)\b/.test(lower),
      owner:/\b(product owner|reviewer|instructor|team leader|approved|accepted|sign[- ]?off)\b/.test(lower)
    };
    const complete=[];
    if(signals.outcome)complete.push('A concrete outcome or completed change is described.');
    if(signals.criteria)complete.push(custom?'The selected/custom criteria are referenced.':'Acceptance requirements are referenced.');
    if(signals.testing)complete.push('A verification or testing activity is mentioned.');
    if(signals.evidence)complete.push('Supporting evidence is identified.');
    const missing=[];
    if(!signals.criteria)missing.push('State the exact criterion or rubric item this work is meant to satisfy.');
    if(!signals.outcome)missing.push('Describe the observable result, not only the activity performed.');
    if(!signals.testing)missing.push('Explain how the result was checked and what passed or failed.');
    if(!signals.blocker)missing.push('State whether anything is blocked; “no blockers” is acceptable when true.');
    const evidence=[];
    if(!signals.evidence)evidence.push('Add a safe link, test result, screenshot description, attachment name, or other verifiable artifact.');
    if(!signals.owner)evidence.push('Identify who still needs to review or accept the work, if approval is required.');
    const questions=[];
    if(!signals.criteria)questions.push('Which acceptance criterion does this prove?');
    if(!signals.testing)questions.push('What exact test or observation shows that it works?');
    if(!signals.evidence)questions.push('Where can the reviewer see the evidence?');
    if(!signals.owner)questions.push('Who has authority to accept this work?');
    if(signals.blocker)questions.push('What must happen before the blocker can be removed?');
    const nextStep=missing[0]||evidence[0]||'Ask the authorized reviewer to compare the evidence with the stated criteria. MIRA cannot approve or submit the work.';
    return{
      criteria:clean(criteria,80),customCriteria:custom,
      looksComplete:complete.length?complete:['The supplied text is readable, but it does not yet demonstrate a reviewed completion signal.'],
      missing,evidenceNeeded:evidence,reviewerQuestions:questions.slice(0,5),nextStep,
      disclaimer:'This is a guidance check, not a grade, Product Owner decision, instructor approval, card move, or submission.'
    };
  }

  function formatCheck(result){
    const block=(title,items)=>title+'\n'+(items.length?items.map(item=>'• '+item).join('\n'):'• Nothing additional identified from the supplied text.');
    return[
      block('WHAT LOOKS COMPLETE',result.looksComplete),
      block('WHAT IS WEAK OR MISSING',result.missing),
      block('EVIDENCE NEEDED',result.evidenceNeeded),
      block('QUESTIONS A REVIEWER MAY ASK',result.reviewerQuestions),
      'NEXT STEP\n'+result.nextStep,
      result.disclaimer
    ].join('\n\n');
  }

  function applyDepth(answer,{depth='quick',sourceLabels=[],nextStep='Review the cited source and use any portal workflow control yourself.'}={}){
    const mode=normalizeDepth(depth),base=clean(answer,12000),sources=[...new Set((sourceLabels||[]).map(value=>clean(value,120)).filter(Boolean))];
    if(mode==='quick')return base;
    const sourceLine=sources.length?'WHY\nMIRA used '+sources.join(' and ')+'.':'WHY\nMIRA used the approved source shown with this answer.';
    if(mode==='guide')return [base,sourceLine,'NEXT STEP\n'+clean(nextStep,500)].join('\n\n');
    return [base,'STEP BY STEP','1. Review what MIRA can see in the cited source.','2. Compare it with the applicable criteria or course guidance.','3. Add or verify any missing evidence.','4. Use the portal control yourself, or ask the appropriate person if a decision is required.','NEXT STEP\n'+clean(nextStep,500)].join('\n\n');
  }

  return{DEPTHS,LABELS,normalizeDepth,depthLabel,checkWork,formatCheck,applyDepth};
});
