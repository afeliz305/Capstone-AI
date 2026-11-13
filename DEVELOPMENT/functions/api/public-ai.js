import { openAiDraft, budgetCall } from './ai.js';
import knowledge from '../../server/lib/knowledge.js';
import base from '../../data/capstone-knowledge.json';

// Only reviewed course facts. Browser text, personal snapshots and staff records
// never become provider inputs. The browser supplies IDs, not source excerpts.
export const publicEvidence = new Map(knowledge.reviewedKnowledge(base)
  .filter(e => !e.id.startsWith('portal-') && !['dashboard-personal','getting-started'].includes(e.id) && typeof e.answer === 'string' && e.answer.length > 30)
  .filter(e => /^https:\/\/capstone\.cs\.fiu\.edu\//.test(e.url || '') || /^pages\/syllabus\.html#/.test(e.url || ''))
  .map(e => [e.id, {id:e.id,title:e.title,url:e.url.startsWith('pages/')?'/'+e.url:e.url,excerpt:e.answer.slice(0,650)}]));
const reply=(body,status=200)=>new Response(JSON.stringify(body),{status,headers:{'content-type':'application/json','cache-control':'no-store','x-content-type-options':'nosniff'}});
const fallback=()=>reply({active:false,provider:'deterministic',fallback:true,mode:'MIRA — Course Knowledge'});
export async function visitorHash(request,env){
  const ip=request.headers.get('cf-connecting-ip');
  if(!ip || ip.length>64 || !/^[0-9a-f:.]+$/i.test(ip) || typeof env.MIRA_PUBLIC_VISITOR_SECRET!=='string' || env.MIRA_PUBLIC_VISITOR_SECRET.length<32)throw Error('Visitor control unavailable');
  const key=await crypto.subtle.importKey('raw',new TextEncoder().encode(env.MIRA_PUBLIC_VISITOR_SECRET),{name:'HMAC',hash:'SHA-256'},false,['sign']);
  return [...new Uint8Array(await crypto.subtle.sign('HMAC',key,new TextEncoder().encode(ip)))].map(n=>n.toString(16).padStart(2,'0')).join('');
}
export async function onRequestPost({request,env}){
  if(request.headers.get('origin')!==new URL(request.url).origin)return reply({fallback:true,error:'Same-origin request required'},403);
  if(Number(request.headers.get('content-length'))>1600)return reply({fallback:true},413);
  let body;
  try{const reader=request.body.getReader();let bytes=0,chunks=[];try{for(;;){const {done,value}=await reader.read();if(done)break;bytes+=value.length;if(bytes>1600)return reply({fallback:true},413);chunks.push(value);}}finally{await reader.cancel().catch(()=>{});}const data=new Uint8Array(bytes);let pos=0;for(const chunk of chunks){data.set(chunk,pos);pos+=chunk.length;}body=JSON.parse(new TextDecoder().decode(data));}catch{return reply({fallback:true},400);}
  if(!body||Object.keys(body).some(k=>!['action','sourceIds','requestId'].includes(k))||!['status','ask'].includes(body.action))return reply({fallback:true},400);
  // Two independent gates: configuration and an operator's durable, expiring approval.
  if(env.MIRA_PUBLIC_AI_ENABLED!=='true'||env.MIRA_PUBLIC_BILLING_APPROVED!=='true'||env.MIRA_AI_KILL_SWITCH!=='off')return fallback();
  try{
    const digest=await visitorHash(request,env);
    if(!env.OPENAI_API_KEY)throw Error('Provider unavailable');
    const auth=await budgetCall(env,'/public-auth',{});
    if(!auth.active)throw Error('Public access disabled');
    if(body.action==='status')return reply({active:true,expires:auth.pricingUntil,mode:'MIRA — Live AI'});
    if(!/^[a-f0-9-]{36}$/.test(body.requestId||'')||!Array.isArray(body.sourceIds)||body.sourceIds.length<1||body.sourceIds.length>3||new Set(body.sourceIds).size!==body.sourceIds.length||body.sourceIds.some(id=>!publicEvidence.has(id)))return reply({fallback:true,error:'Use reviewed course knowledge for this question'},400);
    const sources=body.sourceIds.map(id=>publicEvidence.get(id));
    const result=await openAiDraft({...env,MIRA_OPENAI_MODEL:'gpt-6.1-sol',MIRA_AI_VERIFIED_MODEL:'gpt-6.1-sol',MIRA_AI_INPUT_USD_PER_MILLION:'5',MIRA_AI_OUTPUT_USD_PER_MILLION:'10',MIRA_AI_PRICING_VALID_UNTIL:new Date(auth.pricingUntil).toISOString(),MIRA_AI_CONTROLLED_OUTPUT_TOKENS:'512',MIRA_PUBLIC_VISITOR_HASH:digest,MIRA_DEMO_REQUEST_ID:body.requestId},'explain-criteria','Explain these reviewed course topics and their relationship: '+sources.map(s=>s.title).join('; '),'General course guidance and fictional preparation only. No personal records or approval decisions.',sources,{maxOutputTokens:512,timeoutMs:30000});
    // Never expose provider diagnostics or financial totals to anonymous clients.
    return reply({provider:result.provider,fallback:result.fallback===true,text:result.text,citations:result.citations,model:result.model,usage:result.usage,mode:result.provider==='openai'?'MIRA — Live AI':'MIRA — Course Knowledge'});
  }catch{return fallback();}
}
export function onRequest(){return reply({fallback:true},405);}
