const test = require("node:test");
const assert = require("node:assert/strict");

const complex = require("../.tmp-test/complex.js");
const quantum = require("../.tmp-test/quantum.js");
const stateOperators = require("../.tmp-test/state/operators.js");

const approx = (actual, expected, tolerance = 1e-6) => {
  assert.ok(Math.abs(actual - expected) <= tolerance, `expected ${actual} ≈ ${expected}`);
};

const resolver = (gate) => {
  if (stateOperators.isBuiltinGate(gate)) {
    return stateOperators.builtinOperatorMap[gate];
  }
  return null;
};

const ketZero = { a: complex.from_real(1), b: complex.from_real(0) };

const cutMap = (scores) =>
  new Map(scores.map((entry) => [entry.subset.join(","), entry.entropy]));

test("separable state has zero cut entropy on all bipartitions", () => {
  const prepared = quantum.tensor_product_qubits([ketZero, ketZero, ketZero]);
  const snapshots = quantum.simulate_columns_ensemble(prepared, [], resolver, 3);
  const scores = quantum.cut_entanglement_scores_from_ensemble(snapshots[0]);
  const table = cutMap(scores);

  approx(table.get("0"), 0);
  approx(table.get("1"), 0);
  approx(table.get("2"), 0);
});

test("bell pair has unit cut entropy across the single two-qubit cut", () => {
  const prepared = quantum.tensor_product_qubits([ketZero, ketZero]);
  const columns = [
    { gates: [{ id: "h", gate: "H", wires: [0] }] },
    { gates: [{ id: "cx", gate: "CNOT", wires: [0, 1] }] },
  ];
  const snapshots = quantum.simulate_columns_ensemble(prepared, columns, resolver, 2);
  const scores = quantum.cut_entanglement_scores_from_ensemble(snapshots[snapshots.length - 1]);
  assert.equal(scores.length, 1);
  approx(scores[0].entropy, 1);
});

test("GHZ state has unit cut entropy on each 1|2 partition", () => {
  const prepared = quantum.tensor_product_qubits([ketZero, ketZero, ketZero]);
  const columns = [
    { gates: [{ id: "h", gate: "H", wires: [0] }] },
    { gates: [{ id: "cx01", gate: "CNOT", wires: [0, 1] }] },
    { gates: [{ id: "cx02", gate: "CNOT", wires: [0, 2] }] },
  ];
  const snapshots = quantum.simulate_columns_ensemble(prepared, columns, resolver, 3);
  const scores = quantum.cut_entanglement_scores_from_ensemble(snapshots[snapshots.length - 1]);
  const table = cutMap(scores);

  approx(table.get("0"), 1);
  approx(table.get("1"), 1);
  approx(table.get("2"), 1);
});

test("measurement branch averaging reports zero cut entropy after Bell collapse", () => {
  const prepared = quantum.tensor_product_qubits([ketZero, ketZero]);
  const columns = [
    { gates: [{ id: "h", gate: "H", wires: [0] }] },
    { gates: [{ id: "cx", gate: "CNOT", wires: [0, 1] }] },
    { gates: [{ id: "m", gate: "M", wires: [0] }] },
  ];
  const snapshots = quantum.simulate_columns_ensemble(prepared, columns, resolver, 2);
  const beforeMeasurement = quantum.cut_entanglement_scores_from_ensemble(snapshots[2]);
  const afterMeasurement = quantum.cut_entanglement_scores_from_ensemble(snapshots[3]);

  approx(beforeMeasurement[0].entropy, 1);
  approx(afterMeasurement[0].entropy, 0);
});

test("stage helper returns per-stage cut entanglement arrays", () => {
  const prepared = quantum.tensor_product_qubits([ketZero, ketZero]);
  const columns = [{ gates: [{ id: "h", gate: "H", wires: [0] }] }];
  const snapshots = quantum.simulate_columns_ensemble(prepared, columns, resolver, 2);
  const stageScores = quantum.stage_cut_entanglement_scores(snapshots);

  assert.equal(stageScores.length, snapshots.length);
  assert.equal(stageScores[0].length, 1);
  assert.equal(stageScores[1].length, 1);
});

