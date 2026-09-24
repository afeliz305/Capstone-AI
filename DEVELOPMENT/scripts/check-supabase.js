// Read-only preparation check. This is NOT an application ticket transport.
const fs = require("node:fs/promises");
const path = require("node:path");

function validateConfig(config) {
  const url = new URL(config.url);
  if (url.protocol !== "https:" || !/^[a-z0-9]{20}\.supabase\.co$/.test(url.hostname)
    || url.port || url.username || url.password || url.search || url.hash || url.pathname !== "/") {
    throw new Error("Use the HTTPS project URL ending in .supabase.co, without a path or credentials.");
  }
  if (typeof config.publishableKey !== "string" || !/^sb_publishable_[A-Za-z0-9_-]+$/.test(config.publishableKey)) {
    throw new Error("Only an sb_publishable_ key is accepted. Never use a secret, service-role key, or password here.");
  }
  return { url: url.origin, publishableKey: config.publishableKey };
}

async function checkSupabase(config, { fetchImpl = fetch } = {}) {
  const { url, publishableKey } = validateConfig(config);
  async function get(route) {
    try {
      const response = await fetchImpl(url + route, {
        method: "GET", headers: { apikey: publishableKey, Accept: "application/json" },
        redirect: "error", signal: AbortSignal.timeout(8000),
      });
      if (!(response.headers.get("content-type") || "").includes("application/json")) {
        return { status: response.status, failure: "non-json" };
      }
      return { status: response.status, ok: response.ok, data: await response.json() };
    } catch {
      // Never log response bodies, keys, user records, or raw request exceptions.
      return { failure: "connection" };
    }
  }
  const auth = await get("/auth/v1/settings");
  if (!auth.ok) {
    return { project: url, connection: "not_verified", httpStatus: auth.status,
      reason: auth.failure || "request_rejected", ticketWriteTest: "not_run" };
  }
  // limit=0 requests table metadata without reading existing ticket records.
  const table = await get("/rest/v1/capstone_tickets?select=id&limit=0");
  const tableState = table.ok ? "reachable_not_write_verified"
    : table.data?.code === "PGRST205" ? "not_available_in_api"
    : table.status === 401 || table.status === 403 ? "access_not_verified"
    : "not_verified";
  const health = table.ok ? await get("/rest/v1/rpc/capstone_health") : null;
  const schemaReady = health?.ok && health.data?.schemaVersion === 1 && health.data?.privateAttachments === true;
  return {
    project: url, connection: "publishable_key_accepted",
    emailSignInEnabled: auth.data.external?.email === true,
    anonymousSignInEnabled: auth.data.external?.anonymous_users === true,
    ticketTable: tableState, tableHttpStatus: table.status,
    schemaReady: Boolean(schemaReady),
    readyForLiveTest: Boolean(schemaReady && auth.data.external?.anonymous_users === true),
    ticketWriteTest: "not_run",
  };
}

async function main() {
  let config;
  try {
    config = JSON.parse(await fs.readFile(path.resolve(__dirname, "../server/supabase.local.json"), "utf8"));
  } catch {
    console.error("Create server/supabase.local.json from server/supabase.example.json and enter only the project URL and publishable key. See docs/SUPABASE_SETUP.md.");
    process.exitCode = 1;
    return;
  }
  try {
    const result = await checkSupabase(config);
    console.log(JSON.stringify(result, null, 2));
    console.log("Read-only check: no accounts, tickets, attachments, tables, or policies were created or changed.");
    console.log("This helper does not perform a ticket-saving test. Schema readiness is not proof of successful writes or staff provisioning.");
    process.exitCode = result.connection !== "publishable_key_accepted" ? 1
      : !result.readyForLiveTest ? 2 : 0;
  } catch {
    console.error("Invalid Supabase configuration. Use only the HTTPS project URL and an sb_publishable_ key; see docs/SUPABASE_SETUP.md.");
    process.exitCode = 1;
  }
}
if (require.main === module) main();
module.exports = { checkSupabase, validateConfig };
