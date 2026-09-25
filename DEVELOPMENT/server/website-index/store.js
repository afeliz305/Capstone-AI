"use strict";
const fs = require("node:fs/promises");
const path = require("node:path");
const { randomUUID } = require("node:crypto");
const { configuration, normalizeUrl } = require("./policy");
const defaultRoot = path.resolve(__dirname,"../..");
function location(root = defaultRoot) { return process.env.CAPSTONE_INDEX_DIR ? path.resolve(process.env.CAPSTONE_INDEX_DIR) : path.join(root,"server/website-index/runtime"); }
async function readConfig(file = process.env.CAPSTONE_INDEX_CONFIG) {
  return configuration(file ? JSON.parse(await fs.readFile(path.resolve(file),"utf8")) : require("./config.json"));
}
function validateIndex(index, config) {
  if (index.schemaVersion !== 1 || index.siteId !== config.siteId || !Array.isArray(index.pages) || index.pages.length > 3000 || !index.version) throw new Error("Invalid index snapshot.");
  const ids = new Set();
  for (const page of index.pages) {
    if (!/^page-[a-f0-9]{24}$/.test(page.id) || ids.has(page.id) || page.siteId !== config.siteId) throw new Error("Invalid page identity.");
    ids.add(page.id);
    // Excluded/removed records retain their last evidence privately for audit.
    if (page.status === "active" && !normalizeUrl(page.url,config)) throw new Error("Active page is outside configured scope.");
    if (!Array.isArray(page.chunks) || page.chunks.length > 200) throw new Error("Invalid sections.");
    for (const chunk of page.chunks) {
      if (!/^section-[a-f0-9]{24}$/.test(chunk.id) || ids.has(chunk.id) || typeof chunk.text !== "string" || chunk.text.length > 100000) throw new Error("Invalid section identity or text.");
      ids.add(chunk.id);
      if (chunk.url !== page.url+(chunk.anchor ? "#"+encodeURIComponent(chunk.anchor) : "")) throw new Error("Unverified section destination.");
    }
  }
  return index;
}
async function readIndex(directory = location(), config) {
  try {
    const file=path.join(directory,"current.json"), stat=await fs.stat(file);
    if (stat.size > 40000000) throw new Error("Index snapshot is too large.");
    const index=JSON.parse(await fs.readFile(file,"utf8"));
    return validateIndex(index,config || configuration(index.scope));
  } catch (error) { if (error.code === "ENOENT") return null; throw error; }
}
async function atomicJson(file,value) {
  const temp=file+"."+randomUUID()+".tmp";
  await fs.writeFile(temp,JSON.stringify(value,null,2)+"\n",{flag:"wx",mode:0o600});
  const handle=await fs.open(temp,"r+"); try { await handle.sync(); } finally { await handle.close(); }
  await fs.rename(temp,file);
}
async function publish(directory,index,config) {
  validateIndex(index,config);
  await fs.mkdir(path.join(directory,"versions"),{recursive:true});
  await fs.writeFile(path.join(directory,"versions",index.version+".json"),JSON.stringify(index),{flag:"wx",mode:0o600});
  await atomicJson(path.join(directory,"current.json"),index);
}
function publicSnapshot(index) {
  if (!index) return null;
  const config=configuration(index.scope);
  validateIndex(index,config);
  return { schemaVersion:1,siteId:index.siteId,version:index.version,indexedAt:index.indexedAt,
    mode:"extractive-keyword",semanticSearch:false,scope:{allowedOrigins:config.allowedOrigins,allowedPaths:config.allowedPaths,excludedPaths:config.excludedPaths},
    retrieval:{minScore:config.minScore,minCoverage:config.minCoverage,maxResults:config.maxResults,aliases:config.aliases},
    pages:index.pages.filter(p=>p.status==="active").map(p=>({id:p.id,siteId:p.siteId,url:p.url,title:p.title,description:p.description,tags:p.tags,breadcrumbs:p.breadcrumbs,status:p.status,indexedAt:p.indexedAt,lastFetchedAt:p.lastFetchedAt,sourceModifiedAt:p.sourceModifiedAt,
      chunks:p.chunks.filter(c=>c.status==="active").map(c=>({id:c.id,heading:c.heading,hierarchy:c.hierarchy,anchor:c.anchor,url:c.url,text:c.text,context:c.context,blocks:c.blocks,contentHash:c.contentHash,status:c.status}))})) };
}
async function loadPublicIndex(root = defaultRoot) { return publicSnapshot(await readIndex(location(root))); }
module.exports={location,readConfig,readIndex,validateIndex,atomicJson,publish,publicSnapshot,loadPublicIndex};
