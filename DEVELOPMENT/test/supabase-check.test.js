const test = require("node:test");
const assert = require("node:assert/strict");
const { checkSupabase, validateConfig } = require("../scripts/check-supabase");
const config = { url: "https://abcdefghijklmnopqrst.supabase.co", publishableKey: "sb_publishable_fixture" };
const reply = (data, status = 200) => new Response(JSON.stringify(data), { status, headers: { "content-type": "application/json" } });

test("Supabase preparation check accepts only publishable keys and project HTTPS origins", () => {
  assert.equal(validateConfig(config).url, config.url);
  for (const url of ["http://abcdefghijklmnopqrst.supabase.co", "https://example.com", config.url + "/path", config.url + "?key=value", "https://user@abcdefghijklmnopqrst.supabase.co"]) {
    assert.throws(() => validateConfig({ ...config, url }));
  }
  for (const publishableKey of ["sb_secret_fixture", "eyJlegacy", "password", "", null]) {
    assert.throws(() => validateConfig({ ...config, publishableKey }));
  }
});

test("Supabase preparation distinguishes a valid key from unavailable ticket tables without writes", async () => {
  const calls = [];
  const result = await checkSupabase(config, { fetchImpl: async (url, options) => {
    calls.push(url); assert.equal(options.method, "GET"); assert.equal(options.redirect, "error");
    assert.equal(options.headers.apikey, config.publishableKey); assert.equal(options.body, undefined);
    return calls.length === 1 ? reply({ external: { email: true, anonymous_users: false } })
      : reply({ code: "PGRST205", message: "not available" }, 404);
  } });
  assert.equal(result.connection, "publishable_key_accepted");
  assert.equal(result.ticketTable, "not_available_in_api");
  assert.equal(result.readyForLiveTest, false); assert.equal(result.ticketWriteTest, "not_run");
  assert.equal(calls[1], config.url + "/rest/v1/capstone_tickets?select=id&limit=0");
  assert.ok(!JSON.stringify(result).includes(config.publishableKey));
});

test("Supabase preparation does not report a readable empty table as proof of write access", async () => {
  const result = await checkSupabase(config, { fetchImpl: async url => url.includes("/auth/") ? reply({ external: { email: true } }) : reply([]) });
  assert.equal(result.ticketTable, "reachable_not_write_verified");
  assert.equal(result.ticketWriteTest, "not_run");
});

test("Supabase preparation fails closed on denied requests, HTML errors, and timeouts", async () => {
  for (const fetchImpl of [async () => reply({ message: "Invalid API key" }, 401), async () => new Response("<!doctype html>", { status: 503 }), async () => { throw new Error("simulated network failure"); }]) {
    const result = await checkSupabase(config, { fetchImpl });
    assert.equal(result.connection, "not_verified"); assert.equal(result.ticketWriteTest, "not_run");
    assert.ok(!JSON.stringify(result).includes(config.publishableKey));
  }
});

test("Supabase readiness accepts private ticket tables only when the public health RPC and requester auth are ready", async () => {
  for (const status of [401, 403]) {
    const calls = [];
    const result = await checkSupabase(config, { fetchImpl: async (url, options) => {
      calls.push(url); assert.equal(options.method, "GET"); assert.equal(options.body, undefined);
      if (url.includes("/auth/")) return reply({ external: { email: true, anonymous_users: true } });
      if (url.includes("/rpc/")) return reply({ schemaVersion: 1, privateAttachments: true });
      return reply({ code: "42501" }, status);
    } });
    assert.equal(calls.length, 3);
    assert.equal(result.ticketTable, "access_not_verified");
    assert.equal(result.tableHttpStatus, status);
    assert.equal(result.healthHttpStatus, 200);
    assert.equal(result.schemaReady, true);
    assert.equal(result.readyForLiveTest, true);
    assert.equal(result.ticketWriteTest, "not_run");
  }
});

test("a denied ticket table does not mask a missing, unsafe, or unreachable schema health result", async () => {
  for (const healthReply of [() => reply({ code: "PGRST202" }, 404),
    () => reply({ schemaVersion: 1, privateAttachments: false }),
    () => reply({ schemaVersion: 2, privateAttachments: true }),
    () => new Response("<!doctype html>", { status: 502 })]) {
    const result = await checkSupabase(config, { fetchImpl: async url => {
      if (url.includes("/auth/")) return reply({ external: { email: true, anonymous_users: true } });
      return url.includes("/rpc/") ? healthReply() : reply({ code: "42501" }, 401);
    } });
    assert.equal(result.schemaReady, false);
    assert.equal(result.readyForLiveTest, false);
    assert.equal(result.ticketWriteTest, "not_run");
  }
});
