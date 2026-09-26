(() => {
  'use strict';
  const CHANNEL='capstone-ai-hosted-v1';
  const allowed=new Set(['status','discover','identity','capabilities','section','active','open']);
  function exactApp(){
    let pathname;
    try{pathname=decodeURIComponent(location.pathname);}catch{return false;}
    return window===window.top&&location.origin==='https://ocelot.aul.fiu.edu'&&
      (pathname==='/~afeli016/Capstone - AI/'||pathname==='/~afeli016/Capstone - AI/index.html')&&!location.search;
  }
  if(!exactApp())return;
  window.addEventListener('message',event=>{
    const data=event.data;
    if(event.source!==window||event.origin!==location.origin||!data||data.channel!==CHANNEL||data.kind!=='request'||
      typeof data.id!=='string'||!/^[a-f0-9-]{20,80}$/.test(data.id)||!allowed.has(data.operation))return;
    void chrome.runtime.sendMessage({channel:'mira-hosted',operation:data.operation,payload:data.payload||{}})
      .then(response=>window.postMessage({channel:CHANNEL,kind:'response',id:data.id,response},location.origin))
      .catch(()=>window.postMessage({channel:CHANNEL,kind:'response',id:data.id,response:{ok:false,error:{state:'extension-unavailable',message:'The Capstone - AI extension could not complete the request.'}}},location.origin));
  });
  window.postMessage({channel:CHANNEL,kind:'ready'},location.origin);
})();
