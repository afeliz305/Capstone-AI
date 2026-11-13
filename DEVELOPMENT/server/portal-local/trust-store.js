const fs=require('node:fs');
const path=require('node:path');
const os=require('node:os');
const {execFileSync}=require('node:child_process');
// Only an irreversible token digest and replay counter are stored. Never portal data.
function createTrustStore(directory){
  if(!path.isAbsolute(directory))throw new Error('Private trust directory must be absolute.');
  for(let p=directory;;p=path.dirname(p)){
    if(fs.existsSync(p)&&fs.lstatSync(p).isSymbolicLink())throw new Error('Linked trust directories are not supported.');
    if(path.dirname(p)===p)break;
  }
  fs.mkdirSync(directory,{recursive:true,mode:0o700});
  if(process.platform==='win32'){
    const identity=execFileSync('whoami.exe',['/user','/fo','csv','/nh'],{encoding:'utf8',windowsHide:true});
    const sid=identity.match(/S-1-5-[0-9-]+/)?.[0];if(!sid)throw new Error('Private trust owner unavailable.');
    execFileSync('icacls.exe',[directory,'/inheritance:r','/grant:r','*'+sid+':(OI)(CI)F'],{stdio:'pipe',windowsHide:true});
    const quoted=directory.replaceAll("'","''");
    const verify="$a=Get-Acl -LiteralPath '"+quoted+"'; $bad=@($a.Access | Where-Object { $_.AccessControlType -eq 'Allow' -and $_.IdentityReference.Translate([System.Security.Principal.SecurityIdentifier]).Value -ne '"+sid+"' }); if($bad.Count -ne 0){exit 3}";
    execFileSync('powershell.exe',['-NoProfile','-NonInteractive','-Command',verify],{stdio:'pipe',windowsHide:true});
  }else{fs.chmodSync(directory,0o700);if(fs.statSync(directory).uid!==process.getuid())throw new Error('Private trust owner mismatch.');}
  const file=path.join(directory,'trust.json');
  function check(){if(fs.existsSync(file)){const s=fs.lstatSync(file);if(!s.isFile()||s.isSymbolicLink()||s.nlink!==1||s.size>4096)throw new Error('Unsafe private trust file.');}}
  return{
    load(){check();if(!fs.existsSync(file))return null;return JSON.parse(fs.readFileSync(file,'utf8'));},
    save(value){
      check();const temporary=path.join(directory,'trust-'+require('node:crypto').randomUUID()+'.tmp');
      const fd=fs.openSync(temporary,'wx',0o600);
      try{fs.writeFileSync(fd,JSON.stringify(value));fs.fsyncSync(fd);}finally{fs.closeSync(fd);}
      fs.renameSync(temporary,file);
    }
  };
}
function defaultTrustDirectory(){return path.join(process.env.LOCALAPPDATA||path.join(os.homedir(),'.local','share'),'MIRA','portal-connector');}
module.exports={createTrustStore,defaultTrustDirectory};
