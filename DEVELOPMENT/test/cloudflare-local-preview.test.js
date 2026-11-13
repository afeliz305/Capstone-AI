const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs/promises'),os=require('node:os'),path=require('node:path');
const {buildCloudflarePackage}=require('../scripts/package-cloudflare');
const {start}=require('../scripts/preview-cloudflare');
test('offline presentation preview supports all workspace tasks using the production mock handler',async t=>{
 const output=await fs.mkdtemp(path.join(os.tmpdir(),'mira-presentation-preview-'));
 const release=await buildCloudflarePackage({outputRoot:output,publish:true,supabaseConfig:{url:'https://abcdefghijklmnopqrst.supabase.co',publishableKey:'sb_publishable_fictional_preview',recoveryUrl:'https://example.pages.dev/pages/recover.html'}});
 const server=await start({root:release.directory,port:0});
 t.after(async()=>{await new Promise(resolve=>server.close(resolve));await fs.rm(output,{recursive:true,force:true});});
 const origin='http://127.0.0.1:'+server.address().port;
 for(const task of ['explain-criteria','next-steps','review-evidence','what-is-missing','prepare-evidence','prepare-handoff','ready-for-review']){
  const r=await fetch(origin+'/api/ai',{method:'POST',body:JSON.stringify({task,context:'Fictional demo card'})});assert.equal(r.status,200);const b=await r.json();assert.equal(b.provider,'mock');assert.match(b.text,/No portal change was made/);
 }
 assert.equal((await fetch(origin+'/api/ai',{method:'POST',body:JSON.stringify({task:'next-steps',privatePortalData:true})})).status,403);
 assert.equal((await fetch(origin+'/api/ai',{method:'POST',body:'x'.repeat(13000)})).status,413);
 assert.equal((await fetch(origin+'/.env')).status,404);
});
