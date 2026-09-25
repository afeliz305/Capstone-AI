"use strict";
const fs = require("node:fs/promises");
const path = require("node:path");
const { location,readConfig,readIndex } = require("../server/website-index/store");
const { crawl } = require("../server/website-index/crawl");
async function main(args=process.argv.slice(2)) {
  const command=args[0]||"status", config=await readConfig(), directory=location();
  if(command==="status") {
    const index=await readIndex(directory); let lastRun=null;
    try {lastRun=JSON.parse(await fs.readFile(path.join(directory,"last-run.json"),"utf8"));}catch(error){if(error.code!=="ENOENT") throw error;}
    console.log(JSON.stringify({siteId:config.siteId,mode:"extractive-keyword",semanticSearch:false,version:index?.version||null,lastSuccessfulRun:index?.lastSuccessfulRun||null,
      pages:(index?.pages||[]).map(p=>({url:p.url,status:p.status,sections:p.chunks.length,indexedAt:p.indexedAt,lastFetchedAt:p.lastFetchedAt})),lastRun},null,2)); return;
  }
  if(command!=="refresh" && command!=="watch") throw new Error("Use status, refresh or watch.");
  // OS account permissions authorize this maintenance command. There is no
  // public refresh endpoint, and prototype email-only staff cannot trigger it.
  const refresh=async()=>{ try { console.log(JSON.stringify(await crawl({config,directory}),null,2)); }catch(error){ console.error(JSON.stringify(error.report||{error:error.message},null,2)); if(command!=="watch") process.exitCode=1; } };
  await refresh();
  if(command==="watch") { console.log("Owner-only scheduled refresh every "+config.refreshHours+" hours; stop with Ctrl+C."); setInterval(refresh,config.refreshHours*3600000); }
}
if(require.main===module) main().catch(error=>{console.error(error.message);process.exitCode=1;});
module.exports={main};
