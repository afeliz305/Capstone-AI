const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs/promises");
const os = require("node:os");
const path = require("node:path");
const { buildCloudflarePackage, manifestFor, assertPublicPackage } = require("../scripts/package-cloudflare");

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
});
