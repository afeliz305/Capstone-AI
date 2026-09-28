const { PortalNativeMira } = require("./mira-service");

function element(document,tag,className,text){const node=document.createElement(tag);if(className)node.className=className;if(text!==undefined)node.textContent=text;return node;}

function mountPortalNativeMira({root,adapter,publicSearch,document:doc=globalThis.document}={}){
  if(!root||typeof root.append!=="function")throw new Error("Provide a portal-owned mount element.");
  const service=new PortalNativeMira({adapter,publicSearch});
  const launcher=element(doc,"button","mira-native-launcher","MIRA");launcher.type="button";launcher.setAttribute("aria-expanded","false");
  const panel=element(doc,"section","mira-native-panel");panel.hidden=true;panel.setAttribute("role","dialog");panel.setAttribute("aria-modal","false");panel.setAttribute("aria-label","MIRA personal portal assistant");
  const header=element(doc,"header","mira-native-header");header.append(element(doc,"strong","","MIRA · secure portal"));
  const close=element(doc,"button","mira-native-close","Minimize");close.type="button";close.setAttribute("aria-label","Minimize MIRA");header.append(close);
  const status=element(doc,"p","mira-native-status","Uses your current verified portal session. Private answers stay in this page for no more than five minutes.");status.setAttribute("role","status");
  const log=element(doc,"div","mira-native-log");log.setAttribute("role","log");log.setAttribute("aria-live","polite");
  const form=element(doc,"form","mira-native-form");const input=element(doc,"textarea","mira-native-input");input.name="question";input.required=true;input.maxLength=500;input.rows=2;input.placeholder="Ask about your authorized dashboard information";const submit=element(doc,"button","mira-native-submit","Ask MIRA");submit.type="submit";form.append(input,submit);
  panel.append(header,status,log,form);root.append(launcher,panel);
  let context="",request=0;
  function add(role,text){const message=element(doc,"article","mira-native-message "+role);message.append(element(doc,"span","mira-native-label",role==="user"?"You":"MIRA"),element(doc,"p","",text));log.append(message);return message;}
  function setOpen(open){panel.hidden=!open;launcher.hidden=open;launcher.setAttribute("aria-expanded",String(open));if(open)input.focus();else launcher.focus();}
  function clear(reason){request++;context="";log.replaceChildren();if(reason)add("assistant",reason);}
  async function ask(question){
    const generation=++request;add("user",question);input.disabled=true;submit.disabled=true;
    try{
      const result=await service.ask(question,context);if(generation!==request)return;
      const message=add("assistant",result.answer||"No supported answer was found.");
      const sources=(result.sources||[]).slice(0,3);context=sources.map(source=>source.id).join(",");
      for(const source of sources){
        const card=element(doc,"section","mira-native-source");card.append(element(doc,"strong","",source.sectionTitle||source.section));
        if(result.answerStatus!=="clarification_needed")card.append(element(doc,"blockquote","",source.excerpt));
        card.append(element(doc,"small","",source.coverage||"Authorized portal source."));
        const open=element(doc,"button","mira-native-source-link",source.destination?.label||("Open "+source.section));open.type="button";
        open.addEventListener("click",async()=>{try{await service.openSource(source.id);}catch(error){clear(error.message);}});card.append(open);message.append(card);
      }
      if(result.coverage)message.append(element(doc,"p","mira-native-note",result.coverage));
    }catch(error){if(generation===request){context="";add("assistant",error?.message||"Personal MIRA is unavailable.");}}
    finally{if(generation===request){input.disabled=false;submit.disabled=false;input.focus();}}
  }
  launcher.addEventListener("click",()=>setOpen(true));close.addEventListener("click",()=>setOpen(false));
  form.addEventListener("submit",event=>{event.preventDefault();const question=input.value.trim();if(!question)return;input.value="";void ask(question);});
  panel.addEventListener("keydown",event=>{if(event.key==="Escape")setOpen(false);});
  const visibility=()=>{if(doc.visibilityState==="visible"){const state=service.resume();if(state.state!=="connected"&&context)clear("Your previous private sources expired or the portal session changed. Ask again to re-verify.");}};
  doc.addEventListener("visibilitychange",visibility);
  return{service,open:()=>setOpen(true),close:()=>setOpen(false),ask,clear,destroy(){request++;doc.removeEventListener("visibilitychange",visibility);service.destroy();root.replaceChildren();}};
}

module.exports={mountPortalNativeMira};
