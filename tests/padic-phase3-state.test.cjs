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

const localRawByValue = (qubit) => new Map(qubit.localStates.map((entry) => [entry.value, entry.amplitude.raw]));

test("p-adic qubit count clamps and keeps prepared qubits aligned", () => {
  const original = clonePAdic();

  try {
    actions.setPAdicPrime(7);
    actions.setPAdicQubitCount(9);
    assert.equal(store.state.pAdic.qubitCount, 8);
    assert.equal(store.state.pAdic.preparedQubits.length, 8);
    for (const qubit of store.state.pAdic.preparedQubits) {
      assert.equal(qubit.localStates.length, 7);
    }

    actions.setPAdicQubitCount(0);
    assert.equal(store.state.pAdic.qubitCount, 1);
    assert.equal(store.state.pAdic.preparedQubits.length, 1);
    assert.equal(store.state.pAdic.preparedQubits[0].localStates.length, 7);
  } finally {
    restorePAdic(original);
  }
});

test("p-adic prime/model/geometry setters reject invalid values and prime reshapes local state set", () => {
  const original = clonePAdic();

  try {
    actions.setPAdicQubitCount(1);
    actions.setPAdicPrime(3);
    actions.setPAdicLocalAmplitude(0, 0, "7");
    actions.setPAdicLocalAmplitude(0, 1, "11");

    actions.setPAdicPrime(5);
    assert.equal(store.state.pAdic.prime, 5);
    const byValue = localRawByValue(store.state.pAdic.preparedQubits[0]);
    assert.equal(byValue.size, 5);
    assert.equal(byValue.get(0), "7");
    assert.equal(byValue.get(1), "11");
    assert.equal(byValue.get(4), "0");

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

test("p-adic presets and local-state setters cover full local state set", () => {
  const original = clonePAdic();

  try {
    actions.setPAdicPrime(5);
    actions.setPAdicQubitCount(2);
    actions.applyPAdicPreset(0, "zero");
    let byValue = localRawByValue(store.state.pAdic.preparedQubits[0]);
    assert.equal(byValue.get(0), "1");
    assert.equal(byValue.get(1), "0");
    assert.equal(byValue.get(4), "0");

    actions.applyPAdicPreset(0, "one");
    byValue = localRawByValue(store.state.pAdic.preparedQubits[0]);
    assert.equal(byValue.get(0), "0");
    assert.equal(byValue.get(1), "1");
    assert.equal(byValue.get(4), "0");

    actions.applyPAdicPreset(0, "balanced");
    byValue = localRawByValue(store.state.pAdic.preparedQubits[0]);
    assert.equal(byValue.size, 5);
    assert.deepEqual([...byValue.values()], ["1", "1", "1", "1", "1"]);

    actions.setPAdicLocalAmplitude(1, 4, "3 + 5p");
    actions.setPAdicLocalAmplitudeByValuation(1, 2, -2);
    actions.setPAdicLocalAmplitudeByValuation(1, 3, 3, -1);
    const qubitOne = localRawByValue(store.state.pAdic.preparedQubits[1]);
    assert.equal(qubitOne.get(4), "3 + 5p");
    assert.equal(qubitOne.get(2), "p^-2");
    assert.equal(qubitOne.get(3), "-p^3");
  } finally {
    restorePAdic(original);
  }
});

test("p-adic prep model is local-state based and not a/b amplitude based", () => {
  const original = clonePAdic();

  try {
    actions.setPAdicPrime(7);
    actions.setPAdicQubitCount(1);
    const qubit = store.state.pAdic.preparedQubits[0];
    assert.equal(Object.prototype.hasOwnProperty.call(qubit, "a"), false);
    assert.equal(Object.prototype.hasOwnProperty.call(qubit, "b"), false);
    assert.equal(qubit.localStates.length, 7);
  } finally {
    restorePAdic(original);
  }
});
