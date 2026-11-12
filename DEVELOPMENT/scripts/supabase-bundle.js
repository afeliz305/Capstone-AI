const fs = require("node:fs/promises");
const path = require("node:path");
const { build } = require("esbuild");
const { validateConfig } = require("./check-supabase");
const { loadPublicIndex } = require("../server/website-index/store");
async function supabaseBundle(root, configuration, siteIndex) {
  if (siteIndex === undefined) siteIndex = await loadPublicIndex(root);
  const config = validateConfig(configuration || JSON.parse(await fs.readFile(path.join(root,"server/supabase.local.json"),"utf8")));
  const requestedRecovery = configuration?.recoveryUrl || "https://ocelot.aul.fiu.edu/~afeli016/MIRA/pages/recover.html";
  const recovery = new URL(requestedRecovery);
  if (recovery.protocol !== "https:" || recovery.username || recovery.password || recovery.search || recovery.hash || !recovery.pathname.endsWith("/pages/recover.html")) throw new Error("Use an exact HTTPS MIRA recovery URL ending in /pages/recover.html.");
  const result = await build({ absWorkingDir:root,entryPoints:[path.join(root,"js","shared","supabase-entry.js")],bundle:true,
    platform:"browser",format:"iife",target:["es2020"],write:false,minify:true,legalComments:"inline",
    define:{CAPSTONE_SUPABASE_CONFIG:JSON.stringify(config),CAPSTONE_WEBSITE_INDEX:JSON.stringify(siteIndex),CAPSTONE_RECOVERY_URL:JSON.stringify(recovery.href)} });
  return result.outputFiles[0].contents;
}
module.exports={supabaseBundle};
