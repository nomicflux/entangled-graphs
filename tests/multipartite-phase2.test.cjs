const test = require("node:test");
const assert = require("node:assert/strict");

const complex = require("../.tmp-test/complex.js");
const quantum = require("../.tmp-test/quantum.js");
const stateOperators = require("../.tmp-test/state/operators.js");

const resolver = (gate) => {
  if (stateOperators.isBuiltinGate(gate)) {
    return stateOperators.builtinOperatorMap[gate];
  }
  return null;
};

const ketZero = { a: complex.from_real(1), b: complex.from_real(0) };

const finalComponents = (prepared, columns, qubitCount) => {
  const snapshots = quantum.simulate_columns_ensemble(prepared, columns, resolver, qubitCount);
  return quantum.entanglement_model_from_ensemble(snapshots[snapshots.length - 1]).components;
};

const rowsOnly = (components) => components.map((entry) => entry.rows);
const kindsOnly = (components) => components.map((entry) => entry.kind);

test("separable four-qubit state yields only single components", () => {
  const prepared = quantum.tensor_product_qubits([ketZero, ketZero, ketZero, ketZero]);
  const components = finalComponents(prepared, [], 4);

  assert.deepEqual(rowsOnly(components), [[0], [1], [2], [3]]);
  assert.deepEqual(kindsOnly(components), ["single", "single", "single", "single"]);
});

test("two disjoint Bell pairs yield two pairwise components", () => {
  const prepared = quantum.tensor_product_qubits([ketZero, ketZero, ketZero, ketZero]);
  const columns = [
    { gates: [{ id: "h0", gate: "H", wires: [0] }] },
    { gates: [{ id: "cx01", gate: "CNOT", wires: [0, 1] }] },
    { gates: [{ id: "h2", gate: "H", wires: [2] }] },
    { gates: [{ id: "cx23", gate: "CNOT", wires: [2, 3] }] },
  ];
  const components = finalComponents(prepared, columns, 4);

  assert.deepEqual(rowsOnly(components), [[0, 1], [2, 3]]);
  assert.deepEqual(kindsOnly(components), ["pairwise", "pairwise"]);
});

test("GHZ state yields one multipartite three-qubit component", () => {
  const prepared = quantum.tensor_product_qubits([ketZero, ketZero, ketZero]);
  const columns = [
    { gates: [{ id: "h0", gate: "H", wires: [0] }] },
    { gates: [{ id: "cx01", gate: "CNOT", wires: [0, 1] }] },
    { gates: [{ id: "cx02", gate: "CNOT", wires: [0, 2] }] },
  ];
  const components = finalComponents(prepared, columns, 3);

  assert.deepEqual(rowsOnly(components), [[0, 1, 2]]);
  assert.deepEqual(kindsOnly(components), ["multipartite"]);
});

test("measurement-collapse of GHZ removes multipartite component", () => {
  const prepared = quantum.tensor_product_qubits([ketZero, ketZero, ketZero]);
  const columns = [
    { gates: [{ id: "h0", gate: "H", wires: [0] }] },
    { gates: [{ id: "cx01", gate: "CNOT", wires: [0, 1] }] },
    { gates: [{ id: "cx02", gate: "CNOT", wires: [0, 2] }] },
    { gates: [{ id: "m0", gate: "M", wires: [0] }] },
  ];
  const components = finalComponents(prepared, columns, 3);

  assert.deepEqual(rowsOnly(components), [[0], [1], [2]]);
  assert.deepEqual(kindsOnly(components), ["single", "single", "single"]);
});

test("stage model helper returns per-stage component model objects", () => {
  const prepared = quantum.tensor_product_qubits([ketZero, ketZero]);
  const columns = [
    { gates: [{ id: "h", gate: "H", wires: [0] }] },
    { gates: [{ id: "cx", gate: "CNOT", wires: [0, 1] }] },
  ];
  const snapshots = quantum.simulate_columns_ensemble(prepared, columns, resolver, 2);
  const stageModels = quantum.stage_entanglement_models_from_snapshots(snapshots);

  assert.equal(stageModels.length, snapshots.length);
  assert.deepEqual(rowsOnly(stageModels[0].components), [[0], [1]]);
  assert.deepEqual(rowsOnly(stageModels[2].components), [[0, 1]]);
  assert.deepEqual(kindsOnly(stageModels[2].components), ["pairwise"]);
});

