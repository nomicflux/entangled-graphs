const test = require("node:test");
const assert = require("node:assert/strict");

const persistence = require("../.tmp-test/app/persistence.js");

const fakeStorage = (initial = {}) => {
  const store = new Map(Object.entries(initial));
  return {
    getItem: (key) => (store.has(key) ? store.get(key) : null),
    setItem: (key, value) => {
      store.set(key, value);
    },
    dump: () => Object.fromEntries(store.entries()),
  };
};

test("workspace parser falls back to free-form for invalid values", () => {
  assert.equal(persistence.parseWorkspaceMode("algorithms"), "algorithms");
  assert.equal(persistence.parseWorkspaceMode("free-form"), "free-form");
  assert.equal(persistence.parseWorkspaceMode("anything-else"), "free-form");
  assert.equal(persistence.parseWorkspaceMode(null), "free-form");
});

test("algorithm parser keeps current supported algorithm", () => {
  assert.equal(persistence.parseAlgorithmView("teleportation"), "teleportation");
  assert.equal(persistence.parseAlgorithmView("deutsch"), "deutsch");
  assert.equal(persistence.parseAlgorithmView("unknown"), "teleportation");
  assert.equal(persistence.parseAlgorithmView(null), "teleportation");
});

test("read/write helpers persist workspace and algorithm selections", () => {
  const storage = fakeStorage();
  persistence.writeWorkspaceToStorage(storage, "algorithms");
  persistence.writeAlgorithmToStorage(storage, "deutsch");

  assert.equal(persistence.readWorkspaceFromStorage(storage), "algorithms");
  assert.equal(persistence.readAlgorithmFromStorage(storage), "deutsch");

  const dump = storage.dump();
  assert.equal(dump[persistence.WORKSPACE_STORAGE_KEY], "algorithms");
  assert.equal(dump[persistence.ALGORITHM_STORAGE_KEY], "deutsch");
});
