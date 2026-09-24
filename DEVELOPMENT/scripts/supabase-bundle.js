const fs = require("node:fs/promises");
const path = require("node:path");
const { build } = require("esbuild");
const { validateConfig } = require("./check-supabase");
async function supabaseBundle(root, configuration) {
  const config = validateConfig(configuration || JSON.parse(await fs.readFile(path.join(root,"server/supabase.local.json"),"utf8")));
  const result = await build({ absWorkingDir:root,entryPoints:["js/shared/supabase-entry.js"],bundle:true,
    platform:"browser",format:"iife",target:["es2020"],write:false,minify:true,legalComments:"inline",
    define:{CAPSTONE_SUPABASE_CONFIG:JSON.stringify(config)} });
  return result.outputFiles[0].contents;
}
module.exports={supabaseBundle};
