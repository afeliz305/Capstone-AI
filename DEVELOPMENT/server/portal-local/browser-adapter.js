const path = require('node:path');
const { Client } = require('@modelcontextprotocol/sdk/client/index.js');
const { StdioClientTransport } = require('@modelcontextprotocol/sdk/client/stdio.js');
const { readPortalDom, readPortalGuard } = require('./dom-reader');
const PORTAL='https://capstone.cs.fiu.edu/portal';
function portalUrl(url) { try { const u=new URL(url); return u.href===PORTAL || u.href===PORTAL+'#'; } catch { return false; } }
class PortalError extends Error { constructor(state,message) { super(message); this.state=state; } }
function resultText(result) { return (result.content || []).filter(c=>c.type==='text').map(c=>c.text).join('\n'); }
function jsonResult(result) { const match=resultText(result).match(/```json\s*([\s\S]*?)\s*```/); if (!match) throw new PortalError('connection-lost','The browser returned an unsupported response.'); return JSON.parse(match[1]); }
function safeConnectionError(message) {
  if(/approval|permission|remote debugging|DevToolsActivePort/i.test(message||'')) return new PortalError('browser-approval-required','Chrome is waiting for browser approval. Keep Chrome open, enable incoming debugging yourself, approve the prompt, and retry.');
  if(/timed?\s*out|timeout|could not connect|couldn't connect|browser.*not.*running|ENOENT|spawn/i.test(message||'')) return new PortalError('browser-connection-unavailable','The approved Chrome connection is unavailable. Confirm Chrome is running in the profile that has your portal tab, then retry.');
  if(/already.*(?:debug|attach)|another.*debug/i.test(message||'')) return new PortalError('browser-connection-unavailable','Another debugging session may own this browser tab. Review Chrome’s active debugging connections before retrying.');
  return new PortalError('browser-connection-unavailable','The browser connection was lost. Keep the local helper and Chrome open, then retry.');
}
class BrowserAdapter {
  constructor() { this.client=null; this.transport=null; this.epoch=0; }
  async start() {
    if(this.client) return;
    const client=new Client({name:'capstone-local-read-only',version:'1.0.0'},{capabilities:{}});
    const binary=path.join(path.dirname(require.resolve('chrome-devtools-mcp')),'bin/chrome-devtools-mcp.js');
    const env=Object.fromEntries(['PATH','Path','SYSTEMROOT','SystemRoot','USERPROFILE','LOCALAPPDATA','APPDATA','TEMP','TMP'].filter(k=>process.env[k]).map(k=>[k,process.env[k]]));
    Object.assign(env,{CHROME_DEVTOOLS_MCP_NO_USAGE_STATISTICS:'1',CI:'1'});
    const transport=new StdioClientTransport({command:process.execPath,args:[binary,'--autoConnect','--channel=stable','--allowedUrlPattern=https://capstone.cs.fiu.edu/*','--no-usage-statistics','--no-performance-crux','--no-source-maps','--no-category-input','--no-category-emulation','--no-category-performance','--no-category-network','--no-category-memory','--redact-network-headers','--experimental-structured-content'],env,stderr:'pipe'});
    // Do not relay MCP errors/logs: they can include private page content/URLs.
    transport.stderr?.on('data',()=>{});
    this.client=client; this.transport=transport; const epoch=this.epoch;
    try { await client.connect(transport,{timeout:15000}); if(epoch!==this.epoch) throw new Error(); }
    catch(error) { await this.close(); throw safeConnectionError(error?.message); }
  }
  async call(name,args={}) {
    if(!['list_pages','evaluate_script','navigate_page'].includes(name)) throw new Error('Operation denied');
    await this.start();
    try {
      const result=await this.client.callTool({name,arguments:args},undefined,{timeout:25000});
      if(result.isError) throw safeConnectionError(resultText(result));
      return result;
    } catch(error) { throw error instanceof PortalError?error:safeConnectionError(error.message); }
  }
  async listEligible() {
    const result=await this.call('list_pages');
    // Chrome's allowlist detaches unrelated origins before enumeration. Only
    // exact portal URLs leave this adapter; titles are deliberately discarded.
    return (result.structuredContent?.pages || []).filter(p=>portalUrl(p.url) && Number.isSafeInteger(p.id)).map(p=>({id:p.id,label:'Capstone portal tab '+p.id}));
  }
  async assertTab(id) { if(!(await this.listEligible()).some(p=>p.id===id)) throw new PortalError('connection-lost','The selected portal tab is closed or has left the approved portal.'); }
  async evaluate(id,fn) { return jsonResult(await this.call('evaluate_script',{pageId:id,function:fn.toString(),dialogAction:'dismiss',waitForStableDom:false})); }
  async inspect(id) {
    await this.assertTab(id);
    const guard=await this.evaluate(id,readPortalGuard);
    if(guard.state!=='present') throw new PortalError('connection-lost','The selected tab is not on the portal.');
    if(guard.active!=='Overview' || guard.editable) throw new PortalError('overview-required','Choose Overview in the approved portal tab and finish editing before continuing. No message was opened.');
    const result=await this.evaluate(id,readPortalDom);
    if(result.state!=='verified') {
      if(result.state==='sign-in-required') throw new PortalError('sign-in-required','Sign in to the Capstone portal with its normal email code, then return to Overview.');
      if(result.state==='overview-required') throw new PortalError('overview-required','Choose Overview in the approved portal tab.');
      throw new PortalError('extraction-failed','The approved Overview could not be read. No cached personal answer will be used.');
    }
    return {...result,contextBinding:'chrome-stable:'+id};
  }
  async verify(id) {
    await this.assertTab(id);
    const before=await this.evaluate(id,readPortalGuard);
    if(before.state!=='present') throw new PortalError('connection-lost','The selected tab is not on the portal.');
    if(before.active!=='Overview' || before.editable) throw new PortalError('overview-required','Choose Overview in the approved portal tab and finish editing before verifying. No message was opened.');
    const reload=await this.call('navigate_page',{pageId:id,type:'reload',ignoreCache:true,handleBeforeUnload:'dismiss',timeout:15000});
    if(!resultText(reload).includes('Successfully reloaded the page.')) throw new PortalError('session-expired','A fresh portal load could not be verified. Old data was removed.');
    const result=await this.inspect(id);
    const proof=result.proof;
    // A new document, successful network response, and no service-worker/cache
    // substitution are required; a cached signed-in DOM is not authentication.
    if(!proof || proof.documentId===before.documentId || proof.status!==200 || !(proof.transferred>0) || proof.worker || proof.serviceWorker) throw new PortalError('session-expired','A fresh, non-cached authenticated page could not be verified.');
    return result;
  }
  async open(id) { await this.assertTab(id); return {url:PORTAL,section:'Overview'}; }
  async close() { this.epoch++; const client=this.client; this.client=null; this.transport=null; try { await client?.close(); } catch {} }
}
module.exports={BrowserAdapter,PortalError,PORTAL,portalUrl,jsonResult};
