"use strict";

const REMEMBER_MS = 7 * 24 * 60 * 60 * 1000;

// Supabase-compatible storage. Only an explicitly verified staff login may
// promote a tab session into a remembered session. Passwords never enter here.
// This is a browser-side convenience deadline, not a server security boundary.
function createStaffSessionStorage({ key, tabStorage, persistentStorage, now = Date.now,
  uuid = () => crypto.randomUUID(), schedule = setTimeout, cancel = clearTimeout }) {
  const rememberedKey = key + ":remembered-v1";
  const memory = new Map(); // Nonpersistent fallback when tab storage is blocked.
  const listeners = new Set();
  let mode = "initial", lease = null, timer = null;

  function tabRead(name) {
    try { return memory.get(name) ?? tabStorage?.getItem(name) ?? null; }
    catch { return memory.get(name) ?? null; }
  }
  function tabWrite(name, value) {
    try { if (!tabStorage) throw new Error(); tabStorage.setItem(name, value); memory.delete(name); }
    catch { memory.set(name, value); }
  }
  function tabRemove(name) {
    memory.delete(name);
    try { tabStorage?.removeItem(name); } catch { /* storage unavailable */ }
  }
  function stopTimer() { if (timer !== null) cancel(timer); timer = null; }
  function readRemembered() {
    let raw;
    try { raw = persistentStorage?.getItem(rememberedKey); } catch { return null; }
    if (!raw) return null;
    try {
      const record = JSON.parse(raw);
      if (record.version !== 1 || typeof record.id !== "string" || !record.id ||
          !Number.isSafeInteger(record.startedAt) || record.startedAt > now() ||
          record.expiresAt !== record.startedAt + REMEMBER_MS ||
          typeof record.session !== "string" || !record.session) throw new Error();
      return record;
    } catch {
      try { persistentStorage.removeItem(rememberedKey); } catch { /* unavailable */ }
      return null;
    }
  }
  function forgetRemembered() {
    try { persistentStorage?.removeItem(rememberedKey); } catch { /* unavailable */ }
  }
  function end(removeRemembered = true, notify = false) {
    stopTimer();
    mode = "closed";
    lease = null;
    tabRemove(key);
    tabRemove(key + "-user");
    if (removeRemembered) forgetRemembered();
    if (notify) for (const listener of listeners) listener();
  }
  function arm(record) {
    stopTimer();
    timer = schedule(() => { timer = null; storage.getItem(key); }, Math.max(0, record.expiresAt - now()));
    timer?.unref?.();
  }
  function currentRemembered() {
    const record = readRemembered();
    if (!record || (lease && record.id !== lease.id)) {
      // A different tab signed out or changed accounts. Never overwrite its login.
      end(false, true);
      return null;
    }
    if (now() >= record.expiresAt) { end(true, true); return null; }
    return record;
  }
  const storage = {
    getItem(name) {
      if (name !== key) return tabRead(name);
      if (mode === "initial") {
        // Retain an existing non-remembered tab login after this upgrade.
        if (tabRead(key)) mode = "tab";
        else {
          const record = readRemembered();
          if (record) { mode = "remembered"; lease = record; arm(record); }
          else mode = "tab";
        }
      }
      if (mode === "closed") return null;
      return mode === "remembered" ? currentRemembered()?.session ?? null : tabRead(key);
    },
    setItem(name, value) {
      if (name !== key) { tabWrite(name, value); return; }
      if (mode === "initial") storage.getItem(key);
      if (mode === "closed") return; // A late refresh must not resurrect a logout/expiry.
      if (mode !== "remembered") { tabWrite(key, value); return; }
      const record = currentRemembered();
      if (!record) return;
      try { persistentStorage.setItem(rememberedKey, JSON.stringify({ ...record, session: value })); }
      catch { end(true, true); } // No silent downgrade to a tab with an unlimited deadline.
    },
    removeItem(name) {
      if (name === key) end();
      else tabRemove(name);
    }
  };
  return {
    storage, rememberedKey,
    beginLogin() { end(); mode = "tab"; },
    remember() {
      const session = storage.getItem(key);
      if (!session) throw new Error("The sign-in session is unavailable. Sign in again.");
      const startedAt = now();
      const record = { version: 1, id: uuid(), startedAt, expiresAt: startedAt + REMEMBER_MS, session };
      try {
        if (!persistentStorage) throw new Error();
        persistentStorage.setItem(rememberedKey, JSON.stringify(record));
        if (persistentStorage.getItem(rememberedKey) !== JSON.stringify(record)) throw new Error();
      } catch {
        end();
        throw new Error("This browser cannot remember your sign-in. Uncheck Remember me and try again.");
      }
      mode = "remembered"; lease = record;
      tabRemove(key);
      arm(record);
      return record.expiresAt;
    },
    clear() { end(); },
    check() { storage.getItem(key); },
    onEnded(listener) { listeners.add(listener); return () => listeners.delete(listener); }
  };
}

module.exports = { createStaffSessionStorage, REMEMBER_MS };
