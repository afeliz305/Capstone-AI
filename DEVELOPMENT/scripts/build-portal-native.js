const fs=require("node:fs/promises");
const path=require("node:path");
const {build}=require("esbuild");

async function buildPortalNative({root=path.resolve(__dirname,".."),output=path.join(root,"dist","portal-native-review")}={}){
  await fs.mkdir(output,{recursive:true});
  const result=await build({absWorkingDir:root,entryPoints:[path.join(root,"portal-native","entry.js")],bundle:true,platform:"browser",format:"iife",target:["es2020"],write:false,minify:false,legalComments:"none"});
  await fs.writeFile(path.join(output,"mira-portal-native.bundle.js"),result.outputFiles[0].contents);
  await fs.copyFile(path.join(root,"css","portal-native-mira.css"),path.join(output,"mira-portal-native.css"));
  return output;
}

if(require.main===module)buildPortalNative().then(output=>console.log("Portal-owner review assets: "+output)).catch(error=>{console.error(error.message);process.exitCode=1;});
module.exports={buildPortalNative};
