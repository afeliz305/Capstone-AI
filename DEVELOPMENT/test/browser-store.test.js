const test = require("node:test");
const assert = require("node:assert/strict");
const { createBrowserStore } = require("../js/shared/browser-store");

// Event-order fixture for our IndexedDB adapter, not a browser implementation.
// Real browser persistence/quotas still need the documented manual smoke test.
function databaseFixture(initial) {
  let saved = structuredClone(initial), staged, finish, abort = false;
  const fixture = { names: [], writes: 0, commitFailure: false };
  fixture.indexedDB = {
    open(name) {
      fixture.names.push(name);
      const request = {};
      queueMicrotask(() => { request.result = db; request.onsuccess(); });
      return request;
    }
  };
  const db = {
    close() {},
    transaction(name, mode) {
      assert.equal(name, "state");
      staged = undefined; abort = false;
      const transaction = {
        abort() { abort = true; queueMicrotask(() => transaction.onabort()); },
        objectStore() { return {
          get(key) {
            assert.equal(key, "queue"); const request = {};
            queueMicrotask(() => {
              request.result = structuredClone(saved); request.onsuccess();
              if (abort) return;
              finish = () => {
                if (fixture.commitFailure) transaction.abort();
                else { if (staged !== undefined) saved = structuredClone(staged); transaction.oncomplete(); }
              };
              if (!fixture.hold) finish();
            }); return request;
          },
          put(value, key) { assert.equal(mode, "readwrite"); assert.equal(key, "queue"); staged = structuredClone(value); fixture.writes++; }
        }; }
      };
      return transaction;
    }
  };
  fixture.finish = () => finish();
  fixture.snapshot = () => structuredClone(saved);
  return fixture;
}
test("browser store scopes the database, leaves missing state empty, and confirms only on transaction completion", async () => {
  const f = databaseFixture();
  const store = createBrowserStore({ indexedDB: f.indexedDB, scope: "https://example.edu/app/" });
  assert.deepEqual(await store.transact(false, state => state.tickets), []);
  assert.equal(f.writes, 0); assert.equal(f.snapshot(), undefined);
  f.hold = true;
  let confirmed = false;
  const pending = store.transact(true, state => { state.example = "fictional"; return "saved"; }).then(result => { confirmed = true; return result; });
  await new Promise(resolve => setImmediate(resolve));
  assert.equal(confirmed, false); assert.equal(f.snapshot(), undefined);
  f.finish(); assert.equal(await pending, "saved");
  assert.equal(f.snapshot().example, "fictional");
  assert.deepEqual(f.names, ["capstone-browser-demo-v1:https://example.edu/app/"]);
});
test("browser store failed commits reject without replacing previous records", async () => {
  const original = { version: 1, tickets: [], documents: {}, marker: "preserve" };
  const f = databaseFixture(original); f.commitFailure = true;
  const store = createBrowserStore({ indexedDB: f.indexedDB, scope: "fixture" });
  await assert.rejects(store.transact(true, state => { state.marker = "changed"; }), /unavailable or full/);
  assert.deepEqual(f.snapshot(), original);
});
test("browser store refuses corrupt or future-version data without writes or resets", async () => {
  for (const original of [null, [], { version: 2, tickets: [], documents: {} }, { version: 1, tickets: [{ id: "CAP-1001" }], documents: {} }]) {
    const f = databaseFixture(original);
    const store = createBrowserStore({ indexedDB: f.indexedDB, scope: "fixture" });
    await assert.rejects(store.transact(true, () => "never"), /not reset or replaced/);
    assert.deepEqual(f.snapshot(), original); assert.equal(f.writes, 0);
  }
});
test("browser store unavailable storage and mutation errors do not report success", async () => {
  const unavailable = createBrowserStore({ scope: "fixture" });
  await assert.rejects(unavailable.transact(true, () => "never"), /storage is unavailable/);
  const f = databaseFixture({ version: 1, tickets: [], documents: {} });
  const store = createBrowserStore({ indexedDB: f.indexedDB, scope: "fixture" });
  await assert.rejects(store.transact(true, () => { throw new Error("validation failed"); }), /validation failed/);
  assert.equal(f.writes, 0);
});
