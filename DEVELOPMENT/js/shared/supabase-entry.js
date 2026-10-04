const { createClient } = require("@supabase/supabase-js");
const { createSupabaseApi } = require("./supabase-api");
const { createStaffSessionStorage } = require("./staff-session-storage");
const { reviewedKnowledge } = require("../../server/lib/knowledge");
const knowledge = reviewedKnowledge(require("../../data/capstone-knowledge.json"));
const config = CAPSTONE_SUPABASE_CONFIG; // Public-only values injected by the packager.
window.CapstoneSupabase = { create: options => {
  const scope = new URL(options.baseUrl).pathname;
  const recoveryPage = /\/pages\/recover\.html$/.test(window.location.pathname);
  const storageKey = role => "capstone-supabase:"+config.url+":"+scope+":"+role;
  const browserStorage = name => { try { return window[name]; } catch { return undefined; } };
  const staffSessions = createStaffSessionStorage({ key:storageKey("staff"),
    tabStorage:browserStorage("sessionStorage"), persistentStorage:browserStorage("localStorage") });
  // A recovery link must never inherit or create a seven-day remembered login.
  // It starts a fresh tab-only session and is signed out after a confirmed update.
  if (recoveryPage) staffSessions.beginLogin();
  // Keep requester sessions tab-scoped even if the browser blocks Web Storage.
  const guestMemory = new Map();
  const guestStorage = browserStorage("sessionStorage") || {
    getItem:key => guestMemory.get(key) ?? null,
    setItem:(key, value) => guestMemory.set(key, value),
    removeItem:key => guestMemory.delete(key)
  };
  const client = role => createClient(config.url, config.publishableKey, { auth: {
    storageKey:storageKey(role),
    storage:role === "staff" ? staffSessions.storage : guestStorage, persistSession:true, autoRefreshToken:true,
    detectSessionInUrl:role === "staff" && recoveryPage
  } });
  window.addEventListener("focus", () => staffSessions.check());
  window.addEventListener("pageshow", () => staffSessions.check());
  window.addEventListener("storage", event => { if (event.key === null || event.key === staffSessions.rememberedKey) staffSessions.check(); });
  const staffClient = client("staff");
  const recoveryState = recoveryPage ? { session:null } : null;
  if (recoveryState) recoveryState.ready = new Promise(resolve => {
    recoveryState.resolve = resolve;
    window.setTimeout(resolve, 2000);
  });
  if (recoveryState) staffClient.auth.onAuthStateChange((event, session) => {
    if (event === "PASSWORD_RECOVERY") { recoveryState.session = session || null; recoveryState.resolve(); }
    if (event === "SIGNED_OUT") recoveryState.session = null;
  });
  return createSupabaseApi({ ...options,staffClient,guestClient:client("requester"),staffSessions,recoveryState,knowledge,siteIndex:CAPSTONE_WEBSITE_INDEX });
} };
