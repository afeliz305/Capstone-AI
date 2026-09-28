const { searchIndex } = require("../server/lib/index-search");
const { aliases, injected, navigationQuery, publicAuthorityQuery, routeQuestion, sectionFor, usablePublicResult } = require("../server/lib/portal-intent");
const { PORTAL_ORIGIN } = require("../js/shared/portal-navigation");
const { PortalNativeError, validateHostAdapter } = require("./host-adapter");

const PRIVATE_TTL = 5 * 60 * 1000;
const allowedKinds = new Set(["profile","project","team","team-member","classmate","alumni","leadership","product-owner","dates","assignment","sprint","sprint-board","task","ceremony","standup","schedule","standing","standing-trend","grade","past-grade","messages","message-content","onboarding","connection","opportunity","team-contact","ai-anchor","record","showcase","letter","letter-guidance","resource","resource-link","brand"]);
const scope={allowedOrigins:[PORTAL_ORIGIN],allowedPaths:["/portal","/static/templates/","/resources","/projects","/tutorials","/showcase/resources/"],excludedPaths:[]};

function safeDestination(value) {
  try {
    const url = new URL(value);
    if (url.origin !== PORTAL_ORIGIN || url.username || url.password) return null;
    if (url.pathname === "/portal" || url.pathname === "/resources" || url.pathname === "/projects" || url.pathname === "/tutorials" || url.pathname.startsWith("/static/templates/") || url.pathname.startsWith("/showcase/resources/")) return url.href;
  } catch {}
  return null;
}

function shortHash(value) {
  let hash=2166136261;
  for (const char of String(value)) { hash ^= char.codePointAt(0); hash = Math.imul(hash,16777619); }
  return (hash>>>0).toString(16).padStart(8,"0");
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
    if(section==="Messages"&&this.messageContent&&!source.messageContentReadable)throw new PortalNativeError("message-content-unavailable","Message content is outside the approved read scope. Open Messages yourself to review it.");
    const generation=this.generation,binding=this.binding;
    const loaded=await this.adapter.readAuthorizedSection({sourceId:source.id,section,messageContent:section==="Messages"&&this.messageContent,purpose:"mira-answer"});
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
  async ask(question,context=""){
    if(typeof question!=="string"||!question.trim()||question.length>500||typeof context!=="string"||context.length>300)throw new PortalNativeError("invalid-question","Enter a shorter question.");
    const q=question.trim();
    if(publicAuthorityQuery(q)||!routeQuestion(q,context))return this.publicSearch(q,context);
    if(/[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/i.test(q)||/\b(?:student|account|user)(?:Id|_id| id)\s*[:=]/i.test(q)||/\b(?:another|other) student\b/i.test(q))throw new PortalNativeError("account-selection-denied","MIRA uses only the server-verified current portal session; chat text cannot select another account.");
    try{await this.verify();}catch(error){const publicResult=await this.publicSearch(q,context);if(usablePublicResult(publicResult))return{...publicResult,personalUnavailable:true,personalNote:error.message};throw error;}
    const contextRecords=String(context).split(",").map(id=>this.lastSources.get(id)?.record).filter(Boolean);
    const section=sectionFor(q,contextRecords);
    const snapshot=navigationQuery(q)&&contextRecords.length===1?[...this.snapshots.values()].find(item=>item.records.some(record=>record.id===contextRecords[0].id)):await this.load(section);
    if(!snapshot)throw new PortalNativeError("source-expired","That source expired. Ask the personal question again.");
    const generation=this.generation,binding=this.binding;
    const result=searchIndex(this.index(snapshot),q,context);
    if(generation!==this.generation||binding!==this.binding)throw new PortalNativeError("session-changed","The portal session changed before the answer was ready.");
    this.enforceExpiry();
    const sources=result.sources.map(item=>{const record=snapshot.records.find(candidate=>candidate.id===item.id);const source={...item,section:record.section,subview:record.subview,retrievedAt:record.retrievedAt,expiresAt:record.expiresAt,coverage:record.coverage,destination:snapshot.destination};this.lastSources.set(item.id,{record,sourceId:snapshot.sourceId,expiresAt:record.expiresAt});return source;});
    return{...result,personal:true,indexed:false,answer:result.answerStatus==="not_found"?"No supporting information was found in the approved "+section+" source. This does not prove the information is absent.":result.answer,sources,navigation:result.navigation.map(action=>({...action,label:snapshot.destination.label||("Open "+section)})),connection:this.status(),coverage:"Current-session "+section+" source only. Private content expires five minutes after retrieval and remains inside this portal page."};
  }
  async openSource(sourceId){
    await this.verify();this.enforceExpiry();
    const source=this.lastSources.get(sourceId);
    if(!source||source.expiresAt<=this.now())throw new PortalNativeError("source-expired","That source expired. Ask again before opening it.");
    return this.adapter.openAuthorizedSection({sourceId:source.sourceId,section:source.record.section,purpose:"mira-source-navigation"});
  }
}

module.exports={PortalNativeMira,PRIVATE_TTL,safeDestination};
