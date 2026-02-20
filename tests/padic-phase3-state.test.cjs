const test = require("node:test");
const assert = require("node:assert/strict");

const actions = require("../.tmp-test/state/actions.js");
const store = require("../.tmp-test/state/store.js");

const clonePAdic = () => JSON.parse(JSON.stringify(store.state.pAdic));

const restorePAdic = (snapshot) => {
  store.state.pAdic.prime = snapshot.prime;
  store.state.pAdic.measurementModel = snapshot.measurementModel;
  store.state.pAdic.geometryMode = snapshot.geometryMode;
  store.state.pAdic.qubitCount = snapshot.qubitCount;
  store.state.pAdic.preparedQubits = snapshot.preparedQubits;
  store.state.pAdic.columns = snapshot.columns;
  store.state.pAdic.selectedGate = snapshot.selectedGate;
  store.state.pAdic.selectedStageIndex = snapshot.selectedStageIndex;
  store.state.pAdic.selectedBasis = snapshot.selectedBasis;
};

test("p-adic qubit count clamps and keeps prepared qubits aligned", () => {
  const original = clonePAdic();

  try {
    actions.setPAdicQubitCount(9);
    assert.equal(store.state.pAdic.qubitCount, 8);
    assert.equal(store.state.pAdic.preparedQubits.length, 8);

    actions.setPAdicQubitCount(0);
    assert.equal(store.state.pAdic.qubitCount, 1);
    assert.equal(store.state.pAdic.preparedQubits.length, 1);
  } finally {
    restorePAdic(original);
  }
});

test("p-adic prime, model, and geometry setters reject invalid values", () => {
  const original = clonePAdic();

  try {
    actions.setPAdicPrime(5);
    assert.equal(store.state.pAdic.prime, 5);

    actions.setPAdicPrime(11);
    assert.equal(store.state.pAdic.prime, 5);

    actions.setPAdicMeasurementModel("character_based");
    assert.equal(store.state.pAdic.measurementModel, "character_based");

    actions.setPAdicMeasurementModel("not-a-model");
    assert.equal(store.state.pAdic.measurementModel, "character_based");

    actions.setPAdicGeometryMode("valuation_ring");
    assert.equal(store.state.pAdic.geometryMode, "valuation_ring");

    actions.setPAdicGeometryMode("not-a-geometry");
    assert.equal(store.state.pAdic.geometryMode, "valuation_ring");
  } finally {
    restorePAdic(original);
  }
});

test("p-adic presets and amplitude setters update explicit amplitude inputs", () => {
  const original = clonePAdic();

  try {
    actions.setPAdicQubitCount(2);
    actions.applyPAdicPreset(0, "zero");
    assert.equal(store.state.pAdic.preparedQubits[0].a.raw, "1");
    assert.equal(store.state.pAdic.preparedQubits[0].b.raw, "0");

    actions.applyPAdicPreset(0, "one");
    assert.equal(store.state.pAdic.preparedQubits[0].a.raw, "0");
    assert.equal(store.state.pAdic.preparedQubits[0].b.raw, "1");

    actions.applyPAdicPreset(0, "balanced");
    assert.equal(store.state.pAdic.preparedQubits[0].a.raw, "1");
    assert.equal(store.state.pAdic.preparedQubits[0].b.raw, "1");

    actions.setPAdicAmplitude(1, "a", "3 + 5p");
    actions.setPAdicAmplitude(1, "b", "7p^2");
    assert.equal(store.state.pAdic.preparedQubits[1].a.raw, "3 + 5p");
    assert.equal(store.state.pAdic.preparedQubits[1].b.raw, "7p^2");
  } finally {
    restorePAdic(original);
  }
});
