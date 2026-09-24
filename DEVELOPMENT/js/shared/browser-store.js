"use strict";

// A separate database for each origin + application folder. Never migrates or
// substitutes for Node/PHP records. IndexedDB commits tickets and documents
// together and serializes writers across tabs (no localStorage lost updates).
function createBrowserStore({ indexedDB, scope }) {
  let opening;
  const unavailable = () => new Error("Browser ticket storage is unavailable or full. Nothing was confirmed saved. Allow site storage or free space, then retry. Existing tickets were not reset.");
  function open() {
    if (!opening) opening = new Promise((resolve, reject) => {
      if (!indexedDB) return reject(unavailable());
      let blocked = false;
      const request = indexedDB.open("capstone-browser-demo-v1:" + scope, 1);
      request.onupgradeneeded = () => request.result.createObjectStore("state");
      request.onerror = () => reject(unavailable());
      request.onblocked = () => { blocked = true; reject(new Error("Close other Capstone tabs before opening browser storage.")); };
      request.onsuccess = () => {
        const db = request.result;
        if (blocked) { db.close(); return; }
        db.onversionchange = () => { db.close(); opening = null; };
        resolve(db);
      };
    }).catch(error => { opening = null; throw error; });
    return opening;
  }
  return {
    async transact(write, change) {
      const db = await open();
      return new Promise((resolve, reject) => {
        let result, failure;
        const transaction = db.transaction("state", write ? "readwrite" : "readonly");
        const store = transaction.objectStore("state");
        transaction.oncomplete = () => resolve(result);
        transaction.onabort = () => reject(failure || unavailable());
        transaction.onerror = () => { /* onabort reports the error, never success */ };
        const request = store.get("queue");
        request.onsuccess = () => {
          try {
            const state = request.result === undefined ? { version: 1, tickets: [], documents: {} } : request.result;
            if (!state || state.version !== 1 || !Array.isArray(state.tickets) ||
                !state.documents || typeof state.documents !== "object" || Array.isArray(state.documents) ||
                state.tickets.some(t => !t || !/^CAP-\d+$/.test(t.id) || !Number.isSafeInteger(Number(t.id.slice(4))) || typeof t.question !== "string" || typeof t.details !== "string" ||
                  !["open", "in-review", "resolved"].includes(t.status) || !Array.isArray(t.attachments) ||
                  t.attachments.some(file => !file || typeof file.id !== "string" || !Object.hasOwn(state.documents, file.id))) ||
                Object.values(state.documents).some(file => !file || typeof file.name !== "string" || !Number.isSafeInteger(file.size) || file.size <= 0 || typeof file.data !== "string") ||
                new Set(state.tickets.map(t => t.id)).size !== state.tickets.length) {
              throw new Error("Browser ticket data is not in the expected format. It was not reset or replaced. Ask the project owner for recovery help.");
            }
            result = change(state);
            if (result?.then) throw new Error("Storage changes must complete synchronously.");
            if (write) store.put(state, "queue");
          } catch (error) { failure = error; transaction.abort(); }
        };
      });
    }
  };
}
module.exports = { createBrowserStore };
