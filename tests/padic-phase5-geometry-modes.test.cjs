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

const approx = (left, right, tolerance = 1e-9) => Math.abs(left - right) <= tolerance;

test("switching p-adic geometry mode changes coordinates but preserves stage weights", () => {
  const original = clonePAdic();

  try {
    actions.setPAdicPrime(3);
    actions.setPAdicQubitCount(2);
    actions.setPAdicMeasurementModel("valuation_weight");
    store.state.pAdic.preparedQubits = [
      {
        localStates: [
          { value: 0, amplitude: { raw: "1" } },
          { value: 1, amplitude: { raw: "1" } },
          { value: 2, amplitude: { raw: "1" } },
        ],
      },
      {
        localStates: [
          { value: 0, amplitude: { raw: "1" } },
          { value: 1, amplitude: { raw: "1" } },
          { value: 2, amplitude: { raw: "1" } },
        ],
      },
    ];
    store.state.pAdic.columns = [
      { gates: [{ id: "cx", gate: "CNOT", wires: [0, 1] }] },
    ];
    actions.setPAdicSelectedStage(1);

    actions.setPAdicGeometryMode("padic_vector");
    const vectorStage = selectors.pAdicSelectedStageVisualization.value;
    const vectorNodes = new Map(vectorStage.nodes.map((node) => [node.basis, node]));

    actions.setPAdicGeometryMode("valuation_ring");
    const ringStage = selectors.pAdicSelectedStageVisualization.value;

    assert.equal(vectorStage.stageIndex, ringStage.stageIndex);
    assert.equal(vectorStage.nodes.length, ringStage.nodes.length);

    let foundCoordinateDifference = false;
    for (const ringNode of ringStage.nodes) {
      const vectorNode = vectorNodes.get(ringNode.basis);
      assert.ok(vectorNode);
      assert.ok(approx(vectorNode.weight, ringNode.weight));
      assert.ok(approx(vectorNode.rawWeight, ringNode.rawWeight));

      if (!approx(vectorNode.point.x, ringNode.point.x) || !approx(vectorNode.point.y, ringNode.point.y)) {
        foundCoordinateDifference = true;
      }
    }

    assert.equal(foundCoordinateDifference, true);
  } finally {
    restorePAdic(original);
  }
});
