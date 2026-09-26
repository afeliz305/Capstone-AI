const HELPER='http://127.0.0.1:3005',PORTAL_PATTERN='https://capstone.cs.fiu.edu/*',SCRIPT_ID='mira-portal-content',ALARM='mira-portal-wake';
let pollPromise=null,timer=null;
const local={get:keys=>chrome.storage.local.get(keys),set:value=>chrome.storage.local.set(value),remove:keys=>chrome.storage.local.remove(keys)};

async function restrictStorage(){try{await chrome.storage.local.setAccessLevel({accessLevel:'TRUSTED_CONTEXTS'});}catch{}}
async function permission(){return chrome.permissions.contains({origins:[PORTAL_PATTERN]});}
async function register(){
  if(!(await permission()))return false;
  const existing=await chrome.scripting.getRegisteredContentScripts();
  if(!existing.some(item=>item.id===SCRIPT_ID))await chrome.scripting.registerContentScripts([{id:SCRIPT_ID,matches:[PORTAL_PATTERN],js:['content.bundle.js'],runAt:'document_idle',persistAcrossSessions:true}]);
  return true;
}
async function nextSeq(){const state=await local.get(['seq']);const seq=Number.isSafeInteger(state.seq)?state.seq+1:1;await local.set({seq});return seq;}
async function helper(path,data,authenticated=true){
  const state=await local.get(['token']);if(authenticated&&!state.token)throw new Error('pairing-required');
  const payload={...data};if(authenticated){payload.token=state.token;payload.seq=await nextSeq();}
  const response=await fetch(HELPER+'/__mira_extension/'+path,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(payload),cache:'no-store'});
  const result=await response.json().catch(()=>({}));if(!response.ok)throw new Error(result.error||'helper-unavailable');return result;
}
async function exactPortalTab(tabId){const tab=await chrome.tabs.get(tabId);try{const url=new URL(tab.url);return url.origin==='https://capstone.cs.fiu.edu'&&url.pathname==='/portal'&&!url.search?tab:null;}catch{return null;}}
async function send(tabId,operation,payload={}){const tab=await exactPortalTab(tabId);if(!tab)throw new Error('portal-tab-unavailable');return chrome.tabs.sendMessage(tabId,{channel:'mira-portal',operation,payload});}
async function execute(command){
  if(command.name==='discover'){
    const tabs=await chrome.tabs.query({url:PORTAL_PATTERN}),eligible=[];
    for(const tab of tabs){if(!Number.isSafeInteger(tab.id))continue;try{const result=await send(tab.id,'guard');if(result?.ok&&result.value?.state==='present')eligible.push({id:tab.id});}catch{}}
    return{tabs:eligible};
  }
  const tabId=command.payload?.tabId;if(!Number.isSafeInteger(tabId))throw new Error('portal-tab-unavailable');
  if(command.name==='identity')return(await send(tabId,'identity')).value;
  if(command.name==='capabilities')return(await send(tabId,'capabilities')).value;
  if(command.name==='section')return(await send(tabId,'section',command.payload)).value;
  if(command.name==='active')return(await send(tabId,'active',command.payload)).value;
  if(command.name==='open')return(await send(tabId,'open',command.payload)).value;
  throw new Error('operation-denied');
}
async function runPoll(){
  try{
    const state=await local.get(['token','manualDisconnect']);if(!state.token||state.manualDisconnect||!(await permission()))return;
    const next=await helper('next',{});
    if(next.operation==='command'){
      let value,error,ok=true;try{value=await execute(next);}catch{ok=false;error={state:'extension-operation-failed',message:'The requested read-only portal operation could not be completed.'};}
      await helper('result',{id:next.id,ok,value,error});
    }
  }catch(error){
    if(/pairing|trust|401|403/i.test(String(error?.message||'')))await local.remove(['token','seq','trustExpiresAt']);
  }
}
function poll(){
  if(pollPromise)return pollPromise;
  pollPromise=runPoll().finally(()=>{pollPromise=null;clearTimeout(timer);timer=setTimeout(()=>void poll(),750);});
  return pollPromise;
}
async function pair(code){
  if(!(await permission()))throw new Error('Grant portal site access first.');await register();
  const response=await helper('pair',{code,clientNonce:crypto.randomUUID().replaceAll('-',''),version:chrome.runtime.getManifest().version},false);
  await local.set({token:response.token,trustExpiresAt:response.trustExpiresAt,seq:0,manualDisconnect:false});void poll();return response;
}
async function disconnect(){try{const state=await local.get(['token']);if(state.token)await helper('revoke',{});}catch{}await local.remove(['token','seq','trustExpiresAt']);await local.set({manualDisconnect:true});}
async function status(){const state=await local.get(['token','trustExpiresAt','manualDisconnect']);return{permission:await permission(),paired:!!state.token&&!state.manualDisconnect,trustExpiresAt:state.trustExpiresAt||null,manualDisconnect:!!state.manualDisconnect};}

chrome.runtime.onMessage.addListener((message,_sender,sendResponse)=>{if(!message||message.channel!=='mira-popup')return false;void(async()=>{try{let value;if(message.operation==='status'){await register();await poll();value=await status();}else if(message.operation==='grant'){const granted=await chrome.permissions.request({origins:[PORTAL_PATTERN]});if(granted)await register();value=await status();}else if(message.operation==='pair')value=await pair(String(message.code||''));else if(message.operation==='disconnect'){await disconnect();value=await status();}else throw new Error('Unsupported operation.');sendResponse({ok:true,value});}catch(error){sendResponse({ok:false,error:String(error?.message||'Operation failed.').slice(0,180)});}})();return true;});
chrome.permissions.onRemoved.addListener(permissions=>{if(permissions.origins?.includes(PORTAL_PATTERN))void disconnect();});
chrome.runtime.onStartup.addListener(()=>{void register().then(()=>poll());});
chrome.runtime.onInstalled.addListener(()=>{void restrictStorage().then(()=>register()).then(()=>poll());});
chrome.alarms.onAlarm.addListener(alarm=>{if(alarm.name===ALARM)void poll();});
chrome.tabs.onUpdated.addListener((_id,change)=>{if(change.url?.startsWith('https://capstone.cs.fiu.edu/portal'))void poll();});
void restrictStorage();chrome.alarms.create(ALARM,{periodInMinutes:0.5});void register().then(()=>poll());
