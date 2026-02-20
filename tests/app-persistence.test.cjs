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

test("p-adic parser helpers clamp and default invalid values", () => {
  assert.equal(persistence.parsePAdicPrime("2"), 2);
  assert.equal(persistence.parsePAdicPrime("7"), 7);
  assert.equal(persistence.parsePAdicPrime("11"), 2);
  assert.equal(persistence.parsePAdicPrime(null), 2);

  assert.equal(persistence.parsePAdicMeasurementModel("valuation_weight"), "valuation_weight");
  assert.equal(persistence.parsePAdicMeasurementModel("character_based"), "character_based");
  assert.equal(persistence.parsePAdicMeasurementModel("bad-model"), "valuation_weight");
  assert.equal(persistence.parsePAdicMeasurementModel(null), "valuation_weight");

  assert.equal(persistence.parsePAdicQubitCount("1"), 1);
  assert.equal(persistence.parsePAdicQubitCount("8"), 8);
  assert.equal(persistence.parsePAdicQubitCount("0"), 1);
  assert.equal(persistence.parsePAdicQubitCount("9"), 8);
  assert.equal(persistence.parsePAdicQubitCount(null), 2);
});

test("p-adic read/write helpers persist and normalize values", () => {
  const storage = fakeStorage();
  persistence.writePAdicPrimeToStorage(storage, 5);
  persistence.writePAdicMeasurementModelToStorage(storage, "operator_ensemble");
  persistence.writePAdicQubitCountToStorage(storage, 9);

  assert.equal(persistence.readPAdicPrimeFromStorage(storage), 5);
  assert.equal(persistence.readPAdicMeasurementModelFromStorage(storage), "operator_ensemble");
  assert.equal(persistence.readPAdicQubitCountFromStorage(storage), 8);

  const dump = storage.dump();
  assert.equal(dump[persistence.PADIC_PRIME_STORAGE_KEY], "5");
  assert.equal(dump[persistence.PADIC_MEASUREMENT_MODEL_STORAGE_KEY], "operator_ensemble");
  assert.equal(dump[persistence.PADIC_QUBIT_COUNT_STORAGE_KEY], "8");
});
