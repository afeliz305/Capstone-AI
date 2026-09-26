// Served ONLY by demo:portal. Never included in the Ocelot upload allowlist.
(() => {
  'use strict';
  if(location.origin!=='http://127.0.0.1:3005')return;
  const api=window.CapstoneApi;
  let csrf='',state={state:'helper-ready',generation:0,progress:{helper:true,browser:false,tab:false,identity:false,overview:false}},serial=0,busy=false,expiryTimer;
  const controllers=new Set();
  const labels={'helper-ready':'Ready to connect','helper-unreachable':'Local helper unavailable','not-connected':'Not connected','extension-pairing-required':'Extension pairing required','extension-unavailable':'Portal extension unavailable','snapshot-expired':'Private information expired','browser-approval-required':'Browser approval required','browser-connection-unavailable':'Browser connection unavailable','no-eligible-tab':'No eligible portal tab','tab-selection-required':'Choose a portal tab','sign-in-required':'FIU sign-in required','overview-required':'Choose Overview in the portal','section-required':'Open the requested portal section','section-unavailable':'Portal section unavailable','editing-active':'Finish editing first','identity-verification-failed':'Identity verification failed','extraction-failed':'Portal information unavailable','account-changed':'Portal account changed','connected':'Connected','verifying':'Verifying account','retrieving':'Refreshing information','session-expired':'Verification expired','connection-lost':'Connection lost'};
  const box=document.createElement('section');box.className='card local-portal-panel';box.setAttribute('aria-label','Local portal connection');
  box.innerHTML='<div class="portal-panel-heading"><div><p class="eyebrow">OPTIONAL PERSONALIZATION</p><h2>My portal</h2></div><p id="portal-state" class="portal-status" role="status" aria-live="polite">Ready to connect</p></div><p>Normal mode uses the locally installed Capstone - AI Chrome extension. It verifies the current FIU session without remote debugging or forcing Overview, then retrieves only the relevant supported source when you ask a personal question.</p><ol class="portal-progress" aria-label="Portal connection progress"><li data-progress="helper">Local helper available</li><li data-progress="browser">Portal extension paired</li><li data-progress="tab">Portal tab selected</li><li data-progress="identity">Current account verified</li><li data-progress="overview">Private source loaded</li></ol><p id="portal-connection-stage" class="message-note" hidden></p><div id="portal-primary-actions"><button id="portal-discover" type="button" class="primary-action">Connect my portal</button></div><div id="portal-tab-actions" hidden><label for="portal-tab">Approved portal tab</label><select id="portal-tab"></select><button id="portal-connect" type="button" class="primary-action">Verify selected portal</button></div><div id="portal-connected-actions" hidden><fieldset><legend>Message-content scope</legend><label><input id="portal-message-content" type="checkbox"> Read only the conversation I deliberately opened</label><p class="message-note">Off by default. MIRA never selects an unread conversation, thread, composer, reaction, or message action.</p></fieldset><button id="portal-content" type="button" class="secondary-action">Refresh current section</button><button id="portal-verify" type="button" class="secondary-action">Verify again</button><button id="portal-disconnect" type="button" class="secondary-action">Disconnect and clear private data</button></div><p id="portal-times" class="message-note" hidden></p><div id="portal-suggestions" hidden><h3>Questions available from loaded sections</h3><div class="starter-prompts"></div></div><details id="portal-capabilities"><summary>Dashboard source coverage</summary><ul></ul></details><details id="portal-advanced"><summary>Advanced setup</summary><p>Build and load the unpacked extension from <code>portal-extension</code>. Pair it with the separate extension code printed by <code>npm.cmd run demo:portal</code>. The app fallback code below only restores the local MIRA page session.</p><form id="portal-pair"><label for="portal-pair-code">Single-use app fallback code from the local demo terminal</label><input id="portal-pair-code" type="password" autocomplete="off" maxlength="80" required><button type="submit" class="secondary-action">Use app fallback code</button></form><p>Development fallback only: <code>npm.cmd run demo:portal:mcp</code> keeps the earlier explicitly approved remote-debugging transport.</p></details><p id="portal-note" class="message-note">Private excerpts stay in helper memory for at most five minutes. Extension site permission and local pairing are separate from that content lifetime.</p>';
  document.querySelector('main').prepend(box);
  const status=box.querySelector('#portal-state'),note=box.querySelector('#portal-note'),stage=box.querySelector('#portal-connection-stage'),form=box.querySelector('#portal-pair'),code=box.querySelector('#portal-pair-code'),primary=box.querySelector('#portal-primary-actions'),tabActions=box.querySelector('#portal-tab-actions'),connectedActions=box.querySelector('#portal-connected-actions'),messageContent=box.querySelector('#portal-message-content'),capabilities=box.querySelector('#portal-capabilities'),select=box.querySelector('#portal-tab'),connect=box.querySelector('#portal-connect'),times=box.querySelector('#portal-times'),suggestions=box.querySelector('#portal-suggestions'),advanced=box.querySelector('#portal-advanced');
  function resetVisible() {serial++;for(const c of controllers)c.abort();controllers.clear();window.dispatchEvent(new Event('capstone-portal-clear'));}
  const displayTime=value=>value?new Date(value).toLocaleTimeString([], {hour:'numeric',minute:'2-digit',second:'2-digit'}):'Not yet';
  function renderProgress(next) {
    const progress=next.progress||{},order=['helper','browser','tab','identity','overview'];
    for(const [index,key] of order.entries()) {const item=box.querySelector('[data-progress="'+key+'"]');item.classList.toggle('complete',!!progress[key]);item.classList.toggle('current',!progress[key]&&order.slice(0,index).every(previous=>progress[previous]));}
  }
  function renderSuggestions(next) {
    const list=suggestions.querySelector('.starter-prompts');list.replaceChildren();
    for(const question of next.suggestions||[]) {const button=document.createElement('button');button.type='button';button.textContent=question;button.addEventListener('click',()=>{document.querySelector('#chat-launcher')?.click();const input=document.querySelector('#chat-input');if(input){input.value=question;document.querySelector('#chat-form')?.requestSubmit();}});list.append(button);}
    suggestions.hidden=!list.children.length;
  }
  function renderCapabilities(next){
    const list=capabilities.querySelector('ul');list.replaceChildren();
    for(const source of next.sourceCapabilities||[]){const item=document.createElement('li');const state=source.blocked?'excluded':source.searchable?'supported':'navigation only';item.textContent=source.section+' — '+state+(source.currentlyLoaded?' · loaded now':'');list.append(item);}
    capabilities.hidden=!list.children.length;
  }
  function update(next) {
    if(!next)return;
    if(next.generation!==state.generation || (state.state==='connected'&&next.state!=='connected')) resetVisible();
    state=next;status.textContent=(labels[next.state]||'Not connected')+(next.name?' · '+next.name:'');note.textContent=next.note||'Only locally verified data can be searched.';stage.hidden=!next.diagnostic?.stage;stage.textContent=next.diagnostic?.stage?'Connection stage: '+next.diagnostic.stage.replaceAll('-',' '):'';
    renderProgress(next);renderSuggestions(next);renderCapabilities(next);messageContent.checked=!!next.messageContent;
    primary.hidden=next.state==='connected'||['verifying','retrieving','tab-selection-required'].includes(next.state);
    connectedActions.hidden=next.state!=='connected';
    times.hidden=!next.verifiedAt&&!next.retrievedAt;
    times.textContent='Last verified: '+displayTime(next.verifiedAt)+' · Information retrieved: '+displayTime(next.retrievedAt);
    clearTimeout(expiryTimer);
    if(next.expiresAt) expiryTimer=setTimeout(()=>void checkStatus(),Math.max(0,Date.parse(next.expiresAt)-Date.now())+50);
  }
  async function request(operation,data={},authorized=true) {
    const controller=new AbortController();controllers.add(controller);
    try {
      const response=await fetch('/__portal/'+operation,{method:'POST',credentials:'same-origin',cache:'no-store',redirect:'error',headers:{'Content-Type':'application/json',...(authorized?{'X-Capstone-Pair':csrf}:{})},body:JSON.stringify(data),signal:controller.signal});
      const result=await response.json();
      if(!response.ok){if(result.connection)update(result.connection);const error=new Error(result.error||'Local portal request failed.');error.portalHandled=true;if(response.status===401&&authorized){csrf='';update({state:'session-expired',generation:state.generation+1,progress:{helper:true,browser:false,tab:false,identity:false,overview:false},note:'The local application session expired. Reload this local page or use Advanced setup.'});}throw error;}
      if(result.connection)update(result.connection);
      return result;
    }catch(error){if(error.name==='AbortError')throw error;note.textContent=error.message;throw error;}
    finally{controllers.delete(controller);}
  }
  async function action(work){if(busy)return;busy=true;box.setAttribute('aria-busy','true');try{await work();}catch(error){if(error.name!=='AbortError'&&!error.portalHandled)update({state:'helper-unreachable',generation:state.generation+1,progress:{helper:false,browser:false,tab:false,identity:false,overview:false},note:'The local helper stopped responding. Run npm.cmd run demo:portal from DEVELOPMENT and keep its terminal open.'});}finally{busy=false;box.removeAttribute('aria-busy');}}
  async function establishSession() {
    if(csrf)return;
    try {const resumed=await request('resume',{},false);csrf=resumed.csrf;update(resumed.connection);return;} catch {}
    try {const bootstrapped=await request('bootstrap',{},false);csrf=bootstrapped.csrf;update(bootstrapped.connection);advanced.open=false;return;} catch(error) {advanced.open=true;throw error;}
  }
  async function discover(){
    await establishSession();
    update({...state,state:state.transport==='mcp'?'browser-approval-required':'extension-pairing-required',note:state.transport==='mcp'?'Starting the explicit MCP development fallback. Review Chrome approval if prompted.':'Checking the paired Capstone - AI extension. This normal mode does not use Chrome remote debugging.'});
    const result=await request('discover');update(result);select.replaceChildren();
    for(const tab of result.choices||[]){const option=document.createElement('option');option.value=String(tab.id);option.textContent=tab.label;select.append(option);}
    tabActions.hidden=!result.choices?.length;
  }
  form.addEventListener('submit',event=>{event.preventDefault();const value=code.value;code.value='';void action(async()=>{const result=await request('pair',{code:value},false);csrf=result.csrf;advanced.open=false;update(result.connection);await discover();});});
  box.querySelector('#portal-discover').addEventListener('click',()=>void action(discover));
  connect.addEventListener('click',()=>void action(async()=>{tabActions.hidden=true;update({...state,state:'verifying',note:state.transport==='mcp'?'Reloading the selected dedicated Overview once to verify the current account.':'Checking the current FIU session without reloading or requiring Overview.'});update(await request('connect',{tabId:Number(select.value)}));}));
  box.querySelector('#portal-verify').addEventListener('click',()=>void action(async()=>{update({...state,state:'verifying',note:state.transport==='mcp'?'Reloading the selected dedicated Overview once to verify the current account.':'Checking the current FIU session and refreshing the currently relevant source.'});update(await request('verify'));}));
  messageContent.addEventListener('change',()=>void action(async()=>{update(await request('configure',{messageContent:messageContent.checked}));}));
  box.querySelector('#portal-content').addEventListener('click',()=>void action(async()=>{update({...state,state:'retrieving',note:'Reading the current approved portal section without reloading the page.'});update(await request('content'));}));
  box.querySelector('#portal-disconnect').addEventListener('click',()=>{resetVisible();void (async()=>{try{await request('disconnect');}catch{}finally{csrf='';busy=false;tabActions.hidden=true;connectedActions.hidden=true;update({state:'helper-ready',generation:state.generation+1,progress:{helper:true,browser:false,tab:false,identity:false,overview:false},note:'Private data was cleared. Select Connect my portal to start a new local application session.'});}})();});
  async function checkStatus(){if(!csrf||document.hidden)return;try{update(await request('status'));}catch{}}
  document.addEventListener('visibilitychange',()=>{if(document.hidden)resetVisible();else void checkStatus();});
  window.addEventListener('pagehide',()=>{resetVisible();csrf='';});
  window.CapstonePortal={
    accepts:result=>result?.connection?.state==='connected'&&result.connection.generation===state.generation&&state.state==='connected',
    async destination(sourceId){const result=await request('destination',{sourceId});const url=new URL(result.url);if(url.origin!=='https://capstone.cs.fiu.edu'||result.generation!==state.generation||state.state!=='connected')throw new Error('Portal session changed.');return result;},
    status:()=>({state:state.state,generation:state.generation})
  };
  // A valid HttpOnly local session can resume after a same-origin refresh. No
  // pairing credential or private content is stored by browser JavaScript.
  void (async()=>{try{const resumed=await request('resume',{},false);csrf=resumed.csrf;update(resumed.connection);}catch{}})();
  const original=api.fetch.bind(api);
  api.fetch=async(route,options={})=>{
    const parsed=new URL(route,location.origin);
    if(parsed.pathname==='/api/search') {
      if(!csrf)return original(route,options); // Public/indexed help remains usable when disconnected.
      const before=serial;
      const result=await request('search',{question:parsed.searchParams.get('q')||'',context:parsed.searchParams.get('context')||''});
      if(before!==serial)throw new DOMException('The portal session changed.','AbortError');
      return new Response(JSON.stringify(result),{headers:{'Content-Type':'application/json','Cache-Control':'no-store'}});
    }
    if(parsed.pathname.startsWith('/api/tickets')||parsed.pathname.startsWith('/api/staff'))throw new Error('Tickets and transcript sharing are disabled in the local private portal preview.');
    return original(route,options);
  };
  // Statically hosted and Supabase clients never load this module.
})();
