// Isolated candidate preview: never replaces the current upload folder or local tickets.
const path = require("node:path");
const { createOcelotPackage } = require("./package-ocelot");
const { createPreview, basePath } = require("./preview-ocelot");
const { probePreview } = require("./start-demo");
async function start() {
  const port=3004;
  if ((await probePreview(port)).occupied) throw new Error("Port 3004 is occupied. If it is an older Supabase preview, stop it in its own terminal before restarting. No process was stopped.");
  const root=path.resolve(__dirname,"..");
  const result=await createOcelotPackage({root,outputRoot:path.join(root,"dist/staging"),transport:"supabase"});
  const server=createPreview({root:result.uploadDirectory});
  await new Promise((resolve,reject)=>{ server.once("error",reject); server.listen(port,"127.0.0.1",resolve); });
  console.log("Supabase candidate: http://127.0.0.1:3004"+basePath);
  console.log("Keep this terminal open. Database/Auth setup is required; failed requests never fall back to browser storage.");
  console.log("The current upload folder and browser-only demo were not changed.");
}
if (require.main===module) start().catch(error=>{console.error(error.message);process.exitCode=1;});
