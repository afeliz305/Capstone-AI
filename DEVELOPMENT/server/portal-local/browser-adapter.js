const path = require('node:path');
const { Client } = require('@modelcontextprotocol/sdk/client/index.js');
const { StdioClientTransport } = require('@modelcontextprotocol/sdk/client/stdio.js');
const { SECTION_ROUTES, readPortalGuard, readPortalIdentity, navigatePortalSection, readPortalSection } = require('./dom-reader');
const PORTAL='https://capstone.cs.fiu.edu/portal';
const APPROVAL_TIMEOUT_MS=Math.min(180000,Math.max(30000,Number(process.env.CAPSTONE_PORTAL_APPROVAL_TIMEOUT_MS)||120000));
const TOOL_TIMEOUTS={list_pages:APPROVAL_TIMEOUT_MS,evaluate_script:30000,navigate_page:45000};
function portalUrl(url) { try { const u=new URL(url); return u.href===PORTAL || u.href===PORTAL+'#'; } catch { return false; } }
class PortalError extends Error { constructor(state,message,diagnostic='unknown') { super(message); this.state=state; this.diagnostic=diagnostic; } }
function resultText(result) { return (result.content || []).filter(c=>c.type==='text').map(c=>c.text).join('\n'); }
function jsonResult(result) { const match=resultText(result).match(/```json\s*([\s\S]*?)\s*```/); if (!match) throw new PortalError('connection-lost','The browser returned an unsupported response.'); return JSON.parse(match[1]); }
function safeConnectionError(message,flags=new Set(),phase='browser') {
  const text=message||'';
  if(phase==='evaluate_script'&&/execution context|context.*destroyed|cannot find context|target navigated/i.test(text)) return new PortalError('extraction-failed','The portal changed execution context during the read. The connector will retry once without reloading.','page-context-changed');
  if(phase==='evaluate_script'&&/(?:Reference|Type|Syntax|Range|Eval)Error/i.test(text)) return new PortalError('extraction-failed','The approved portal reader encountered a browser script error. The browser connection remains open.','page-script-error');
  if(/approval|permission|remote debugging|DevToolsActivePort/i.test(text)||flags.has('approval')) return new PortalError('browser-approval-required','Chrome is waiting for browser approval. Keep Chrome open, enable incoming debugging yourself, approve the prompt, and retry.','approval');
  if(/target.*closed|detached/i.test(text)||flags.has('target-closed')) return new PortalError('browser-connection-unavailable','Chrome reloaded the portal, but the connector lost that page target. Retry the connection after the Overview finishes loading.','target-closed');
  if(/socket.*closed|connection.*closed/i.test(text)||flags.has('socket-closed')) return new PortalError('browser-connection-unavailable','Chrome closed the approved debugging connection during verification. Keep remote debugging enabled, approve the next prompt, and retry.','socket-closed');
  if(/timed?\s*out|timeout/i.test(text)||flags.has('timeout')) {
    if(phase==='list_pages') return new PortalError('browser-connection-unavailable','The connector started, but Chrome did not complete the browser request within the 120-second approval window. Whether a consent prompt appeared is unconfirmed.','browser-request-timeout');
    if(phase==='navigate_page') return new PortalError('browser-connection-unavailable','The verified portal reload did not complete within its browser-operation window. The existing connector remains available for a deliberate retry.','reload-timeout');
    return new PortalError('browser-connection-unavailable','The approved read-only browser operation timed out. The existing connector remains available for a deliberate retry.','browser-operation-timeout');
  }
  if(/could not connect|couldn't connect|browser.*not.*running|ENOENT|spawn/i.test(text)) return new PortalError('browser-connection-unavailable','The approved Chrome connection is unavailable. Confirm Chrome is running in the profile that has your portal tab, then retry.','connect-unavailable');
  if(/already.*(?:debug|attach)|another.*debug/i.test(message||'')) return new PortalError('browser-connection-unavailable','Another debugging session may own this browser tab. Review Chrome’s active debugging connections before retrying.');
  return new PortalError('browser-connection-unavailable','The browser connection was lost. Keep the local helper and Chrome open, then retry.');
}
class BrowserAdapter {
  constructor() { this.client=null; this.transport=null; this.startPromise=null; this.epoch=0; this.attempt=0; this.stderrFlags=new Set(); this.trace={attempt:0,stage:'idle',at:new Date().toISOString(),childPid:null,exitCode:null,errorType:null}; }
  setStage(stage,details={}) { this.trace={...this.trace,...details,attempt:this.attempt,stage,at:new Date().toISOString()}; if(this.attempt>0)console.error('Portal browser diagnostic: '+JSON.stringify(this.trace)); }
  diagnostics() { return {...this.trace}; }
  async start() {
    if(this.client) return;
    if(this.startPromise)return this.startPromise;
    const epoch=this.epoch,attempt=++this.attempt;
    const pending=(async()=>{
      this.setStage('child-starting',{childPid:null,exitCode:null,errorType:null});
      const client=new Client({name:'capstone-local-read-only',version:'1.0.0'},{capabilities:{}});
      const binary=path.join(path.dirname(require.resolve('chrome-devtools-mcp')),'bin/chrome-devtools-mcp.js');
      const env=Object.fromEntries(['PATH','Path','SYSTEMROOT','SystemRoot','USERPROFILE','LOCALAPPDATA','APPDATA','TEMP','TMP'].filter(k=>process.env[k]).map(k=>[k,process.env[k]]));
      Object.assign(env,{CHROME_DEVTOOLS_MCP_NO_USAGE_STATISTICS:'1',CI:'1'});
      const transport=new StdioClientTransport({command:process.execPath,args:[binary,'--autoConnect','--channel=stable','--allowedUrlPattern=https://capstone.cs.fiu.edu/*','--no-usage-statistics','--no-performance-crux','--no-source-maps','--no-category-input','--no-category-emulation','--no-category-performance','--no-category-network','--no-category-memory','--redact-network-headers','--experimental-structured-content'],env,stderr:'pipe'});
      this.stderrFlags.clear();
      transport.stderr?.on('data',bytes=>{const text=String(bytes);if(/approval|permission/i.test(text))this.stderrFlags.add('approval');if(/timed?\s*out|timeout/i.test(text))this.stderrFlags.add('timeout');if(/socket.*closed|connection.*closed/i.test(text))this.stderrFlags.add('socket-closed');if(/target.*closed|detached/i.test(text))this.stderrFlags.add('target-closed');});
      client.onclose=()=>{if(this.client===client){this.client=null;this.transport=null;this.setStage('transport-closed',{errorType:'connection-closed'});}};
      this.client=client;this.transport=transport;
      try {
        await client.connect(transport,{timeout:15000});
        if(epoch!==this.epoch||attempt!==this.attempt)throw new Error('stale connector start');
        const child=transport._process;
        child?.once('exit',(code)=>{if(this.transport===transport)this.setStage('child-exited',{exitCode:Number.isInteger(code)?code:null,errorType:'child-exit'});});
        this.setStage('mcp-ready',{childPid:transport.pid||null,errorType:null});
      } catch(error) {
        const mapped=safeConnectionError(error?.message,this.stderrFlags,'start');
        this.setStage('mcp-start-failed',{childPid:transport.pid||null,errorType:mapped.diagnostic});
        await this.close();throw mapped;
      }
    })();
    this.startPromise=pending;
    try{return await pending;}finally{if(this.startPromise===pending)this.startPromise=null;}
  }
  async call(name,args={}) {
    if(!['list_pages','evaluate_script','navigate_page'].includes(name)) throw new Error('Operation denied');
    await this.start();
    this.stderrFlags.clear();
    this.setStage(name==='list_pages'?'browser-request-issued':name==='navigate_page'?'portal-reload-issued':'portal-read-issued',{errorType:null});
    try {
      const result=await this.client.callTool({name,arguments:args},undefined,{timeout:TOOL_TIMEOUTS[name]});
      if(result.isError) throw safeConnectionError(resultText(result),this.stderrFlags,name);
      this.setStage(name==='list_pages'?'browser-connected':name==='navigate_page'?'portal-reloaded':'portal-read-complete',{errorType:null});
      return result;
    } catch(error) { const mapped=error instanceof PortalError?error:safeConnectionError(error.message,this.stderrFlags,name); this.setStage(name+'-failed',{errorType:mapped.diagnostic}); throw mapped; }
  }
  async listEligible() {
    const result=await this.call('list_pages');
    // Chrome's allowlist detaches unrelated origins before enumeration. Only
    // exact portal URLs leave this adapter; titles are deliberately discarded.
    const pages=(result.structuredContent?.pages || []).filter(p=>portalUrl(p.url) && Number.isSafeInteger(p.id)).map(p=>({id:p.id,label:'Capstone portal tab '+p.id}));
    this.setStage(pages.length?'portal-tab-available':'portal-tab-unavailable',{errorType:null});
    return pages;
  }
  async assertTab(id) { if(!(await this.listEligible()).some(p=>p.id===id)) throw new PortalError('connection-lost','The selected portal tab is closed or has left the approved portal.'); }
  async evaluate(id,fn,arg) {
    const invocation=arguments.length>2?'('+fn.toString()+')('+JSON.stringify(arg)+')':'('+fn.toString()+')()';
    const source=`async()=>{try{return{ok:true,value:await ${invocation}}}catch(error){const message=String(error&&error.message||'');return{ok:false,error:{name:String(error&&error.name||'Error').slice(0,40),category:/not iterable/i.test(message)?'not-iterable':/selector/i.test(message)?'selector':/undefined|null/i.test(message)?'missing-value':/serializ|cyclic|circular/i.test(message)?'serialization':'other'}}}}`;
    let response;
    try{response=await this.call('evaluate_script',{pageId:id,function:source,dialogAction:'dismiss',waitForStableDom:false});}
    catch(error){if(!(error instanceof PortalError)||!['page-context-changed','unknown'].includes(error.diagnostic))throw error;this.setStage('portal-read-retry',{errorType:error.diagnostic});await new Promise(resolve=>setTimeout(resolve,300));response=await this.call('evaluate_script',{pageId:id,function:source,dialogAction:'dismiss',waitForStableDom:false});}
    const wrapped=jsonResult(response);
    if(!wrapped||wrapped.ok!==true){const diagnostic='page-'+String(wrapped?.error?.category||'unknown');this.setStage('portal-script-failed',{errorType:diagnostic});throw new PortalError('extraction-failed','The approved portal reader could not process this section. The browser connection remains open.',diagnostic);}
    return wrapped.value;
  }
  async identity(id) {
    await this.assertTab(id);
    const guard=await this.evaluate(id,readPortalGuard);
    if(guard.state!=='present') throw new PortalError('connection-lost','The selected tab is not on the portal.');
    if(guard.editable) throw new PortalError('editing-active','Finish editing in the selected portal tab before continuing. No control was used.');
    const result=await this.evaluate(id,readPortalIdentity);
    if(result.state!=='verified') {
      if(result.state==='sign-in-required') throw new PortalError('sign-in-required','Sign in to the Capstone portal with its normal email code, then return to Overview.');
      if(result.state==='editing-active') throw new PortalError('editing-active','Finish editing in the selected portal tab before continuing.');
      throw new PortalError('identity-verification-failed','The signed-in portal identity could not be verified.');
    }
    this.setStage('account-verified',{errorType:null});
    return {...result,contextBinding:'chrome-stable:'+id};
  }
  async inspectSection(id,section,{navigate=false,messageContent=false}={}) {
    if(!Object.hasOwn(SECTION_ROUTES,section)) throw new PortalError('section-denied','That portal section is outside the approved connector scope.');
    const identity=await this.identity(id);
    let guard=await this.evaluate(id,readPortalGuard);
    if(guard.active!==section) {
      if(section==='Messages')throw new PortalError('section-required','Open Messages and deliberately select a conversation yourself. The connector will not open one automatically.');
      if(!navigate) throw new PortalError('section-required','Open '+section+' in the selected portal tab, or ask MIRA for that section explicitly.');
      const moved=await this.evaluate(id,navigatePortalSection,section);
      if(moved.state!=='present') throw new PortalError(moved.state==='editing-active'?'editing-active':'section-unavailable','The approved '+section+' section could not be opened safely.');
      guard=await this.evaluate(id,readPortalGuard);
    }
    if(guard.active!==section||guard.editable) throw new PortalError('section-unavailable','The approved '+section+' section is not ready for read-only extraction.');
    const extracted=await this.evaluate(id,readPortalSection,{section,messageContent:messageContent?'selected-conversation':'metadata-only'});
    if(extracted.state!=='verified') throw new PortalError(extracted.state==='editing-active'?'editing-active':'extraction-failed','The approved '+section+' information could not be read. No cached answer for that section will be used.');
    this.setStage('section-read',{errorType:null});
    return {...identity,...extracted,contextBinding:'chrome-stable:'+id};
  }
  async inspect(id) { return this.inspectSection(id,'Overview',{navigate:false}); }
  async inspectActive(id,options={}) {
    await this.assertTab(id);
    const guard=await this.evaluate(id,readPortalGuard);
    if(!Object.hasOwn(SECTION_ROUTES,guard.active)) throw new PortalError('section-required','Choose a supported dashboard section before refreshing.');
    return this.inspectSection(id,guard.active,{navigate:false,...options});
  }
  async verify(id) {
    await this.assertTab(id);
    const before=await this.evaluate(id,readPortalGuard);
    if(before.state!=='present') throw new PortalError('connection-lost','The selected tab is not on the portal.');
    if(before.active!=='Overview' || before.editable) throw new PortalError('overview-required','Choose Overview in the approved portal tab and finish editing before verifying. No message was opened.');
    const reload=await this.call('navigate_page',{pageId:id,type:'reload',ignoreCache:true,handleBeforeUnload:'dismiss',timeout:15000});
    if(!resultText(reload).includes('Successfully reloaded the page.')) throw new PortalError('session-expired','A fresh portal load could not be verified. Old data was removed.');
    const result=await this.inspectSection(id,'Overview',{navigate:false});
    const proof=result.proof;
    // A new document, successful network response, and no service-worker/cache
    // substitution are required; a cached signed-in DOM is not authentication.
    if(!proof || proof.documentId===before.documentId || proof.status!==200 || !(proof.transferred>0) || proof.worker || proof.serviceWorker) throw new PortalError('session-expired','A fresh, non-cached authenticated page could not be verified.');
    this.setStage('overview-verified',{errorType:null});
    return result;
  }
  async open(id,section='Overview') {
    await this.assertTab(id);
    if(section==='Messages') {
      return{url:PORTAL,section:'Messages',guidance:'Open Messages and select a conversation yourself. The connector will not open or mark one read.'};
    }
    const moved=await this.evaluate(id,navigatePortalSection,Object.hasOwn(SECTION_ROUTES,section)?section:'Overview');
    if(moved.state!=='present')throw new PortalError('section-unavailable','The verified portal section could not be opened safely.');
    return{url:PORTAL,section:moved.section,guidance:'The verified parent section is open. Detail panels without a stable URL must be opened manually.'};
  }
  async close() { this.epoch++;this.attempt++;const client=this.client;this.client=null;this.transport=null;this.startPromise=null;try { await client?.close(); } catch {}this.setStage('closed',{childPid:null,errorType:null}); }
}
module.exports={BrowserAdapter,PortalError,PORTAL,portalUrl,jsonResult,APPROVAL_TIMEOUT_MS,TOOL_TIMEOUTS};
