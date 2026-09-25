// Served ONLY by demo:portal. Never included in the Ocelot upload allowlist.
(() => {
  'use strict';
  if(location.origin!=='http://127.0.0.1:3005')return;
  const api=window.CapstoneApi;
  let csrf='',state={state:'helper-ready',generation:0,progress:{helper:true,browser:false,tab:false,identity:false,overview:false}},serial=0,busy=false,expiryTimer;
  const controllers=new Set();
  const labels={'helper-ready':'Ready to connect','helper-unreachable':'Local helper unavailable','not-connected':'Not connected','browser-approval-required':'Browser approval required','browser-connection-unavailable':'Browser connection unavailable','no-eligible-tab':'No eligible portal tab','tab-selection-required':'Choose a portal tab','sign-in-required':'FIU sign-in required','overview-required':'Choose Overview in the portal','identity-verification-failed':'Identity verification failed','extraction-failed':'Overview information unavailable','account-changed':'Portal account changed','connected':'Connected','verifying':'Verifying account','retrieving':'Refreshing information','session-expired':'Verification expired','connection-lost':'Connection lost'};
  const box=document.createElement('section');box.className='card local-portal-panel';box.setAttribute('aria-label','Local portal connection');
  box.innerHTML='<div class="portal-panel-heading"><div><p class="eyebrow">OPTIONAL PERSONALIZATION</p><h2>My portal</h2></div><p id="portal-state" class="portal-status" role="status" aria-live="polite">Ready to connect</p></div><p>Connect the Capstone portal Overview that is already open in your approved Chrome profile. The first verification reloads only that dedicated Overview tab once. Ordinary questions never reload it.</p><ol class="portal-progress" aria-label="Portal connection progress"><li data-progress="helper">Local helper available</li><li data-progress="browser">Browser connection approved</li><li data-progress="tab">Portal tab selected</li><li data-progress="identity">Current account verified</li><li data-progress="overview">Overview information available</li></ol><div id="portal-primary-actions"><button id="portal-discover" type="button" class="primary-action">Connect my portal</button></div><div id="portal-tab-actions" hidden><label for="portal-tab">Approved portal tab</label><select id="portal-tab"></select><button id="portal-connect" type="button" class="primary-action">Verify selected Overview</button></div><div id="portal-connected-actions" hidden><button id="portal-content" type="button" class="secondary-action">Refresh information</button><button id="portal-verify" type="button" class="secondary-action">Verify again</button><button id="portal-disconnect" type="button" class="secondary-action">Disconnect and clear private data</button></div><p id="portal-times" class="message-note" hidden></p><div id="portal-suggestions" hidden><h3>Questions available from this Overview</h3><div class="starter-prompts"></div></div><details id="portal-advanced"><summary>Advanced setup</summary><p>If automatic local setup expires, restart from the DEVELOPMENT folder with <code>npm.cmd run demo:portal</code>, or double-click <code>scripts\\Start Capstone Portal Demo.cmd</code>. Keep that terminal open.</p><form id="portal-pair"><label for="portal-pair-code">Single-use fallback code from the local demo terminal</label><input id="portal-pair-code" type="password" autocomplete="off" maxlength="80" required><button type="submit" class="secondary-action">Use fallback code</button></form></details><p id="portal-note" class="message-note">Your Overview excerpts and personal questions stay in this local helper. Browser debugging grants broader access than this app uses, so close unrelated sensitive tabs before approving it.</p>';
  document.querySelector('main').prepend(box);
  const status=box.querySelector('#portal-state'),note=box.querySelector('#portal-note'),form=box.querySelector('#portal-pair'),code=box.querySelector('#portal-pair-code'),primary=box.querySelector('#portal-primary-actions'),tabActions=box.querySelector('#portal-tab-actions'),connectedActions=box.querySelector('#portal-connected-actions'),select=box.querySelector('#portal-tab'),connect=box.querySelector('#portal-connect'),times=box.querySelector('#portal-times'),suggestions=box.querySelector('#portal-suggestions'),advanced=box.querySelector('#portal-advanced');
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
  function update(next) {
    if(!next)return;
    if(next.generation!==state.generation || (state.state==='connected'&&next.state!=='connected')) resetVisible();
    state=next;status.textContent=(labels[next.state]||'Not connected')+(next.name?' · '+next.name:'');note.textContent=next.note||'Only locally verified data can be searched.';
    renderProgress(next);renderSuggestions(next);
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
    update({...state,state:'browser-approval-required',note:'Approve the local Chrome connection if prompted. The app cannot bypass browser approval.'});
    const result=await request('discover');update(result);select.replaceChildren();
    for(const tab of result.choices||[]){const option=document.createElement('option');option.value=String(tab.id);option.textContent=tab.label;select.append(option);}
    tabActions.hidden=!result.choices?.length;
  }
  form.addEventListener('submit',event=>{event.preventDefault();const value=code.value;code.value='';void action(async()=>{const result=await request('pair',{code:value},false);csrf=result.csrf;advanced.open=false;update(result.connection);await discover();});});
  box.querySelector('#portal-discover').addEventListener('click',()=>void action(discover));
  connect.addEventListener('click',()=>void action(async()=>{tabActions.hidden=true;update({...state,state:'verifying',note:'Reloading the selected dedicated Overview once to verify the current account.'});update(await request('connect',{tabId:Number(select.value)}));}));
  box.querySelector('#portal-verify').addEventListener('click',()=>void action(async()=>{update({...state,state:'verifying',note:'Reloading the selected dedicated Overview once to verify the current account.'});update(await request('verify'));}));
  box.querySelector('#portal-content').addEventListener('click',()=>void action(async()=>{update({...state,state:'retrieving',note:'Reading current visible Overview information without reloading the portal.'});update(await request('content'));}));
  box.querySelector('#portal-disconnect').addEventListener('click',()=>{resetVisible();void (async()=>{try{await request('disconnect');}catch{}finally{csrf='';busy=false;tabActions.hidden=true;connectedActions.hidden=true;update({state:'helper-ready',generation:state.generation+1,progress:{helper:true,browser:false,tab:false,identity:false,overview:false},note:'Private data was cleared. Select Connect my portal to start a new local application session.'});}})();});
  async function checkStatus(){if(!csrf||document.hidden)return;try{update(await request('status'));}catch{}}
  document.addEventListener('visibilitychange',()=>{if(document.hidden)resetVisible();else void checkStatus();});
  window.addEventListener('pagehide',()=>{resetVisible();csrf='';});
  window.CapstonePortal={
    accepts:result=>result?.connection?.state==='connected'&&result.connection.generation===state.generation&&state.state==='connected',
    async destination(sourceId){const result=await request('destination',{sourceId});if(result.url!=='https://capstone.cs.fiu.edu/portal'||result.generation!==state.generation||state.state!=='connected')throw new Error('Portal session changed.');return result;},
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
