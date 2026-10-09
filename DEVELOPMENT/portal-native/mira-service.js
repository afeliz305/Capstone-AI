const { searchIndex } = require("../server/lib/index-search");
const { aliases, injected, navigationQuery, publicAuthorityQuery, routeQuestion, sectionFor, sectionsFor, publicCompanionQuestion, assistanceIntent, usablePublicResult } = require("../server/lib/portal-intent");
const { PORTAL_ORIGIN } = require("../js/shared/portal-navigation");
const { normalizeDepth, applyDepth } = require("../js/shared/mira-guidance");
const { PortalNativeError, validateHostAdapter } = require("./host-adapter");

const PRIVATE_TTL = 5 * 60 * 1000;
const allowedKinds = new Set(["profile","project","team","team-member","leadership","product-owner","dates","assignment","sprint","sprint-board","task","ceremony","standup","schedule","standing","standing-trend","messages","onboarding","connection","opportunity","team-contact","ai-anchor","record","showcase","letter","letter-guidance","resource","resource-link","brand"]);
const scope={allowedOrigins:[PORTAL_ORIGIN],allowedPaths:["/portal","/today","/inbox","/board","/meetings","/my-work","/this-term","/people","/me/rhythm","/recognition","/me/privacy","/static/templates/","/resources","/projects","/tutorials","/showcase/resources/"],excludedPaths:[]};

function safeDestination(value) {
  try {
    const url = new URL(value);
    if (url.origin !== PORTAL_ORIGIN || url.username || url.password) return null;
    if (["/portal","/today","/inbox","/board","/meetings","/my-work","/this-term","/people","/me/rhythm","/recognition","/me/privacy","/resources","/projects","/tutorials"].includes(url.pathname) || url.pathname.startsWith("/static/templates/") || url.pathname.startsWith("/showcase/resources/")) return url.href;
  } catch {}
  return null;
}

function shortHash(value) {
  let hash=2166136261;
  for (const char of String(value)) { hash ^= char.codePointAt(0); hash = Math.imul(hash,16777619); }
  return (hash>>>0).toString(16).padStart(8,"0");
}

function manualResult(records,answer,answerStatus="answered"){
  const sources=records.slice(0,7).map(record=>({id:record.id,sourceId:record.id,pageId:record.id,siteId:"portal-native-session",pageTitle:"Your portal · "+record.section,sectionTitle:record.heading,url:record.url,anchor:null,excerpt:record.text,truncated:false,indexed_at:record.retrievedAt,last_fetched_at:record.retrievedAt,source_modified_at:record.sourceTimestamp||null,section:record.section,subview:record.subview}));
  return{indexed:false,mode:"allowlisted-portal-context",semanticSearch:false,answerStatus,status:answerStatus==="not_found"?"unmatched":"matched",answer,sources,navigation:sources.map(source=>({label:"Open "+source.section,targetSourceId:source.id,url:source.url})),matches:[],links:[]};
}
function firstRecord(records,section,kind){return records.find(record=>record.section===section&&(!kind||record.kind===kind));}
function snapshotAnswer(records){
  const row=(label,record)=>label+"\n"+(record?record.text.slice(0,360):"Not available in the currently authorized snapshot.");
  return["MY CAPSTONE",row("CURRENT SPRINT",firstRecord(records,"Today","project")||firstRecord(records,"My work")),row("NEXT STEP",firstRecord(records,"My rhythm")||firstRecord(records,"Today","task")),row("OPEN / BLOCKED WORK",firstRecord(records,"Board","task")||firstRecord(records,"My work")),row("STANDUPS THIS WEEK",firstRecord(records,"My rhythm")||firstRecord(records,"Today","standup")),row("UPCOMING MEETING",firstRecord(records,"Meetings")),row("UNREAD INBOX",firstRecord(records,"Inbox","messages")),"This is a temporary read-only summary of the verified account. Missing information is not treated as zero or complete."].join("\n\n");
}
function humanHelpAnswer(question){
  const role=/\bgrade|standing|policy|extension|instructor\b/i.test(question)?"Instructor":/\baccept|review|product owner|requirement\b/i.test(question)?"Product Owner":/\bblocked|blocker|coordination|team|meeting|standup\b/i.test(question)?"Team Leader":"AI Anchor or Team Leader";
  return["WHY THIS PERSON\n"+role+" is the safest starting role for this question based on its subject.","WHAT CONTEXT WOULD BE SHARED\nOnly the question and the specific source or card details you deliberately include.","WHAT WILL NOT BE SHARED\nNo password, login code, token, unrelated portal record, message body, grade, or another student's information.","NEXT STEP\nOpen the cited Team/People source, confirm the person and role, then draft or send the message yourself. MIRA has not sent anything."].join("\n\n");
}
function checkWorkAnswer(records){
  const card=records.find(record=>record.section==="Board"&&record.kind==="task");
  const missing=!card?"MIRA could not identify an authorized current card.":/\u2611\s*0\//.test(card.text)?"The visible card shows zero checked criteria; review each criterion and add evidence before requesting review.":"MIRA cannot confirm that every criterion and required evidence is complete from the visible metadata alone.";
  return["WHAT THE RULE SAYS\nUse the reviewed acceptance-criteria, evidence, verification, and Product Owner guidance shown with this answer.","WHAT MIRA CAN SEE\n"+(card?card.text.slice(0,900):"No current-card metadata was available."),"WHAT IS STILL MISSING\n"+missing,"NEXT STEP\nOpen the card, compare each criterion with verifiable evidence, then ask the authorized reviewer. MIRA cannot move, approve, verify, or submit the card."].join("\n\n");
}

class PortalNativeMira {
  constructor({adapter, now=Date.now, publicSearch=async()=>({status:"unmatched",matches:[],links:[]}), messageContent=false}={}) {
    this.adapter=validateHostAdapter(adapter);
    this.now=now;
    this.publicSearch=publicSearch;
    this.messageContent=Boolean(messageContent);
    this.generation=1;
    this.binding=null;
    this.sources=[];
    this.snapshots=new Map();
    this.lastSources=new Map();
    this.unsubscribe=this.adapter.subscribeToSessionChanges(change=>this.handleSessionChange(change));
    if(typeof this.unsubscribe!=="function")throw new PortalNativeError("adapter-incomplete","subscribeToSessionChanges must return an unsubscribe function.");
  }
  handleSessionChange(change){
    const state=change?.state;
    if(state!=="verified"||!this.binding||change.binding!==this.binding)this.clear(state==="verified"?"account-changed":"session-ended");
  }
  clear(reason="cleared"){
    this.generation++;
    this.binding=null;
    this.sources=[];
    this.snapshots.clear();
    this.lastSources.clear();
    this.reason=reason;
  }
  destroy(){this.clear("destroyed");this.unsubscribe?.();this.unsubscribe=()=>{};}
  enforceExpiry(){
    const now=this.now();
    for(const [id,snapshot] of this.snapshots)if(snapshot.expiresAt<=now)this.snapshots.delete(id);
    for(const [id,source] of this.lastSources)if(source.expiresAt<=now)this.lastSources.delete(id);
  }
  resume(){this.enforceExpiry();return this.status();}
  status(){this.enforceExpiry();return{state:this.binding?"connected":"not-connected",generation:this.generation,loadedSections:[...this.snapshots.values()].map(item=>item.section),expiresAt:this.snapshots.size?new Date(Math.min(...[...this.snapshots.values()].map(item=>item.expiresAt))).toISOString():null,reason:this.reason||null};}
  async verify(){
    this.enforceExpiry();
    const session=await this.adapter.getVerifiedSession();
    if(session?.state!=="verified"||typeof session.binding!=="string"||session.binding.length<8){this.clear(session?.state||"unverified");throw new PortalNativeError("session-unverified","Sign in through the portal's existing email-code flow before using personal MIRA.");}
    if(this.binding&&this.binding!==session.binding)this.clear("account-changed");
    this.binding=session.binding;
    return session;
  }
  async capability(section){
    const listed=await this.adapter.listAccessibleSources({binding:this.binding});
    if(!Array.isArray(listed))throw new PortalNativeError("source-map-unavailable","The portal did not provide an accessible-source map.");
    this.sources=listed.filter(source=>source&&typeof source.id==="string"&&typeof source.section==="string"&&source.readable!==false).slice(0,80);
    return this.sources.find(source=>source.section.toLowerCase()===String(section).toLowerCase())||null;
  }
  normalizeRecords(loaded,source,destination,expiresAt){
    const records=[];
    for(const [index,record] of (loaded.records||[]).slice(0,240).entries()){
      if(!record||!allowedKinds.has(record.kind)||typeof record.text!=="string"||injected(record.text))continue;
      const text=record.text.slice(0,6000),heading=String(record.heading||record.kind).slice(0,180),subview=String(record.subview||loaded.section).slice(0,120);
      const id="private-"+this.generation+"-"+shortHash(source.id+"|"+loaded.section+"|"+record.kind+"|"+heading+"|"+index);
      records.push({id,sourceId:source.id,kind:record.kind,heading,text,section:loaded.section,subview,sourceTimestamp:record.sourceTimestamp||null,url:destination.url,retrievedAt:new Date(this.now()).toISOString(),expiresAt,coverage:String(record.coverage||loaded.coverage||("Authorized "+loaded.section+" source only.")).slice(0,300)});
    }
    return records;
  }
  async load(section){
    this.enforceExpiry();
    const existing=[...this.snapshots.values()].find(item=>item.section===section&&item.binding===this.binding&&item.expiresAt>this.now());
    if(existing)return existing;
    const source=await this.capability(section);
    if(!source)throw new PortalNativeError("source-unavailable","The current account does not expose an approved "+section+" source.");
    const generation=this.generation,binding=this.binding;
    if(section==="Grade"){
      const resolved=await this.adapter.resolveSourceDestination({sourceId:source.id,section});
      const url=safeDestination(resolved?.url);
      if(!url||!["exact-section","parent-only"].includes(resolved?.capability))throw new PortalNativeError("destination-unavailable","The portal did not provide a safe destination for this source.");
      const retrievedAt=this.now(),expiresAt=retrievedAt+PRIVATE_TTL;
      const snapshot={sourceId:source.id,section,binding,retrievedAt,expiresAt,records:[],destination:{...resolved,url}};
      this.snapshots.set(source.id,snapshot);
      return snapshot;
    }
    const loaded=await this.adapter.readAuthorizedSection({sourceId:source.id,section,messageContent:false,purpose:"mira-answer"});
    if(generation!==this.generation||binding!==this.binding)throw new PortalNativeError("session-changed","The portal session changed before the read completed.");
    if(!loaded||loaded.sessionBinding!==binding||loaded.section!==section||!Array.isArray(loaded.records))throw new PortalNativeError("source-verification-failed","The portal could not verify this source for the current session.");
    const resolved=await this.adapter.resolveSourceDestination({sourceId:source.id,section});
    const url=safeDestination(resolved?.url);
    if(!url||!["exact-section","parent-only"].includes(resolved?.capability))throw new PortalNativeError("destination-unavailable","The portal did not provide a safe destination for this source.");
    const expiresAt=this.now()+PRIVATE_TTL;
    const records=this.normalizeRecords(loaded,source,{...resolved,url},expiresAt);
    const snapshot={sourceId:source.id,section,binding,retrievedAt:this.now(),expiresAt,records,destination:{...resolved,url}};
    this.snapshots.set(source.id,snapshot);
    return snapshot;
  }
  index(snapshot){
    const at=new Date(snapshot.retrievedAt).toISOString();
    return{schemaVersion:1,siteId:"portal-native-session",version:String(this.generation),scope,retrieval:{minScore:0.30,minCoverage:0.45,maxResults:3,aliases},pages:snapshot.records.map(record=>({id:record.id,siteId:"portal-native-session",url:record.url,status:"active",title:"Your portal · "+record.section+" · "+record.kind,tags:[record.kind,record.section,record.subview],breadcrumbs:[record.section,record.subview],indexedAt:record.retrievedAt,lastFetchedAt:at,sourceModifiedAt:record.sourceTimestamp,chunks:[{id:record.id,url:record.url,status:"active",heading:record.heading,hierarchy:[record.section,record.subview,record.kind,record.heading],text:record.text,blocks:[record.text],anchor:null}]}))};
  }
  indexMany(snapshots){const indexes=snapshots.map(snapshot=>this.index(snapshot));return{...indexes[0],pages:indexes.flatMap(index=>index.pages)};}
  async ask(question,context="",options={}){
    if(typeof question!=="string"||!question.trim()||question.length>500||typeof context!=="string"||context.length>300)throw new PortalNativeError("invalid-question","Enter a shorter question.");
    const q=question.trim();
    if(publicAuthorityQuery(q)||!routeQuestion(q,context))return this.publicSearch(q,context);
    if(/[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/i.test(q)||/\b(?:student|account|user)(?:Id|_id| id)\s*[:=]/i.test(q)||/\b(?:another|other) student\b/i.test(q))throw new PortalNativeError("account-selection-denied","MIRA uses only the server-verified current portal session; chat text cannot select another account.");
    try{await this.verify();}catch(error){const publicResult=await this.publicSearch(q,context);if(usablePublicResult(publicResult))return{...publicResult,personalUnavailable:true,personalNote:error.message};throw error;}
    const depth=normalizeDepth(options?.depth),contextRecords=String(context).split(",").map(id=>this.lastSources.get(id)?.record).filter(Boolean),sections=sectionsFor(q,contextRecords).slice(0,7),section=sections[0]||sectionFor(q,contextRecords);
    let snapshots;
    if(navigationQuery(q)&&contextRecords.length===1)snapshots=[[...this.snapshots.values()].find(item=>item.records.some(record=>record.id===contextRecords[0].id))];
    else{
      snapshots=[];
      for(const name of sections)try{snapshots.push(await this.load(name));}catch(error){if(sections.length===1||error?.state!=="source-unavailable")throw error;}
    }
    if(!snapshots.length||snapshots.some(snapshot=>!snapshot))throw new PortalNativeError("source-expired","That source expired. Ask the personal question again.");
    const generation=this.generation,binding=this.binding;
    const intent=assistanceIntent(q),records=snapshots.flatMap(snapshot=>snapshot.records);
    const publicQuestion=publicCompanionQuestion(q),publicResult=publicQuestion?await this.publicSearch(publicQuestion,""):undefined;
    let result;
    if(intent==="snapshot")result=manualResult(sections.map(name=>firstRecord(records,name)).filter(Boolean),snapshotAnswer(records));
    else if(intent==="human-help")result=manualResult(records.filter(record=>["Team","People"].includes(record.section)).slice(0,3),humanHelpAnswer(q));
    else if(intent==="check-work")result=manualResult(records.filter(record=>record.section==="Board").slice(0,3),checkWorkAnswer(records),records.some(record=>record.section==="Board")?"partial":"not_found");
    else{
      result=searchIndex(this.indexMany(snapshots),q,context);
      if(intent==="next-step"&&result.answerStatus==="not_found")result=manualResult(records.slice(0,3),snapshotAnswer(records),"partial");
    }
    if(generation!==this.generation||binding!==this.binding)throw new PortalNativeError("session-changed","The portal session changed before the answer was ready.");
    this.enforceExpiry();
    const sources=result.sources.map(item=>{const snapshot=snapshots.find(value=>value.records.some(record=>record.id===item.id)),record=snapshot.records.find(candidate=>candidate.id===item.id);const source={...item,section:record.section,subview:record.subview,retrievedAt:record.retrievedAt,expiresAt:record.expiresAt,coverage:record.coverage,destination:snapshot.destination};this.lastSources.set(item.id,{record,sourceId:snapshot.sourceId,expiresAt:record.expiresAt});return source;});
    const sourceLabels=[...new Set(sources.map(source=>source.section+' — current portal'))],answer=applyDepth(result.answerStatus==="not_found"?"No supporting information was found in the approved "+sections.join(', ')+" source. This does not prove the information is absent.":result.answer,{depth,sourceLabels});
    return{...result,personal:true,indexed:false,responseDepth:depth,sourceContext:sourceLabels,answer,sources,navigation:result.navigation.map(action=>{const source=sources.find(item=>item.id===action.targetSourceId);return{...action,label:source?.destination?.label||("Open "+(source?.section||section))};}),connection:this.status(),coverage:"Current-session "+sections.join(', ')+" source only. Private content expires five minutes after retrieval and remains inside this portal page.",...(publicResult?{publicResult}:{})};
  }
  async openSource(sourceId){
    await this.verify();this.enforceExpiry();
    const source=this.lastSources.get(sourceId);
    if(!source||source.expiresAt<=this.now())throw new PortalNativeError("source-expired","That source expired. Ask again before opening it.");
    return this.adapter.openAuthorizedSection({sourceId:source.sourceId,section:source.record.section,purpose:"mira-source-navigation"});
  }
}

module.exports={PortalNativeMira,PRIVATE_TTL,safeDestination};
