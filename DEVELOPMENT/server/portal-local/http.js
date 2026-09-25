const http=require('node:http');
const fs=require('node:fs/promises');
const path=require('node:path');
const {randomBytes,timingSafeEqual}=require('node:crypto');
const publicFiles=require('../lib/public-files');
const {basePath}=require('../../scripts/preview-ocelot');
const {PortalError}=require('./browser-adapter');
const opaque=()=>randomBytes(24).toString('base64url');
const equal=(a,b)=>{if(typeof a!=='string'||typeof b!=='string')return false;const x=Buffer.from(a),y=Buffer.from(b);return x.length===y.length&&timingSafeEqual(x,y);};
const types={'.html':'text/html; charset=utf-8','.js':'text/javascript; charset=utf-8','.css':'text/css; charset=utf-8','.svg':'image/svg+xml','.png':'image/png','.pdf':'application/pdf','.woff2':'font/woff2'};
function createPortalServer({root,sourceRoot,service,pairingCode=opaque(),port=3005,now=Date.now}) {
  const sessions=new Map(),limits=new Map(),bootstrapTokens=new Map();
  const pairingExpiresAt=now()+15*60000;
  let pairingUsed=false;
  const cookieName='capstone_portal_local_'+port;
  const bootstrapCookieName='capstone_portal_bootstrap_'+port;
  const host='127.0.0.1:'+port,origin='http://'+host;
  const allowed=new Set([...publicFiles,'js/shared/supabase.bundle.js','js/shared/browser-demo.bundle.js']);
  const headers={'Cache-Control':'no-store, private, max-age=0','Pragma':'no-cache','X-Content-Type-Options':'nosniff','Referrer-Policy':'no-referrer','Vary':'Cookie, Origin','Content-Security-Policy':"default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline'; img-src 'self' data:; font-src 'self'; connect-src 'self'; object-src 'none'; frame-ancestors 'none'; base-uri 'self'; form-action 'self'"};
  const send=(res,code,data,extra={})=>{res.writeHead(code,{...headers,'Content-Type':'application/json',...extra});res.end(JSON.stringify(data));};
  const budget=(key,max)=>{const slot=limits.get(key)||{at:now(),n:0};if(now()-slot.at>60000){slot.at=now();slot.n=0;}slot.n++;limits.set(key,slot);return slot.n<=max;};
  const cookie=(req,name)=>(req.headers.cookie||'').split(';').map(value=>value.trim()).find(value=>value.startsWith(name+'='))?.slice(name.length+1);
  const getSession=req=>{const id=cookie(req,cookieName);const s=sessions.get(id);if(s&&s.expires>now()) return s;if(s){sessions.delete(id);void service.disconnect(s.id);}return null;};
  const newSession=()=>({id:opaque(),csrf:opaque(),expires:now()+15*60000});
  const sessionCookie=session=>`${cookieName}=${session.id}; HttpOnly; SameSite=Strict; Path=/; Max-Age=900`;
  const establish=()=>{const session=newSession();sessions.clear();sessions.set(session.id,session);pairingUsed=true;return session;};
  async function body(req) {let size=0,chunks=[];for await(const c of req){size+=c.length;if(size>4096)throw new Error('size');chunks.push(c);}const value=JSON.parse(Buffer.concat(chunks).toString('utf8'));if(!value||typeof value!=='object'||Array.isArray(value))throw new Error();return value;}
  const server=http.createServer(async(req,res)=>{
    const remote=req.socket.remoteAddress;
    if(!['127.0.0.1','::ffff:127.0.0.1'].includes(remote)||req.headers.host!==host||req.headers['x-forwarded-host']||req.headers['x-forwarded-for']) return send(res,403,{error:'Loopback access with the exact local address is required.'});
    if(req.headers.origin&&req.headers.origin!==origin) return send(res,403,{error:'Foreign origins are not allowed.'});
    if(req.headers['sec-fetch-site']&&!['same-origin','none'].includes(req.headers['sec-fetch-site'])) return send(res,403,{error:'Cross-site requests are not allowed.'});
    let url;try{url=new URL(req.url,origin);}catch{return send(res,400,{error:'Invalid address.'});}
    if(url.origin!==origin)return send(res,403,{error:'Proxy requests are not allowed.'});
    if(url.search) return send(res,400,{error:'Query strings are not accepted by this private preview.'});
    if(url.pathname==='/__portal/health'&&req.method==='GET') return send(res,200,{helper:true,mode:'local-read-only',application:'Capstone - AI'});
    if(url.pathname.startsWith('/__portal/')) {
      if(req.method!=='POST'||req.headers.origin!==origin||!/^application\/json(?:;|$)/i.test(req.headers['content-type']||'')) return send(res,403,{error:'Same-origin JSON POST required.'});
      if(!budget('all',100))return send(res,429,{error:'Please wait before retrying.'});
      let data;try{data=await body(req);}catch{return send(res,400,{error:'Invalid or oversized request.'});}
      const operation=url.pathname.slice('/__portal/'.length);
      let session=getSession(req);
      if(operation==='resume') {
        if(Object.keys(data).length||!session) return send(res,401,{error:'No valid local application session is available.'});
        session.csrf=opaque();
        return send(res,200,{csrf:session.csrf,connection:service.status(session.id)});
      }
      if(operation==='bootstrap') {
        const bootstrap=cookie(req,bootstrapCookieName),record=bootstrapTokens.get(bootstrap);
        if(Object.keys(data).length||!record||record.expires<=now()) return send(res,403,{error:'Automatic local setup expired. Reload this local page directly, or use Advanced setup.'});
        bootstrapTokens.delete(bootstrap);
        if(service.owner) return send(res,409,{error:'Another local application session owns this connector. Disconnect it or restart the local demo.'});
        session=establish();
        return send(res,200,{csrf:session.csrf,connection:service.status(session.id)},{'Set-Cookie':[sessionCookie(session),`${bootstrapCookieName}=; HttpOnly; SameSite=Strict; Path=/; Max-Age=0`]});
      }
      if(operation==='pair') {
        if(!budget('pair',8)||pairingUsed||now()>pairingExpiresAt||Object.keys(data).some(k=>k!=='code')||!equal(data.code,pairingCode)) return send(res,403,{error:'Pairing was not accepted. The fallback code is invalid, expired, or already used. Restart the local helper only if Advanced setup is required.'});
        if(service.owner&&(!session||service.owner!==session.id)) return send(res,409,{error:'Another local session owns this connector. Disconnect it or restart the local demo.'});
        if(session) await service.disconnect(session.id);
        session=establish();
        return send(res,200,{csrf:session.csrf,connection:service.status(session.id)},{'Set-Cookie':sessionCookie(session)});
      }
      if(!session||!equal(req.headers['x-capstone-pair'],session.csrf)) return send(res,401,{error:'Local pairing expired. Private data must be cleared.'});
      const fields={discover:[],connect:['tabId'],status:[],verify:[],content:[],search:['question','context'],destination:['sourceId'],disconnect:[]};
      if(!Object.hasOwn(fields,operation)||Object.keys(data).some(k=>!fields[operation].includes(k))) return send(res,400,{error:'Unsupported operation or field.'});
      try {
        let result;
        if(operation==='discover') result=await service.discover(session.id);
        if(operation==='connect') {if(!Number.isSafeInteger(data.tabId))throw new Error();result=await service.connect(session.id,data.tabId);}
        if(operation==='status') result=service.status(session.id);
        if(operation==='verify') result=await service.verify(session.id);
        if(operation==='content') result=await service.refreshContent(session.id);
        if(operation==='search') {if(!budget('search',30))return send(res,429,{error:'Please wait before another search.'});result=await service.search(session.id,data);}
        if(operation==='destination') {if(typeof data.sourceId!=='string'||!/^private-[a-f0-9]{24}$/.test(data.sourceId))throw new Error();result=await service.destination(session.id,data.sourceId);}
        if(operation==='disconnect') {await service.disconnect(session.id);sessions.delete(session.id);return send(res,200,{state:'not-connected'},{'Set-Cookie':`${cookieName}=; HttpOnly; SameSite=Strict; Path=/; Max-Age=0`});}
        // A session invalidated while waiting for the browser cannot return data.
        if(!sessions.has(session.id)||session.expires<=now()) {await service.disconnect(session.id);return send(res,401,{error:'Local session expired.'});}
        return send(res,200,result);
      } catch(error) {return send(res,error instanceof PortalError?409:400,{error:error instanceof PortalError?error.message:'Invalid request.',connection:service.status(session.id)});}
    }
    if(req.method!=='GET') return send(res,404,{error:'Not found'});
    if(url.pathname==='/') {res.writeHead(302,{...headers,Location:basePath});res.end();return;}
    const file=url.pathname.startsWith(basePath)?url.pathname.slice(basePath.length)||'index.html':'';
    if(file==='pages/staff.html')return send(res,404,{error:'This is the read-only portal demo. Use your ordinary preview for fictional staff-ticket testing.'});
    try {
      let bytes;
      if(file==='js/local/portal-client.js') bytes=await fs.readFile(path.join(sourceRoot,file));
      else if(allowed.has(file)) bytes=await fs.readFile(path.join(root,file));
      else return send(res,404,{error:'Not found'});
      if(file==='index.html') bytes=Buffer.from(bytes.toString('utf8').replace('<script src="js/chat/capstone-chat.js"','<script src="js/local/portal-client.js" defer></script>\n    <script src="js/chat/capstone-chat.js"').replace(/<p class="hosting-test-notice"[\s\S]*?<\/p>/,'<p class="hosting-test-notice" role="note"><strong>LOCAL PRIVATE PORTAL DEMO.</strong> Read-only; this session stays on your computer. Ticket creation and transcript sharing are disabled in this preview. Public Ocelot visitors cannot connect to this browser.</p>'));
      const extra={};
      if(file==='index.html'&&!getSession(req)&&req.headers['sec-fetch-mode']==='navigate'&&req.headers['sec-fetch-dest']==='document'&&['none','same-origin'].includes(req.headers['sec-fetch-site'])) {
        const bootstrap=opaque();bootstrapTokens.set(bootstrap,{expires:now()+5*60000});
        extra['Set-Cookie']=`${bootstrapCookieName}=${bootstrap}; HttpOnly; SameSite=Strict; Path=/; Max-Age=300`;
      }
      res.writeHead(200,{...headers,...extra,'Content-Type':types[path.extname(file)]||'application/octet-stream'});res.end(bytes);
    }catch{send(res,404,{error:'Preview asset unavailable.'});}
  });
  server.requestTimeout=15000;server.headersTimeout=10000;
  const sweep=setInterval(()=>{for(const [id,s] of sessions)if(s.expires<=now()){sessions.delete(id);void service.disconnect(id);}for(const [id,entry] of bootstrapTokens)if(entry.expires<=now())bootstrapTokens.delete(id);if(service.owner)service.status(service.owner);},5000);sweep.unref();
  server.on('close',()=>{clearInterval(sweep);sessions.clear();bootstrapTokens.clear();if(service.owner)void service.disconnect(service.owner);});
  return {server,pairingCode,pairingExpiresAt,origin};
}
module.exports={createPortalServer};
