const fs=require('node:fs/promises'),crypto=require('node:crypto'),assert=require('node:assert/strict');
async function main(){
 const manifest=JSON.parse(await fs.readFile('dist/cloudflare/manifest.json','utf8'));
 const origin=(process.env.MIRA_REVIEW_ORIGIN||'https://mira-9gg.pages.dev').replace(/\/$/,'');
 let count=0,bytes=0;
 for(const item of manifest.filter(x=>x.file!=='_headers')){const r=await fetch(origin+'/'+item.file);assert.equal(r.status,200,item.file);const b=Buffer.from(await r.arrayBuffer());assert.equal(b.length,item.bytes,item.file);assert.equal(crypto.createHash('sha256').update(b).digest('hex'),item.sha256,item.file);count++;bytes+=b.length;}
 const post=body=>fetch(origin+'/api/ai',{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify(body)});
 const r=await post({task:'next-steps',context:'Fictional presentation check'});assert.equal(r.status,200);const b=await r.json();assert.equal(b.provider,'mock');assert.equal(b.budgetReady,false);
 const recovery=await fetch(origin+'/pages/recover.html');assert.equal(recovery.status,200);assert.match(recovery.headers.get('cache-control'),/no-store/);
 const home=await fetch(origin+'/');assert.equal(home.headers.get('x-content-type-options'),'nosniff');assert.match(home.headers.get('content-security-policy'),/frame-ancestors 'none'/);assert.ok(home.headers.get('referrer-policy'));assert.ok(home.headers.get('permissions-policy'));
 for(const p of ['/.git/config','/.env','/server/server.js','/workers/ai-budget/worker.mjs','/wrangler.jsonc','/node_modules/package.json','/data/tickets.json','/js/shared/ai-gateway.js.map'])assert.equal((await fetch(origin+p)).status,404,p);
 for(const [body,expected] of [[{task:'next-steps',privatePortalData:true},403],[{task:'invalid'},400],[{task:'next-steps',context:'x'.repeat(13000)},413]])assert.equal((await post(body)).status,expected);
 const result={origin,checkedAt:new Date().toISOString(),assets:count,bytes,hashes:'PASS',provider:b.provider,budgetReady:b.budgetReady,recovery:'no-store',headers:'PASS',protectedPaths:'PASS',privacy:'PASS'};
 await fs.mkdir('dist/presentation',{recursive:true});await fs.writeFile('dist/presentation/hosted-integrity.json',JSON.stringify(result,null,2));console.log(JSON.stringify(result));
}
main().catch(e=>{console.error(e);process.exitCode=1});
