const test = require("node:test");
const assert = require("node:assert/strict");

const complex = require("../.tmp-test/complex.js");
const quantum = require("../.tmp-test/quantum.js");
const selectors = require("../.tmp-test/state/selectors.js");
const store = require("../.tmp-test/state/store.js");
const stageVisual = require("../.tmp-test/components/circuit/stage-visual-model.js");
const stateOperators = require("../.tmp-test/state/operators.js");

const cloneColumns = (columns) =>
  columns.map((column) => ({
    gates: column.gates.map((gate) => ({
      id: gate.id,
      gate: gate.gate,
      wires: [...gate.wires],
    })),
  }));

const cloneBloch = (preparedBloch) => preparedBloch.map((entry) => ({ ...entry }));

const ketZero = { a: complex.from_real(1), b: complex.from_real(0) };

const resolver = (gate) => {
  if (stateOperators.isBuiltinGate(gate)) {
    return stateOperators.builtinOperatorMap[gate];
  }
  return null;
};

test("stage snapshots preserve canonical ensemble state and derive reduced views only at the consumer boundary", () => {
  const originalColumns = cloneColumns(store.state.columns);
  const originalBloch = cloneBloch(store.state.preparedBloch);

  try {
    store.state.preparedBloch = [{ theta: 0, phi: 0 }, { theta: 0, phi: 0 }];
    store.state.columns = [
      { gates: [{ id: "h", gate: "H", wires: [0] }] },
      { gates: [{ id: "cx", gate: "CNOT", wires: [0, 1] }] },
    ];

    const snapshots = selectors.stageSnapshots.value;
    const ensembles = selectors.ensembleSnapshots.value;

    assert.equal(snapshots.length, 3);
    assert.equal(snapshots[0].ensemble, ensembles[0]);
    assert.equal(snapshots[2].ensemble, ensembles[2]);

    assert.deepEqual(
      stageVisual.distributionForStageSnapshot(snapshots[2]),
      quantum.measurement_distribution_for_ensemble(snapshots[2].ensemble),
    );
    assert.deepEqual(
      stageVisual.blochPairForStageSnapshot(snapshots[2]),
      quantum.bloch_pair_from_ensemble(snapshots[2].ensemble),
    );
  } finally {
    store.state.columns = originalColumns;
    store.state.preparedBloch = originalBloch;
  }
});

test("canonical stage snapshots preserve Bell-phase distinctions when reduced local views collapse", () => {
  const prepared = quantum.tensor_product_qubits([ketZero, ketZero]);
  const bellColumns = [
    { gates: [{ id: "h", gate: "H", wires: [0] }] },
    { gates: [{ id: "cx", gate: "CNOT", wires: [0, 1] }] },
  ];
  const bellPhaseFlippedColumns = [
    ...bellColumns,
    { gates: [{ id: "z", gate: "Z", wires: [0] }] },
  ];

  const bellSnapshots = quantum.simulate_columns_ensemble(prepared, bellColumns, resolver, 2);
  const bellPhaseFlippedSnapshots = quantum.simulate_columns_ensemble(prepared, bellPhaseFlippedColumns, resolver, 2);

  const positiveStage = {
    id: "bell-plus",
    index: bellSnapshots.length - 1,
    label: "Bell+",
    ensemble: bellSnapshots[bellSnapshots.length - 1],
    isFinal: true,
  };
  const negativeStage = {
    id: "bell-minus",
    index: bellPhaseFlippedSnapshots.length - 1,
    label: "Bell-",
    ensemble: bellPhaseFlippedSnapshots[bellPhaseFlippedSnapshots.length - 1],
    isFinal: true,
  };

  assert.equal(
    Number(positiveStage.ensemble[0].state[3].real.toFixed(6)),
    Number(Math.SQRT1_2.toFixed(6)),
  );
  assert.equal(
    Number(negativeStage.ensemble[0].state[3].real.toFixed(6)),
    Number((-Math.SQRT1_2).toFixed(6)),
  );

  const positiveDistribution = quantum.measurement_distribution_for_ensemble(positiveStage.ensemble);
  const negativeDistribution = quantum.measurement_distribution_for_ensemble(negativeStage.ensemble);
  const positiveBlochPair = quantum.bloch_pair_from_ensemble(positiveStage.ensemble);
  const negativeBlochPair = quantum.bloch_pair_from_ensemble(negativeStage.ensemble);
  const positiveVisual = stageVisual.deriveStageVisualModel(positiveStage);
  const negativeVisual = stageVisual.deriveStageVisualModel(negativeStage);

  assert.deepEqual(positiveDistribution, negativeDistribution);
  assert.deepEqual(positiveBlochPair, negativeBlochPair);
  assert.notDeepEqual(positiveVisual.pairPhaseOverlays, negativeVisual.pairPhaseOverlays);
  assert.notDeepEqual(positiveVisual.renderPair, negativeVisual.renderPair);
  assert.notDeepEqual(positiveStage.ensemble, negativeStage.ensemble);
});
