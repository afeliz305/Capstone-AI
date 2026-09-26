const path=require('node:path');
const {build}=require('esbuild');
async function main(){const root=path.resolve(__dirname,'..');await build({entryPoints:[path.join(root,'portal-extension/content-entry.js')],bundle:true,platform:'browser',format:'iife',target:['chrome116'],outfile:path.join(root,'portal-extension/content.bundle.js'),legalComments:'none',logLevel:'silent'});console.log('Portal extension ready: '+path.join(root,'portal-extension'));}
if(require.main===module)main().catch(error=>{console.error(error.message);process.exitCode=1;});
module.exports={main};
