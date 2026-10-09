const {randomBytes,createHmac,createHash}=require('node:crypto');
const {searchIndex}=require('../lib/index-search');
const {PORTAL,PortalError}=require('./browser-adapter');
const {SECTION_ROUTES}=require('./dom-reader');
const {aliases,injected,navigationQuery,publicAuthorityQuery,routeQuestion,usablePublicResult,sectionFor,sectionsFor,publicCompanionQuestion,assistanceIntent}=require('../lib/portal-intent');
const {normalizeDepth,applyDepth}=require('../../js/shared/mira-guidance');
const token=()=>randomBytes(24).toString('base64url');
const PRIVATE_TTL=5*60*1000;
const privateScope={allowedOrigins:['https://capstone.cs.fiu.edu'],allowedPaths:['/portal','/today','/inbox','/board','/meetings','/my-work','/this-term','/people','/me/rhythm','/recognition','/me/privacy','/static/templates/','/resources','/projects','/tutorials','/showcase/resources/'],excludedPaths:[]};
const allowedSections=new Set(Object.keys(SECTION_ROUTES));
const allowedKinds=new Set(['profile','project','team','team-member','leadership','product-owner','dates','assignment','sprint','sprint-board','task','ceremony','standup','schedule','standing','standing-trend','messages','onboarding','connection','opportunity','team-contact','ai-anchor','record','showcase','letter','letter-guidance','resource','resource-link','brand']);
const privateSourceUrl=value=>{try{const url=new URL(value);if(url.origin!=='https://capstone.cs.fiu.edu'||url.username||url.password||url.search||url.hash)return null;const exact=new Set(['/portal','/today','/inbox','/board','/meetings','/my-work','/this-term','/people','/me/rhythm','/recognition','/me/privacy','/resources','/projects','/tutorials']);if(exact.has(url.pathname)||url.pathname.startsWith('/static/templates/')||url.pathname.startsWith('/showcase/resources/'))return url.href;return null;}catch{return null;}};
const suggestions={Today:['Show my Capstone snapshot','What should I do next?'],Board:['What am I working on?','What work do I have open?','What are my acceptance criteria?','Does my evidence mean this card is Done?','Can you check my work?'],'My work':['What work do I have open?','What should I finish?'],'My rhythm':['How many standups have I done this week?','Am I caught up on standups?'],Team:['Who is my Product Owner?','Who should I ask for help?'],Standing:['What does my standing explanation say?'],Inbox:['Do I have unread messages?'],Meetings:['When is my next meeting?'],Resources:['What does the linked stand-up template require?'],Showcase:['What does my showcase readiness information say?'],Record:['What information is in my Capstone record?']};

function recordSource(record,version){return{id:record.id,sourceId:record.id,pageId:record.id,siteId:'private-session',pageTitle:'Your portal Â· '+record.section,sectionTitle:record.heading,url:record.url,anchor:null,excerpt:record.text,truncated:false,indexed_at:record.retrievedAt,last_fetched_at:record.retrievedAt,source_modified_at:record.sourceTimestamp||null,indexVersion:String(version),section:record.section,subview:record.subview,retrievedAt:record.retrievedAt,coverage:record.coverage};}
function manualResult(records,version,answer,answerStatus='answered'){
  const sources=records.slice(0,5).map(record=>recordSource(record,version));
  return{indexed:false,mode:'allowlisted-portal-context',semanticSearch:false,answerStatus,answer,status:answerStatus==='not_found'?'unmatched':'matched',sources,navigation:sources.map(source=>({label:'Open in portal',targetSourceId:source.id,url:source.url})),matches:[],links:[]};
}
function firstRecord(records,section,kind){return records.find(record=>record.section===section&&(!kind||record.kind===kind));}
function snapshotAnswer(records){
  const row=(label,record)=>label+'\n'+(record?record.text.slice(0,360):'Not available in the currently authorized snapshot.');
  return['MY CAPSTONE',row('CURRENT SPRINT',firstRecord(records,'Today','project')||firstRecord(records,'My work')),row('NEXT STEP',firstRecord(records,'My rhythm')||firstRecord(records,'Today','task')),row('OPEN / BLOCKED WORK',firstRecord(records,'Board','task')||firstRecord(records,'My work')),row('STANDUPS THIS WEEK',firstRecord(records,'My rhythm')||firstRecord(records,'Today','standup')),row('UPCOMING MEETING',firstRecord(records,'Meetings')),row('UNREAD INBOX',firstRecord(records,'Inbox','messages')),'This is a temporary read-only summary of the verified account. Missing information is not treated as zero or complete.'].join('\n\n');
}
function humanHelpAnswer(question){
  const role=/\bgrade|standing|policy|extension|instructor\b/i.test(question)?'Instructor':/\baccept|review|product owner|requirement\b/i.test(question)?'Product Owner':/\bblocked|blocker|coordination|team|meeting|standup\b/i.test(question)?'Team Leader':'AI Anchor or Team Leader';
  return['WHY THIS PERSON\n'+role+' is the safest starting role for this question based on its subject.','WHAT CONTEXT WOULD BE SHARED\nOnly the question and the specific source or card details you deliberately include.','WHAT WILL NOT BE SHARED\nNo password, login code, token, unrelated portal record, message body, grade, or another student’s information.','NEXT STEP\nOpen the cited Team/People source, confirm the person and role, then draft or send the message yourself. MIRA has not sent anything.'].join('\n\n');
}
function checkWorkAnswer(records,publicResult){
  const card=records.find(record=>record.section==='Board'&&record.kind==='task');
  const missing=!card?'MIRA could not identify an authorized current card.':/\u2611\s*0\//.test(card.text)?'The visible card shows zero checked criteria; review each criterion and add evidence before requesting review.':'MIRA cannot confirm that every criterion and required evidence is complete from the visible metadata alone.';
  return['WHAT THE RULE SAYS\nUse the reviewed acceptance-criteria, evidence, verification, and Product Owner guidance shown with this answer.', 'WHAT MIRA CAN SEE\n'+(card?card.text.slice(0,900):'No current-card metadata was available.'),'WHAT IS STILL MISSING\n'+missing,'NEXT STEP\nOpen the card, compare each criterion with verifiable evidence, then ask the authorized reviewer. MIRA cannot move, approve, verify, or submit the card.'].join('\n\n');
}

class PortalService{
  constructor({adapter,now=Date.now,publicSearch=async()=>({status:'unmatched',matches:[],links:[]})}){
    this.adapter=adapter;this.now=now;this.publicSearch=publicSearch;this.salt=token();this.generation=0;this.owner=null;this.state='helper-ready';this.records=[];this.sections=new Set();this.lastVerified=0;this.lastRetrieved=0;this.pending=Promise.resolve();this.discoveryPromise=null;this.discoveryOwner=null;this.verificationPromise=null;this.verificationOwner=null;this.choices=[];this.binding=null;this.identity=null;this.tab=null;this.activeSection=null;this.sourceCapabilities=[];this.messageContent=false;this.note='The local helper is available. Connect only when you need personal portal information.';
  }
  loadedSections(){return[...this.sections];}
  status(owner){
    if(this.owner!==owner)return{state:'helper-ready',transport:this.adapter.mode||'mcp',generation:this.generation,name:null,verifiedAt:null,retrievedAt:null,expiresAt:null,availableKinds:[],loadedSections:[],suggestions:[],sourceCapabilities:this.sourceCapabilities,messageContent:this.messageContent,progress:{helper:true,browser:false,tab:false,identity:false,overview:false,sections:false},note:this.note};
    if(this.lastVerified&&this.now()-this.lastVerified>PRIVATE_TTL){if(this.adapter.continuous)this.expireSnapshot();else this.invalidate('session-expired','Verification expired. Personal data was removed. Choose Verify again before asking personal questions.');}
    const availableKinds=[...new Set(this.records.map(record=>record.kind))],loadedSections=this.loadedSections();
    return{state:this.state,transport:this.adapter.mode||'mcp',generation:this.generation,name:this.identity?.name||null,verifiedAt:this.lastVerified?new Date(this.lastVerified).toISOString():null,retrievedAt:this.lastRetrieved?new Date(this.lastRetrieved).toISOString():null,expiresAt:this.lastVerified?new Date(this.lastVerified+PRIVATE_TTL).toISOString():null,availableKinds,loadedSections,suggestions:loadedSections.flatMap(section=>suggestions[section]||[]),sourceCapabilities:this.sourceCapabilities,messageContent:this.messageContent,progress:{helper:true,browser:!['helper-ready','browser-approval-required','browser-connection-unavailable','extension-pairing-required'].includes(this.state),tab:Number.isSafeInteger(this.tab),identity:!!this.binding,overview:loadedSections.includes('Today'),sections:loadedSections.length>0},activeSection:this.activeSection,diagnostic:this.adapter.diagnostics?.()||null,note:this.note};
  }
  expireSnapshot(){this.generation++;this.state='snapshot-expired';this.records=[];this.sections.clear();this.sourceCapabilities=this.sourceCapabilities.map(source=>({...source,currentlyLoaded:false}));this.binding=null;this.identity=null;this.lastVerified=0;this.lastRetrieved=0;this.activeSection=null;this.note='Private information expired and was removed. The paired extension remains trusted; the next personal question will revalidate the current account and refresh only the needed source.';}
  invalidate(state='not-connected',note='Private information cleared.'){this.generation++;this.state=state;this.records=[];this.sections.clear();this.binding=null;this.identity=null;this.lastVerified=0;this.lastRetrieved=0;this.activeSection=null;this.note=note;}
  async disconnect(owner){if(this.owner!==owner)return;this.invalidate();this.owner=null;this.tab=null;this.choices=[];this.messageContent=false;await this.adapter.close();}
  exclusive(work){const result=this.pending.then(work,work);this.pending=result.catch(()=>{});return result;}
  async discover(owner){
    if(this.owner&&this.owner!==owner)throw new PortalError('not-connected','Another local pairing owns this connector.');
    if(this.owner===owner&&this.state==='connected')return{...this.status(owner),choices:this.choices};
    if(this.owner===owner&&this.state==='tab-selection-required'&&this.choices.length)return{...this.status(owner),choices:this.choices};
    if(this.discoveryPromise&&this.discoveryOwner===owner)return this.discoveryPromise;
    const extension=this.adapter.mode==='extension';this.owner=owner;this.invalidate(extension?'extension-pairing-required':'browser-approval-required',extension?'Waiting for the locally installed MIRA extension. Grant portal access and pair it with the single-use terminal code.':'Starting one application-owned browser connection. This attempt remains active for up to 120 seconds while Chrome completes consent and discovery.');const generation=this.generation;
    const attempt=(async()=>{try{const choices=await this.exclusive(()=>this.adapter.listEligible());if(generation!==this.generation||this.owner!==owner)return this.status(owner);this.choices=choices;this.state=choices.length?'tab-selection-required':'no-eligible-tab';this.note=choices.length?'Select the intended signed-in Capstone portal tab.':'No eligible exact /portal tab was found. Sign in to the portal and retry.';return{...this.status(owner),choices};}
    catch(error){if(generation===this.generation)this.invalidate(error.state||'browser-connection-unavailable',error.message);return this.status(owner);}})();
    this.discoveryPromise=attempt;this.discoveryOwner=owner;
    try{return await attempt;}finally{if(this.discoveryPromise===attempt){this.discoveryPromise=null;this.discoveryOwner=null;}}
  }
  async connect(owner,id){if(owner!==this.owner||!this.choices.some(page=>page.id===id))throw new PortalError('tab-selection-required','Choose a listed portal tab.');this.tab=id;const result=await this.verify(owner,true);if(result.state==='connected'&&this.adapter.capabilities)try{const map=await this.adapter.capabilities(id);if(map?.state==='present'&&Array.isArray(map.sources)){const loaded=new Set(this.loadedSections());this.sourceCapabilities=map.sources.slice(0,40).map(source=>loaded.has(source.section)?{...source,inspected:true,currentlyLoaded:true,searchable:source.extractionSupported&&this.records.some(record=>record.section===source.section)}:source);}}catch{}return this.status(owner);}
  configure(owner,{messageContent}){if(owner!==this.owner||typeof messageContent!=='boolean')throw new PortalError('not-connected','A connected local application session is required.');this.messageContent=messageContent;if(!messageContent)this.records=this.records.filter(record=>record.kind!=='message-content');return this.status(owner);}
  bindingFor(owner,loaded){return createHmac('sha256',this.salt).update(owner+'\0'+loaded.contextBinding+'\0'+loaded.identity.email.toLowerCase()).digest('hex');}
  normalizeRecords(owner,loaded,binding,verifiedAt){
    const retrievedAt=this.now(),section=loaded.section||'Today';
    return(loaded.records||[]).slice(0,240).filter(record=>allowedKinds.has(record.kind)&&privateSourceUrl(record.url)&&record.section===section&&typeof record.text==='string'&&!injected(record.text)).map((record,index)=>({id:'private-'+createHash('sha256').update(binding+'|'+this.generation+'|'+section+'|'+record.subview+'|'+record.kind+'|'+record.heading+'|'+index).digest('hex').slice(0,24),owner,contextBinding:loaded.contextBinding,binding,generation:this.generation,kind:record.kind,heading:String(record.heading).slice(0,180),text:record.text.slice(0,6000),url:privateSourceUrl(record.url),section,subview:String(record.subview||section).slice(0,120),retrievedAt:new Date(retrievedAt).toISOString(),sourceTimestamp:record.sourceTimestamp||null,expiresAt:verifiedAt+PRIVATE_TTL,coverage:record.coverage||loaded.coverage||'Only the approved visible '+section+' section.'}));
  }
  adoptInitial(owner,loaded,previousBinding=null,verifiedAt=this.now()){
    if(loaded.state!=='verified'||!loaded.identity?.email||!loaded.identity?.name||!loaded.contextBinding)throw new PortalError('identity-verification-failed','The current portal account could not be verified. No personal data was retained.');
    const binding=this.bindingFor(owner,loaded);if(previousBinding&&binding!==previousBinding)throw new PortalError('account-changed','The portal account changed. Old private data was removed. Select the tab again to verify the current account.');
    const section=allowedSections.has(loaded.section)?loaded.section:'Today';this.binding=binding;this.identity={name:loaded.identity.name.slice(0,120)};this.lastVerified=verifiedAt;this.lastRetrieved=this.now();this.activeSection=section;
    const profile={kind:'profile',heading:'Signed-in portal profile',text:'Verified account name: '+this.identity.name,url:PORTAL,section,subview:'Account identity',sourceTimestamp:null};
    this.records=this.normalizeRecords(owner,{...loaded,section,records:[profile,...(loaded.records||[])]},binding,verifiedAt);this.sections.add(section);
    if(!this.records.length)throw new PortalError('extraction-failed','The verified dashboard source did not expose any approved information. No cached answer was retained.');
    this.state='connected';this.adapter.setStage?.('private-index-ready',{errorType:null});this.note='Verified local read-only portal session. Approved sections load only when you ask for them; searches never extend the five-minute deadline.';return this.status(owner);
  }
  mergeSection(owner,loaded,previousBinding){
    const binding=this.bindingFor(owner,loaded);if(binding!==previousBinding)throw new PortalError('account-changed','The portal account changed. Old private data was removed. Select the tab again to verify the current account.');
    if(!allowedSections.has(loaded.section))throw new PortalError('section-denied','That section is outside the approved connector scope.');
    const fresh=this.normalizeRecords(owner,loaded,binding,this.lastVerified);this.records=[...this.records.filter(record=>record.section!==loaded.section),...fresh];this.sections.add(loaded.section);this.sourceCapabilities=this.sourceCapabilities.map(source=>source.section===loaded.section?{...source,inspected:true,currentlyLoaded:true,searchable:source.extractionSupported&&fresh.length>0}:source);this.lastRetrieved=this.now();this.activeSection=loaded.section;this.state='connected';this.note=fresh.length?'Loaded '+loaded.section+' into this temporary private session.':'The approved '+loaded.section+' view had no searchable text. This does not prove the information is absent.';return this.status(owner);
  }
  async verify(owner,initial=false){
    if(owner!==this.owner||!Number.isSafeInteger(this.tab))return this.status(owner);
    if(this.verificationPromise&&this.verificationOwner===owner)return this.verificationPromise;
    if(initial&&this.state==='connected'&&this.sections.size)return this.status(owner);
    const previousBinding=initial?null:this.binding;this.invalidate('verifying',this.adapter.continuous?'Checking the current FIU session without reloading or requiring Today.':'The dedicated portal tab will return to Today and reload once to verify the current account.');const generation=this.generation,tab=this.tab;
    const attempt=this.exclusive(async()=>{if(generation!==this.generation||owner!==this.owner)return this.status(owner);try{const loaded=await this.adapter.verify(tab);if(generation!==this.generation||owner!==this.owner)return this.status(owner);return this.adoptInitial(owner,loaded,previousBinding,this.now());}catch(error){if(generation===this.generation)this.invalidate(error.state||'identity-verification-failed',error instanceof PortalError?error.message:'Portal verification failed. Old private data was removed.');return this.status(owner);}});
    this.verificationPromise=attempt;this.verificationOwner=owner;
    try{return await attempt;}finally{if(this.verificationPromise===attempt){this.verificationPromise=null;this.verificationOwner=null;}}
  }
  async refresh(owner,initial=false){return this.verify(owner,initial);}
  async refreshContent(owner){
    const current=this.status(owner);if(current.state!=='connected'||!this.binding||!Number.isSafeInteger(this.tab))return current;
    const previousBinding=this.binding,generation=this.generation,tab=this.tab;
    return this.exclusive(async()=>{if(generation!==this.generation||owner!==this.owner)return this.status(owner);try{const loaded=await this.adapter.inspectActive(tab,{messageContent:this.messageContent});if(generation!==this.generation||owner!==this.owner)return this.status(owner);return this.mergeSection(owner,loaded,previousBinding);}catch(error){if(['account-changed','sign-in-required','identity-verification-failed','connection-lost'].includes(error.state)&&generation===this.generation)this.invalidate(error.state,error.message);else this.note=error instanceof PortalError?error.message:'The current approved section could not be refreshed.';return this.status(owner);}});
  }
  async ensureFresh(owner){const current=this.status(owner);if(current.state==='snapshot-expired'&&this.adapter.continuous&&Number.isSafeInteger(this.tab))return this.verify(owner,true);return this.revalidate(owner);}
  async revalidate(owner){
    const current=this.status(owner);if(current.state!=='connected'||!this.binding||!Number.isSafeInteger(this.tab))return current;
    const generation=this.generation,binding=this.binding,tab=this.tab;
    return this.exclusive(async()=>{if(generation!==this.generation||owner!==this.owner)return this.status(owner);try{const loaded=await this.adapter.identity(tab);if(generation!==this.generation||owner!==this.owner)return this.status(owner);if(this.bindingFor(owner,loaded)!==binding)this.invalidate('account-changed','The portal account changed. Old private data was removed. Select the tab again to verify the current account.');}catch(error){if(generation===this.generation)this.invalidate(error.state||'connection-lost',error instanceof PortalError?error.message:'The current portal session could not be checked. Old private data was removed.');}return this.status(owner);});
  }
  async loadSection(owner,section){
    if(!allowedSections.has(section))throw new PortalError('section-denied','That portal section is outside the approved scope.');
    if(this.loadedSections().includes(section))return this.status(owner);
    const generation=this.generation,binding=this.binding,tab=this.tab;
    return this.exclusive(async()=>{if(generation!==this.generation||owner!==this.owner)return this.status(owner);try{const loaded=await this.adapter.inspectSection(tab,section,{navigate:true,messageContent:false});if(generation!==this.generation||owner!==this.owner)return this.status(owner);return this.mergeSection(owner,loaded,binding);}catch(error){if(['account-changed','sign-in-required','identity-verification-failed','connection-lost'].includes(error.state)&&generation===this.generation)this.invalidate(error.state,error.message);else this.note=error instanceof PortalError?error.message:'The approved '+section+' section could not be loaded.';return this.status(owner);}});
  }
  owned(owner){return this.owner===owner&&this.state==='connected'&&this.binding&&this.lastVerified+PRIVATE_TTL>this.now()?this.records.filter(record=>record.owner===owner&&record.binding===this.binding&&record.generation===this.generation&&record.expiresAt>this.now()):[];}
  index(owner,section=null){
    const items=this.owned(owner).filter(record=>!section||record.section===section),siteId='private-session',at=new Date(this.lastRetrieved||this.now()).toISOString();
    return{schemaVersion:1,siteId,version:String(this.generation),scope:privateScope,retrieval:{minScore:0.30,minCoverage:0.45,maxResults:3,aliases},pages:items.map(record=>({id:record.id,siteId,url:record.url,status:'active',title:'Your portal · '+record.section+' · '+record.kind,tags:[record.kind,record.section,record.subview],breadcrumbs:[record.section,record.subview],indexedAt:record.retrievedAt,lastFetchedAt:at,sourceModifiedAt:record.sourceTimestamp,chunks:[{id:record.id,url:record.url,status:'active',heading:record.heading,hierarchy:[record.section,record.subview,record.kind,record.heading],text:record.text,blocks:[record.text],anchor:null}]}))};
  }
  empty(owner,note){return{personal:true,indexed:false,status:'unmatched',answerStatus:'not_found',answer:note||'Connect and verify your own portal session first. No personal data was searched.',sources:[],navigation:[],matches:[],links:[],connection:this.status(owner)};}
  async search(owner,{question,context='',depth='quick'}){
    if(typeof question!=='string'||!question.trim()||question.length>500||typeof context!=='string'||context.length>300)throw new PortalError('not-connected','Invalid search request.');
    depth=normalizeDepth(depth);
    const q=question.trim();if(publicAuthorityQuery(q)||!routeQuestion(q,context))return this.publicSearch(q,context);
    if(/[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/i.test(q)||/\b(?:user|account|student|owner)(?:Id|_id| id)\s*[:=]/i.test(q)||/\b(?:someone else|another student|other student|their account)\b/i.test(q))return this.empty(owner,'Only the verified account in your selected portal tab can be searched. Account identifiers in chat cannot select another user.');
    let state=await this.ensureFresh(owner);if(state.state!=='connected'){
      const publicResult=await this.publicSearch(q,context);
      if(usablePublicResult(publicResult))return{...publicResult,connection:state,privateUnavailable:true,privateNote:state.note};
      return{...this.empty(owner,state.note),publicResult};
    }
    const contextRecords=context.split(',').filter(Boolean).map(id=>this.owned(owner).find(record=>record.id===id)).filter(Boolean);
    if(context.split(',').filter(id=>id.startsWith('private-')).some(id=>!contextRecords.some(record=>record.id===id)))return this.empty(owner,'That private source expired or belongs to a different session. Ask your question again.');
    const sections=sectionsFor(q,contextRecords,this.activeSection).filter(section=>allowedSections.has(section)).slice(0,7),section=sections[0]||sectionFor(q,contextRecords,this.activeSection);
    if(!navigationQuery(q))for(const requested of sections){if(this.loadedSections().includes(requested))continue;state=await this.loadSection(owner,requested);if(state.state!=='connected')return this.empty(owner,state.note);}
    const generation=this.generation,binding=this.binding,clauses=q.split(/;|\band\s+(?=(?:how|what|when|where|can|does|is|do)\b)/i).slice(0,3),publicClauses=clauses.filter(clause=>!routeQuestion(clause,context));
    const privateText=clauses.filter(clause=>routeQuestion(clause,context)).join('; ')||q;
    const original=this.owned(owner),selected=original.filter(record=>sections.includes(record.section)),intent=assistanceIntent(q);
    let publicQuestion=publicCompanionQuestion(q),publicResult=publicClauses.length?await this.publicSearch(publicClauses.join('; '),''):publicQuestion?await this.publicSearch(publicQuestion,''):null;
    let result;
    if(intent==='snapshot')result=manualResult(sections.map(name=>firstRecord(selected,name)).filter(Boolean),this.generation,snapshotAnswer(selected));
    else if(intent==='human-help')result=manualResult(selected.filter(record=>['Team','People'].includes(record.section)).slice(0,3),this.generation,humanHelpAnswer(q));
    else if(intent==='check-work')result=manualResult(selected.filter(record=>record.section==='Board').slice(0,3),this.generation,checkWorkAnswer(selected,publicResult),selected.some(record=>record.section==='Board')?'partial':'not_found');
    else {
      result=searchIndex(this.index(owner),privateText,context);
      if(intent==='next-step'&&result.answerStatus==='not_found')result=manualResult(selected.slice(0,3),this.generation,snapshotAnswer(selected),'partial');
      else result={...result,answer:result.answerStatus==='not_found'?'No supporting information was found in the approved '+sections.join(', ')+' snapshot. This does not mean the information is absent from the account.':result.answer,sources:result.sources.map(source=>{const record=original.find(item=>item.id===source.id);return{...source,retrievedAt:record?.retrievedAt,sourceTimestamp:record?.sourceTimestamp,section:record?.section,subview:record?.subview,coverage:record?.coverage};}),navigation:result.navigation.map(action=>({...action,label:'Open in portal'}))};
    }
    const sourceLabels=[...new Set((result.sources||[]).map(source=>(source.section||section)+' — current portal'))];
    result={...result,personal:true,indexed:false,responseDepth:depth,sourceContext:sourceLabels,answer:applyDepth(result.answer,{depth,sourceLabels,nextStep:intent==='next-step'?'Open the cited personal source and complete the first verified outstanding item.':'Review the cited portal source and use any state-changing control yourself.'}),connection:this.status(owner),coverage:'Temporary local '+sections.join(', ')+' snapshot only. Supported sources load on demand; excluded controls, unrelated records, and unavailable linked content remain unavailable.'};
    if(publicResult)result.publicResult=publicResult;
    if(generation!==this.generation||binding!==this.binding||!this.owned(owner).length)return this.empty(owner,'The session changed before the answer was ready. Please reconnect.');
    return result;
  }
  async destination(owner,sourceId){
    const status=await this.revalidate(owner),record=this.owned(owner).find(item=>item.id===sourceId);if(status.state!=='connected'||!record)throw new PortalError('session-expired','This source is no longer verified for your session.');
    if(record.url!==PORTAL)return{url:record.url,section:record.section,subview:record.subview,guidance:'Opening the exact verified same-origin resource used by this answer.',generation:this.generation,sourceId:record.id,connection:this.status(owner)};
    const opened=await this.adapter.open(this.tab,record.section);if(!this.owned(owner).some(item=>item.id===sourceId))throw new PortalError('session-expired','This source is no longer verified for your session.');
    return{url:PORTAL,section:record.section,subview:record.subview,guidance:opened.guidance,generation:this.generation,sourceId:record.id,connection:this.status(owner)};
  }
}
module.exports={PortalService,PRIVATE_TTL,routeQuestion,navigationQuery,sectionFor,injected,usablePublicResult,publicAuthorityQuery};
