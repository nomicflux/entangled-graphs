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

const asProbabilityMap = (distribution) =>
  new Map(distribution.map((entry) => [entry.basis, Number(entry.probability.toFixed(6))]));

test("p-adic stage selectors expose model-weighted stages and entanglement overlays", () => {
  const original = clonePAdic();

  try {
    actions.setPAdicQubitCount(2);
    actions.setPAdicMeasurementModel("operator_ensemble");

    store.state.pAdic.preparedQubits = [
      { a: { raw: "1" }, b: { raw: "1" } },
      { a: { raw: "1" }, b: { raw: "0" } },
    ];
    store.state.pAdic.columns = [{ gates: [{ id: "cx-bell", gate: "CNOT", wires: [0, 1] }] }];

    const stages = selectors.pAdicStageViews.value;
    assert.equal(stages.length, 2);

    actions.setPAdicSelectedStage(1);
    assert.equal(store.state.pAdic.selectedStageIndex, 1);
    actions.setPAdicSelectedStage(2);
    assert.equal(store.state.pAdic.selectedStageIndex, 1);

    const selected = selectors.pAdicSelectedStage.value;
    assert.equal(selected.label, "Final");

    const distribution = asProbabilityMap(selected.distribution);
    assert.equal(distribution.get("00"), 0.5);
    assert.equal(distribution.get("11"), 0.5);

    const finalLinks = selectors.pAdicStageEntanglementLinks.value[1] ?? [];
    assert.equal(finalLinks.length, 1);
    assert.equal(finalLinks[0].fromRow, 0);
    assert.equal(finalLinks[0].toRow, 1);
    assert.ok(finalLinks[0].strength > 0.9);

    const finalModel = selectors.pAdicStageEntanglementModels.value[1];
    assert.ok(
      (finalModel?.components ?? []).some(
        (component) =>
          component.kind === "pairwise" &&
          component.rows.length === 2 &&
          component.rows.includes(0) &&
          component.rows.includes(1) &&
          component.strength > 0.9,
      ),
    );
  } finally {
    restorePAdic(original);
  }
});
