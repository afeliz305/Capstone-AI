"use strict";
const { normalizeContact } = require("./contact-policy");
const policy = require("./attachment-policy");
const { searchKnowledge } = require("../../server/lib/search");

const fail = (message, statusCode = 400) => Object.assign(new Error(message), { statusCode });
const reply = (data, status = 200) => new Response(JSON.stringify(data), { status, headers: { "Content-Type": "application/json" } });
const setupError = "Supabase database setup is not complete. Ask the project owner to follow SUPABASE_SETUP.md. No save was confirmed.";
function serviceError(error) {
  if (!error) return;
  if (["PGRST202", "PGRST205", "42P01", "42883"].includes(error.code)) throw fail(setupError, 503);
  if (/^PT\d{3}$/.test(error.code || "")) throw fail(error.message, Number(error.code.slice(2)));
  if (["42501", "PGRST301", "PGRST303"].includes(error.code)) throw fail("Unauthorized access. Sign in with your provisioned staff account.", 403);
  throw fail("Supabase could not complete the operation. Check your connection and account setup. No success was confirmed; keep your draft and retry without changing it.", 503);
}

async function filesFor(input) {
  const files = input ?? [];
  const error = policy.validate(files);
  if (error) throw fail(error);
  return Promise.all(files.map(async file => {
    if (typeof file.data !== "string" || file.data.length !== Math.ceil(file.size / 3) * 4 || /[^A-Za-z0-9+/=]/.test(file.data)) throw fail("Invalid document encoding.");
    const binary = atob(file.data);
    if (binary.length !== file.size || btoa(binary) !== file.data) throw fail("Document size does not match its contents.");
    const bytes = Uint8Array.from(binary, c => c.charCodeAt(0));
    const ext = policy.extension(file.name);
    if (ext === "pdf" && !binary.startsWith("%PDF-")) throw fail("The PDF header is invalid.");
    if (ext === "docx" && (!binary.startsWith("PK\u0003\u0004") || !binary.includes("[Content_Types].xml") || !binary.includes("word/document.xml"))) throw fail("Select a valid DOCX document.");
    if (ext === "txt") {
      try { if (binary.includes("\0")) throw new Error(); new TextDecoder("utf-8", { fatal: true }).decode(bytes); }
      catch { throw fail("Text documents must contain UTF-8 text."); }
    }
    const digest = await crypto.subtle.digest("SHA-256", bytes);
    return { bytes, name: file.name, size: file.size, type: policy.types[ext], sha256: Array.from(new Uint8Array(digest), b => b.toString(16).padStart(2,"0")).join("") };
  }));
}

function createSupabaseApi({ baseUrl, staffClient, guestClient, knowledge, staffSessions, uuid = () => crypto.randomUUID() }) {
  const base = new URL(baseUrl);
  const pending = new Map(); // In-memory idempotency IDs, not ticket persistence.
  let guestStart;
  let changingPassword = false;
  function routeUrl(route) {
    if (!/^\/api\//.test(route)) throw fail("Invalid API route.");
    const target = new URL(route.slice(1), base);
    if (target.origin !== base.origin || !target.pathname.startsWith(base.pathname + "api/")) throw fail("Invalid API route.");
    return target;
  }
  async function rpc(client, name, args = {}) {
    const result = await client.rpc(name, args);
    serviceError(result.error);
    return result.data;
  }
  async function staffSession() {
    const { data, error } = await staffClient.auth.getSession(); serviceError(error);
    if (!data.session) throw fail("Sign in with your staff email and password.", 401);
    return rpc(staffClient, "capstone_staff_session");
  }
  async function requester() {
    // One anonymous Auth session, created only when the user submits a form.
    if (!guestStart) guestStart = (async () => {
      let result = await guestClient.auth.getSession(); serviceError(result.error);
      if (!result.data.session) {
        result = await guestClient.auth.signInAnonymously();
        if (result.error) throw fail("Requester sign-in is unavailable. The owner must enable Supabase Anonymous Sign-Ins for this test project. No ticket was confirmed.", 503);
      }
      return result.data.session;
    })().finally(() => { guestStart = null; });
    return guestStart;
  }
  async function changePassword(input) {
    if (changingPassword) throw fail("A password change is already in progress.", 409);
    const { currentPassword, newPassword, confirmPassword } = input;
    if (typeof currentPassword !== "string" || !currentPassword || currentPassword.length > 128) throw fail("Enter your current password.");
    if (typeof newPassword !== "string" || newPassword.length < 8 || newPassword.length > 128 || !newPassword.trim()) throw fail("Use a new password with 8–128 characters.");
    if (newPassword !== confirmPassword) throw fail("The new passwords do not match.");
    if (newPassword === currentPassword) throw fail("Choose a new password different from your current password.");
    changingPassword = true;
    try {
      const session = await staffSession(); // Verify active, provisioned staff before any credential write.
      const auth = await staffClient.auth.getSession(); serviceError(auth.error);
      const userId = auth.data.session?.user.id;
      if (!userId) throw fail("Your session has ended. Sign in again.", 401);
      // A fresh sign-in verifies the current password even when the hosted
      // 'require current password' setting is off. Never accept a target email/ID.
      const verified = await staffClient.auth.signInWithPassword({ email:session.staff.email, password:currentPassword });
      if (verified.error) {
        if (verified.error.code === "invalid_credentials") throw fail("Your current password is incorrect.");
        if (verified.error.status === 429) throw fail("Too many attempts. Wait a few minutes before trying again.", 429);
        throw fail("Could not verify your current password. No password change was attempted. Check your connection and try again.", 503);
      }
      if (verified.data?.user?.id !== userId) {
        await staffClient.auth.signOut({ scope:"local" });
        throw fail("Your account changed. Sign in again before changing your password.", 401);
      }
      await staffSession(); // The fresh identity must still be bound to active staff.
      const result = await staffClient.auth.updateUser({ password:newPassword, current_password:currentPassword });
      if (result.error) {
        const messages = {
          weak_password:"Choose a stronger password that meets this project's password requirements.",
          same_password:"Choose a new password different from your current password.",
          current_password_mismatch:"Your current password is incorrect.",
          current_password_required:"Enter your current password.",
          reauthentication_needed:"Sign out and sign in again, then retry the password change.",
          session_not_found:"Your session has ended. Sign in again.",
          user_not_found:"Your session has ended. Sign in again."
        };
        if (result.error.status === 429) throw fail("Too many attempts. Wait a few minutes before trying again.", 429);
        if (messages[result.error.code]) throw fail(messages[result.error.code], ["session_not_found","user_not_found"].includes(result.error.code) ? 401 : 400);
        throw fail("No password change was confirmed. Check your connection, then try signing in with your new password before retrying.", 503);
      }
      if (result.data?.user?.id !== userId) throw fail("No password change was confirmed. Try signing in with your new password before retrying.", 503);
      return { ok:true };
    } catch (error) {
      if (error.statusCode) throw error;
      throw fail("No password change was confirmed. Check your connection, then try signing in with your new password before retrying.", 503);
    } finally { changingPassword = false; }
  }
  async function submit(input, staffCreated) {
    const files = await filesFor(input.attachments);
    const session = staffCreated ? await staffSession() : null;
    const client = staffCreated ? staffClient : guestClient;
    if (!staffCreated && input.identityContext !== "supabase-requester-v1") throw fail("Reopen the support form before submitting.", 409);
    const auth = staffCreated ? (await client.auth.getSession()).data.session : await requester();
    const email = staffCreated ? session.staff.email : input.email;
    const contact = normalizeContact(input, email);
    const payload = { ...input, contactPhone: contact.method === "phone" ? contact.value : "",
      attachments: files.map(({ bytes, ...meta }) => meta) };
    const signature = JSON.stringify([auth.user.id, staffCreated, payload]);
    if (!pending.has(signature)) pending.set(signature, uuid());
    const plan = await rpc(client, "capstone_submit", { input: payload, request_id: pending.get(signature), staff_created: staffCreated });
    if (!/^CAP-\d+$/.test(plan?.id) || !Array.isArray(plan.attachments) || plan.attachments.length !== files.length) throw fail("No valid upload plan was returned.", 503);
    if (!plan.complete) {
      for (let index=0; index<files.length; index++) {
        const file = files[index], entry = plan.attachments[index];
        const expectedPath = auth.user.id + "/" + plan.id + "/" + entry.id;
        if (entry.path !== expectedPath || entry.name !== file.name || entry.size !== file.size || entry.type !== file.type) throw fail("The attachment plan does not match this draft.", 409);
        const bucket = client.storage.from("capstone-attachments");
        const { error } = await bucket.upload(entry.path, file.bytes, { contentType: file.type, upsert: false });
        if (error) {
          // A previous upload may have committed before its response was lost.
          // Verify exact bytes; never overwrite an existing object or finalize a mismatch.
          const existing = await bucket.download(entry.path);
          if (existing.error || !existing.data) serviceError(error);
          const bytes = new Uint8Array(await existing.data.arrayBuffer());
          if (bytes.length !== file.bytes.length || bytes.some((value,i) => value !== file.bytes[i])) throw fail("The stored document differs from this draft. Contact the project owner.", 409);
        }
      }
    }
    const saved = await rpc(client, "capstone_finalize", { ticket_id: plan.id });
    if (saved?.id !== plan.id) throw fail("No valid saved-ticket receipt was returned.", 503);
    pending.delete(signature);
    return saved;
  }
  async function request(route, options = {}) {
    try {
      const target = routeUrl(route), pathname = "/" + target.pathname.slice(base.pathname.length);
      const method = options.method || "GET";
      const input = options.body ? JSON.parse(options.body) : {};
      if (!input || typeof input !== "object" || Array.isArray(input)) throw fail("Invalid request.");
      if (changingPassword && method === "POST" && ["/api/staff/login","/api/staff/logout"].includes(pathname)) throw fail("Wait for the password change to finish.", 409);
      if (method === "GET" && pathname === "/api/health") return reply(await rpc(guestClient,"capstone_health"));
      if (method === "GET" && pathname === "/api/search") {
        const question=(target.searchParams.get("q")||"").trim().slice(0,500);
        if (!question) throw fail("A question is required.");
        return reply({ question, ...searchKnowledge(knowledge,question,target.searchParams.get("context")) });
      }
      if (method === "GET" && pathname === "/api/session") return reply({ status:"guest",account:null,identityContext:"supabase-requester-v1",demoAvailable:false });
      if (method === "POST" && pathname === "/api/staff/login") {
        await staffClient.auth.signOut({ scope:"local" });
        staffSessions?.beginLogin();
        if (typeof input.email!=="string" || typeof input.password!=="string" || !input.password) throw fail("Enter your staff email and password.",401);
        try {
          const result = await staffClient.auth.signInWithPassword({ email:input.email.trim().toLowerCase(), password:input.password });
          if (result.error) throw fail("Sign-in failed. Check your Supabase staff account email and password.",401);
          const session = await staffSession(); // Never remember an unprovisioned account.
          if (input.rememberMe === true && staffSessions) {
            try { session.rememberedUntil = staffSessions.remember(); }
            catch (error) { throw fail(error.message, 409); }
          }
          return reply(session);
        } catch(error) {
          try { await staffClient.auth.signOut({ scope:"local" }); }
          finally { staffSessions?.clear(); }
          throw error;
        }
      }
      if (method === "POST" && pathname === "/api/staff/logout") {
        let result;
        try { result=await staffClient.auth.signOut({ scope:"local" }); }
        catch { result={ error:true }; }
        finally { staffSessions?.clear(); pending.clear(); }
        if (!staffSessions) serviceError(result.error);
        return reply({ ok:true, ...(result.error ? { warning:"Signed out on this browser. Supabase could not confirm server-side sign-out; reconnect before using a shared computer." } : {}) });
      }
      if (method === "GET" && pathname === "/api/staff/session") return reply(await staffSession());
      if (method === "POST" && pathname === "/api/staff/password") return reply(await changePassword(input));
      if (method === "POST" && ["/api/tickets","/api/staff/tickets"].includes(pathname)) return reply(await submit(input,pathname.includes("/staff/")),201);
      await staffSession();
      if (method === "GET" && pathname === "/api/tickets") return reply(await rpc(staffClient,"capstone_list"));
      const match=pathname.match(/^\/api\/tickets\/(CAP-\d+)(?:\/(work|requester-preview|attachments\/([a-f0-9-]{36})))?$/);
      if (!match) throw fail("Endpoint not found.",404);
      if (method === "PATCH" && (!match[2] || match[2] === "work")) return reply(await rpc(staffClient,"capstone_work",{ ticket_id:match[1],input,quick:!match[2] }));
      if (method === "GET" && match[3]) {
        const result = await staffClient.from("capstone_attachments").select("path,name").eq("ticket_id",match[1]).eq("id",match[3]).single();
        serviceError(result.error);
        if (!result.data) throw fail("Document not found.",404);
        const file = await staffClient.storage.from("capstone-attachments").download(result.data.path); serviceError(file.error);
        return new Response(file.data,{ headers:{"Content-Type":"application/octet-stream"} });
      }
      if (method === "GET" && (!match[2] || match[2] === "requester-preview")) return reply(await rpc(staffClient,match[2] ? "capstone_requester_preview" : "capstone_get",{ ticket_id:match[1] }));
      throw fail("Unsupported operation.",405);
    } catch(error) {
      return reply({ error:error.statusCode ? error.message : "Supabase request failed. No success was confirmed; keep your draft and check the queue before retrying.",loginMode:"password" },error.statusCode||503);
    }
  }
  async function download(route, filename) {
    const response=await request(route);
    if (!response.ok) throw new Error((await response.json()).error);
    const href=URL.createObjectURL(await response.blob()), link=document.createElement("a");
    link.href=href; link.download=filename; document.body.append(link); link.click(); link.remove();
    setTimeout(()=>URL.revokeObjectURL(href),60000);
  }
  return { baseUrl:base.href,storageMode:"supabase",onSessionEnded:staffSessions?.onEnded,url:route=>{routeUrl(route);return "#private-document";},fetch:request,readJson:response=>response.json(),download };
}
module.exports={createSupabaseApi,filesFor};
