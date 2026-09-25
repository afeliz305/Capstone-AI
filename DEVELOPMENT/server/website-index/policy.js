"use strict";
const dns = require("node:dns/promises");
const https = require("node:https");
const ipaddr = require("ipaddr.js");
const defaults = require("./config.json");
const sleep = ms => new Promise(resolve => setTimeout(resolve, ms));
function configuration(input = {}) {
  const config = { ...defaults, ...input };
  if (!/^[a-z0-9][a-z0-9-]{0,50}$/.test(config.siteId)) throw new Error("Invalid site ID.");
  for (const key of ["allowedOrigins", "allowedPaths", "excludedPaths", "allowedQueryParameters", "seedUrls"]) {
    if (!Array.isArray(config[key]) || config[key].length > 100 || config[key].some(x => typeof x !== "string" || x.length > 2048)) throw new Error("Invalid " + key);
  }
  if (!config.allowedOrigins.length || config.allowedOrigins.some(origin => { const u = new URL(origin); return u.origin !== origin || u.protocol !== "https:" || u.port || u.username || u.password; })) throw new Error("Only explicit HTTPS origins on port 443 are supported.");
  if (config.allowedPaths.concat(config.excludedPaths).some(p => !p.startsWith("/") || /[?#\\%]/.test(p))) throw new Error("Paths must be plain absolute path prefixes.");
  for (const [key, min, max] of [["maxPages",1,200],["maxSitemaps",0,30],["maxDepth",0,10],["concurrency",1,4],["delayMs",0,60000],["timeoutMs",100,30000],["retries",0,3],["backoffMs",0,10000],["maxBytes",1000,4000000],["maxSectionsPerPage",1,200],["maxSectionChars",500,40000],["maxResults",1,5],["refreshHours",1,720]]) {
    if (!Number.isInteger(config[key]) || config[key] < min || config[key] > max) throw new Error("Out-of-range " + key);
  }
  for (const key of ["minScore", "minCoverage"]) if (!Number.isFinite(config[key]) || config[key] < 0.1 || config[key] > 1) throw new Error("Invalid retrieval threshold.");
  if (!/^[a-zA-Z0-9/._-]{1,100}$/.test(config.userAgent)) throw new Error("Invalid crawler agent.");
  if (!config.aliases || typeof config.aliases !== "object" || Array.isArray(config.aliases) || Object.keys(config.aliases).length > 100) throw new Error("Invalid aliases.");
  for (const [key, values] of Object.entries(config.aliases)) if (key.length > 80 || !Array.isArray(values) || values.length > 10 || values.some(x => typeof x !== "string" || x.length > 80)) throw new Error("Invalid alias values.");
  if (!normalizeUrl(config.startUrl, config, config.startUrl)) throw new Error("Start URL is outside allowed crawl scope.");
  return config;
}
function prefixMatch(path, prefix) { return prefix === "/" || path === prefix || path.startsWith(prefix.endsWith("/") ? prefix : prefix + "/"); }
function normalizeUrl(value, config, base = config.startUrl, { infrastructure = false, fragment = false } = {}) {
  try {
    if (typeof value !== "string" || value.length > 2048 || /[\u0000-\u0020\\]/.test(value)) return null;
    const url = new URL(value, base);
    if (url.protocol !== "https:" || url.username || url.password || url.port || !config.allowedOrigins.includes(url.origin)) return null;
    const decoded = decodeURIComponent(url.pathname);
    // Avoid encoded path separators, nested escapes and ambiguous server normalization.
    if (/[\\%\u0000-\u001f]/.test(decoded) || /%2f/i.test(url.pathname)) return null;
    if ((!infrastructure && !config.allowedPaths.some(p => prefixMatch(decoded,p))) || config.excludedPaths.some(p => prefixMatch(decoded.toLowerCase(),p.toLowerCase()))) return null;
    if (/\/(?:logout|signout|delete|remove|purchase|checkout|unsubscribe|activate|verify|reset-password)(?:\/|$)/i.test(decoded)) return null;
    for (const key of [...url.searchParams.keys()]) {
      if (/^(?:utm_.+|gclid|fbclid|msclkid)$/i.test(key)) url.searchParams.delete(key);
      else if (!config.allowedQueryParameters.includes(key)) return null; // Don't silently collapse content-changing queries.
    }
    url.searchParams.sort();
    if (!fragment) url.hash = "";
    return url.href;
  } catch { return null; }
}
function isPublicAddress(value) {
  try { const address = ipaddr.process(value); return address.range() === "unicast"; } catch { return false; }
}
async function safeAddresses(hostname, lookup = dns.lookup) {
  if (hostname === "localhost" || hostname.endsWith(".localhost") || hostname.endsWith(".local")) throw new Error("Unsafe destination.");
  const addresses = await lookup(hostname, { all:true, verbatim:true });
  if (!addresses.length || addresses.some(item => !isPublicAddress(item.address))) throw new Error("Destination DNS contains a non-public address.");
  return addresses;
}
// GET only, no cookie jar, no Authorization, no ambient browser session. DNS is
// checked and pinned in the socket lookup; redirects are handled by the caller.
async function publicGet(url, config, validators = {}, lookup = dns.lookup) {
  const target = new URL(url);
  let dnsTimer;
  const addresses = await Promise.race([safeAddresses(target.hostname, lookup),new Promise((_,reject)=>{dnsTimer=setTimeout(()=>reject(new Error("DNS lookup timed out.")),config.timeoutMs);})]).finally(()=>clearTimeout(dnsTimer));
  return new Promise((resolve, reject) => {
    let timer;
    const headers = { "User-Agent":config.userAgent, Accept:"text/html,application/xhtml+xml,application/xml,text/xml,text/plain", "Accept-Encoding":"identity" };
    if (validators.etag) headers["If-None-Match"] = validators.etag;
    if (validators.lastModified) headers["If-Modified-Since"] = validators.lastModified;
    const request = https.get(target, { agent:false, headers, lookup:(_host, options, callback) => {
      const first = addresses[0];
      if (options.all) callback(null, addresses); else callback(null,first.address,first.family);
    } }, response => {
      const chunks = []; let bytes = 0;
      response.on("data", chunk => {
        bytes += chunk.length;
        if (bytes > config.maxBytes) { request.destroy(new Error("Response exceeds configured size limit.")); return; }
        chunks.push(chunk);
      });
      response.on("error", reject);
      response.on("end", () => resolve({ status:response.statusCode, headers:response.headers, body:Buffer.concat(chunks) }));
    });
    timer = setTimeout(() => request.destroy(new Error("Fetch timed out.")), config.timeoutMs);
    request.on("error", reject);
    request.on("close", () => clearTimeout(timer));
  });
}
module.exports = { configuration, normalizeUrl, isPublicAddress, safeAddresses, publicGet, sleep };
