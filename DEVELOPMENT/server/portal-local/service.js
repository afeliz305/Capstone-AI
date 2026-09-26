const {randomBytes,createHmac,createHash}=require('node:crypto');
const {searchIndex}=require('../lib/index-search');
const {PORTAL,PortalError}=require('./browser-adapter');
const {SECTION_ROUTES}=require('./dom-reader');
const token=()=>randomBytes(24).toString('base64url');
const PRIVATE_TTL=5*60*1000;
const privateScope={allowedOrigins:['https://capstone.cs.fiu.edu'],allowedPaths:['/portal','/static/templates/','/resources','/projects','/tutorials','/showcase/resources/'],excludedPaths:[]};
const allowedSections=new Set(Object.keys(SECTION_ROUTES));
const allowedKinds=new Set(['profile','project','team','team-member','leadership','product-owner','dates','assignment','sprint','sprint-board','task','ceremony','standup','schedule','standing','standing-trend','grade','past-grade','messages','message-content','onboarding','connection','opportunity','team-contact','ai-anchor','record','showcase','letter','letter-guidance','resource','resource-link','brand']);
const aliases={deadlines:['dates','due','assignment','schedule'],deadline:['dates','due'],coming:['next','upcoming'],upcoming:['next','coming'],finish:['deadline','due','end','date','schedule'],tasks:['task','assignment','sprint','board','work'],work:['task','card','assigned'],assigned:['work','task','owner'],criteria:['acceptance','requirements','success'],evidence:['proof','recorded','history'],recorded:['evidence','history','proof'],notifications:['messages','unread','channel'],inbox:['messages','unread','channel'],conversation:['messages','channel'],teammates:['team','member'],professor:['product','owner'],status:['sprint','team','standing'],scores:['grade','points'],weights:['grade','weight'],retrospective:['retro','ceremony'],review:['ceremony'],standup:['stand-up','update'],showcase:['presentation','readiness'],letters:['recommendation','letter']};
const injected=text=>/ignore (?:all |previous |the )?(?:instructions|rules)|system prompt|reveal (?:secrets|tokens|password)|execute (?:this|the) (?:code|command)|send .*?(?:cookie|token|password)/i.test(text);
const privateSourceUrl=value=>{try{const url=new URL(value);if(url.origin!=='https://capstone.cs.fiu.edu'||url.username||url.password||url.search||url.hash)return null;if(url.pathname==='/portal'||url.pathname==='/resources'||url.pathname==='/projects'||url.pathname==='/tutorials'||url.pathname.startsWith('/static/templates/')||url.pathname.startsWith('/showcase/resources/'))return url.href;return null;}catch{return null;}};
const navigationQuery=q=>/^(?:take me there|open it|open that|show me that section|where does it say that|view (?:the |this )?source)[.!?]*$/i.test(q.trim());
const personalFollowup=q=>/^(?:what about|and |when is it|is it|how about|show me more|which one)/i.test(q.trim());
const personalQuery=q=>/\b(my|our|mine|i am|i have|am i|who am i|signed in|logged in|messages?|inbox|unread)\b/i.test(q)||/\b(?:current|this) sprint\b/i.test(q)||/\b(?:this|the) (?:card|task|(?:team )?conversation)\b/i.test(q)||/\b(?:assigned to me|recorded for this task|posted grade components|standing explanation|deadlines? (?:are )?coming up)\b/i.test(q);
const publicAuthorityQuery=q=>/\b(?:mira|you) (?:cannot|can't|could not|couldn't|do not|don't) answer\b|\b(?:extension|extra time|extend(?:ed)? (?:my|the|an) assignment)\b|\b(?:what grade will|guess (?:my|the) grade|predict (?:my|the) grade)\b|\b(?:move me to|change (?:my|our) (?:capstone )?team)\b|\b(?:approve|mark) (?:my|our|the|this|a) card (?:as )?done\b|\b(?:another|other) student(?:'s)?\b|\bwhat (?:information )?(?:do i put|should i include) in (?:my |our )?(?:standup|stand-up|daily scrum)\b|\bwhere (?:do|should) we (?:submit|upload|document) (?:our )?sprint work\b/i.test(q);
function routeQuestion(q,context=''){return personalQuery(q)||(String(context).includes('private-')&&(navigationQuery(q)||personalFollowup(q)));}
function usablePublicResult(result){return!!result&&((result.indexed&&result.answerStatus!=='not_found')||['matched','choices'].includes(result.status));}
function sectionFor(q,contextRecords=[]){
  if(navigationQuery(q)&&contextRecords.length===1)return contextRecords[0].section;
  if(/\b(messages?|inbox|unread|channel|conversation)\b/i.test(q))return'Messages';
  if(/\b(grade|score|points?|weight|remaining work|past term)\b/i.test(q))return'Grade';
  if(/\b(standing|trend|compare|comparison)\b/i.test(q))return'Standing';
  if(/\b(onboarding|orientation|intake|start here)\b/i.test(q))return'Start here';
  if(/\b(connection|connected)\b/i.test(q))return'Connections';
  if(/\b(opportunit(?:y|ies)|internship|job)\b/i.test(q))return'Opportunities';
  if(/\b(team contact|linkedin)\b/i.test(q))return'Team contacts';
  if(/\b(ai anchor|anchor)\b/i.test(q))return'AI Anchors';
  if(/\b(capstone record|my record)\b/i.test(q))return'Record';
  if(/\b(showcase|readiness|poster|slides)\b/i.test(q))return'Showcase';
  if(/\b(recommendation letter|my letters?|letter status)\b/i.test(q))return'Letters';
  if(/\b(request a letter|letter request)\b/i.test(q))return'Request a letter';
  if(/\b(brand|logo|colors?|typography)\b/i.test(q))return'Brand & templates';
  if(/\b(resource|template|guide)\b/i.test(q))return'Resources';
  if(/\b(team|teammate|member|leader|leadership|product owner|card|task|criteria|evidence|board|work(?: is)? assigned)\b/i.test(q))return'Team';
  if(contextRecords.length===1&&(personalFollowup(q)||/\b(?:it|that|those|previous|past|more|details?)\b/i.test(q)))return contextRecords[0].section;
  return'Overview';
}
const suggestions={Overview:['What is my project?','What deadlines are coming up?'],Team:['What work is assigned to me?','What acceptance criteria are listed on this card?','What evidence is recorded for this task?','Who is on my team?'],Standing:['What does my standing explanation say?'],Grade:['Which posted grade components are available?','What past-term grade details are available?'],Messages:['Do I have unread messages?','What information is available in this team conversation?'],Resources:['What does the linked stand-up template require?'],Showcase:['What does my showcase readiness information say?'],Record:['What information is in my Capstone record?']};

class PortalService{
  constructor({adapter,now=Date.now,publicSearch=async()=>({status:'unmatched',matches:[],links:[]})}){
    this.adapter=adapter;this.now=now;this.publicSearch=publicSearch;this.salt=token();this.generation=0;this.owner=null;this.state='helper-ready';this.records=[];this.sections=new Set();this.lastVerified=0;this.lastRetrieved=0;this.pending=Promise.resolve();this.discoveryPromise=null;this.discoveryOwner=null;this.verificationPromise=null;this.verificationOwner=null;this.choices=[];this.binding=null;this.identity=null;this.tab=null;this.activeSection=null;this.sourceCapabilities=[];this.messageContent=false;this.note='The local helper is available. Connect only when you need personal portal information.';
  }
  loadedSections(){return[...this.sections];}
  status(owner){
    if(this.owner!==owner)return{state:'helper-ready',transport:this.adapter.mode||'mcp',generation:this.generation,name:null,verifiedAt:null,retrievedAt:null,expiresAt:null,availableKinds:[],loadedSections:[],suggestions:[],sourceCapabilities:this.sourceCapabilities,messageContent:this.messageContent,progress:{helper:true,browser:false,tab:false,identity:false,overview:false,sections:false},note:this.note};
    if(this.lastVerified&&this.now()-this.lastVerified>PRIVATE_TTL){if(this.adapter.continuous)this.expireSnapshot();else this.invalidate('session-expired','Verification expired. Personal data was removed. Choose Verify again before asking personal questions.');}
    const availableKinds=[...new Set(this.records.map(record=>record.kind))],loadedSections=this.loadedSections();
    return{state:this.state,transport:this.adapter.mode||'mcp',generation:this.generation,name:this.identity?.name||null,verifiedAt:this.lastVerified?new Date(this.lastVerified).toISOString():null,retrievedAt:this.lastRetrieved?new Date(this.lastRetrieved).toISOString():null,expiresAt:this.lastVerified?new Date(this.lastVerified+PRIVATE_TTL).toISOString():null,availableKinds,loadedSections,suggestions:loadedSections.flatMap(section=>suggestions[section]||[]),sourceCapabilities:this.sourceCapabilities,messageContent:this.messageContent,progress:{helper:true,browser:!['helper-ready','browser-approval-required','browser-connection-unavailable','extension-pairing-required'].includes(this.state),tab:Number.isSafeInteger(this.tab),identity:!!this.binding,overview:loadedSections.includes('Overview'),sections:loadedSections.length>0},activeSection:this.activeSection,diagnostic:this.adapter.diagnostics?.()||null,note:this.note};
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
    const extension=this.adapter.mode==='extension';this.owner=owner;this.invalidate(extension?'extension-pairing-required':'browser-approval-required',extension?'Waiting for the locally installed Capstone - AI extension. Grant portal access and pair it with the single-use terminal code.':'Starting one application-owned browser connection. This attempt remains active for up to 120 seconds while Chrome completes consent and discovery.');const generation=this.generation;
    const attempt=(async()=>{try{const choices=await this.exclusive(()=>this.adapter.listEligible());if(generation!==this.generation||this.owner!==owner)return this.status(owner);this.choices=choices;this.state=choices.length?'tab-selection-required':'no-eligible-tab';this.note=choices.length?'Select the intended signed-in Capstone portal tab.':'No eligible exact /portal tab was found. Sign in to the portal and retry.';return{...this.status(owner),choices};}
    catch(error){if(generation===this.generation)this.invalidate(error.state||'browser-connection-unavailable',error.message);return this.status(owner);}})();
    this.discoveryPromise=attempt;this.discoveryOwner=owner;
    try{return await attempt;}finally{if(this.discoveryPromise===attempt){this.discoveryPromise=null;this.discoveryOwner=null;}}
  }
  async connect(owner,id){if(owner!==this.owner||!this.choices.some(page=>page.id===id))throw new PortalError('tab-selection-required','Choose a listed portal tab.');this.tab=id;const result=await this.verify(owner,true);if(result.state==='connected'&&this.adapter.capabilities)try{const map=await this.adapter.capabilities(id);if(map?.state==='present'&&Array.isArray(map.sources)){const loaded=new Set(this.loadedSections());this.sourceCapabilities=map.sources.slice(0,40).map(source=>loaded.has(source.section)?{...source,inspected:true,currentlyLoaded:true,searchable:source.extractionSupported&&this.records.some(record=>record.section===source.section)}:source);}}catch{}return this.status(owner);}
  configure(owner,{messageContent}){if(owner!==this.owner||typeof messageContent!=='boolean')throw new PortalError('not-connected','A connected local application session is required.');this.messageContent=messageContent;if(!messageContent)this.records=this.records.filter(record=>record.kind!=='message-content');return this.status(owner);}
  bindingFor(owner,loaded){return createHmac('sha256',this.salt).update(owner+'\0'+loaded.contextBinding+'\0'+loaded.identity.email.toLowerCase()).digest('hex');}
  normalizeRecords(owner,loaded,binding,verifiedAt){
    const retrievedAt=this.now(),section=loaded.section||'Overview';
    return(loaded.records||[]).slice(0,240).filter(record=>allowedKinds.has(record.kind)&&privateSourceUrl(record.url)&&record.section===section&&typeof record.text==='string'&&!injected(record.text)).map((record,index)=>({id:'private-'+createHash('sha256').update(binding+'|'+this.generation+'|'+section+'|'+record.subview+'|'+record.kind+'|'+record.heading+'|'+index).digest('hex').slice(0,24),owner,contextBinding:loaded.contextBinding,binding,generation:this.generation,kind:record.kind,heading:String(record.heading).slice(0,180),text:record.text.slice(0,6000),url:privateSourceUrl(record.url),section,subview:String(record.subview||section).slice(0,120),retrievedAt:new Date(retrievedAt).toISOString(),sourceTimestamp:record.sourceTimestamp||null,expiresAt:verifiedAt+PRIVATE_TTL,coverage:record.coverage||loaded.coverage||'Only the approved visible '+section+' section.'}));
  }
  adoptInitial(owner,loaded,previousBinding=null,verifiedAt=this.now()){
    if(loaded.state!=='verified'||!loaded.identity?.email||!loaded.identity?.name||!loaded.contextBinding)throw new PortalError('identity-verification-failed','The current portal account could not be verified. No personal data was retained.');
    const binding=this.bindingFor(owner,loaded);if(previousBinding&&binding!==previousBinding)throw new PortalError('account-changed','The portal account changed. Old private data was removed. Select the tab again to verify the current account.');
    const section=allowedSections.has(loaded.section)?loaded.section:'Overview';this.binding=binding;this.identity={name:loaded.identity.name.slice(0,120)};this.lastVerified=verifiedAt;this.lastRetrieved=this.now();this.activeSection=section;
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
    const previousBinding=initial?null:this.binding;this.invalidate('verifying',this.adapter.continuous?'Checking the current FIU session without reloading or requiring Overview.':'The dedicated portal tab will return to Overview and reload once to verify the current account.');const generation=this.generation,tab=this.tab;
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
    if(this.loadedSections().includes(section)&&!(section==='Messages'&&this.messageContent&&!this.records.some(record=>record.kind==='message-content')))return this.status(owner);
    const generation=this.generation,binding=this.binding,tab=this.tab;
    return this.exclusive(async()=>{if(generation!==this.generation||owner!==this.owner)return this.status(owner);try{const loaded=await this.adapter.inspectSection(tab,section,{navigate:section!=='Messages',messageContent:this.messageContent});if(generation!==this.generation||owner!==this.owner)return this.status(owner);return this.mergeSection(owner,loaded,binding);}catch(error){if(['account-changed','sign-in-required','identity-verification-failed','connection-lost'].includes(error.state)&&generation===this.generation)this.invalidate(error.state,error.message);else this.note=error instanceof PortalError?error.message:'The approved '+section+' section could not be loaded.';return this.status(owner);}});
  }
  owned(owner){return this.owner===owner&&this.state==='connected'&&this.binding&&this.lastVerified+PRIVATE_TTL>this.now()?this.records.filter(record=>record.owner===owner&&record.binding===this.binding&&record.generation===this.generation&&record.expiresAt>this.now()):[];}
  index(owner,section=null){
    const items=this.owned(owner).filter(record=>!section||record.section===section),siteId='private-session',at=new Date(this.lastRetrieved||this.now()).toISOString();
    return{schemaVersion:1,siteId,version:String(this.generation),scope:privateScope,retrieval:{minScore:0.30,minCoverage:0.45,maxResults:3,aliases},pages:items.map(record=>({id:record.id,siteId,url:record.url,status:'active',title:'Your portal · '+record.section+' · '+record.kind,tags:[record.kind,record.section,record.subview],breadcrumbs:[record.section,record.subview],indexedAt:record.retrievedAt,lastFetchedAt:at,sourceModifiedAt:record.sourceTimestamp,chunks:[{id:record.id,url:record.url,status:'active',heading:record.heading,hierarchy:[record.section,record.subview,record.kind,record.heading],text:record.text,blocks:[record.text],anchor:null}]}))};
  }
  empty(owner,note){return{personal:true,indexed:false,status:'unmatched',answerStatus:'not_found',answer:note||'Connect and verify your own portal session first. No personal data was searched.',sources:[],navigation:[],matches:[],links:[],connection:this.status(owner)};}
  async search(owner,{question,context=''}){
    if(typeof question!=='string'||!question.trim()||question.length>500||typeof context!=='string'||context.length>300)throw new PortalError('not-connected','Invalid search request.');
    const q=question.trim();if(publicAuthorityQuery(q)||!routeQuestion(q,context))return this.publicSearch(q,context);
    if(/[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/i.test(q)||/\b(?:user|account|student|owner)(?:Id|_id| id)\s*[:=]/i.test(q)||/\b(?:someone else|another student|other student|their account)\b/i.test(q))return this.empty(owner,'Only the verified account in your selected portal tab can be searched. Account identifiers in chat cannot select another user.');
    let state=await this.ensureFresh(owner);if(state.state!=='connected'){
      const publicResult=await this.publicSearch(q,context);
      if(usablePublicResult(publicResult))return{...publicResult,connection:state,privateUnavailable:true,privateNote:state.note};
      return{...this.empty(owner,state.note),publicResult};
    }
    const contextRecords=context.split(',').filter(Boolean).map(id=>this.owned(owner).find(record=>record.id===id)).filter(Boolean);
    if(context.split(',').filter(id=>id.startsWith('private-')).some(id=>!contextRecords.some(record=>record.id===id)))return this.empty(owner,'That private source expired or belongs to a different session. Ask your question again.');
    const section=sectionFor(q,contextRecords);
    if(!navigationQuery(q)&&!this.loadedSections().includes(section)){state=await this.loadSection(owner,section);if(state.state!=='connected')return this.empty(owner,state.note);}
    const generation=this.generation,binding=this.binding,clauses=q.split(/;|\band\s+(?=(?:how|what|when|where|can|does|is|do)\b)/i).slice(0,3),publicClauses=clauses.filter(clause=>!routeQuestion(clause,context));
    const privateText=clauses.filter(clause=>routeQuestion(clause,context)).join('; ')||q;
    let result=searchIndex(this.index(owner,navigationQuery(q)?null:section),privateText,context);
    const original=this.owned(owner);const coverage='Temporary local '+section+' snapshot only. Supported sources load on demand; excluded controls, unrelated records, and unavailable linked content remain unavailable.';
    result={...result,personal:true,indexed:false,answer:result.answerStatus==='not_found'?'No supporting information was found in the approved '+section+' snapshot. This does not mean the information is absent from the account.':result.answer,sources:result.sources.map(source=>{const record=original.find(item=>item.id===source.id);return{...source,retrievedAt:record?.retrievedAt,sourceTimestamp:record?.sourceTimestamp,section:record?.section,subview:record?.subview,coverage:record?.coverage};}),navigation:result.navigation.map(action=>({...action,label:'Open in portal'})),connection:this.status(owner),coverage};
    if(publicClauses.length)result.publicResult=await this.publicSearch(publicClauses.join('; '),'');
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
