const statusNode=document.querySelector('#status'),grant=document.querySelector('#grant'),pairButton=document.querySelector('#pair'),disconnect=document.querySelector('#disconnect'),code=document.querySelector('#code');
const request=(operation,extra={})=>chrome.runtime.sendMessage({channel:'mira-popup',operation,...extra});
function render(value){statusNode.textContent=value.paired?'Paired with the local MIRA helper.':value.permission?'Portal access granted; enter the local pairing code.':'Portal site access has not been granted.';grant.hidden=value.permission;disconnect.hidden=!value.paired;pairButton.disabled=!value.permission;code.disabled=!value.permission;}
async function act(work){for(const button of [grant,pairButton,disconnect])button.disabled=true;try{const result=await work();if(!result?.ok)throw new Error(result?.error||'Operation failed.');render(result.value);}catch(error){statusNode.textContent=String(error?.message||'Operation failed.');}finally{const current=await request('status').catch(()=>null);if(current?.ok)render(current.value);}}
grant.addEventListener('click',()=>void act(()=>request('grant')));
pairButton.addEventListener('click',()=>void act(async()=>{const value=code.value;code.value='';return request('pair',{code:value});}));
disconnect.addEventListener('click',()=>void act(()=>request('disconnect')));
void request('status').then(result=>result?.ok?render(result.value):Promise.reject()).catch(()=>{statusNode.textContent='Start the local MIRA demo on port 3005.';});
