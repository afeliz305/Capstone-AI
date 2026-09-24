const { createClient } = require("@supabase/supabase-js");
const { createSupabaseApi } = require("./supabase-api");
const knowledge = require("../../data/capstone-knowledge.json");
const config = CAPSTONE_SUPABASE_CONFIG; // Public-only values injected by the packager.
window.CapstoneSupabase = { create: options => {
  const scope = new URL(options.baseUrl).pathname;
  const client = role => createClient(config.url, config.publishableKey, { auth: {
    storageKey:"capstone-supabase:"+config.url+":"+scope+":"+role,
    storage:window.sessionStorage, persistSession:true, autoRefreshToken:true, detectSessionInUrl:false
  } });
  return createSupabaseApi({ ...options,staffClient:client("staff"),guestClient:client("requester"),knowledge });
} };
