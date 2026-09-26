const statusNode=document.querySelector('#status'),grant=document.querySelector('#grant'),grantApp=document.querySelector('#grant-app'),pairButton=document.querySelector('#pair'),disconnect=document.querySelector('#disconnect'),code=document.querySelector('#code');
const request=(operation,extra={})=>chrome.runtime.sendMessage({channel:'mira-popup',operation,...extra});
function render(value){statusNode.textContent=value.portalPermission&&value.appPermission?'Ready for hosted MIRA.':value.portalPermission?'Portal access granted; grant Ocelot app access next.':'Grant portal access, then Ocelot app access.';if(value.paired)statusNode.textContent+=' Local MIRA is also paired.';grant.hidden=value.portalPermission;grantApp.hidden=value.appPermission;disconnect.hidden=!value.paired;pairButton.disabled=!value.portalPermission;code.disabled=!value.portalPermission;}
async function act(work){for(const button of [grant,grantApp,pairButton,disconnect])button.disabled=true;try{const result=await work();if(!result?.ok)throw new Error(result?.error||'Operation failed.');render(result.value);}catch(error){statusNode.textContent=String(error?.message||'Operation failed.');}finally{const current=await request('status').catch(()=>null);if(current?.ok)render(current.value);}}
grant.addEventListener('click',()=>void act(()=>request('grant')));
grantApp.addEventListener('click',()=>void act(()=>request('grant-app')));
pairButton.addEventListener('click',()=>void act(async()=>{const value=code.value;code.value='';return request('pair',{code:value});}));
disconnect.addEventListener('click',()=>void act(()=>request('disconnect')));
void request('status').then(result=>result?.ok?render(result.value):Promise.reject()).catch(()=>{statusNode.textContent='Reload this extension and try again.';});
