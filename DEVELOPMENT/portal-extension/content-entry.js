const {SECTION_ROUTES,canonicalSection,readPortalGuard,readPortalCapabilities,navigatePortalSection,readPortalSection}=require('../server/portal-local/dom-reader');

const PORTAL='https://capstone.cs.fiu.edu/portal';
const PORTAL_PATHS=new Set(['/portal','/today','/inbox','/board','/meetings','/my-work','/this-term','/people','/me/rhythm','/recognition','/me/privacy']);
const documentId=crypto.randomUUID();
const exactPortal=()=>location.origin==='https://capstone.cs.fiu.edu'&&PORTAL_PATHS.has(location.pathname)&&!location.search;
const editing=()=>!!document.activeElement?.matches('input,textarea,select,[contenteditable="true"]');

async function freshIdentity(){
  if(!exactPortal())return{state:'connection-lost'};
  if(editing())return{state:'editing-active'};
  let response,text;
  const page=location.origin+location.pathname;
  try{response=await fetch(page,{method:'GET',credentials:'same-origin',cache:'no-store',redirect:'follow',headers:{Accept:'text/html'}});text=await response.text();}catch{return{state:'sign-in-required'};}
  if(!response.ok||response.url!==page||!text)return{state:'sign-in-required'};
  const parsed=new DOMParser().parseFromString(text,'text/html'),name=parsed.querySelector('#pubavdrop .avdname')?.textContent?.trim(),email=parsed.querySelector('#pubavdrop .avdemail')?.textContent?.trim(),logout=parsed.querySelector('#pubavdrop form[action="/logout"][method="post"]');
  if(!name||!logout||!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email||''))return{state:'sign-in-required'};
  return{state:'verified',identity:{name:name.slice(0,120),email:email.toLowerCase().slice(0,254)},active:readPortalGuard().active,documentId,proof:{network:true,status:response.status,checkedAt:new Date().toISOString(),bytes:text.length}};
}

async function combinedSection(payload,activeOnly=false){
  const identity=await freshIdentity();if(identity.state!=='verified')return identity;
  const section=canonicalSection(activeOnly?readPortalGuard().active:payload.section);
  if(!Object.hasOwn(SECTION_ROUTES,section))return{state:'section-denied'};
  if(readPortalGuard().active!==section){
    if(!payload.navigate)return{state:'section-required',section,message:'The requested section is not currently loaded.'};
    const moved=await navigatePortalSection(section);if(moved.state!=='present')return moved;
  }
  const extracted=readPortalSection({section,identityName:identity.identity.name});
  return{...identity,...extracted,identity:identity.identity,proof:identity.proof,documentId};
}

chrome.runtime.onMessage.addListener((message,_sender,sendResponse)=>{
  if(!message||message.channel!=='mira-portal'||typeof message.operation!=='string')return false;
  void(async()=>{
    try{
      let result;
      if(message.operation==='guard')result={...readPortalGuard(),documentId};
      else if(message.operation==='identity')result=await freshIdentity();
      else if(message.operation==='capabilities')result={...readPortalCapabilities(),documentId};
      else if(message.operation==='section')result=await combinedSection(message.payload||{});
      else if(message.operation==='active')result=await combinedSection({...message.payload,navigate:false},true);
      else if(message.operation==='open'){
        const section=canonicalSection(message.payload?.section);
        if(!Object.hasOwn(SECTION_ROUTES,section))result={state:'section-denied'};
        else{const moved=await navigatePortalSection(section);result={...moved,guidance:section==='Inbox'?'Open Inbox yourself; MIRA reads metadata only and will not open a conversation or change read state.':'The verified parent section is open. Open a nested detail manually when no stable deep link exists.'};}
      } else result={state:'operation-denied'};
      sendResponse({ok:true,value:result});
    }catch{sendResponse({ok:false,error:{state:'extension-operation-failed',message:'The approved portal read could not be completed.'}});}
  })();
  return true;
});
