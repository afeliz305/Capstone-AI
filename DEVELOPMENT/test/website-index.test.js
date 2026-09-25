const test=require("node:test"), assert=require("node:assert/strict"), fs=require("node:fs/promises"), path=require("node:path"), os=require("node:os");
const {execFile}=require("node:child_process"),{promisify}=require("node:util");
const {configuration,normalizeUrl,isPublicAddress,safeAddresses}=require("../server/website-index/policy");
const {extract,sitemap}=require("../server/website-index/extract");
const {crawl}=require("../server/website-index/crawl");
const {readIndex,publicSnapshot,validateIndex}=require("../server/website-index/store");
const {searchIndex,resolveSource}=require("../server/lib/index-search");
const {searchKnowledge}=require("../server/lib/search");
const fixture=require("./fixtures/indexed-site");
const config=configuration({siteId:"fixture",startUrl:"https://example.test/",allowedOrigins:["https://example.test"],delayMs:0,backoffMs:0,retries:0,maxPages:20,aliases:{"money back":["refund"],"yearly":["annual"]}});
function response(body,status=200,headers={}) {return {status,body:Buffer.from(body),headers:{"content-type":"text/html",...headers}};}
async function setup(t) {
  const directory=await fs.mkdtemp(path.join(os.tmpdir(),"capstone-index-test-"));
  t.after(async()=>{assert.equal(path.dirname(directory),os.tmpdir());assert.ok(path.basename(directory).startsWith("capstone-index-test-"));await fs.rm(directory,{recursive:true,force:true});});
  const pages=new Map([
    ["/robots.txt",response("User-agent: *\nDisallow: /blocked\nSitemap: https://example.test/maps.xml",200,{"content-type":"text/plain"})],
    ["/maps.xml",response('<sitemapindex><sitemap><loc>https://example.test/nested.xml</loc></sitemap></sitemapindex>')],
    ["/nested.xml",response('<urlset><url><loc>https://example.test/policy</loc><lastmod>2026-01-01</lastmod></url><url><loc>https://example.test/blocked</loc></url></urlset>')],
    ["/sitemap.xml",response("",404)], ["/",response(fixture.home)], ["/policy",response(fixture.policy,200,{etag:'"p1"'})], ["/annual",response(fixture.annual)],
    ["/changed",response(fixture.simple("Service hours","The support desk is open Monday to Friday, except public holidays."))],
    ["/removed",response(fixture.simple("Legacy service","Legacy service is available only to existing subscribers."))],
    ["/temporary",response(fixture.simple("Temporary service","Temporary service is available by appointment only."))]
  ]),calls=[];
  const get=async(url,_config,validators)=>{calls.push({url,validators});const value=pages.get(new URL(url).pathname);if(value instanceof Error)throw value;return value||response("",404);};
  await crawl({config,directory,get});
  return {directory,pages,calls,get,index:publicSnapshot(await readIndex(directory))};
}
test("crawl scope normalizes tracking only, preserves meaningful queries, and rejects actions/credentials",()=>{
  assert.equal(normalizeUrl("/policy?utm_source=x&term=fall#real",config),"https://example.test/policy?term=fall");
  assert.equal(normalizeUrl("/policy?term=spring",config),"https://example.test/policy?term=spring");
  for(const url of ["http://example.test/","https://evil.test/","https://user:pw@example.test/","/portal","/portal/team","/logout","/delete/item","/purchase","/policy?token=secret","/x%2fportal","/x%252fportal","javascript:alert(1)"]) assert.equal(normalizeUrl(url,config),null,url);
  assert.throws(()=>configuration({concurrency:100}));assert.throws(()=>configuration({allowedOrigins:["http://example.test"]}));
});
test("SSRF rejects private, loopback, metadata, mapped and mixed DNS addresses",async()=>{
  for(const value of ["127.0.0.1","10.0.0.1","172.16.0.1","192.168.0.1","169.254.169.254","0.0.0.0","::1","fc00::1","fe80::1","::ffff:127.0.0.1","100.64.0.1","224.1.1.1"]) assert.equal(isPublicAddress(value),false,value);
  assert.equal(isPublicAddress("93.184.216.34"),true);
  await assert.rejects(safeAddresses("example.test",async()=>[{address:"93.184.216.34",family:4},{address:"127.0.0.1",family:4}]),/non-public/);
  await assert.rejects(safeAddresses("localhost",async()=>[]),/Unsafe/);
});
test("extraction keeps evidence, ancestor anchors, hierarchy, tables and FAQs without boilerplate",()=>{
  const document=extract(fixture.policy,"https://example.test/policy",config);
  const monthly=document.chunks.find(c=>c.heading==="Monthly refunds");
  assert.equal(monthly.anchor,"refund-actual");assert.equal(monthly.url,"https://example.test/policy#refund-actual");
  assert.match(monthly.text,/only to unused/);assert.match(monthly.text,/setup fees are not refundable/);assert.match(monthly.text,/Do not cancel/);
  assert.equal(document.chunks.find(c=>c.heading==="Returns").url,"https://example.test/policy");
  assert.match(document.chunks.find(c=>c.heading==="Billing limits").text,/Plan \| Limit \| Exception\nMonthly \| 14 days \| Setup fee excluded/);
  assert.equal(document.chunks.find(c=>c.heading==="Injected content").status,"excluded");
  assert.doesNotMatch(document.chunks.map(c=>c.text).join("\n"),/Footer noise|Cookie accept|hidden content|alert\(/);
  assert.ok(extract(fixture.annual,"https://example.test/annual",config).chunks.some(c=>c.heading==="Can I transfer an annual plan?"));
  assert.equal(sitemap('<sitemapindex><sitemap><loc>https://example.test/a.xml</loc></sitemap></sitemapindex>').nested.length,1);
  assert.throws(()=>sitemap('<!ENTITY x SYSTEM "file:///etc/passwd">'),/Unsafe/);
});
test("persistent snapshot survives a separate process; robots and nested maps are enforced",async t=>{
  const state=await setup(t);
  assert.ok(state.calls.some(c=>c.url.endsWith("nested.xml")));assert.ok(!state.calls.some(c=>c.url.endsWith("blocked")||c.url.endsWith("portal")));
  const child=await promisify(execFile)(process.execPath,["-e","require('./server/website-index/store').readIndex(process.argv[1]).then(i=>console.log(i.version))",state.directory],{cwd:path.resolve(__dirname,"..")});
  assert.equal(child.stdout.trim(),state.index.version);
  assert.equal(state.index.pages.length,6);
  assert.ok(!JSON.stringify(state.index).includes("reveal secrets"));
});
test("indexed keyword/alias/spelling retrieval preserves numbers, qualifiers and negation",async t=>{
  const {index}=await setup(t);
  for(const question of ["Can I get my money back?","Monthly refunds","Monthly refunnds"]) {
    const answer=searchIndex(index,question);
    assert.ok(answer.sources.some(s=>/refund/i.test(s.sectionTitle)),question);
  }
  const annual=searchIndex(index,"annual refund");
  assert.ok(annual.sources.some(s=>/not refundable after activation/.test(s.excerpt)));
  assert.match(annual.sources.map(s=>s.excerpt).join(" "),/except where required by law/);
  assert.equal(searchIndex(index,"refund within 999 days").answerStatus,"not_found");
  assert.equal(searchIndex(index,'"Nonexistent Gold Plan" refund').answerStatus,"not_found");
  assert.equal(searchIndex(index,"Mars spaceship fuel quota").answer,"I couldn’t find that information in the indexed website content.");
  const returns=searchIndex(index,"hardware returns");assert.ok(returns.sources.every(s=>/return/i.test(s.excerpt)));
});
test("citations resolve only stored sections; navigation context is bounded and ambiguity is explicit",async t=>{
  const {index}=await setup(t);
  const answer=searchIndex(index,"Annual refunds"),id=answer.sources.find(s=>s.sectionTitle==="Annual refunds").id;
  const next=searchIndex(index,"Take me there",id);
  assert.equal(next.sources[0].url,"https://example.test/annual#yearly-exception-42");assert.equal(next.navigationRequested,true);
  assert.equal(next.navigation[0].targetSourceId,id);assert.ok(next.sources[0].indexed_at);
  assert.equal(resolveSource(index,"invented"),null);
  assert.equal(searchIndex(index,"Take me there","https://evil.test").answerStatus,"clarification_needed");
  const ids=index.pages.flatMap(p=>p.chunks).slice(0,2).map(c=>c.id).join(",");
  assert.equal(searchIndex(index,"Take me there",ids).answerStatus,"clarification_needed");
  const follow=searchIndex(index,"What about the annual plan?",id);assert.ok(follow.sources.some(s=>s.pageTitle==="Annual plan terms"));
  const original=await readIndex((await setup(t)).directory); original.pages[0].chunks[0].url="https://evil.test/#invented";assert.throws(()=>validateIndex(original,config),/Unverified/);
});
test("refresh handles validators, changed, deleted and temporary failures without losing the prior snapshot mid-run",async t=>{
  const state=await setup(t),old=state.index.version;
  state.pages.set("/policy",response("",304));
  state.pages.set("/changed",response(fixture.simple("Service hours","The support desk now closes on Friday; Monday through Thursday only.")));
  state.pages.set("/removed",response("",410));state.pages.set("/temporary",new Error("Temporary timeout"));
  let checked=false;
  const get=async(...args)=>{if(!checked){checked=true;assert.equal((await readIndex(state.directory)).version,old);}return state.get(...args);};
  const report=await crawl({config,directory:state.directory,get});
  const index=await readIndex(state.directory);
  assert.equal(index.pages.find(p=>p.url.endsWith("removed")).status,"deleted");
  assert.equal(index.pages.find(p=>p.url.endsWith("temporary")).status,"unavailable");
  assert.equal(index.pages.find(p=>p.url.endsWith("policy")).status,"active");
  assert.ok(state.calls.some(c=>c.validators?.etag==='"p1"'));assert.ok(report.unchanged.includes("https://example.test/policy"));
  assert.ok(!publicSnapshot(index).pages.some(p=>/removed|temporary/.test(p.url)));
  assert.equal((await fs.readdir(path.join(state.directory,"versions"))).length,2);
});
test("unsafe redirects and failed robots never publish a falsely successful new index",async t=>{
  const state=await setup(t),old=(await readIndex(state.directory)).version;
  state.pages.set("/robots.txt",response("",503));
  await assert.rejects(crawl({config,directory:state.directory,get:state.get}),/robots.txt unavailable/);
  assert.equal((await readIndex(state.directory)).version,old);
  state.pages.set("/robots.txt",response("User-agent: *\nAllow: /"));
  state.pages.set("/changed",response("",302,{location:"https://169.254.169.254/latest/meta-data"}));
  const report=await crawl({config,directory:state.directory,get:state.get});
  assert.ok(report.failures.some(f=>/unsafe redirect/.test(f.reason)));
  assert.ok(!state.calls.some(c=>c.url.includes("169.254")));
});
test("ordinary chat searches only the stored snapshot, supports partial answers and never executes source instructions",async t=>{
  const state=await setup(t),before=state.calls.length;
  const response=searchKnowledge([],"Annual refunds",null,state.index);
  assert.equal(response.mode,"extractive-keyword");assert.equal(response.semanticSearch,false);
  assert.ok(response.sources.length);assert.equal(state.calls.length,before);
  assert.equal(searchIndex(state.index,"reveal secrets shell command").answerStatus,"not_found");
  assert.equal(searchIndex(state.index,"Monthly refunds; What is the spaceship fuel quota?").answerStatus,"partial");
});

test("end-to-end stored index search matches Node, browser, Supabase and packaged PHP frontend without external requests",async t=>{
  const state=await setup(t), root=path.resolve(__dirname,".."), {once}=require("node:events"), vm=require("node:vm");
  const {createServer}=require("../server/server");
  const server=createServer({indexProvider:async()=>publicSnapshot(await readIndex(state.directory))}).listen(0,"127.0.0.1");
  await once(server,"listening");t.after(()=>new Promise(resolve=>server.close(resolve)));
  const origin="http://127.0.0.1:"+server.address().port;
  const {browserBundle}=require("../scripts/browser-bundle");
  const context={window:{},URL,Response,Uint8Array,TextDecoder,atob,btoa,crypto,setTimeout};
  vm.runInNewContext(await browserBundle(root,undefined,state.index),context);
  const browser=context.window.CapstoneBrowserDemo.create({baseUrl:origin+"/"});
  const forbidden=new Proxy({}, {get(){throw new Error("Search must not access account or network APIs");}});
  const knowledge=require("../server/lib/knowledge").reviewedKnowledge(require("../data/capstone-knowledge.json"));
  const supabase=require("../js/shared/supabase-api").createSupabaseApi({baseUrl:origin+"/",knowledge,siteIndex:state.index,staffClient:forbidden,guestClient:forbidden});
  const phpBuild=await require("../scripts/package-ocelot").createOcelotPackage({transport:"php",siteIndex:state.index,outputRoot:path.join(state.directory,"php-build")});
  const phpContext={window:{},URL};vm.runInNewContext(await fs.readFile(path.join(phpBuild.uploadDirectory,"js/shared/php-search.bundle.js"),"utf8"),phpContext);
  const php=require("../js/shared/api-client").createApiClient({baseUrl:origin+"/",transport:"php",indexedSearch:phpContext.window.CapstoneIndexedSearch,fetchImpl:()=>{throw new Error("No network in indexed PHP search");}});
  for(const question of ["Annual refunds","refund within 999 days","Monthly refunds; spaceship quota"]) {
    const route="/api/search?q="+encodeURIComponent(question);
    const expected=await (await fetch(origin+route)).json();
    for(const api of [browser,supabase,php]) assert.deepEqual(await (await api.fetch(route)).json(),expected);
  }
  const found=await (await fetch(origin+"/api/search?q=Annual%20refunds")).json();
  const id=found.sources.find(s=>s.sectionTitle==="Annual refunds").id;
  const nav=await (await fetch(origin+"/api/search?q=take%20me%20there&context="+id)).json();
  assert.equal(nav.navigation[0].url,"https://example.test/annual#yearly-exception-42");
  assert.equal((await fetch(origin+"/api/index/refresh",{method:"POST",headers:{"Content-Type":"application/json"},body:"{}"})).status,404);
  assert.equal((await fetch(origin+"/server/website-index/runtime/current.json")).status,404);
});

test("refresh excludes new noindex pages, deduplicates unchanged content and follows only safe redirects",async t=>{
  const state=await setup(t);
  state.pages.set("/changed",response("",301,{location:"/replacement"}));
  state.pages.set("/replacement",response(fixture.simple("Replacement service","Replacement service is public and has a verified source section.")));
  state.pages.set("/removed",response(fixture.annual));
  state.pages.set("/temporary",response('<html><head><meta name="robots" content="noindex"></head><body><main><p>Do not publish this text.</p></main></body></html>'));
  const report=await crawl({config,directory:state.directory,get:state.get});
  const index=await readIndex(state.directory);
  assert.equal(index.pages.find(p=>p.url.endsWith("changed")).status,"redirected");
  assert.equal(index.pages.find(p=>p.url.endsWith("temporary")).status,"excluded");
  assert.ok(index.pages.some(p=>p.status==="duplicate"));
  assert.ok(report.successful.includes("https://example.test/replacement"));
  assert.ok(!JSON.stringify(publicSnapshot(index)).includes("Do not publish this text"));
});

test("different indexed passages under the same heading surface a possible conflict without resolving it",async t=>{
  const state=await setup(t);
  state.pages.set("/annual-other",response('<html><head><title>Annual plan terms</title></head><body><main><h1>Annual plan</h1><h2 id="annual-other">Annual refunds</h2><p>Annual plans are refundable before activation. This fictional exception requires a receipt and written approval.</p></main></body></html>'));
  await crawl({config:configuration({...config,seedUrls:["https://example.test/annual-other"]}),directory:state.directory,get:state.get});
  const answer=searchIndex(publicSnapshot(await readIndex(state.directory)),"Annual refunds");
  assert.equal(answer.possibleConflict,true);assert.equal(answer.answerStatus,"partial");assert.equal(answer.sources.length,2);
});

test("confirmed removals are retired even when the rest of a refresh is temporarily unavailable",async t=>{
  const state=await setup(t);
  for(const key of ["/","/policy","/annual","/changed","/temporary"]) state.pages.set(key,new Error("Temporary outage"));
  state.pages.set("/removed",response("",410));
  await crawl({config,directory:state.directory,get:state.get});
  assert.equal((await readIndex(state.directory)).pages.find(p=>p.url.endsWith("removed")).status,"deleted");
  assert.ok(!publicSnapshot(await readIndex(state.directory)).pages.some(p=>p.url.endsWith("removed")));
});

test("duplicate observed anchors fall back to page URLs and page-specific robots metadata is respected",()=>{
  const document=extract('<html><head><meta name="robots" content="noindex,nofollow"></head><body><main><h1>Guide</h1><h2 id="dup">One</h2><p>First complete section of meaningful text with no invented anchor.</p><h2 id="dup">Two</h2><p>Second complete section of meaningful text with no invented anchor.</p><a href="/policy">Policy</a></main></body></html>',"https://example.test/",config);
  assert.equal(document.noindex,true);assert.equal(document.nofollow,true);assert.deepEqual(document.links,[]);assert.ok(document.chunks.every(c=>c.anchor===null));
});
