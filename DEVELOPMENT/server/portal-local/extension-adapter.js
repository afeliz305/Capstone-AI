const {PORTAL,PortalError}=require('./browser-adapter');
const {SECTION_ROUTES,canonicalSection}=require('./dom-reader');

class ExtensionAdapter{
  constructor(bridge){this.bridge=bridge;this.mode='extension';this.continuous=true;}
  diagnostics(){return this.bridge.diagnostics();}
  async listEligible(){const result=await this.bridge.request('discover');return(result?.tabs||[]).filter(tab=>Number.isSafeInteger(tab.id)).map(tab=>({id:tab.id,label:'Capstone portal tab '+tab.id}));}
  async identity(id){const result=await this.bridge.request('identity',{tabId:id});if(result?.state!=='verified')throw new PortalError(result?.state||'identity-verification-failed','The extension could not verify the current signed-in portal account.');return{...result,contextBinding:'extension:'+id+':'+result.documentId};}
  async capabilities(id){return this.bridge.request('capabilities',{tabId:id});}
  async inspectSection(id,section,{navigate=false}={}){
    section=canonicalSection(section);
    if(!Object.hasOwn(SECTION_ROUTES,section))throw new PortalError('section-denied','That section is outside the supported dashboard map.');
    const result=await this.bridge.request('section',{tabId:id,section,navigate,messageContent:'metadata-only'});
    if(result?.state!=='verified')throw new PortalError(result?.state||'extraction-failed',result?.message||'The approved dashboard source could not be read.');
    return{...result,contextBinding:'extension:'+id+':'+result.documentId};
  }
  async inspectActive(id){const result=await this.bridge.request('active',{tabId:id,messageContent:'metadata-only'});if(result?.state!=='verified')throw new PortalError(result?.state||'extraction-failed',result?.message||'The current approved dashboard source could not be read.');return{...result,contextBinding:'extension:'+id+':'+result.documentId};}
  async verify(id){
    const identity=await this.identity(id);const section=Object.hasOwn(SECTION_ROUTES,identity.active)?identity.active:'Today';
    const extracted=await this.inspectSection(id,section,{navigate:true});return{...identity,...extracted,identity:identity.identity,proof:identity.proof,contextBinding:identity.contextBinding};
  }
  async inspect(id){return this.inspectSection(id,'Today',{navigate:true});}
  async open(id,section='Today'){
    section=canonicalSection(Object.hasOwn(SECTION_ROUTES,canonicalSection(section))?section:'Today');
    const result=await this.bridge.request('open',{tabId:id,section});
    if(result?.state!=='present')throw new PortalError(result?.state||'section-unavailable',result?.message||'The verified dashboard destination could not be opened.');
    return{url:result.url||PORTAL,section:result.section||section,guidance:result.guidance||'The verified parent section is open.'};
  }
  async close(){}
}

module.exports={ExtensionAdapter};
