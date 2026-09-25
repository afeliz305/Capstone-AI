const {randomBytes,createHmac,createHash}=require('node:crypto');
const {searchIndex}=require('../lib/index-search');
const {PORTAL,PortalError}=require('./browser-adapter');
const token=()=>randomBytes(24).toString('base64url');
// Personal answers are valid only during an explicit verification lease. No
// timer or ordinary chat question reloads the portal to extend this lease.
const PRIVATE_TTL=5*60*1000;
const privateScope={allowedOrigins:['https://capstone.cs.fiu.edu'],allowedPaths:['/portal'],excludedPaths:[]};
const aliases={deadlines:['dates','due','assignment','sprint'],deadline:['dates','due'],tasks:['assignment','sprint'],notifications:['messages'],inbox:['messages'],unread:['messages'],profile:['name','profile'],name:['name','profile'],teammates:['team'],professor:['product','owner'],status:['sprint','team']};
const injected=text=>/ignore (?:all |previous |the )?(?:instructions|rules)|system prompt|reveal (?:secrets|tokens|password)|execute (?:this|the) (?:code|command)|send .*?(?:cookie|token|password)/i.test(text);
const personalQuery=q=>/\b(my|our|mine|i am|i have|am i|who am i|signed in|logged in|messages?|inbox|unread)\b/i.test(q)||/\b(?:current|this) sprint\b/i.test(q);
const navigationQuery=q=>/^(?:take me there|open it|open that|show me that section|where does it say that|view (?:the |this )?source)[.!?]*$/i.test(q.trim());
const personalFollowup=q=>/^(?:what about|and |when is it|is it|how about)/i.test(q.trim());
function routeQuestion(q,context='') { return personalQuery(q)||(String(context).startsWith('private-')&&(navigationQuery(q)||personalFollowup(q))); }
const questions={profile:'What name is shown on my portal account?',project:'What is my project?',team:'Who is on my team?','product-owner':'Who is my Product Owner?',dates:'What dates are shown on my Overview?',assignment:'What is my current assignment?',sprint:'What sprint information is available?',messages:'What message indicator is visible?'};
class PortalService {
  constructor({adapter,now=Date.now,publicSearch=async()=>({status:'unmatched',matches:[],links:[]})}) {
    this.adapter=adapter;this.now=now;this.publicSearch=publicSearch;this.salt=token();this.generation=0;this.owner=null;this.state='helper-ready';this.records=[];this.lastVerified=0;this.lastRetrieved=0;this.pending=Promise.resolve();this.choices=[];this.binding=null;this.identity=null;this.tab=null;this.note='The local helper is available. Select Connect my portal when you need personal Overview information.';
  }
  status(owner) {
    if(this.owner!==owner) return {state:'helper-ready',generation:this.generation,name:null,verifiedAt:null,retrievedAt:null,expiresAt:null,availableKinds:[],suggestions:[],progress:{helper:true,browser:false,tab:false,identity:false,overview:false},note:this.note};
    if(this.lastVerified && this.now()-this.lastVerified>PRIVATE_TTL) this.invalidate('session-expired','Verification expired. Personal data was removed. Choose Verify again before asking personal questions.');
    const availableKinds=[...new Set(this.records.map(record=>record.kind))];
    return {state:this.state,generation:this.generation,name:this.identity?.name||null,verifiedAt:this.lastVerified?new Date(this.lastVerified).toISOString():null,retrievedAt:this.lastRetrieved?new Date(this.lastRetrieved).toISOString():null,expiresAt:this.lastVerified?new Date(this.lastVerified+PRIVATE_TTL).toISOString():null,availableKinds,suggestions:availableKinds.map(kind=>questions[kind]).filter(Boolean),progress:{helper:true,browser:!['helper-ready','browser-approval-required','browser-connection-unavailable'].includes(this.state),tab:Number.isSafeInteger(this.tab),identity:!!this.binding,overview:this.state==='connected'&&this.records.length>0},note:this.note};
  }
  invalidate(state='not-connected',note='Private information cleared.') { this.generation++;this.state=state;this.records=[];this.binding=null;this.identity=null;this.lastVerified=0;this.lastRetrieved=0;this.note=note; }
  async disconnect(owner) { if(this.owner!==owner) return;this.invalidate();this.owner=null;this.tab=null;this.choices=[];await this.adapter.close(); }
  exclusive(work) { const result=this.pending.then(work,work);this.pending=result.catch(()=>{});return result; }
  async discover(owner) {
    if(this.owner&&this.owner!==owner) throw new PortalError('not-connected','Another local pairing owns this connector.');
    this.owner=owner;this.invalidate('browser-approval-required','Approve the connection in Chrome, then choose your portal tab.');const generation=this.generation;
    try { const choices=await this.exclusive(()=>this.adapter.listEligible());if(generation!==this.generation||this.owner!==owner) return this.status(owner);this.choices=choices;this.state=choices.length?'tab-selection-required':'no-eligible-tab';this.note=choices.length?'Select the intended Capstone portal tab.':'No eligible portal tab was found in the approved Chrome profile. Sign in to the portal, open Overview, and retry.';return {...this.status(owner),choices}; }
    catch(error) { if(generation===this.generation) this.invalidate(error.state||'browser-connection-unavailable',error.message);return this.status(owner); }
  }
  async connect(owner,id) {
    if(owner!==this.owner||!this.choices.some(page=>page.id===id)) throw new PortalError('tab-selection-required','Choose a listed portal tab.');
    this.tab=id;
    return this.verify(owner,true);
  }
  bindingFor(owner,loaded) { return createHmac('sha256',this.salt).update(owner+'\0'+loaded.contextBinding+'\0'+loaded.identity.email.toLowerCase()).digest('hex'); }
  adopt(owner,loaded,{previousBinding=null,verifiedAt=this.now()}={}) {
    if(loaded.state!=='verified'||!loaded.identity?.email||!loaded.identity?.name||!loaded.contextBinding) throw new PortalError('identity-verification-failed','The current portal account could not be verified. No personal data was retained.');
    const binding=this.bindingFor(owner,loaded);
    if(previousBinding&&binding!==previousBinding) throw new PortalError('account-changed','The portal account changed. Old private data was removed. Select the tab again to verify the current account.');
    this.binding=binding;this.identity={name:loaded.identity.name.slice(0,120)};this.lastVerified=verifiedAt;this.lastRetrieved=this.now();
    const records=[{kind:'profile',heading:'Signed-in portal profile',text:'Verified account name: '+this.identity.name,url:PORTAL,section:'Overview'},...(loaded.records||[])];
    this.records=records.slice(0,20).filter(record=>['profile','project','team','product-owner','dates','assignment','sprint','messages'].includes(record.kind)&&record.url===PORTAL&&typeof record.text==='string'&&!injected(record.text)).map(record=>({id:'private-'+createHash('sha256').update(binding+'|'+this.generation+'|'+record.kind+'|'+record.heading).digest('hex').slice(0,24),owner,contextBinding:loaded.contextBinding,binding,generation:this.generation,kind:record.kind,heading:String(record.heading).slice(0,180),text:record.text.slice(0,6000),url:PORTAL,section:record.section==='Messages'?'Messages':'Overview',retrievedAt:new Date(this.lastRetrieved).toISOString(),sourceTimestamp:null,expiresAt:this.lastVerified+PRIVATE_TTL,coverage:loaded.coverage||'Only visible approved Overview sections.'}));
    if(!this.records.length) throw new PortalError('extraction-failed','The verified Overview did not expose any approved information. No cached answer was retained.');
    this.state='connected';this.note='Verified local read-only Overview. Ordinary questions do not reload the portal. Use Refresh information for visible changes or Verify again when verification expires.';
    return this.status(owner);
  }
  async verify(owner,initial=false) {
    if(owner!==this.owner||!Number.isSafeInteger(this.tab)) return this.status(owner);
    const previousBinding=initial?null:this.binding;
    this.invalidate('verifying','The dedicated Overview tab will reload once to verify the current account.');
    const generation=this.generation,tab=this.tab;
    return this.exclusive(async()=>{
      if(generation!==this.generation||owner!==this.owner) return this.status(owner);
      try {
        const loaded=await this.adapter.verify(tab);
        if(generation!==this.generation||owner!==this.owner) return this.status(owner);
        return this.adopt(owner,loaded,{previousBinding,verifiedAt:this.now()});
      } catch(error) {if(generation===this.generation) this.invalidate(error.state||'identity-verification-failed',error instanceof PortalError?error.message:'Portal verification failed. Old private data was removed.');return this.status(owner);}
    });
  }
  async refresh(owner,initial=false) { return this.verify(owner,initial); }
  async refreshContent(owner) {
    const current=this.status(owner);
    if(current.state!=='connected'||!this.binding||!Number.isSafeInteger(this.tab)) return current;
    const previousBinding=this.binding,verifiedAt=this.lastVerified,tab=this.tab;
    this.invalidate('retrieving','Reading the approved visible Overview without reloading it.');
    const generation=this.generation;
    return this.exclusive(async()=>{
      if(generation!==this.generation||owner!==this.owner) return this.status(owner);
      try {
        const loaded=await this.adapter.inspect(tab);
        if(generation!==this.generation||owner!==this.owner) return this.status(owner);
        return this.adopt(owner,loaded,{previousBinding,verifiedAt});
      } catch(error) {if(generation===this.generation) this.invalidate(error.state||'extraction-failed',error instanceof PortalError?error.message:'Overview extraction failed. Old private data was removed.');return this.status(owner);}
    });
  }
  async revalidate(owner) {
    const current=this.status(owner);
    if(current.state!=='connected'||!this.binding||!Number.isSafeInteger(this.tab)) return current;
    const generation=this.generation,binding=this.binding,tab=this.tab;
    return this.exclusive(async()=>{
      if(generation!==this.generation||owner!==this.owner) return this.status(owner);
      try {
        // This check never extends the verification lease or replaces records.
        // It only detects visible sign-out/account/tab changes before release.
        const loaded=await this.adapter.inspect(tab);
        if(generation!==this.generation||owner!==this.owner) return this.status(owner);
        if(this.bindingFor(owner,loaded)!==binding) this.invalidate('account-changed','The portal account changed. Old private data was removed. Select the tab again to verify the current account.');
      } catch(error) {if(generation===this.generation) this.invalidate(error.state||'connection-lost',error instanceof PortalError?error.message:'The current portal session could not be checked. Old private data was removed.');}
      return this.status(owner);
    });
  }
  owned(owner) { return this.owner===owner&&this.state==='connected'&&this.binding&&this.lastVerified+PRIVATE_TTL>this.now() ? this.records.filter(r=>r.owner===owner&&r.binding===this.binding&&r.generation===this.generation&&r.expiresAt>this.now()) : []; }
  index(owner) {
    const items=this.owned(owner),siteId='private-session',at=new Date(this.lastRetrieved||this.now()).toISOString();
    return {schemaVersion:1,siteId,version:String(this.generation),scope:privateScope,retrieval:{minScore:0.35,minCoverage:0.55,maxResults:3,aliases},pages:items.map(r=>({id:r.id,siteId,url:PORTAL,status:'active',title:'Your portal · '+r.kind,tags:[r.kind],breadcrumbs:['Overview'],indexedAt:r.retrievedAt,lastFetchedAt:at,chunks:[{id:r.id,url:PORTAL,status:'active',heading:r.heading,hierarchy:[r.kind,r.heading],text:r.text,blocks:[r.text],anchor:null}]}))};
  }
  empty(owner,note) {return {personal:true,indexed:false,status:'unmatched',answerStatus:'not_found',answer:note||'Connect and verify your own portal session first. No personal data was searched.',sources:[],navigation:[],matches:[],links:[],connection:this.status(owner)};}
  async search(owner,{question,context=''}) {
    if(typeof question!=='string'||!question.trim()||question.length>500||typeof context!=='string'||context.length>300) throw new PortalError('not-connected','Invalid search request.');
    const q=question.trim();
    if(!routeQuestion(q,context)) return this.publicSearch(q,context);
    // No client-provided account identifiers are used to select records.
    if(/[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/i.test(q)||/\b(?:user|account|student|owner)(?:Id|_id| id)\s*[:=]/i.test(q)||/\b(?:someone else|another student|other student|their account)\b/i.test(q)) return this.empty(owner,'Only the verified account in your selected portal tab can be searched. Account identifiers in chat cannot select another user.');
    const state=await this.revalidate(owner);
    if(state.state!=='connected') return {...this.empty(owner,state.note),publicResult:await this.publicSearch(q,context)};
    const generation=this.generation,binding=this.binding;
    const ids=context.split(',').filter(Boolean);
    if(ids.some(id=>id.startsWith('private-')&&!this.owned(owner).some(r=>r.id===id))) return this.empty(owner,'That private source expired or belongs to a different session. Ask your question again.');
    const clauses=q.split(/;|\band\s+(?=(?:how|what|when|where|can|does|is|do)\b)/i).slice(0,3);
    const publicClauses=clauses.filter(c=>!routeQuestion(c,context));
    const privateText=clauses.filter(c=>routeQuestion(c,context)).join('; ')||q;
    let result=searchIndex(this.index(owner),privateText,context);
    const original=this.owned(owner);
    result={...result,personal:true,indexed:false,answer:result.answerStatus==='not_found'?'No supporting information was found in the approved Overview content. This does not mean the information or messages do not exist in the account.':result.answer,sources:result.sources.map(s=>{const r=original.find(r=>r.id===s.id);return {...s,retrievedAt:r.retrievedAt,section:r.section,coverage:r.coverage};}),navigation:result.navigation.map(a=>({...a,label:'Open in portal'})),connection:this.status(owner),coverage:'Partial: approved visible Overview content only, plus any Messages sidebar indicator. Inbox contents, collapsed cards, grades and Canvas are not searched.'};
    if(publicClauses.length) result.publicResult=await this.publicSearch(publicClauses.join('; '),'');
    if(generation!==this.generation||binding!==this.binding||!this.owned(owner).length) return this.empty(owner,'The session changed before the answer was ready. Please reconnect.');
    return result;
  }
  async destination(owner,sourceId) {
    const status=await this.revalidate(owner);
    const record=this.owned(owner).find(r=>r.id===sourceId);
    if(status.state!=='connected'||!record) throw new PortalError('session-expired','This source is no longer verified for your session.');
    if(!this.owned(owner).some(item=>item.id===sourceId)) throw new PortalError('session-expired','This source is no longer verified for your session.');
    // A normal validated link is deliberate: sidebar state has no unique URL.
    // Do not click Messages and inadvertently mark a conversation read.
    return {url:PORTAL,section:record.section,generation:this.generation,sourceId:record.id,connection:status};
  }
}
module.exports={PortalService,PRIVATE_TTL,routeQuestion,navigationQuery,injected};
