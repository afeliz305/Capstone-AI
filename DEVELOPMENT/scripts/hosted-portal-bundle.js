const path=require('node:path');
const {build}=require('esbuild');

const hashShim=`
function bytes(size){const value=crypto.getRandomValues(new Uint8Array(size));return{toString(){let text='';for(const byte of value)text+=String.fromCharCode(byte);return btoa(text).replaceAll('+','-').replaceAll('/','_').replace(/=+$/,'');}};}
function digest(seed=''){let value=seed;return{update(input){value+=String(input);return this;},digest(){const parts=[];for(let round=0;round<4;round++){let hash=1469598103934665603n^BigInt(round+1);for(const char of value){hash^=BigInt(char.codePointAt(0));hash=BigInt.asUintN(64,hash*1099511628211n);}parts.push(hash.toString(16).padStart(16,'0'));}return parts.join('');}};}
module.exports={randomBytes:bytes,createHash:()=>digest(),createHmac:(_algorithm,key)=>digest(String(key))};`;
const protocolShim=`class PortalError extends Error{constructor(state,message){super(message);this.state=state;}}module.exports={PORTAL:'https://capstone.cs.fiu.edu/portal',PortalError};`;

async function hostedPortalBundle(root=path.resolve(__dirname,'..')){
  const result=await build({absWorkingDir:root,entryPoints:[path.join(root,'js','hosted','portal-client-entry.js')],bundle:true,platform:'browser',format:'iife',target:['chrome116'],write:false,minify:true,plugins:[{name:'hosted-portal-shims',setup(plugin){
    plugin.onResolve({filter:/^node:crypto$/},()=>({path:'crypto',namespace:'capstone-shim'}));
    plugin.onResolve({filter:/browser-adapter$/},()=>({path:'protocol',namespace:'capstone-shim'}));
    plugin.onLoad({filter:/.*/,namespace:'capstone-shim'},args=>({contents:args.path==='crypto'?hashShim:protocolShim,loader:'js'}));
  }}]});
  return result.outputFiles[0].contents;
}
module.exports={hostedPortalBundle};
