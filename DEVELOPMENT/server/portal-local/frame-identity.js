// Parse only the server-rendered JSON account contract. Never execute page code.
function frameIdentity(doc) {
  const matches=[];
  for(const script of doc.querySelectorAll('script:not([src])')) {
    const text=script.textContent||'';
    const start=/\bwindow\.__FRAME__\s*=\s*(\{)/.exec(text);
    if(!start)continue;
    let depth=0,quoted=false,escaped=false,end=-1;
    const offset=start.index+start[0].length-1;
    for(let i=offset;i<text.length;i++) {
      const c=text[i];
      if(quoted){if(escaped)escaped=false;else if(c==='\\')escaped=true;else if(c==='"')quoted=false;continue;}
      if(c==='"')quoted=true;else if(c==='{')depth++;else if(c==='}'&&--depth===0){end=i+1;break;}
    }
    if(end<0)return null;
    try {
      const frame=JSON.parse(text.slice(offset,end)),me=frame.me;
      if(frame.kind!=='cap2'||!Number.isSafeInteger(me?.id)||me.id<=0||typeof me.name!=='string'||!me.name.trim()||me.name.length>120)return null;
      matches.push({portalAccountId:String(me.id),name:me.name.trim()});
    }catch{return null;}
  }
  return matches.length===1?matches[0]:null;
}
function matchingFrameIdentity(fresh,loaded){
  const a=frameIdentity(fresh),b=frameIdentity(loaded);
  return a&&b&&a.portalAccountId===b.portalAccountId&&a.name===b.name?a:null;
}
module.exports={frameIdentity,matchingFrameIdentity};
