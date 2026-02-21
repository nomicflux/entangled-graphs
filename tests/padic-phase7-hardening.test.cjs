const test = require("node:test");
const assert = require("node:assert/strict");

const actions = require("../.tmp-test/state/actions.js");
const selectors = require("../.tmp-test/state/selectors.js");
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

test("p-adic visualization selectors invalidate deterministically on circuit changes", () => {
  const original = clonePAdic();

  try {
    actions.setPAdicQubitCount(2);
    actions.setPAdicMeasurementModel("operator_ensemble");
    actions.setPAdicGeometryMode("padic_vector");
    store.state.pAdic.columns = [{ gates: [] }];

    const before = selectors.pAdicStageVisualizations.value;
    assert.equal(before.length, 2);

    store.state.pAdic.columns = [
      { gates: [{ id: "x", gate: "X", wires: [0] }] },
      { gates: [] },
    ];

    const after = selectors.pAdicStageVisualizations.value;
    assert.equal(after.length, 3);
    assert.notEqual(before, after);

    const afterAgain = selectors.pAdicStageVisualizations.value;
    assert.equal(after, afterAgain);
  } finally {
    restorePAdic(original);
  }
});
