const path=require('node:path');
const fs=require('node:fs/promises');
const {createOcelotPackage}=require('./package-ocelot');
const {probePreview}=require('./start-demo');
const {BrowserAdapter}=require('../server/portal-local/browser-adapter');
const {PortalService}=require('../server/portal-local/service');
const {createPortalServer}=require('../server/portal-local/http');
const {loadPublicIndex}=require('../server/website-index/store');
const {reviewedKnowledge}=require('../server/lib/knowledge');
const {searchKnowledge}=require('../server/lib/search');
async function start() {
  const port=3005,root=path.resolve(__dirname,'..');
  if((await probePreview(port)).occupied)throw new Error('Port 3005 is already in use. Stop only your older portal demo terminal first.');
  // Browser-demo packaging avoids cloud credentials. All ticket operations are
  // disabled by the local client; existing hosting modes remain unchanged.
  const result=await createOcelotPackage({root,outputRoot:path.join(root,'dist/staging'),transport:'browser'});
  const knowledge=reviewedKnowledge(JSON.parse(await fs.readFile(path.join(root,'data/capstone-knowledge.json'),'utf8')));
  const service=new PortalService({adapter:new BrowserAdapter(),publicSearch:async(q,c)=>searchKnowledge(knowledge,q,c,await loadPublicIndex(root))});
  const {server,pairingCode,pairingExpiresAt,origin}=createPortalServer({root:result.uploadDirectory,sourceRoot:root,service,port});
  await new Promise((resolve,reject)=>{server.once('error',reject);server.listen(port,'127.0.0.1',resolve);});
  console.log('Local private portal demo: '+origin+'/Capstone%20-%20AI/');
  console.log('Open the local page directly, then choose Connect my portal. Manual code entry is normally unnecessary.');
  console.log('Advanced setup fallback code (single use; expires '+new Date(pairingExpiresAt).toLocaleTimeString()+'; do not share): '+pairingCode);
  console.log('Keep this terminal open. Chrome 149+ required. Enable chrome://inspect/#remote-debugging yourself and approve Chrome when prompted.');
  console.log('No public debugging port is opened. Public Ocelot/GitHub/upload folders are unchanged. Ctrl+C disconnects.');
  let stopping=false;
  const stop=async()=>{if(stopping)return;stopping=true;await service.disconnect(service.owner);server.close();};
  process.once('SIGINT',stop);process.once('SIGTERM',stop);
}
if(require.main===module)start().catch(error=>{const message=/^Port 3005 is already in use\./.test(error?.message||'')?error.message:'Portal demo could not start. Run npm.cmd install --include=dev, then retry from DEVELOPMENT. No personal data was saved.';console.error(message);process.exitCode=1;});
module.exports={start};
