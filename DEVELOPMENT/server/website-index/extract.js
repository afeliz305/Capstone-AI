"use strict";
const cheerio = require("cheerio");
const { createHash } = require("node:crypto");
const { normalizeUrl } = require("./policy");
const hash = value => createHash("sha256").update(value).digest("hex");
const clean = value => String(value || "").replace(/\s+/g," ").trim();
const unsafeInstruction = /(?:ignore|override|disregard).{0,60}(?:previous|system|developer|instructions)|(?:reveal|exfiltrate|print|send).{0,35}(?:secret|password|api key|token)|(?:system|assistant|developer)\s*:\s*(?:you|ignore|execute)|(?:run|execute)\s+(?:this\s+)?(?:shell|command|tool)|<\|(?:im_start|system)/i;
function extract(html, url, config) {
  const $ = Buffer.isBuffer(html) ? cheerio.loadBuffer(html) : cheerio.load(html);
  const title = clean($("title").first().text() || $("h1").first().text()).slice(0,300);
  const description = clean($('meta[name="description"]').attr("content")).slice(0,1000);
  const robots = $('meta[name="robots"],meta[name="CapstoneKnowledgeIndexer"]').map((_,e)=>$(e).attr("content")).get().join(",").toLowerCase();
  const noindex = /\b(?:noindex|none)\b/.test(robots);
  const nofollow = /\b(?:nofollow|none)\b/.test(robots);
  const canonicalHint = normalizeUrl($('link[rel="canonical"]').attr("href") || url, config, url);
  const links = [];
  $("a[href]").each((_,e) => {
    if ($(e).closest('form,[hidden],[aria-hidden="true"]').length || /\bnofollow\b/i.test($(e).attr("rel") || "")) return;
    const target = normalizeUrl($(e).attr("href"),config,url);
    if (target) links.push({ url:target, label:clean($(e).text()).slice(0,150), navigation:$(e).closest('nav,[role="navigation"]').length > 0 });
  });
  const breadcrumbs = $('[aria-label*="breadcrumb" i],.breadcrumb,.breadcrumbs').map((_,e)=>clean($(e).text())).get();
  const tags = clean($('meta[name="keywords"]').attr("content")).split(",").map(clean).filter(Boolean).slice(0,30);
  const faqs = [];
  $('script[type="application/ld+json"]').each((_,e) => {
    try {
      const parsed = JSON.parse($(e).text());
      const walk = (node, depth=0) => {
        if (depth > 8 || !node || typeof node !== "object") return;
        if (node["@type"] === "Question" && node.name && node.acceptedAnswer?.text) faqs.push([clean(cheerio.load(node.name).text()),clean(cheerio.load(node.acceptedAnswer.text).text())]);
        for (const value of Object.values(node)) if (typeof value === "object") Array.isArray(value) ? value.slice(0,100).forEach(v=>walk(v,depth+1)) : walk(value,depth+1);
      };
      walk(parsed);
    } catch { /* Invalid structured data isn't evidence. */ }
  });
  const requiresAuth = $('input[type="password"]').length > 0 || /^(?:sign in|log in|login|access denied|just a moment|verify you are human)/i.test(title);
  $('script,style,noscript,template,iframe,form,button,nav,footer,[role="navigation"],[role="contentinfo"],[hidden],[aria-hidden="true"],[data-nosnippet],.cookie-banner,.cookie-consent,#cookie-banner,.breadcrumbs,.breadcrumb').remove();
  // Prefer main/article; otherwise remove the site header, not article headers.
  let main = $("main,[role='main']").first();
  if (!main.length) main = $("article").first();
  if (!main.length) { $("body > header").remove(); main = $("body"); }
  main.find('[style*="display:none"],[style*="display: none"],[style*="visibility:hidden"],[style*="visibility: hidden"]').remove();
  const observed = new Set(); const duplicates = new Set();
  $("[id],a[name]").each((_,e) => { const id = $(e).attr("id") || $(e).attr("name"); if (observed.has(id)) duplicates.add(id); observed.add(id); });
  const verifiedAnchor = element => {
    const candidates = [element,...$(element).parentsUntil(main).toArray()];
    for (const e of candidates) {
      const id = $(e).attr("id") || ($(e).is("a") ? $(e).attr("name") : null);
      if (id && !duplicates.has(id) && id.length < 200 && !/[\u0000-\u0020]/.test(id)) return id;
    }
    return null;
  };
  const sections = []; const headings = []; const parentIntro = new Map(); let section = { heading:title || "Page", hierarchy:[], anchor:null, blocks:[] };
  function flush() {
    if (section.blocks.length) {
      const text = section.blocks.join("\n\n");
      if (text.length <= config.maxSectionChars) sections.push({ ...section, text, context:headings.slice(0,-1).map(h=>parentIntro.get(h.text)).filter(Boolean).join("\n\n") });
    }
  }
  function visit(element) {
    if (sections.length >= config.maxSectionsPerPage) return;
    if (element.type === "text") { const text = clean(element.data); if (text) section.blocks.push(text); return; }
    if (!element.name) return;
    const node = $(element), tag = element.name.toLowerCase();
    if (/^h[1-6]$/.test(tag)) {
      flush(); const level=Number(tag[1]), text=clean(node.text());
      if (!text) return;
      while (headings.length && headings[headings.length-1].level >= level) headings.pop();
      headings.push({level,text});
      section = { heading:text, hierarchy:headings.map(h=>h.text), anchor:verifiedAnchor(element), blocks:[] };
      return;
    }
    if (["p","ul","ol","table","dl","blockquote","pre","summary"].includes(tag)) {
      let text;
      if (tag === "table") text=node.find("tr").map((_,row)=>$(row).find("th,td").map((_,cell)=>clean($(cell).text())).get().join(" | ")).get().join("\n");
      else if (["ul","ol"].includes(tag)) text=node.children("li").map((_,li)=>"• "+clean($(li).text())).get().join("\n");
      else text=clean(node.text());
      if (text) { section.blocks.push(text); if (!parentIntro.has(section.heading)) parentIntro.set(section.heading,text); }
      return;
    }
    for (const child of element.children || []) visit(child);
  }
  for (const element of main.contents().toArray()) visit(element);
  flush();
  for (const [question,answer] of faqs) if (!sections.some(s=>s.text.includes(answer))) sections.push({heading:question,hierarchy:[question],anchor:null,blocks:[answer],text:answer,context:""});
  const counts = new Map();
  const chunks = sections.slice(0,config.maxSectionsPerPage).map(s => {
    const evidence = [s.context,...s.blocks].filter(Boolean).join("\n\n");
    const key = s.anchor || s.hierarchy.join(" > ") || s.heading;
    const occurrence = (counts.get(key)||0)+1; counts.set(key,occurrence);
    return { id:"section-"+hash(config.siteId+"\n"+url+"\n"+key+"\n"+occurrence).slice(0,24), heading:s.heading, hierarchy:s.hierarchy, anchor:s.anchor,
      url:url+(s.anchor ? "#"+encodeURIComponent(s.anchor) : ""), text:evidence, blocks:s.blocks, context:s.context,
      contentHash:hash(evidence), status:unsafeInstruction.test(evidence) ? "excluded" : "active", exclusionReason:unsafeInstruction.test(evidence) ? "Possible embedded instructions; manual review required." : null };
  });
  return { title,description,breadcrumbs,tags,canonicalHint,requiresAuth,noindex,nofollow,
    links:nofollow?[]:links, navigation:links.filter(l=>l.navigation), chunks,
    contentHash:hash(JSON.stringify({title,description,chunks:chunks.map(c=>[c.heading,c.anchor,c.contentHash])})),
    extractionMode:"server-html", needsRendering:!chunks.some(c=>c.text.length >= 40) };
}
function sitemap(xml) {
  const $ = cheerio.load(xml,{xml:true});
  if ($("parsererror").length || /<!ENTITY/i.test(xml)) throw new Error("Unsafe or invalid sitemap XML.");
  const nested = $("sitemapindex > sitemap > loc").map((_,e)=>clean($(e).text())).get();
  const pages = $("urlset > url").map((_,e)=>({url:clean($(e).find("loc").first().text()),lastModified:clean($(e).find("lastmod").first().text())||null})).get();
  return { nested,pages };
}
module.exports = { extract, sitemap, hash, unsafeInstruction };
