const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs/promises");
const os = require("node:os");
const path = require("node:path");
const { buildCloudflarePackage, manifestFor, assertPublicPackage } = require("../scripts/package-cloudflare");
const { loadReleaseIndex } = require('../scripts/release-index');

test('release index rejects missing or changed content and equals the approved public snapshot', async (t) => {
  const root = path.resolve(__dirname, '..');
  const approved = await loadReleaseIndex(root);
  const local = await require('../server/website-index/store').loadPublicIndex(root);
  if (local) assert.deepEqual(approved, local);
  const isolated = await fs.mkdtemp(path.join(os.tmpdir(), 'mira-index-integrity-'));
  t.after(() => fs.rm(isolated, { recursive: true, force: true }));
  await assert.rejects(loadReleaseIndex(isolated), /ENOENT/);
  await fs.mkdir(path.join(isolated, 'knowledge'));
  await fs.writeFile(path.join(isolated, 'knowledge/public-index.json'), JSON.stringify({ ...approved, pages: [] }) + '\n');
  await assert.rejects(loadReleaseIndex(isolated), /checksum mismatch/);
});

test("Cloudflare preview package is deterministic, Supabase-compatible, and public-only", async (t) => {
  const output = await fs.mkdtemp(path.join(os.tmpdir(), "mira-cloudflare-test-"));
  t.after(() => fs.rm(output, { recursive: true, force: true }));
  const options = { outputRoot: output, supabaseConfig: { url: "https://abcdefghijklmnopqrst.supabase.co", publishableKey: "sb_publishable_test_value", recoveryUrl: "https://mira-preview.pages.dev/pages/recover.html" } };
  const first = await buildCloudflarePackage(options);
  const second = await buildCloudflarePackage(options);
  assert.deepEqual(first.manifest, second.manifest);
  assert.deepEqual(await manifestFor(first.directory), first.manifest);
  const files = await assertPublicPackage(first.directory);
  assert.ok(files.includes("_headers"));
  assert.ok(files.includes("404.html"));
  assert.ok(files.includes("pages/recover.html"));
  assert.ok(files.includes("js/shared/team-workspace.js"));
  assert.ok(!files.some((file) => /(?:server|functions|test|tickets\.json|supabase\.local)/i.test(file)));
  const headers = await fs.readFile(path.join(first.directory, "_headers"), "utf8");
  assert.match(headers, /connect-src 'self' https:\/\/abcdefghijklmnopqrst\.supabase\.co/);
  assert.match(headers, /\/pages\/recover.html\n  Cache-Control: no-store/);
  assert.match(headers, /\/pages\/recover\n  Cache-Control: no-store/);
});

test("Cloudflare packaging uses reviewed knowledge even with no local runtime index", async (t) => {
  const output = await fs.mkdtemp(path.join(os.tmpdir(), "mira-missing-index-"));
  const previous = process.env.CAPSTONE_INDEX_DIR;
  process.env.CAPSTONE_INDEX_DIR = path.join(output, "absent");
  t.after(async () => {
    if (previous === undefined) delete process.env.CAPSTONE_INDEX_DIR;
    else process.env.CAPSTONE_INDEX_DIR = previous;
    await fs.rm(output, { recursive: true, force: true });
  });
  const built = await buildCloudflarePackage({ outputRoot: output, supabaseConfig: { url: "https://abcdefghijklmnopqrst.supabase.co", publishableKey: "sb_publishable_test_value", recoveryUrl: "https://mira-preview.pages.dev/pages/recover.html" } });
  assert.ok(built.manifest.find(x => x.file === 'js/shared/supabase.bundle.js').bytes > 1000000);
});
