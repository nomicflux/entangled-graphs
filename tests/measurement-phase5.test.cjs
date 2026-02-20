const test = require("node:test");
const assert = require("node:assert/strict");

const complex = require("../.tmp-test/complex.js");
const quantum = require("../.tmp-test/quantum.js");
const actions = require("../.tmp-test/state/actions.js");
const placements = require("../.tmp-test/state/placements.js");
const measurementLocks = require("../.tmp-test/state/measurement-locks.js");
const stateOperators = require("../.tmp-test/state/operators.js");
const store = require("../.tmp-test/state/store.js");

const ketZero = { a: complex.from_real(1), b: complex.from_real(0) };

const resolver = (gate) => {
  if (stateOperators.isBuiltinGate(gate)) {
    return stateOperators.builtinOperatorMap[gate];
  }
  return null;
};

const scriptedRandom = (values) => {
  let cursor = 0;
  return () => {
    const value = values[Math.min(cursor, values.length - 1)];
    cursor += 1;
    return value;
  };
};

const cloneColumns = (columns) =>
  columns.map((column) => ({
    gates: column.gates.map((gate) => ({
      id: gate.id,
      gate: gate.gate,
      wires: [...gate.wires],
    })),
  }));

const cloneBloch = (preparedBloch) => preparedBloch.map((entry) => ({ ...entry }));

test("distribution remains branch-correct after Bell partial measurement and downstream gate", () => {
  const prepared = quantum.tensor_product_qubits([ketZero, ketZero]);
  const columns = [
    { gates: [{ id: "h", gate: "H", wires: [0] }] },
    { gates: [{ id: "cx", gate: "CNOT", wires: [0, 1] }] },
    { gates: [{ id: "m", gate: "M", wires: [0] }] },
    { gates: [{ id: "h2", gate: "H", wires: [1] }] },
  ];
  const snapshots = quantum.simulate_columns_ensemble(prepared, columns, resolver, 2);
  const distribution = quantum.measurement_distribution_for_ensemble(snapshots[snapshots.length - 1]);
  const table = new Map(distribution.map((entry) => [entry.basis, Number(entry.probability.toFixed(6))]));

  assert.equal(table.get("00"), 0.5);
  assert.equal(table.get("01"), 0.5);
  assert.equal(table.get("10"), 0);
  assert.equal(table.get("11"), 0);
});

test("row lock remains correct after qubit removal remaps measured wire", () => {
  const originalColumns = cloneColumns(store.state.columns);
  const originalBloch = cloneBloch(store.state.preparedBloch);

  try {
    store.state.preparedBloch = [{ theta: 0, phi: 0 }, { theta: 0, phi: 0 }, { theta: 0, phi: 0 }];
    store.state.columns = [
      { gates: [{ id: "m-row2", gate: "M", wires: [2] }] },
      { gates: [] },
      { gates: [] },
    ];

    assert.equal(placements.toSingleGatePlacement(1, 2, "X"), null);
    actions.removeQubit(0);

    const firstByRow = measurementLocks.firstMeasurementColumnByRow(store.state.columns);
    assert.equal(firstByRow.get(1), 0);
    assert.equal(placements.toSingleGatePlacement(1, 1, "X"), null);
    assert.notEqual(placements.toSingleGatePlacement(1, 0, "X"), null);
  } finally {
    store.state.columns = originalColumns;
    store.state.preparedBloch = originalBloch;
  }
});

test("row lock recomputes correctly when columns are removed and re-added", () => {
  const originalColumns = cloneColumns(store.state.columns);
  const originalBloch = cloneBloch(store.state.preparedBloch);

  try {
    store.state.preparedBloch = [{ theta: 0, phi: 0 }, { theta: 0, phi: 0 }];
    store.state.columns = [
      { gates: [{ id: "m-row0", gate: "M", wires: [0] }] },
      { gates: [] },
      { gates: [] },
    ];

    assert.equal(placements.toSingleGatePlacement(2, 0, "X"), null);

    actions.removeLastColumn();
    actions.removeLastColumn();

    assert.equal(store.state.columns.length, 1);
    assert.notEqual(placements.toSingleGatePlacement(0, 0, "X"), null);

    actions.appendColumn();
    assert.equal(store.state.columns.length, 2);
    assert.equal(placements.toSingleGatePlacement(1, 0, "X"), null);
  } finally {
    store.state.columns = originalColumns;
    store.state.preparedBloch = originalBloch;
  }
});

test("deterministic sampled run follows two in-circuit measurement outcomes on entangled pair", () => {
  const prepared = quantum.tensor_product_qubits([ketZero, ketZero]);
  const columns = [
    { gates: [{ id: "h", gate: "H", wires: [0] }] },
    { gates: [{ id: "cx", gate: "CNOT", wires: [0, 1] }] },
    { gates: [{ id: "m0", gate: "M", wires: [0] }] },
    { gates: [{ id: "m1", gate: "M", wires: [1] }] },
  ];

  const sampled = quantum.sample_circuit_run(prepared, columns, resolver, 2, scriptedRandom([0.9, 0.1, 0.2]));

  assert.equal(sampled.outcomes.length, 2);
  assert.equal(sampled.outcomes[0].wire, 0);
  assert.equal(sampled.outcomes[0].value, 1);
  assert.equal(Number(sampled.outcomes[0].probability.toFixed(6)), 0.5);
  assert.equal(sampled.outcomes[1].wire, 1);
  assert.equal(sampled.outcomes[1].value, 1);
  assert.equal(Number(sampled.outcomes[1].probability.toFixed(6)), 1);
  assert.equal(sampled.finalSample.basis, "00");
  assert.equal(Number(sampled.finalSample.probability.toFixed(6)), 1);
});
