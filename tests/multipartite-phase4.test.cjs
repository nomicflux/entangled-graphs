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

const separatesRows = (cut, rows) => {
  const subset = new Set(cut.subset);
  let inSubset = false;
  let inComplement = false;
  for (const row of rows) {
    if (subset.has(row)) {
      inSubset = true;
    } else {
      inComplement = true;
    }
  }
  return inSubset && inComplement;
};

const minCutEntropyStrength = (rows, cuts) => {
  const splitting = cuts.filter((cut) => separatesRows(cut, rows));
  if (splitting.length === 0) {
    return 0;
  }
  return splitting.reduce((minEntropy, cut) => Math.min(minEntropy, cut.entropy), splitting[0].entropy);
};

test("pairwise component strength equals min-cut entropy for Bell pair", () => {
  const prepared = quantum.tensor_product_qubits([ketZero, ketZero]);
  const columns = [
    { gates: [{ id: "h", gate: "H", wires: [0] }] },
    { gates: [{ id: "cx", gate: "CNOT", wires: [0, 1] }] },
  ];
  const snapshots = quantum.simulate_columns_ensemble(prepared, columns, resolver, 2);
  const model = quantum.entanglement_model_from_ensemble(snapshots[snapshots.length - 1]);
  const component = model.components[0];

  approx(component.strength, minCutEntropyStrength(component.rows, model.cuts));
  approx(component.strength, 1);
});

test("multipartite component strength equals min-cut entropy for GHZ", () => {
  const prepared = quantum.tensor_product_qubits([ketZero, ketZero, ketZero]);
  const columns = [
    { gates: [{ id: "h0", gate: "H", wires: [0] }] },
    { gates: [{ id: "cx01", gate: "CNOT", wires: [0, 1] }] },
    { gates: [{ id: "cx02", gate: "CNOT", wires: [0, 2] }] },
  ];
  const snapshots = quantum.simulate_columns_ensemble(prepared, columns, resolver, 3);
  const model = quantum.entanglement_model_from_ensemble(snapshots[snapshots.length - 1]);
  const component = model.components[0];

  assert.equal(component.kind, "multipartite");
  approx(component.strength, minCutEntropyStrength(component.rows, model.cuts));
  approx(component.strength, 1);
});

test("single-qubit components report zero strength", () => {
  const prepared = quantum.tensor_product_qubits([ketZero, ketZero, ketZero]);
  const snapshots = quantum.simulate_columns_ensemble(prepared, [], resolver, 3);
  const model = quantum.entanglement_model_from_ensemble(snapshots[0]);

  for (const component of model.components) {
    assert.equal(component.kind, "single");
    approx(component.strength, 0);
  }
});

test("teleportation backbone reaches multipartite component before measurement for superposed source", () => {
  const invSqrt2 = 1 / Math.sqrt(2);
  const sourcePlus = {
    a: complex.from_real(invSqrt2),
    b: complex.from_real(invSqrt2),
  };
  const prepared = quantum.tensor_product_qubits([sourcePlus, ketZero, ketZero]);
  const columns = [
    { gates: [{ id: "bell-h-gate", gate: "H", wires: [1] }] },
    { gates: [{ id: "bell-cnot-gate", gate: "CNOT", wires: [1, 2] }] },
    { gates: [{ id: "alice-cnot-gate", gate: "CNOT", wires: [0, 1] }] },
    { gates: [{ id: "alice-h-gate", gate: "H", wires: [0] }] },
    {
      gates: [
        { id: "measure-q0", gate: "M", wires: [0] },
        { id: "measure-q1", gate: "M", wires: [1] },
      ],
    },
    { gates: [] },
    { gates: [] },
  ];
  const snapshots = quantum.simulate_columns_ensemble(prepared, columns, resolver, 3);
  const models = quantum.stage_entanglement_models_from_snapshots(snapshots);

  const aliceCnotModel = models[3];
  const multipartite = aliceCnotModel.components.find((component) => component.kind === "multipartite");
  assert.ok(multipartite, "expected multipartite component at Alice CNOT stage");
  assert.deepEqual(multipartite.rows, [0, 1, 2]);
  assert.ok(multipartite.strength > 0.1);
});
