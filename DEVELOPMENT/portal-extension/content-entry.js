const {SECTION_ROUTES,readPortalGuard,readPortalCapabilities,navigatePortalSection,readPortalSection}=require('../server/portal-local/dom-reader');

const PORTAL='https://capstone.cs.fiu.edu/portal';
const documentId=crypto.randomUUID();
const exactPortal=()=>location.origin==='https://capstone.cs.fiu.edu'&&location.pathname==='/portal'&&!location.search;
const editing=()=>!!document.activeElement?.matches('input,textarea,select,[contenteditable="true"]');

async function freshIdentity(){
  if(!exactPortal())return{state:'connection-lost'};
  if(editing())return{state:'editing-active'};
  let response,text;
  try{response=await fetch(PORTAL,{method:'GET',credentials:'same-origin',cache:'no-store',redirect:'follow',headers:{Accept:'text/html'}});text=await response.text();}catch{return{state:'sign-in-required'};}
  if(!response.ok||response.url!==PORTAL||!text)return{state:'sign-in-required'};
  const parsed=new DOMParser().parseFromString(text,'text/html'),name=parsed.querySelector('#pubavdrop .avdname')?.textContent?.trim(),email=parsed.querySelector('#pubavdrop .avdemail')?.textContent?.trim(),logout=parsed.querySelector('#pubavdrop form[action="/logout"][method="post"]');
  if(!name||!logout||!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email||''))return{state:'sign-in-required'};
  return{state:'verified',identity:{name:name.slice(0,120),email:email.toLowerCase().slice(0,254)},active:readPortalGuard().active,documentId,proof:{network:true,status:response.status,checkedAt:new Date().toISOString(),bytes:text.length}};
}

async function combinedSection(payload,activeOnly=false){
  const identity=await freshIdentity();if(identity.state!=='verified')return identity;
  const section=activeOnly?readPortalGuard().active:payload.section;
  if(!Object.hasOwn(SECTION_ROUTES,section))return{state:'section-denied'};
  if(readPortalGuard().active!==section){
    if(!payload.navigate||section==='Messages')return{state:'section-required',section,message:section==='Messages'?'Open Messages and deliberately select a conversation yourself. MIRA will not open one automatically.':'The requested section is not currently loaded.'};
    const moved=await navigatePortalSection(section);if(moved.state!=='present')return moved;
  }
  const extracted=readPortalSection({section,messageContent:payload.messageContent});
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
        const section=message.payload?.section;
        if(!Object.hasOwn(SECTION_ROUTES,section))result={state:'section-denied'};
        else if(section==='Messages')result={state:'present',section,url:PORTAL,guidance:'Open Messages and choose the conversation yourself; MIRA will not select or mark one read.'};
        else{const moved=await navigatePortalSection(section);result={...moved,guidance:'The verified parent section is open. Open a nested detail manually when no stable deep link exists.'};}
      } else result={state:'operation-denied'};
      sendResponse({ok:true,value:result});
    }catch{sendResponse({ok:false,error:{state:'extension-operation-failed',message:'The approved portal read could not be completed.'}});}
  })();
  return true;
});
