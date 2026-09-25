"use strict";
const fs = require("node:fs/promises");
const path = require("node:path");
const robotsParser = require("robots-parser");
const { randomUUID } = require("node:crypto");
const { normalizeUrl, publicGet, sleep } = require("./policy");
const { extract, sitemap, hash } = require("./extract");
const { readIndex, publish, atomicJson } = require("./store");
const timestamp = () => new Date().toISOString();
async function crawl({ config, directory, get = publicGet, now = timestamp }) {
  await fs.mkdir(directory,{recursive:true});
  const lock=path.join(directory,"refresh.lock");
  try { await fs.mkdir(lock); } catch(error) { if(error.code==="EEXIST") throw new Error("Index refresh already running; inspect the owner-only lock after an interrupted process."); throw error; }
  const report={startedAt:now(),finishedAt:null,siteId:config.siteId,successful:[],unchanged:[],deleted:[],excluded:[],failures:[],discovered:0,limited:false};
  try {
    const old=await readIndex(directory), version=new Date().toISOString().replace(/[:.]/g,"-")+"-"+randomUUID().slice(0,8);
    if (old && old.siteId !== config.siteId) throw new Error("A different site's index exists here. Use a separate index directory.");
    const pages=new Map((old?.pages||[]).map(p=>[p.url,structuredClone(p)]));
    const robots=new Map(); let nextRequest=0; let requestQueue=Promise.resolve();
    async function request(url,validators={},robotsRequest=false) {
      let current=url;
      for(let redirects=0;redirects<=5;redirects++) {
        const approved=normalizeUrl(current,config,current,{infrastructure:robotsRequest});
        if(!approved) throw new Error("Blocked out-of-scope request or redirect.");
        if(!robotsRequest) {
          const rules=await rulesFor(new URL(current).origin);
          if(rules.isAllowed(current,config.userAgent)===false) throw Object.assign(new Error("robots.txt excludes this destination."),{excluded:true});
        }
        let response;
        for(let attempt=0;attempt<=config.retries;attempt++) {
          try {
            const reserve=requestQueue.then(async()=>{
              const rules=robots.get(new URL(current).origin);
              const delay=Math.max(config.delayMs,(rules?.getCrawlDelay(config.userAgent)||0)*1000);
              if(delay>60000) throw new Error("Host crawl delay exceeds this job's limit; refresh deferred.");
              const wait=Math.max(0,nextRequest-Date.now()); nextRequest=Date.now()+wait+delay;
              if(wait) await sleep(wait);
            }); requestQueue=reserve.catch(()=>{}); await reserve;
            response=await get(current,config,validators);
            if((response.status===429 || response.status>=500) && attempt<config.retries) {
              const retry=response.headers["retry-after"];
              let delay=Number(retry)*1000;
              if(!Number.isFinite(delay)) delay=Date.parse(retry)-Date.now();
              if(delay>60000) throw new Error("Host asked for a later retry; refresh deferred.");
              await sleep(Math.max(0,delay||config.backoffMs*2**attempt)); continue;
            }
            break;
          } catch(error) { if(attempt===config.retries || /later retry/.test(error.message)) throw error; await sleep(config.backoffMs*2**attempt); }
        }
        if([301,302,303,307,308].includes(response.status)) {
          const redirect=normalizeUrl(response.headers.location,config,current,{infrastructure:robotsRequest});
          if(!redirect) throw new Error("Blocked unsafe redirect.");
          current=redirect; validators={}; continue;
        }
        return {...response,url:current};
      }
      throw new Error("Redirect limit exceeded.");
    }
    async function rulesFor(origin) {
      if(robots.has(origin)) return robots.get(origin);
      // Loaded serially before workers; never let a failed robots fetch mean allow.
      const response=await request(origin+"/robots.txt",{},true);
      if(response.status!==200 && ![404,410].includes(response.status)) throw new Error("robots.txt unavailable; crawl stopped for this origin.");
      const rules=robotsParser(origin+"/robots.txt",response.status===200 ? response.body.toString("utf8") : "");
      robots.set(origin,rules); return rules;
    }
    for(const origin of config.allowedOrigins) await rulesFor(origin);
    const queue=[],queued=new Set(),visited=new Set();
    function enqueue(value,depth=0) {
      const url=normalizeUrl(value,config);
      if(!url || queued.has(url) || depth>config.maxDepth || queued.size>=config.maxPages*10) return;
      if(/\.(?:pdf|zip|png|jpe?g|gif|svg|woff2?|mp4|mp3|css|js|docx?|xlsx?)$/i.test(new URL(url).pathname)) return;
      queued.add(url); queue.push({url,depth}); report.discovered++;
    }
    enqueue(config.startUrl); for(const url of config.seedUrls) enqueue(url);
    // Recheck previously indexed URLs, including pages no longer linked anywhere.
    for(const page of pages.values()) if(normalizeUrl(page.url,config)) enqueue(page.url); else { page.status="excluded"; page.reason="Configured exclusion."; report.excluded.push({url:page.url,reason:page.reason}); }
    const sitemapQueue=[...new Set([...robots.values()].flatMap(r=>r.getSitemaps()).concat(new URL("/sitemap.xml",config.startUrl).href))],seenMaps=new Set();
    while(sitemapQueue.length && seenMaps.size<config.maxSitemaps) {
      const url=normalizeUrl(sitemapQueue.shift(),config); if(!url || seenMaps.has(url)) continue; seenMaps.add(url);
      try {
        const response=await request(url);
        if([404,410].includes(response.status)) continue;
        if(response.status!==200) throw new Error("Sitemap HTTP "+response.status);
        const parsed=sitemap(response.body.toString("utf8"));
        parsed.nested.slice(0,config.maxSitemaps).forEach(x=>sitemapQueue.push(x));
        for(const page of parsed.pages.slice(0,config.maxPages*2)) enqueue(page.url);
      } catch(error) { report.failures.push({url,stage:"sitemap",reason:error.message}); }
    }
    async function indexPage({url,depth}) {
      visited.add(url); const previous=pages.get(url), fetchedAt=now();
      try {
        const response=await request(url, previous?.status==="active" ? {etag:previous.etag,lastModified:previous.lastModified} : {});
        if(response.status===304 && previous) {
          previous.lastFetchedAt=fetchedAt; previous.lastCheckedAt=fetchedAt; previous.status="active"; report.unchanged.push(url);
          for(const link of previous.links||[]) enqueue(link.url,depth+1); return;
        }
        if([404,410].includes(response.status)) {
          if(previous) { previous.status="deleted"; previous.lastCheckedAt=fetchedAt; previous.reason="Confirmed HTTP "+response.status; }
          report.deleted.push(url); return;
        }
        if([401,403].includes(response.status)) throw Object.assign(new Error("Authentication or access restriction."),{excluded:true});
        if(response.status!==200) throw new Error("Page HTTP "+response.status);
        if(!/^(?:text\/html|application\/xhtml\+xml)(?:;|$)/i.test(response.headers["content-type"]||"")) throw Object.assign(new Error("Not an HTML page."),{excluded:true});
        if(/\b(?:noindex|none)\b/i.test(response.headers["x-robots-tag"]||"")) throw Object.assign(new Error("Response excludes public indexing."),{excluded:true});
        const document=extract(response.body,response.url,config);
        if(document.noindex || document.requiresAuth) throw Object.assign(new Error("Login page or noindex directive."),{excluded:true});
        if(document.needsRendering) throw new Error("No meaningful server-rendered text; needs an approved public rendered-content source.");
        const target=response.url;
        if(target!==url && previous) { previous.status="redirected"; previous.redirectTo=target; previous.lastCheckedAt=fetchedAt; }
        const existing=pages.get(target), same=existing?.contentHash===document.contentHash;
        const page={id:"page-"+hash(config.siteId+"\n"+target).slice(0,24),siteId:config.siteId,url:target,canonicalUrl:target,
          ...document,status:"active",etag:response.headers.etag||null,lastModified:response.headers["last-modified"]||null,
          sourceModifiedAt:response.headers["last-modified"] && Number.isFinite(Date.parse(response.headers["last-modified"])) ? new Date(response.headers["last-modified"]).toISOString() : null,
          lastFetchedAt:fetchedAt,lastCheckedAt:fetchedAt,indexedAt:same?existing.indexedAt:fetchedAt,indexVersion:version};
        pages.set(target,page); if(same) report.unchanged.push(target); else report.successful.push(target);
        if(!/\bnofollow\b/i.test(response.headers["x-robots-tag"]||"")) for(const link of document.links) enqueue(link.url,depth+1);
        for(const chunk of document.chunks) if(chunk.status==="excluded") report.excluded.push({url:chunk.url,reason:chunk.exclusionReason});
      } catch(error) {
        if(previous) { previous.status=error.excluded?"excluded":"unavailable"; previous.reason=error.message; previous.lastCheckedAt=fetchedAt; }
        const record={url,reason:error.message}; (error.excluded?report.excluded:report.failures).push(record);
      }
    }
    while(queue.length && visited.size<config.maxPages) {
      // Prefer ordinary linked pages over large archive query permutations.
      queue.sort((a,b)=>Number(Boolean(new URL(a.url).search))-Number(Boolean(new URL(b.url).search)) || a.depth-b.depth);
      const batch=[];
      while(queue.length && batch.length<config.concurrency && visited.size+batch.length<config.maxPages) { const item=queue.shift(); if(!visited.has(item.url)) batch.push(item); }
      await Promise.all(batch.map(indexPage));
    }
    report.limited=queue.length>0;
    // Remove duplicate active pages without losing URL evidence or audit history.
    const hashes=new Map();
    for(const page of [...pages.values()].sort((a,b)=>a.url.localeCompare(b.url))) if(page.status==="active") {
      const duplicate=hashes.get(page.contentHash); if(duplicate) {page.status="duplicate";page.duplicateOf=duplicate;} else hashes.set(page.contentHash,page.id);
    }
    const next={schemaVersion:1,siteId:config.siteId,version,indexedAt:now(),scope:config,pages:[...pages.values()],lastSuccessfulRun:now()};
    if(!report.successful.length && !report.unchanged.length && report.failures.length && !report.deleted.length && !report.excluded.length) throw new Error("No successful page fetch; previous index remains published.");
    await publish(directory,next,config);
    report.version=version; report.activePages=next.pages.filter(p=>p.status==="active").length;
    report.activeSections=next.pages.filter(p=>p.status==="active").reduce((n,p)=>n+p.chunks.filter(c=>c.status==="active").length,0);
    report.published=true;
    return report;
  } catch(error) { report.published=false; report.error=error.message; throw Object.assign(error,{report}); }
  finally { report.finishedAt=now(); await atomicJson(path.join(directory,"last-run.json"),report); await fs.rmdir(lock); }
}
module.exports={crawl};
