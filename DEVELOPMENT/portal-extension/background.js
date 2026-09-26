const HELPER='http://127.0.0.1:3005';
const PORTAL_PATTERN='https://capstone.cs.fiu.edu/*';
const APP_PATTERN='https://ocelot.aul.fiu.edu/*';
const PORTAL_SCRIPT_ID='mira-portal-content';
const APP_SCRIPT_ID='mira-hosted-content';
const ALARM='mira-portal-wake';
const HOSTED_PATH='/~afeli016/Capstone - AI/';
const DIRECT_OPERATIONS=new Set(['discover','identity','capabilities','section','active','open']);
let pollPromise=null,timer=null;
const local={get:keys=>chrome.storage.local.get(keys),set:value=>chrome.storage.local.set(value),remove:keys=>chrome.storage.local.remove(keys)};

async function restrictStorage(){try{await chrome.storage.local.setAccessLevel({accessLevel:'TRUSTED_CONTEXTS'});}catch{}}
const hasPermission=origin=>chrome.permissions.contains({origins:[origin]});
const portalPermission=()=>hasPermission(PORTAL_PATTERN);
const appPermission=()=>hasPermission(APP_PATTERN);

async function registerScript(id,matches,js){
  const existing=await chrome.scripting.getRegisteredContentScripts();
  if(!existing.some(item=>item.id===id))await chrome.scripting.registerContentScripts([{id,matches,js:[js],runAt:'document_idle',persistAcrossSessions:true,allFrames:false}]);
}
async function unregisterScript(id){
  const existing=await chrome.scripting.getRegisteredContentScripts();
  if(existing.some(item=>item.id===id))await chrome.scripting.unregisterContentScripts({ids:[id]});
}
async function registerPortal(){if(!(await portalPermission()))return false;await registerScript(PORTAL_SCRIPT_ID,[PORTAL_PATTERN],'content.bundle.js');return true;}
async function registerHosted(){if(!(await appPermission()))return false;await registerScript(APP_SCRIPT_ID,[APP_PATTERN],'hosted-entry.js');return true;}
async function registerAll(){await registerPortal();await registerHosted();}

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

function exactHostedSender(sender){
  if(sender.frameId!==0||!sender.tab||!Number.isSafeInteger(sender.tab.id))return false;
  try{
    const url=new URL(sender.url||sender.tab.url),pathname=decodeURIComponent(url.pathname);
    return url.origin==='https://ocelot.aul.fiu.edu'&&!url.search&&(pathname===HOSTED_PATH||pathname===HOSTED_PATH+'index.html');
  }catch{return false;}
}
async function hosted(message,sender){
  if(!exactHostedSender(sender))throw new Error('hosted-page-denied');
  if(message.operation==='status')return{portalPermission:await portalPermission(),appPermission:await appPermission(),version:chrome.runtime.getManifest().version};
  if(!DIRECT_OPERATIONS.has(message.operation)||!(await portalPermission()))throw new Error('portal-permission-required');
  await registerPortal();
  return execute({name:message.operation,payload:message.payload||{}});
}

async function runPoll(){
  try{
    const state=await local.get(['token','manualDisconnect']);if(!state.token||state.manualDisconnect||!(await portalPermission()))return;
    const next=await helper('next',{});
    if(next.operation==='command'){
      let value,error,ok=true;try{value=await execute(next);}catch{ok=false;error={state:'extension-operation-failed',message:'The requested read-only portal operation could not be completed.'};}
      await helper('result',{id:next.id,ok,value,error});
    }
  }catch(error){if(/pairing|trust|401|403/i.test(String(error?.message||'')))await local.remove(['token','seq','trustExpiresAt']);}
}
function poll(){
  if(pollPromise)return pollPromise;
  pollPromise=runPoll().finally(()=>{pollPromise=null;clearTimeout(timer);timer=setTimeout(()=>void poll(),750);});
  return pollPromise;
}
async function pair(code){
  if(!(await portalPermission()))throw new Error('Grant portal site access first.');await registerPortal();
  const response=await helper('pair',{code,clientNonce:crypto.randomUUID().replaceAll('-',''),version:chrome.runtime.getManifest().version},false);
  await local.set({token:response.token,trustExpiresAt:response.trustExpiresAt,seq:0,manualDisconnect:false});void poll();return response;
}
async function disconnect(){try{const state=await local.get(['token']);if(state.token)await helper('revoke',{});}catch{}await local.remove(['token','seq','trustExpiresAt']);await local.set({manualDisconnect:true});}
async function status(){
  const state=await local.get(['token','trustExpiresAt','manualDisconnect']),portal=await portalPermission(),app=await appPermission();
  return{permission:portal,portalPermission:portal,appPermission:app,paired:!!state.token&&!state.manualDisconnect,trustExpiresAt:state.trustExpiresAt||null,manualDisconnect:!!state.manualDisconnect};
}

chrome.runtime.onMessage.addListener((message,sender,sendResponse)=>{
  if(!message||!['mira-popup','mira-hosted'].includes(message.channel))return false;
  void(async()=>{
    try{
      let value;
      if(message.channel==='mira-hosted')value=await hosted(message,sender);
      else if(message.operation==='status'){await registerAll();await poll();value=await status();}
      else if(message.operation==='grant'){const granted=await chrome.permissions.request({origins:[PORTAL_PATTERN]});if(granted)await registerPortal();value=await status();}
      else if(message.operation==='grant-app'){const granted=await chrome.permissions.request({origins:[APP_PATTERN]});if(granted)await registerHosted();value=await status();}
      else if(message.operation==='pair')value=await pair(String(message.code||''));
      else if(message.operation==='disconnect'){await disconnect();value=await status();}
      else throw new Error('Unsupported operation.');
      sendResponse({ok:true,value});
    }catch(error){sendResponse({ok:false,error:{state:String(error?.message||'extension-operation-failed').slice(0,80),message:'The approved extension operation could not be completed.'}});}
  })();
  return true;
});
chrome.permissions.onRemoved.addListener(permissions=>{
  if(permissions.origins?.includes(PORTAL_PATTERN))void disconnect().then(()=>unregisterScript(PORTAL_SCRIPT_ID));
  if(permissions.origins?.includes(APP_PATTERN))void unregisterScript(APP_SCRIPT_ID);
});
chrome.runtime.onStartup.addListener(()=>{void registerAll().then(()=>poll());});
chrome.runtime.onInstalled.addListener(()=>{void restrictStorage().then(()=>registerAll()).then(()=>poll());});
chrome.alarms.onAlarm.addListener(alarm=>{if(alarm.name===ALARM)void poll();});
chrome.tabs.onUpdated.addListener((_id,change)=>{if(change.url?.startsWith('https://capstone.cs.fiu.edu/portal'))void poll();});
void restrictStorage();chrome.alarms.create(ALARM,{periodInMinutes:0.5});void registerAll().then(()=>poll());
