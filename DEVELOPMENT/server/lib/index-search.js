"use strict";
// Pure retrieval, shared by Node and packaged clients. No network, model,
// filesystem, credentials, or tool execution can be invoked from this module.
const STOP = new Set("a an the i me my we our you your can could would should do does did is are was were be been being have has had it this that those these about for of on in at to from with and or please tell show find get what how where when which who any information page section website site says say need want".split(" "));
const normalize = s => String(s||"").toLowerCase().normalize("NFKD").replace(/[\u0300-\u036f]/g,"").replace(/[^a-z0-9]+/g," ").trim();
function stem(token) { return token.length>4 && token.endsWith("ies") ? token.slice(0,-3)+"y" : token.length>4 && token.endsWith("s") && !token.endsWith("ss") ? token.slice(0,-1) : token; }
const tokens = text => [...new Set(normalize(text).split(/\s+/).filter(t=>t && !STOP.has(t)).map(stem))];
function safeUrl(url, index) {
  try {
    const parsed=new URL(url), scope=index.scope;
    const prefix=(path,p)=>p==="/" || path===p || path.startsWith(p.endsWith("/")?p:p+"/");
    const decoded=decodeURIComponent(parsed.pathname);
    return parsed.protocol==="https:" && !parsed.username && !parsed.password && !parsed.port && scope.allowedOrigins.includes(parsed.origin)
      && scope.allowedPaths.some(p=>prefix(decoded,p)) && !scope.excludedPaths.some(p=>prefix(decoded.toLowerCase(),p.toLowerCase())) && !/[\\%\u0000-\u001f]/.test(decoded);
  } catch {return false;}
}
function records(index) {
  if(!index || index.schemaVersion!==1 || !Array.isArray(index.pages)) return [];
  return index.pages.filter(p=>p.status==="active" && p.siteId===index.siteId && safeUrl(p.url,index)).flatMap(page=>(page.chunks||[])
    .filter(c=>c.status==="active" && c.url===page.url+(c.anchor?"#"+encodeURIComponent(c.anchor):"") && safeUrl(c.url,index))
    .map(chunk=>({page,chunk})));
}
function resolveSource(index,id) { return records(index).find(r=>r.chunk.id===id) || null; }
function queryGroups(question,aliases={}) {
  let text=normalize(question); const phrases=[];
  for(const [key,values] of Object.entries(aliases).sort((a,b)=>b[0].length-a[0].length)) {
    const words=normalize(key); if(!words) continue;
    const pattern=new RegExp("(^| )"+words.replace(/[.*+?^${}()|[\]\\]/g,"\\$&")+"(?= |$)","g");
    if(pattern.test(text)) { phrases.push([...new Set([words,...values].flatMap(tokens))]); text=text.replace(pattern," "); }
  }
  return [...tokens(text).map(t=>[t]),...phrases].filter(g=>g.length);
}
function near(a,b) { // One insertion/deletion/substitution only for long words.
  if(a.length<5 || b.length<5 || Math.abs(a.length-b.length)>1 || /\d/.test(a+b)) return false;
  let i=0,j=0,errors=0; while(i<a.length && j<b.length) { if(a[i]===b[j]){i++;j++;}else {if(++errors>1)return false;if(a.length>=b.length)i++;if(b.length>=a.length)j++;} } return errors+(i<a.length||j<b.length?1:0)<=1;
}
function rank(index,question,context=[]) {
  const groups=queryGroups(question,index.retrieval?.aliases).slice(0,32), query=normalize(question);
  if(!groups.length) return [];
  const quoted=[...String(question).matchAll(/["“]([^"”]+)["”]/g)].map(m=>normalize(m[1]));
  const numbers=tokens(question).filter(t=>/^\d+$/.test(t));
  const contextTerms=new Set(context.flatMap(r=>tokens(r.page.title+" "+r.chunk.heading)));
  const rows=records(index), frequencies=new Map();
  for(const row of rows) {
    row.body=new Set(tokens(row.chunk.text)); row.title=new Set(tokens(row.page.title)); row.heading=new Set(tokens(row.chunk.heading+" "+row.chunk.hierarchy.join(" "))); row.tags=new Set(tokens((row.page.tags||[]).join(" ")+" "+(row.page.breadcrumbs||[]).join(" ")));
    row.all=new Set([...row.body,...row.title,...row.heading,...row.tags]);
    for(const word of row.all) frequencies.set(word,(frequencies.get(word)||0)+1);
  }
  return rows.map(row=>{
    const full=normalize(row.page.title+" "+row.chunk.heading+" "+row.chunk.text);
    if(numbers.some(n=>!row.all.has(n)) || quoted.some(q=>!full.includes(q))) return {...row,score:0,coverage:0};
    // Explicit qualifiers must be present; annual is not monthly, a refund is
    // not an exchange. Related concepts aren't collapsed into one synonym.
    const protectedTerms=tokens(question).filter(t=>["annual","monthly","refund","return","exchange","cancellation","undergraduate","graduate"].includes(t));
    if(protectedTerms.some(t=>!row.all.has(t))) return {...row,score:0,coverage:0};
    let covered=0,bodyCovered=0,weight=0,total=0;
    for(const group of groups) {
      const idf=Math.max(...group.map(t=>1+Math.log(1+rows.length/(1+(frequencies.get(t)||0))))); total+=idf;
      let best=0;
      for(const term of group) {
        const exact=(row.heading.has(term)?0.6:0)+(row.title.has(term)?0.2:0)+(row.tags.has(term)?0.1:0)+(row.body.has(term)?0.35:0);
        const fuzzy=exact?0:[...row.all].some(t=>near(term,t))?0.35:0;
        best=Math.max(best,Math.min(1,exact||fuzzy));
      }
      if(group.some(term=>row.body.has(term)||[...row.body].some(t=>near(term,t)))) bodyCovered++;
      if(best) covered++; weight+=best*idf;
    }
    const coverage=covered/groups.length;
    const phrase=normalize(row.chunk.heading) && query.includes(normalize(row.chunk.heading)) ? 0.12 : 0;
    const contextBonus=context.length && contextTerms.size && [...contextTerms].some(t=>row.title.has(t)||row.heading.has(t))?0.06:0;
    const exactHeading=groups.every(group=>group.some(term=>row.heading.has(term))) && row.chunk.text.length>=80;
    return {...row,coverage,score:bodyCovered/groups.length<0.34 && !exactHeading?0:Math.min(1,0.4*coverage+0.6*weight/total+phrase+contextBonus)};
  }).filter(r=>r.score>=(index.retrieval?.minScore||0.38) && r.coverage>=(index.retrieval?.minCoverage||0.6))
    .sort((a,b)=>b.score-a.score || b.coverage-a.coverage || a.chunk.id.localeCompare(b.chunk.id));
}
function excerpt(row,limit=2300) {
  const text=row.chunk.text;
  if(text.length<=limit) return {text,truncated:false};
  // Never cut a table row, list or sentence mid-block. An oversized block is a
  // navigation-only result, not a fabricated shortened policy.
  const parts=[]; let length=0;
  for(const block of [row.chunk.context,...row.chunk.blocks].filter(Boolean)) { if(length+block.length>limit) break; parts.push(block);length+=block.length+2; }
  return {text:parts.length?parts.join("\n\n"):"This section is too long to quote safely here. Open the source to read its full conditions.",truncated:true};
}
function source(row,index) {
  const quoted=excerpt(row);
  return {id:row.chunk.id,sourceId:row.chunk.id,pageId:row.page.id,siteId:index.siteId,pageTitle:row.page.title,sectionTitle:row.chunk.heading,url:row.chunk.url,anchor:row.chunk.anchor,
    excerpt:quoted.text,truncated:quoted.truncated,indexed_at:row.page.indexedAt,last_fetched_at:row.page.lastFetchedAt,source_modified_at:row.page.sourceModifiedAt||null,indexVersion:index.version};
}
function result(index,answerStatus,answer,rows=[],extra={}) {
  const sources=rows.slice(0,index?.retrieval?.maxResults||3).map(r=>source(r,index));
  return {indexed:true,mode:"extractive-keyword",semanticSearch:false,answerStatus,answer,
    status:answerStatus==="not_found"?"unmatched":answerStatus==="clarification_needed"?"choices":"matched",
    sources,navigationScope:index?.scope||null,navigation:sources.map(s=>({label:s.anchor?"View this section":"Open the relevant page",targetSourceId:s.id,url:s.url})),
    matches:sources.map(s=>({id:s.id,title:s.sectionTitle,sourceTitle:s.pageTitle,url:s.url,section:s.sectionTitle,access:"public",sourceKind:"website-index",answer:s.excerpt,indexedAt:s.indexed_at,followUps:["Where does it say that?","Show me that section."]})),links:[],indexVersion:index?.version||null,...extra};
}
function searchIndex(index,question,contextId="") {
  const questionText=String(question||"").slice(0,500), text=normalize(questionText);
  const ids=String(contextId||"").split(",").slice(0,5);
  const context=ids.map(id=>resolveSource(index,id)).filter(Boolean);
  if(/^(?:take me there|open it|open that|show me that section|where does it say that|where does that say that|view (?:the |this )?source)$/.test(text)) {
    if(!context.length) return result(index,"clarification_needed","Which page or topic should I open? Ask a site question first.");
    if(context.length>1) return result(index,"clarification_needed","Which of these sources did you mean?",context,{navigationRequested:true});
    return result(index,"answered","Here is the source for that answer. Use the link below to open it in a new tab.",context,{navigationRequested:true});
  }
  const clauses=questionText.split(/\?\s*(?=\w)|;|\band\s+(?=(?:how|what|when|where|can|does|is|do)\b)/i).map(s=>s.trim()).filter(Boolean).slice(0,3);
  if(clauses.length>1) {
    const found=[],missing=[];
    for(const clause of clauses) {const hits=rank(index,clause,context); if(hits.length) found.push(hits[0]); else missing.push(clause);}
    const unique=[...new Map(found.map(r=>[r.chunk.id,r])).values()];
    if(!unique.length) return result(index,"not_found","I couldn’t find that information in the indexed website content.");
    return result(index,missing.length?"partial":"answered",missing.length?"I found related source text for part of your question, but couldn’t find indexed support for: "+missing.join("; "):"Here are the indexed source passages for your questions. They are excerpts, not a live verification.",unique);
  }
  const ranked=rank(index,questionText,context), unique=[],seen=new Set();
  for(const row of ranked) {const key=row.chunk.contentHash||row.chunk.text;if(!seen.has(key)){seen.add(key);unique.push(row);}}
  if(!unique.length) return result(index,"not_found","I couldn’t find that information in the indexed website content.");
  const top=unique[0], second=unique[1];
  // A score is relevance, not proof: in extractive mode we return original
  // passages, not inferred yes/no conclusions or model-generated facts.
  if(second && top.score-second.score<0.07 && top.chunk.heading!==second.chunk.heading) return result(index,"clarification_needed","I found several relevant sections. Which one do you mean?",unique.slice(0,3));
  const potentialConflict=second && normalize(top.chunk.heading)===normalize(second.chunk.heading) && top.chunk.text!==second.chunk.text && top.score-second.score<0.1;
  if(potentialConflict) return result(index,"partial","These indexed sources give different text under the same topic. Their conditions or versions may differ; compare both sources before relying on one.",[top,second],{possibleConflict:true});
  const quoted=excerpt(top);
  return result(index,quoted.truncated?"partial":"answered",quoted.truncated?"I found a longer section. This excerpt may omit conditions; open the source for the complete text.":"Here is the relevant indexed source text. This is an excerpt, not a live check.",[top]);
}
module.exports={searchIndex,resolveSource,records,safeUrl,normalize,tokens,rank};
