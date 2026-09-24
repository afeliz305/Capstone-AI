const fs = require("node:fs/promises");
const path = require("node:path");
const { STAFF } = require("../server/lib/staff-auth");

// Explicit, dependency-free bundle: only reviewed knowledge and pure app code.
// Never reads runtime tickets, passwords, sessions, or stored attachments.
async function browserBundle(root, readSource = file => fs.readFile(path.join(root, file))) {
  const sources = {
    "./browser-api": "js/shared/browser-api.js", "./browser-store": "js/shared/browser-store.js",
    "./search": "server/lib/search.js", "./keyword-links": "server/lib/keyword-links.js",
    "./ticket-work": "server/lib/ticket-work.js",
    "./contact-policy": "js/shared/contact-policy.js", "./attachment-policy": "js/shared/attachment-policy.js"
  };
  const modules = [];
  for (const [id, file] of Object.entries(sources)) modules.push(JSON.stringify(id) + ": function(module, exports, require) {\n" + await readSource(file) + "\n}");
  const knowledge = JSON.parse(await readSource("data/capstone-knowledge.json"));
  return `(function () { "use strict";
const modules = {${modules.join(",\n")}};
const STAFF = ${JSON.stringify(STAFF)};
const normalizeEmail = email => typeof email === "string" ? email.trim().toLowerCase() : "";
const cache = { "./staff-auth": { STAFF, normalizeEmail, memberFor: email => STAFF.find(member => member.email === normalizeEmail(email)) },
  "node:crypto": {
    randomUUID: () => crypto.randomUUID(),
    // Browser-only save deduplication compares complete serialized inputs. This
    // is NOT a cryptographic hash, credential, or authorization mechanism.
    createHash: () => ({ update: input => ({ digest: () => "browser-input:" + input }) })
  }
};
function require(id) { if (!Object.hasOwn(cache, id)) { if (!Object.hasOwn(modules, id)) throw new Error("Unknown demo module"); const module = { exports: {} }; modules[id](module, module.exports, require); cache[id] = module.exports; } return cache[id]; }
window.CapstoneBrowserDemo = { create: options => {
  let indexedDB, sessionStorage;
  try { indexedDB = window.indexedDB; } catch { /* API reports unavailable storage, without network fallback */ }
  try { sessionStorage = window.sessionStorage; } catch { /* Sign-in reports blocked session storage */ }
  return require("./browser-api").createBrowserApi({ ...options, knowledge: ${JSON.stringify(knowledge)}, indexedDB, sessionStorage });
} };
})();\n`;
}
module.exports = { browserBundle };
