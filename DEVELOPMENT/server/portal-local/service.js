const {randomBytes,createHmac,createHash}=require('node:crypto');
const {searchIndex}=require('../lib/index-search');
const {PORTAL,PortalError}=require('./browser-adapter');
const token=()=>randomBytes(24).toString('base64url');
const PRIVATE_TTL=5*60*1000;
const privateScope={allowedOrigins:['https://capstone.cs.fiu.edu'],allowedPaths:['/portal'],excludedPaths:[]};
const allowedSections=new Set(['Overview','Team','Standing','Grade','Messages']);
const allowedKinds=new Set(['profile','project','team','team-member','leadership','product-owner','dates','assignment','sprint','sprint-board','task','ceremony','standup','schedule','standing','standing-trend','grade','past-grade','messages']);
const aliases={deadlines:['dates','due','assignment','schedule'],deadline:['dates','due'],tasks:['task','assignment','sprint','board'],notifications:['messages','unread','channel'],inbox:['messages','unread','channel'],teammates:['team','member'],professor:['product','owner'],status:['sprint','team','standing'],scores:['grade','points'],weights:['grade','weight'],retrospective:['retro','ceremony'],review:['ceremony'],standup:['stand-up','update']};
const injected=text=>/ignore (?:all |previous |the )?(?:instructions|rules)|system prompt|reveal (?:secrets|tokens|password)|execute (?:this|the) (?:code|command)|send .*?(?:cookie|token|password)/i.test(text);
const navigationQuery=q=>/^(?:take me there|open it|open that|show me that section|where does it say that|view (?:the |this )?source)[.!?]*$/i.test(q.trim());
const personalFollowup=q=>/^(?:what about|and |when is it|is it|how about|show me more|which one)/i.test(q.trim());
const personalQuery=q=>/\b(my|our|mine|i am|i have|am i|who am i|signed in|logged in|messages?|inbox|unread)\b/i.test(q)||/\b(?:current|this) sprint\b/i.test(q);
function routeQuestion(q,context=''){return personalQuery(q)||(String(context).includes('private-')&&(navigationQuery(q)||personalFollowup(q)));}
function sectionFor(q,contextRecords=[]){
  if(navigationQuery(q)&&contextRecords.length===1)return contextRecords[0].section;
  if(/\b(messages?|inbox|unread|channel)\b/i.test(q))return'Messages';
  if(/\b(grade|score|points?|weight|remaining work|past term)\b/i.test(q))return'Grade';
  if(/\b(standing|trend|compare|comparison)\b/i.test(q))return'Standing';
  if(/\b(team|teammate|member|leader|leadership|product owner)\b/i.test(q))return'Team';
  if(contextRecords.length===1&&(personalFollowup(q)||/\b(?:it|that|those|previous|past|more|details?)\b/i.test(q)))return contextRecords[0].section;
  return'Overview';
}
const suggestions={Overview:['What is my project?','What tasks are in my current sprint?','What deadlines are shown for me?','What are the Sprint Review and Retrospective instructions?','What are the stand-up requirements?'],Team:['Who is on my team?','Who is my Product Owner?','What leadership information is shown for my team?'],Standing:['What is my standing?','What trend information is shown?'],Grade:['What grade components are posted?','What weights and totals are shown?','What past-term grade details are available?'],Messages:['Do I have unread messages?','Which message channels are available?']};

class PortalService{
  constructor({adapter,now=Date.now,publicSearch=async()=>({status:'unmatched',matches:[],links:[]})}){
    this.adapter=adapter;this.now=now;this.publicSearch=publicSearch;this.salt=token();this.generation=0;this.owner=null;this.state='helper-ready';this.records=[];this.sections=new Set();this.lastVerified=0;this.lastRetrieved=0;this.pending=Promise.resolve();this.choices=[];this.binding=null;this.identity=null;this.tab=null;this.activeSection=null;this.note='The local helper is available. Connect only when you need personal portal information.';
  }
  loadedSections(){return[...this.sections];}
  status(owner){
    if(this.owner!==owner)return{state:'helper-ready',generation:this.generation,name:null,verifiedAt:null,retrievedAt:null,expiresAt:null,availableKinds:[],loadedSections:[],suggestions:[],progress:{helper:true,browser:false,tab:false,identity:false,overview:false,sections:false},note:this.note};
    if(this.lastVerified&&this.now()-this.lastVerified>PRIVATE_TTL)this.invalidate('session-expired','Verification expired. Personal data was removed. Choose Verify again before asking personal questions.');
    const availableKinds=[...new Set(this.records.map(record=>record.kind))],loadedSections=this.loadedSections();
    return{state:this.state,generation:this.generation,name:this.identity?.name||null,verifiedAt:this.lastVerified?new Date(this.lastVerified).toISOString():null,retrievedAt:this.lastRetrieved?new Date(this.lastRetrieved).toISOString():null,expiresAt:this.lastVerified?new Date(this.lastVerified+PRIVATE_TTL).toISOString():null,availableKinds,loadedSections,suggestions:loadedSections.flatMap(section=>suggestions[section]||[]),progress:{helper:true,browser:!['helper-ready','browser-approval-required','browser-connection-unavailable'].includes(this.state),tab:Number.isSafeInteger(this.tab),identity:!!this.binding,overview:loadedSections.includes('Overview'),sections:loadedSections.length>0},activeSection:this.activeSection,note:this.note};
  }
  invalidate(state='not-connected',note='Private information cleared.'){this.generation++;this.state=state;this.records=[];this.sections.clear();this.binding=null;this.identity=null;this.lastVerified=0;this.lastRetrieved=0;this.activeSection=null;this.note=note;}
  async disconnect(owner){if(this.owner!==owner)return;this.invalidate();this.owner=null;this.tab=null;this.choices=[];await this.adapter.close();}
  exclusive(work){const result=this.pending.then(work,work);this.pending=result.catch(()=>{});return result;}
  async discover(owner){
    if(this.owner&&this.owner!==owner)throw new PortalError('not-connected','Another local pairing owns this connector.');
    this.owner=owner;this.invalidate('browser-approval-required','Approve the connection in Chrome, then choose your portal tab.');const generation=this.generation;
    try{const choices=await this.exclusive(()=>this.adapter.listEligible());if(generation!==this.generation||this.owner!==owner)return this.status(owner);this.choices=choices;this.state=choices.length?'tab-selection-required':'no-eligible-tab';this.note=choices.length?'Select the intended Capstone portal tab.':'No eligible portal tab was found in the approved Chrome profile. Sign in to the portal, open Overview, and retry.';return{...this.status(owner),choices};}
    catch(error){if(generation===this.generation)this.invalidate(error.state||'browser-connection-unavailable',error.message);return this.status(owner);}
  }
  async connect(owner,id){if(owner!==this.owner||!this.choices.some(page=>page.id===id))throw new PortalError('tab-selection-required','Choose a listed portal tab.');this.tab=id;return this.verify(owner,true);}
  bindingFor(owner,loaded){return createHmac('sha256',this.salt).update(owner+'\0'+loaded.contextBinding+'\0'+loaded.identity.email.toLowerCase()).digest('hex');}
  normalizeRecords(owner,loaded,binding,verifiedAt){
    const retrievedAt=this.now(),section=loaded.section||'Overview';
    return(loaded.records||[]).slice(0,160).filter(record=>allowedKinds.has(record.kind)&&record.url===PORTAL&&record.section===section&&typeof record.text==='string'&&!injected(record.text)).map((record,index)=>({id:'private-'+createHash('sha256').update(binding+'|'+this.generation+'|'+section+'|'+record.subview+'|'+record.kind+'|'+record.heading+'|'+index).digest('hex').slice(0,24),owner,contextBinding:loaded.contextBinding,binding,generation:this.generation,kind:record.kind,heading:String(record.heading).slice(0,180),text:record.text.slice(0,6000),url:PORTAL,section,subview:String(record.subview||section).slice(0,120),retrievedAt:new Date(retrievedAt).toISOString(),sourceTimestamp:record.sourceTimestamp||null,expiresAt:verifiedAt+PRIVATE_TTL,coverage:record.coverage||loaded.coverage||'Only the approved visible '+section+' section.'}));
  }
  adoptInitial(owner,loaded,previousBinding=null,verifiedAt=this.now()){
    if(loaded.state!=='verified'||!loaded.identity?.email||!loaded.identity?.name||!loaded.contextBinding)throw new PortalError('identity-verification-failed','The current portal account could not be verified. No personal data was retained.');
    const binding=this.bindingFor(owner,loaded);if(previousBinding&&binding!==previousBinding)throw new PortalError('account-changed','The portal account changed. Old private data was removed. Select the tab again to verify the current account.');
    this.binding=binding;this.identity={name:loaded.identity.name.slice(0,120)};this.lastVerified=verifiedAt;this.lastRetrieved=this.now();this.activeSection=loaded.section||'Overview';
    const profile={kind:'profile',heading:'Signed-in portal profile',text:'Verified account name: '+this.identity.name,url:PORTAL,section:'Overview',subview:'Account identity',sourceTimestamp:null};
    this.records=this.normalizeRecords(owner,{...loaded,section:'Overview',records:[profile,...(loaded.records||[])]},binding,verifiedAt);this.sections.add('Overview');
    if(!this.records.length)throw new PortalError('extraction-failed','The verified Overview did not expose any approved information. No cached answer was retained.');
    this.state='connected';this.note='Verified local read-only portal session. Approved sections load only when you ask for them; searches never extend the five-minute deadline.';return this.status(owner);
  }
  mergeSection(owner,loaded,previousBinding){
    const binding=this.bindingFor(owner,loaded);if(binding!==previousBinding)throw new PortalError('account-changed','The portal account changed. Old private data was removed. Select the tab again to verify the current account.');
    if(!allowedSections.has(loaded.section))throw new PortalError('section-denied','That section is outside the approved connector scope.');
    const fresh=this.normalizeRecords(owner,loaded,binding,this.lastVerified);this.records=[...this.records.filter(record=>record.section!==loaded.section),...fresh];this.sections.add(loaded.section);this.lastRetrieved=this.now();this.activeSection=loaded.section;this.state='connected';this.note=fresh.length?'Loaded '+loaded.section+' into this temporary private session.':'The approved '+loaded.section+' view had no searchable text. This does not prove the information is absent.';return this.status(owner);
  }
  async verify(owner,initial=false){
    if(owner!==this.owner||!Number.isSafeInteger(this.tab))return this.status(owner);
    const previousBinding=initial?null:this.binding;this.invalidate('verifying','The dedicated portal tab will return to Overview and reload once to verify the current account.');const generation=this.generation,tab=this.tab;
    return this.exclusive(async()=>{if(generation!==this.generation||owner!==this.owner)return this.status(owner);try{const loaded=await this.adapter.verify(tab);if(generation!==this.generation||owner!==this.owner)return this.status(owner);return this.adoptInitial(owner,loaded,previousBinding,this.now());}catch(error){if(generation===this.generation)this.invalidate(error.state||'identity-verification-failed',error instanceof PortalError?error.message:'Portal verification failed. Old private data was removed.');return this.status(owner);}});
  }
  async refresh(owner,initial=false){return this.verify(owner,initial);}
  async refreshContent(owner){
    const current=this.status(owner);if(current.state!=='connected'||!this.binding||!Number.isSafeInteger(this.tab))return current;
    const previousBinding=this.binding,generation=this.generation,tab=this.tab;
    return this.exclusive(async()=>{if(generation!==this.generation||owner!==this.owner)return this.status(owner);try{const loaded=await this.adapter.inspectActive(tab);if(generation!==this.generation||owner!==this.owner)return this.status(owner);return this.mergeSection(owner,loaded,previousBinding);}catch(error){if(['account-changed','sign-in-required','identity-verification-failed','connection-lost'].includes(error.state)&&generation===this.generation)this.invalidate(error.state,error.message);else this.note=error instanceof PortalError?error.message:'The current approved section could not be refreshed.';return this.status(owner);}});
  }
  async revalidate(owner){
    const current=this.status(owner);if(current.state!=='connected'||!this.binding||!Number.isSafeInteger(this.tab))return current;
    const generation=this.generation,binding=this.binding,tab=this.tab;
    return this.exclusive(async()=>{if(generation!==this.generation||owner!==this.owner)return this.status(owner);try{const loaded=await this.adapter.identity(tab);if(generation!==this.generation||owner!==this.owner)return this.status(owner);if(this.bindingFor(owner,loaded)!==binding)this.invalidate('account-changed','The portal account changed. Old private data was removed. Select the tab again to verify the current account.');}catch(error){if(generation===this.generation)this.invalidate(error.state||'connection-lost',error instanceof PortalError?error.message:'The current portal session could not be checked. Old private data was removed.');}return this.status(owner);});
  }
  async loadSection(owner,section){
    if(!allowedSections.has(section))throw new PortalError('section-denied','That portal section is outside the approved scope.');
    if(this.loadedSections().includes(section))return this.status(owner);
    const generation=this.generation,binding=this.binding,tab=this.tab;
    return this.exclusive(async()=>{if(generation!==this.generation||owner!==this.owner)return this.status(owner);try{const loaded=await this.adapter.inspectSection(tab,section,{navigate:true});if(generation!==this.generation||owner!==this.owner)return this.status(owner);return this.mergeSection(owner,loaded,binding);}catch(error){if(['account-changed','sign-in-required','identity-verification-failed','connection-lost'].includes(error.state)&&generation===this.generation)this.invalidate(error.state,error.message);else this.note=error instanceof PortalError?error.message:'The approved '+section+' section could not be loaded.';return this.status(owner);}});
  }
  owned(owner){return this.owner===owner&&this.state==='connected'&&this.binding&&this.lastVerified+PRIVATE_TTL>this.now()?this.records.filter(record=>record.owner===owner&&record.binding===this.binding&&record.generation===this.generation&&record.expiresAt>this.now()):[];}
  index(owner,section=null){
    const items=this.owned(owner).filter(record=>!section||record.section===section),siteId='private-session',at=new Date(this.lastRetrieved||this.now()).toISOString();
    return{schemaVersion:1,siteId,version:String(this.generation),scope:privateScope,retrieval:{minScore:0.30,minCoverage:0.45,maxResults:3,aliases},pages:items.map(record=>({id:record.id,siteId,url:PORTAL,status:'active',title:'Your portal · '+record.section+' · '+record.kind,tags:[record.kind,record.section,record.subview],breadcrumbs:[record.section,record.subview],indexedAt:record.retrievedAt,lastFetchedAt:at,sourceModifiedAt:record.sourceTimestamp,chunks:[{id:record.id,url:PORTAL,status:'active',heading:record.heading,hierarchy:[record.section,record.subview,record.kind,record.heading],text:record.text,blocks:[record.text],anchor:null}]}))};
  }
  empty(owner,note){return{personal:true,indexed:false,status:'unmatched',answerStatus:'not_found',answer:note||'Connect and verify your own portal session first. No personal data was searched.',sources:[],navigation:[],matches:[],links:[],connection:this.status(owner)};}
  async search(owner,{question,context=''}){
    if(typeof question!=='string'||!question.trim()||question.length>500||typeof context!=='string'||context.length>300)throw new PortalError('not-connected','Invalid search request.');
    const q=question.trim();if(!routeQuestion(q,context))return this.publicSearch(q,context);
    if(/[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/i.test(q)||/\b(?:user|account|student|owner)(?:Id|_id| id)\s*[:=]/i.test(q)||/\b(?:someone else|another student|other student|their account)\b/i.test(q))return this.empty(owner,'Only the verified account in your selected portal tab can be searched. Account identifiers in chat cannot select another user.');
    let state=await this.revalidate(owner);if(state.state!=='connected')return{...this.empty(owner,state.note),publicResult:await this.publicSearch(q,context)};
    const contextRecords=context.split(',').filter(Boolean).map(id=>this.owned(owner).find(record=>record.id===id)).filter(Boolean);
    if(context.split(',').filter(id=>id.startsWith('private-')).some(id=>!contextRecords.some(record=>record.id===id)))return this.empty(owner,'That private source expired or belongs to a different session. Ask your question again.');
    const section=sectionFor(q,contextRecords);
    if(!navigationQuery(q)&&!this.loadedSections().includes(section)){state=await this.loadSection(owner,section);if(state.state!=='connected')return this.empty(owner,state.note);}
    const generation=this.generation,binding=this.binding,clauses=q.split(/;|\band\s+(?=(?:how|what|when|where|can|does|is|do)\b)/i).slice(0,3),publicClauses=clauses.filter(clause=>!routeQuestion(clause,context));
    const privateText=clauses.filter(clause=>routeQuestion(clause,context)).join('; ')||q;
    let result=searchIndex(this.index(owner,navigationQuery(q)?null:section),privateText,context);
    const original=this.owned(owner);const coverage='Temporary local '+section+' snapshot only. Other approved sections load only when explicitly requested; excluded controls and content remain unavailable.';
    result={...result,personal:true,indexed:false,answer:result.answerStatus==='not_found'?'No supporting information was found in the approved '+section+' snapshot. This does not mean the information is absent from the account.':result.answer,sources:result.sources.map(source=>{const record=original.find(item=>item.id===source.id);return{...source,retrievedAt:record?.retrievedAt,sourceTimestamp:record?.sourceTimestamp,section:record?.section,subview:record?.subview,coverage:record?.coverage};}),navigation:result.navigation.map(action=>({...action,label:'Open in portal'})),connection:this.status(owner),coverage};
    if(publicClauses.length)result.publicResult=await this.publicSearch(publicClauses.join('; '),'');
    if(generation!==this.generation||binding!==this.binding||!this.owned(owner).length)return this.empty(owner,'The session changed before the answer was ready. Please reconnect.');
    return result;
  }
  async destination(owner,sourceId){
    const status=await this.revalidate(owner),record=this.owned(owner).find(item=>item.id===sourceId);if(status.state!=='connected'||!record)throw new PortalError('session-expired','This source is no longer verified for your session.');
    const opened=await this.adapter.open(this.tab,record.section);if(!this.owned(owner).some(item=>item.id===sourceId))throw new PortalError('session-expired','This source is no longer verified for your session.');
    return{url:PORTAL,section:record.section,subview:record.subview,guidance:opened.guidance,generation:this.generation,sourceId:record.id,connection:this.status(owner)};
  }
}
module.exports={PortalService,PRIVATE_TTL,routeQuestion,navigationQuery,sectionFor,injected};
