const {randomBytes,createHash,timingSafeEqual}=require('node:crypto');
const {PortalError}=require('./browser-adapter');

const PAIRING_TTL=15*60*1000;
const TRUST_TTL=7*24*60*60*1000;
const REQUEST_TIMEOUT=12000;
const EXTENSION_ORIGIN=/^chrome-extension:\/\/[a-p]{32}$/;
const token=()=>randomBytes(32).toString('base64url');
const digest=value=>createHash('sha256').update(String(value)).digest();
const equal=(a,b)=>{if(typeof a!=='string'||typeof b!=='string')return false;const x=digest(a),y=digest(b);return timingSafeEqual(x,y);};

class ExtensionBridge{
  constructor({now=Date.now,pairingCode=token(),pairingTtl=PAIRING_TTL,trustTtl=TRUST_TTL,requestTimeout=REQUEST_TIMEOUT}={}){
    this.now=now;this.pairingCode=pairingCode;this.pairingExpiresAt=now()+pairingTtl;this.trustTtl=trustTtl;this.requestTimeout=requestTimeout;
    this.pairingUsed=false;this.client=null;this.queue=[];this.pending=new Map();this.lastDiagnostic={stage:'extension-pairing-required',at:new Date(now()).toISOString(),errorType:null};
  }
  diagnostics(){return{mode:'extension',...this.lastDiagnostic,paired:!!this.validClient()};}
  stage(stage,errorType=null){this.lastDiagnostic={stage,at:new Date(this.now()).toISOString(),errorType};}
  validClient(){if(!this.client)return null;if(this.client.expires<=this.now()){this.revoke('extension-trust-expired');return null;}return this.client;}
  pair(origin,data){
    if(!EXTENSION_ORIGIN.test(origin||'')||this.pairingUsed||this.now()>this.pairingExpiresAt||!data||!equal(data.code,this.pairingCode)||typeof data.clientNonce!=='string'||!/^[A-Za-z0-9_-]{20,120}$/.test(data.clientNonce)||typeof data.version!=='string'||data.version.length>40)throw new PortalError('extension-pairing-required','Extension pairing was not accepted. Use the current single-use code from the local terminal.');
    const secret=token();this.client={origin,secretHash:digest(secret),expires:this.now()+this.trustTtl,lastSeq:0,lastSeen:this.now(),version:data.version};this.pairingUsed=true;this.stage('extension-paired');
    return{token:secret,trustExpiresAt:new Date(this.client.expires).toISOString(),helper:'Capstone - AI local helper'};
  }
  authenticate(origin,data){
    const client=this.validClient();
    if(!client||origin!==client.origin||!data||typeof data.token!=='string'||!timingSafeEqual(digest(data.token),client.secretHash)||!Number.isSafeInteger(data.seq)||data.seq<=client.lastSeq)throw new PortalError('extension-pairing-required','The extension-to-local-app trust is unavailable or expired. Pair the extension again.');
    client.lastSeq=data.seq;client.lastSeen=this.now();return client;
  }
  next(origin,data){
    this.authenticate(origin,data);const command=this.queue.shift();
    if(!command){this.stage('extension-ready');return{operation:'idle',retryAfter:750};}
    command.sent=true;this.stage('extension-operation-sent');return{operation:'command',id:command.id,name:command.name,payload:command.payload};
  }
  complete(origin,data){
    this.authenticate(origin,data);const item=this.pending.get(data.id);
    if(!item||typeof data.ok!=='boolean'||Object.keys(data).some(key=>!['token','seq','id','ok','value','error'].includes(key)))throw new PortalError('extension-protocol-error','The extension returned an invalid or stale operation result.');
    this.pending.delete(data.id);clearTimeout(item.timer);
    if(data.ok)item.resolve(data.value);else item.reject(new PortalError(data.error?.state||'extension-operation-failed',data.error?.message||'The portal extension could not complete the approved read.'));
    this.stage(data.ok?'extension-operation-complete':'extension-operation-failed',data.ok?null:(data.error?.state||'operation-error'));
    return{accepted:true};
  }
  request(name,payload={}){
    const client=this.validClient();if(!client||this.now()-client.lastSeen>45000)throw new PortalError('extension-pairing-required','Open the Capstone - AI extension and confirm that it is paired with this local helper.');
    if(!['discover','identity','capabilities','section','active','open'].includes(name))throw new PortalError('extension-protocol-error','Unsupported extension operation.');
    const id=token();return new Promise((resolve,reject)=>{
      const timer=setTimeout(()=>{this.pending.delete(id);this.queue=this.queue.filter(item=>item.id!==id);this.stage('extension-operation-timeout','timeout');reject(new PortalError('extension-unavailable','The paired portal extension did not respond. Open the signed-in portal tab and retry.'));},this.requestTimeout);
      const item={id,name,payload,resolve,reject,timer,sent:false};this.pending.set(id,item);this.queue.push(item);this.stage('extension-operation-queued');
    });
  }
  revoke(reason='extension-disconnected'){
    for(const item of this.pending.values()){clearTimeout(item.timer);item.reject(new PortalError('extension-pairing-required','The portal extension disconnected. Pair it again before requesting personal information.'));}
    this.pending.clear();this.queue=[];this.client=null;this.stage(reason);
  }
}

module.exports={ExtensionBridge,PAIRING_TTL,TRUST_TTL,REQUEST_TIMEOUT,EXTENSION_ORIGIN};
