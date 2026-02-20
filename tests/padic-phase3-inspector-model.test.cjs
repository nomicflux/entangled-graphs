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

test("p-adic inspector selectors follow selected stage and basis details", () => {
  const original = clonePAdic();

  try {
    actions.setPAdicQubitCount(2);
    actions.setPAdicMeasurementModel("valuation_weight");
    actions.setPAdicGeometryMode("padic_vector");
    store.state.pAdic.preparedQubits = [
      { a: { raw: "1" }, b: { raw: "0" } },
      { a: { raw: "1" }, b: { raw: "0" } },
    ];
    store.state.pAdic.columns = [
      { gates: [{ id: "x", gate: "X", wires: [0] }] },
      { gates: [{ id: "m", gate: "M", wires: [0] }] },
    ];

    actions.setPAdicSelectedBasis("00");
    actions.setPAdicSelectedStage(0);

    const stage0Node = selectors.pAdicSelectedBasisNode.value;
    assert.ok(stage0Node);
    assert.equal(stage0Node.basis, "00");
    assert.ok(stage0Node.weight > 0.99);

    actions.setPAdicSelectedStage(1);
    const stage1Node = selectors.pAdicSelectedBasisNode.value;
    assert.ok(stage1Node);
    assert.equal(stage1Node.basis, "00");
    assert.equal(stage1Node.weight, 0);
    assert.equal(stage1Node.norm, 0);
    assert.equal(stage1Node.valuation, Number.POSITIVE_INFINITY);

    actions.setPAdicGeometryMode("valuation_ring");
    const ringNode = selectors.pAdicSelectedBasisNode.value;
    assert.ok(ringNode);
    assert.equal(ringNode.basis, "00");
    assert.equal(ringNode.weight, 0);

    actions.setPAdicMeasurementModel("operator_ensemble");
    const modelNode = selectors.pAdicSelectedBasisNode.value;
    assert.ok(modelNode);
    assert.equal(modelNode.basis, "00");
  } finally {
    restorePAdic(original);
  }
});
