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
  assert.equal(persistence.parseWorkspaceMode("abstractions"), "abstractions");
  assert.equal(persistence.parseWorkspaceMode("free-form"), "free-form");
  assert.equal(persistence.parseWorkspaceMode("p-adic"), "p-adic");
  assert.equal(persistence.parseWorkspaceMode("anything-else"), "free-form");
  assert.equal(persistence.parseWorkspaceMode(null), "free-form");
});

test("algorithm parser keeps current supported algorithm", () => {
  assert.equal(persistence.parseAlgorithmView("teleportation"), "teleportation");
  assert.equal(persistence.parseAlgorithmView("deutsch"), "deutsch");
  assert.equal(persistence.parseAlgorithmView("unknown"), "teleportation");
  assert.equal(persistence.parseAlgorithmView(null), "teleportation");
});

test("abstraction parser keeps current supported abstractions", () => {
  assert.equal(persistence.parseAbstractionView("preparing-qubits"), "preparing-qubits");
  assert.equal(persistence.parseAbstractionView("entanglement"), "entanglement");
  assert.equal(persistence.parseAbstractionView("phase-kickback"), "phase-kickback");
  assert.equal(persistence.parseAbstractionView("unknown"), "preparing-qubits");
  assert.equal(persistence.parseAbstractionView(null), "preparing-qubits");
});

test("read/write helpers persist workspace, algorithm, and abstraction selections", () => {
  const storage = fakeStorage();
  persistence.writeWorkspaceToStorage(storage, "abstractions");
  persistence.writeAlgorithmToStorage(storage, "deutsch");
  persistence.writeAbstractionToStorage(storage, "phase-kickback");

  assert.equal(persistence.readWorkspaceFromStorage(storage), "abstractions");
  assert.equal(persistence.readAlgorithmFromStorage(storage), "deutsch");
  assert.equal(persistence.readAbstractionFromStorage(storage), "phase-kickback");

  const dump = storage.dump();
  assert.equal(dump[persistence.WORKSPACE_STORAGE_KEY], "abstractions");
  assert.equal(dump[persistence.ALGORITHM_STORAGE_KEY], "deutsch");
  assert.equal(dump[persistence.ABSTRACTION_STORAGE_KEY], "phase-kickback");
});
