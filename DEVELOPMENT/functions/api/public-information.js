import robotsParser from 'robots-parser';

// Exact public documents only. Never forward request headers, cookies or queries.
export const sources = Object.freeze({
  resources: {url:'https://capstone.cs.fiu.edu/resources',title:'Student resources'},
  tutorials: {url:'https://capstone.cs.fiu.edu/tutorials',title:'Tutorials'},
  privacy: {url:'https://capstone.cs.fiu.edu/privacy',title:'Privacy policy'}
});
const json=(body,status=200)=>new Response(JSON.stringify(body),{status,headers:{'Content-Type':'application/json','Cache-Control':'no-store','X-Content-Type-Options':'nosniff'}});
export async function boundedText(response,max=131072){
  if(Number(response.headers.get('content-length'))>max)throw new Error('oversized');
  const reader=response.body?.getReader();if(!reader)throw new Error('empty');
  const decoder=new TextDecoder();let bytes=0,text='';
  try{for(;;){const {value,done}=await reader.read();if(done)break;bytes+=value.byteLength;if(bytes>max)throw new Error('oversized');text+=decoder.decode(value,{stream:true});}return text+decoder.decode();}
  finally{await reader.cancel().catch(()=>{});}
}
export async function extractPublic(html){
  // Remove executable, hidden and interactive content before collecting plain text.
  const cleaned=await new HTMLRewriter().on('script,style,noscript,template,form,nav,footer,[hidden],[aria-hidden="true"],input,textarea,button', {element(e){e.remove();}}).transform(new Response(html)).text();
  const blocks=[];let current='';
  await new HTMLRewriter().on('main p, main li, main h1, main h2, main h3',{
    element(e){current='';e.onEndTag(()=>{const t=current.replace(/\s+/g,' ').trim();if(t.length>20&&t.length<2000)blocks.push(t);current='';});},
    text(t){current+=t.text;}
  }).transform(new Response(cleaned)).text();
  return [...new Set(blocks)].slice(0,40);
}
export async function handlePublic(request,{get=fetch,extract=extractPublic,now=()=>new Date().toISOString()}={}){
  const u=new URL(request.url),id=u.searchParams.get('source');
  if(request.method!=='GET')return json({error:'Read-only GET required.'},405);
  if([...u.searchParams.keys()].some(k=>k!=='source')||u.searchParams.getAll('source').length!==1||!Object.hasOwn(sources,id))return json({error:'Choose an approved public source.'},400);
  const source=sources[id];const controller=new AbortController(),timer=setTimeout(()=>controller.abort(),6000);
  try{
    const options={method:'GET',redirect:'manual',credentials:'omit',signal:controller.signal,headers:{'User-Agent':'MiraPublicReader/1.0','Accept':'text/html,text/plain'}};
    const robots=await get('https://capstone.cs.fiu.edu/robots.txt',options);
    if(!robots.ok)throw new Error('robots unavailable');
    const rules=robotsParser('https://capstone.cs.fiu.edu/robots.txt',await boundedText(robots,16384));
    if(rules.isAllowed(source.url,'MiraPublicReader')!==true)throw new Error('robots denied');
    const response=await get(source.url,options);
    if(!response.ok||response.redirected||!/^text\/html\b/i.test(response.headers.get('content-type')||''))throw new Error('source unavailable');
    const html=await boundedText(response);
    if(!/<main\b/i.test(html)||/<title[^>]*>[^<]*(?:sign in|log in|access denied|just a moment)/i.test(html)||/\b(?:csrf_token|access_token|refresh_token)\s*["']?\s*[:=]/i.test(html))throw new Error('not public content');
    const excerpts=await extract(html);
    if(excerpts.length<2||excerpts.some(t=>/ignore (?:all |previous )?instructions|system prompt|reveal (?:secrets|tokens)|send .*?(?:cookie|password|token)/i.test(t)))throw new Error('invalid source');
    // Current upstream responses are private,no-store: do not cache even anonymous excerpts.
    return json({tool:'search_public_capstone_sources',sourceId:id,title:source.title,url:source.url,checkedAt:now(),sourceUpdatedAt:null,scope:'anonymous public page; linked authenticated content not read',excerpts,cache:'no-store',provider:'deterministic'});
  }catch{return json({error:'Current public source could not be verified. Reviewed course knowledge remains available.',fallback:true},503);}
  finally{clearTimeout(timer);}
}
export const onRequest=({request})=>handlePublic(request);
