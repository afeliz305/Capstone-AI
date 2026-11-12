const fs = require('node:fs/promises');
const path = require('node:path');
const { createHash } = require('node:crypto');
const { validateIndex } = require('../server/website-index/store');
const { configuration, normalizeUrl } = require('../server/website-index/policy');
const EXPECTED = '3b6ad9ad2e48c59cfb64c12226c411c23aad8a2f6f509e5c8eae1a645b22dbe4';
async function loadReleaseIndex(root) {
  const bytes = await fs.readFile(path.join(root, 'knowledge/public-index.json'));
  // Normalize checkout line endings; the approved serialization has one final LF.
  const text = bytes.toString('utf8').replace(/\r\n/g, '\n');
  if (createHash('sha256').update(text).digest('hex') !== EXPECTED) throw new Error('Reviewed public index checksum mismatch. Review source changes before releasing.');
  const index = JSON.parse(text);
  const policy = configuration(index.scope);
  validateIndex(index, policy);
  if (index.pages.length !== 34 || index.version !== '2026-09-28T04-05-04-164Z-2df7f540') throw new Error('Required reviewed knowledge missing.');
  for (const page of index.pages) {
    if (page.status !== 'active' || !normalizeUrl(page.url, policy) || /\/portal(?:[/?#]|$)/i.test(page.url) || !Number.isFinite(Date.parse(page.indexedAt))) throw new Error('Unsupported public source provenance.');
  }
  if (/(?:sb_secret_[\w-]{16,}|sk-[\w-]{20,}|BEGIN PRIVATE KEY|eyJ[\w-]{40,}\.[\w-]{20,})/.test(text)) throw new Error('Credential-shaped public index content rejected.');
  return index;
}
module.exports = { loadReleaseIndex, EXPECTED };
