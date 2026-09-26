const {PortalService,routeQuestion}=require('../../server/portal-local/service');
const {ExtensionAdapter}=require('../../server/portal-local/extension-adapter');
const {PortalError}=require('../../server/portal-local/browser-adapter');

(() => {
  'use strict';
  const EXPECTED_ORIGIN='https://ocelot.aul.fiu.edu';
  const EXPECTED_PATH='/~afeli016/Capstone - AI/';
  let pathname;
  try{pathname=decodeURIComponent(location.pathname);}catch{return;}
  if(location.origin!==EXPECTED_ORIGIN||location.search||(pathname!==EXPECTED_PATH&&pathname!==EXPECTED_PATH+'index.html'))return;

  const CHANNEL='capstone-ai-hosted-v1',api=window.CapstoneApi,owner=crypto.randomUUID(),pending=new Map();
  if(!api)return;
  class WindowBridge{
    request(operation,payload={}){
      const id=crypto.randomUUID();
      return new Promise((resolve,reject)=>{
        const timer=setTimeout(()=>{pending.delete(id);reject(new PortalError('extension-unavailable','Reload the Capstone - AI extension and this page, then try again.'));},5000);
        pending.set(id,{resolve,reject,timer});
        window.postMessage({channel:CHANNEL,kind:'request',id,operation,payload},location.origin);
      });
    }
  }
  window.addEventListener('message',event=>{
    const data=event.data;
    if(event.source!==window||event.origin!==location.origin||!data||data.channel!==CHANNEL||data.kind!=='response')return;
    const item=pending.get(data.id);if(!item)return;pending.delete(data.id);clearTimeout(item.timer);
    if(data.response?.ok)item.resolve(data.response.value);
    else item.reject(new PortalError(data.response?.error?.state||'extension-unavailable',data.response?.error?.message||'The portal extension is unavailable.'));
  });

  const bridge=new WindowBridge(),adapter=new ExtensionAdapter(bridge),originalFetch=api.fetch.bind(api);
  const publicSearch=async(question,context='')=>{
    const response=await originalFetch('/api/search?q='+encodeURIComponent(question)+(context?'&context='+encodeURIComponent(context):''));
    return api.readJson(response);
  };
  const service=new PortalService({adapter,publicSearch});
  let current=service.status(owner),busy=false;

  const box=document.createElement('section');box.className='card local-portal-panel';box.setAttribute('aria-label','Hosted portal connection');
  box.innerHTML='<div class="portal-panel-heading"><div><p class="eyebrow">OPTIONAL PERSONALIZATION</p><h2>My portal</h2></div><p id="portal-state" class="portal-status" role="status" aria-live="polite">Extension required</p></div><p>Connect the Capstone - AI extension to use your current signed-in portal session. Private questions, answers, and dashboard excerpts stay only in this browser tab memory for five minutes; they are not sent to Supabase.</p><ol class="portal-progress hosted" aria-label="Portal connection progress"><li data-progress="extension">Extension available</li><li data-progress="tab">Portal tab selected</li><li data-progress="identity">Current account verified</li><li data-progress="source">Private source loaded</li></ol><p id="portal-connection-stage" class="message-note">Open the extension, grant Portal access and Hosted MIRA access, then reload this page.</p><div id="portal-primary-actions"><button id="portal-discover" type="button" class="primary-action">Connect my portal</button></div><div id="portal-tab-actions" hidden><label for="portal-tab">Signed-in portal tab</label><select id="portal-tab"></select><button id="portal-connect" type="button" class="primary-action">Verify selected portal</button></div><div id="portal-connected-actions" hidden><fieldset><legend>Message-content scope</legend><label><input id="portal-message-content" type="checkbox"> Read only the conversation I deliberately opened</label><p class="message-note">Off by default. MIRA never chooses or opens a conversation.</p></fieldset><button id="portal-content" type="button" class="secondary-action">Refresh current section</button><button id="portal-verify" type="button" class="secondary-action">Verify again</button><button id="portal-disconnect" type="button" class="secondary-action">Disconnect and clear private data</button></div><p id="portal-times" class="message-note" hidden></p><details id="portal-capabilities"><summary>Dashboard source coverage</summary><ul></ul></details>';
  document.querySelector('main')?.prepend(box);
  const status=box.querySelector('#portal-state'),stage=box.querySelector('#portal-connection-stage'),primary=box.querySelector('#portal-primary-actions'),tabActions=box.querySelector('#portal-tab-actions'),connectedActions=box.querySelector('#portal-connected-actions'),select=box.querySelector('#portal-tab'),messageContent=box.querySelector('#portal-message-content'),times=box.querySelector('#portal-times'),capabilities=box.querySelector('#portal-capabilities');
  const labels={'helper-ready':'Ready to connect','extension-pairing-required':'Extension required','extension-unavailable':'Extension unavailable','no-eligible-tab':'Portal tab not found','tab-selection-required':'Choose portal tab','sign-in-required':'FIU sign-in required','editing-active':'Finish editing first','identity-verification-failed':'Identity not verified','section-required':'Portal section unavailable','section-unavailable':'Portal section unavailable','snapshot-expired':'Private information expired','account-changed':'Account changed','connection-lost':'Connection lost','verifying':'Verifying account','connected':'Connected'};
  const format=value=>value?new Date(value).toLocaleTimeString([], {hour:'numeric',minute:'2-digit',second:'2-digit'}):'Not yet';
  function clearVisible(){window.dispatchEvent(new Event('capstone-portal-clear'));}
  function renderCapabilities(next){const list=capabilities.querySelector('ul');list.replaceChildren();for(const source of next.sourceCapabilities||[]){const item=document.createElement('li');item.textContent=source.section+': '+(source.blocked||((source.currentlyLoaded?'loaded; ':'')+(source.extractionSupported?'read-only extraction supported':'navigation only')));list.append(item);}}
  function update(next){
    current=next;status.textContent=labels[next.state]||next.state||'Not connected';stage.textContent=next.note||'';
    const progress={extension:!['helper-ready','extension-pairing-required','extension-unavailable'].includes(next.state),tab:Number.isSafeInteger(next.tab)||!!next.progress?.tab,identity:!!next.progress?.identity,source:(next.loadedSections||[]).length>0};
    const order=['extension','tab','identity','source'];for(const [index,key] of order.entries()){const item=box.querySelector('[data-progress="'+key+'"]');item.classList.toggle('complete',!!progress[key]);item.classList.toggle('current',!progress[key]&&order.slice(0,index).every(previous=>progress[previous]));}
    primary.hidden=next.state==='connected'||next.state==='tab-selection-required';tabActions.hidden=next.state!=='tab-selection-required';connectedActions.hidden=next.state!=='connected';
    messageContent.checked=!!next.messageContent;times.hidden=!next.verifiedAt;times.textContent=next.verifiedAt?'Last verified: '+format(next.verifiedAt)+' · Information retrieved: '+format(next.retrievedAt)+' · Expires: '+format(next.expiresAt):'';
    renderCapabilities(next);
  }
  async function act(work){if(busy)return;busy=true;for(const button of box.querySelectorAll('button'))button.disabled=true;try{update(await work());}catch(error){update({...service.status(owner),state:error.state||'extension-unavailable',note:error.message||'The extension connection failed.'});}finally{busy=false;for(const button of box.querySelectorAll('button'))button.disabled=false;}}
  async function discover(){
    const permission=await bridge.request('status');
    if(!permission.portalPermission)throw new PortalError('extension-pairing-required','Open the extension and grant Portal access.');
    if(!permission.appPermission)throw new PortalError('extension-pairing-required','Open the extension and grant Hosted MIRA access, then reload this page.');
    const found=await service.discover(owner),choices=found.choices||[];
    select.replaceChildren();for(const choice of choices){const option=document.createElement('option');option.value=choice.id;option.textContent=choice.label;select.append(option);}
    if(choices.length===1)return service.connect(owner,choices[0].id);
    return found;
  }
  box.querySelector('#portal-discover').addEventListener('click',()=>void act(discover));
  box.querySelector('#portal-connect').addEventListener('click',()=>void act(()=>service.connect(owner,Number(select.value))));
  box.querySelector('#portal-verify').addEventListener('click',()=>void act(()=>service.refresh(owner)));
  box.querySelector('#portal-content').addEventListener('click',()=>void act(()=>service.refreshContent(owner)));
  messageContent.addEventListener('change',()=>void act(()=>Promise.resolve(service.configure(owner,{messageContent:messageContent.checked}))));
  box.querySelector('#portal-disconnect').addEventListener('click',()=>{clearVisible();void act(async()=>{await service.disconnect(owner);return service.status(owner);});});

  window.CapstonePortal={
    accepts:result=>result?.connection?.state==='connected'&&result.connection.generation===current.generation&&current.state==='connected',
    async destination(sourceId){const result=await service.destination(owner,sourceId);if(result.generation!==current.generation)throw new Error('Portal session changed.');return result;},
    status:()=>({state:current.state,generation:current.generation})
  };
  api.fetch=async(route,options={})=>{
    const parsed=new URL(route,location.origin);
    if(parsed.pathname==='/api/search'){
      const question=parsed.searchParams.get('q')||'',context=parsed.searchParams.get('context')||'';
      if(routeQuestion(question,context)){
        const state=service.status(owner);
        const result=state.state==='connected'||state.state==='snapshot-expired'?await service.search(owner,{question,context}):service.empty(owner,state.note||'Connect and verify your portal before asking a personal question.');
        current=result.connection||service.status(owner);update(current);
        return new Response(JSON.stringify(result),{headers:{'Content-Type':'application/json','Cache-Control':'no-store'}});
      }
    }
    return originalFetch(route,options);
  };
  document.addEventListener('visibilitychange',()=>{if(!document.hidden)update(service.status(owner));});
  window.addEventListener('pagehide',()=>{for(const item of pending.values()){clearTimeout(item.timer);item.reject(new Error('Page closed.'));}pending.clear();});
  update(current);
})();
