const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const { healthUrl, validateAccount, checkHealth, sshArguments, run } = require("../scripts/ocelot-setup");

const healthy = () => new Response(JSON.stringify({ status: "ok", backend: "php", storage: "private-files" }), { headers: { "content-type": "application/json" } });
const blocked = () => new Response(JSON.stringify({ error: "Ocelot cannot create private ticket storage outside public_html." }), { status: 503, headers: { "content-type": "application/json" } });
const neverSpawn = () => { throw new Error("Unexpected SSH call"); };
const quiet = () => {};

test("Ocelot URLs and SSH targets accept usernames only", () => {
  assert.equal(validateAccount("afeli016"), "afeli016");
  assert.equal(healthUrl("afeli016"), "https://ocelot.aul.fiu.edu/~afeli016/Capstone%20-%20AI/api/index.php?route=%2Fhealth");
  for (const input of ["", "-oProxyCommand=x", "a;touch x", "a'", "../a", "a@evil.com", "a\nsh", "a b", "a".repeat(33)]) {
    assert.throws(() => healthUrl(input));
    assert.throws(() => sshArguments(input));
  }
});

test("health check requires successful PHP private-storage JSON and uses no credentials", async () => {
  const result = await checkHealth("afeli016", async (url, options) => {
    assert.equal(url, healthUrl("afeli016"));
    assert.equal(options.redirect, "error");
    assert.ok(options.signal);
    assert.deepEqual(options.headers, { Accept: "application/json" });
    return healthy();
  });
  assert.equal(result.ok, true);
});

test("HTML, malformed JSON, unrelated JSON, redirects and network failure cannot report success", async () => {
  const variants = [
    () => new Response("<!DOCTYPE html>", { status: 404, headers: { "content-type": "text/html" } }),
    () => new Response("not JSON", { headers: { "content-type": "application/json" } }),
    () => new Response('{"status":"ok","backend":"node"}', { headers: { "content-type": "application/json" } }),
    () => new Response('{"status":"ok","backend":"php","storage":"private-files"}', { status: 500, headers: { "content-type": "application/json" } }),
    () => { throw new Error("fetch failed"); }
  ];
  for (const variant of variants) assert.equal((await checkHealth("afeli016", variant)).ok, false);
});

test("SSH executes only the reviewed fixed script without password or host-key bypass", () => {
  const args = sshArguments("afeli016");
  assert.ok(args.includes("StrictHostKeyChecking=ask"));
  assert.equal(args.at(-2), "afeli016@ocelot.aul.fiu.edu");
  const encoded = args.at(-1).match(/^printf %s '([A-Za-z0-9+/=]+)' \| base64 -d \| sh$/)[1];
  assert.equal(Buffer.from(encoded, "base64").toString(), fs.readFileSync(path.join(__dirname, "../scripts/ocelot-private-setup.sh"), "utf8").replace(/\r\n/g, "\n"));
  assert.ok(!Buffer.from(encoded, "base64").toString().includes("\r"), "Windows checkout line endings are normalized for sh");
  assert.doesNotMatch(args.join(" "), /StrictHostKeyChecking=no|password=|UserKnownHostsFile|BatchMode/);
});

test("private-folder preparation is non-recursive, rejects links, and leaves existing storage unchanged", () => {
  const script = fs.readFileSync(path.join(__dirname, "../scripts/ocelot-private-setup.sh"), "utf8");
  assert.match(script, /account_dir=\$\(pwd -P\)/);
  assert.match(script, /if \[ -L "\$private_dir" \]/);
  assert.match(script, /stat -c %u/);
  assert.match(script, /stat -c %a/);
  assert.match(script, /mkdir -m 700 -- "\$private_dir"/);
  assert.doesNotMatch(script, /^\s*(?:chmod|rm|mv|cp|chown)\b/m);
  assert.doesNotMatch(script, /state\.json|state\.lock|attachments\/|mkdir -p/);
  assert.ok(script.indexOf('if [ -e "$private_dir" ]') < script.indexOf("mkdir -m 700"));
});

test("healthy deployments never request SSH setup", async () => {
  assert.equal(await run({ fetchImpl: healthy, spawn: neverSpawn, ask: () => { throw new Error("Unexpected prompt"); }, log: quiet }), 0);
});

test("check-only mode never connects or prepares storage via SSH", async () => {
  const logs = [];
  assert.equal(await run({ checkOnly: true, fetchImpl: blocked, spawn: neverSpawn, log: text => logs.push(text) }), 1);
  assert.match(logs.join("\n"), /ocelot:setup/);
});

test("unrelated backend errors do not offer a filesystem change", async () => {
  assert.equal(await run({ fetchImpl: () => new Response("missing", { status: 404 }), spawn: neverSpawn, ask: () => { throw new Error("Unexpected prompt"); }, log: quiet }), 1);
});

test("declining the setup preserves the remote server", async () => {
  for (const answer of ["", "   ", "no", "NO", "y", "yes please", "yess"]) {
    assert.equal(await run({ fetchImpl: blocked, ask: async () => answer, spawn: neverSpawn, log: quiet }), 1);
  }
});

test("yes in any capitalization confirms setup and rechecks actual web PHP access", async () => {
  for (const answer of ["yes", "YES", "Yes", "yEs", "  yes  "]) {
    let checks = 0;
    let sshCalls = 0;
    assert.equal(await run({ fetchImpl: () => ++checks === 1 ? blocked() : healthy(), ask: async question => {
      assert.match(question, /any capitalization/);
      assert.match(question, /Enter to cancel/);
      return answer;
    }, log: quiet, spawn: (command, args, options) => {
      sshCalls++;
      assert.match(command, /^ssh(?:\.exe)?$/);
      assert.deepEqual(args, sshArguments("afeli016"));
      assert.deepEqual(options, { stdio: "inherit", shell: false });
      return { status: 0 };
    } }), 0);
    assert.equal(checks, 2);
    assert.equal(sshCalls, 1);
  }
});

test("SSH success is not reported as a working website if PHP is still blocked", async () => {
  const logs = [];
  assert.equal(await run({ fetchImpl: blocked, ask: async () => "YES", spawn: () => ({ status: 0 }), log: text => logs.push(text) }), 1);
  assert.match(logs.join("\n"), /request@cs\.fiu\.edu/);
  assert.doesNotMatch(logs.join("\n"), /Storage check passed/);
});

test("missing SSH or failed authentication stops without retry or false success", async () => {
  for (const result of [{ error: { code: "ENOENT" } }, { status: 255 }]) {
    let calls = 0;
    assert.equal(await run({ fetchImpl: blocked, ask: async () => "YES", spawn: () => { calls++; return result; }, log: quiet }), 1);
    assert.equal(calls, 1);
  }
});
