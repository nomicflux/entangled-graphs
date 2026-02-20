const test = require("node:test");
const assert = require("node:assert/strict");

const complex = require("../.tmp-test/complex.js");
const quantum = require("../.tmp-test/quantum.js");
const stateOperators = require("../.tmp-test/state/operators.js");

const ketZero = { a: complex.from_real(1), b: complex.from_real(0) };
const ketOne = { a: complex.from_real(0), b: complex.from_real(1) };
const plus = { a: complex.complex(Math.SQRT1_2, 0), b: complex.complex(Math.SQRT1_2, 0) };

const resolver = (gate) => {
  if (stateOperators.isBuiltinGate(gate)) {
    return stateOperators.builtinOperatorMap[gate];
  }
  return null;
};

const hotIndex = (state) => state.findIndex((amp) => amp.real.toFixed(6) === "1.000000" && amp.imag.toFixed(6) === "0.000000");

test("projective measurement splits one-qubit superposition into Born-rule branches", () => {
  const prepared = quantum.tensor_product_qubits([plus]);
  const columns = [{ gates: [{ id: "m1", gate: "M", wires: [0] }] }];
  const snapshots = quantum.simulate_columns_ensemble(prepared, columns, resolver, 1);
  const measured = snapshots[1];

  assert.equal(measured.length, 2);
  const totalWeight = measured.reduce((acc, branch) => acc + branch.weight, 0);
  assert.equal(Number(totalWeight.toFixed(6)), 1);
  assert.equal(Number(measured[0].weight.toFixed(6)), 0.5);
  assert.equal(Number(measured[1].weight.toFixed(6)), 0.5);
  assert.equal(hotIndex(measured[0].state), 0);
  assert.equal(hotIndex(measured[1].state), 0);
});

test("measurement on one qubit of Bell state collapses entangled partner branch-wise", () => {
  const prepared = quantum.tensor_product_qubits([ketZero, ketZero]);
  const columns = [
    { gates: [{ id: "h", gate: "H", wires: [0] }] },
    { gates: [{ id: "cx", gate: "CNOT", wires: [0, 1] }] },
    { gates: [{ id: "m", gate: "M", wires: [0] }] },
  ];
  const snapshots = quantum.simulate_columns_ensemble(prepared, columns, resolver, 2);
  const measured = snapshots[3];

  assert.equal(measured.length, 2);
  const sorted = [...measured].sort((left, right) => hotIndex(left.state) - hotIndex(right.state));

  assert.equal(Number(sorted[0].weight.toFixed(6)), 0.5);
  assert.equal(Number(sorted[1].weight.toFixed(6)), 0.5);
  assert.equal(hotIndex(sorted[0].state), 0); // |00>
  assert.equal(hotIndex(sorted[1].state), 1); // |01> (q0 reset to |0>)
});

test("downstream unitary after measurement evolves each branch independently", () => {
  const prepared = quantum.tensor_product_qubits([ketZero, ketZero]);
  const columns = [
    { gates: [{ id: "h", gate: "H", wires: [0] }] },
    { gates: [{ id: "cx", gate: "CNOT", wires: [0, 1] }] },
    { gates: [{ id: "m", gate: "M", wires: [0] }] },
    { gates: [{ id: "x1", gate: "X", wires: [1] }] },
  ];
  const snapshots = quantum.simulate_columns_ensemble(prepared, columns, resolver, 2);
  const finalEnsemble = snapshots[snapshots.length - 1];
  const distribution = quantum.measurement_distribution_for_ensemble(finalEnsemble);
  const table = new Map(distribution.map((entry) => [entry.basis, Number(entry.probability.toFixed(6))]));

  assert.equal(table.get("00"), 0.5);
  assert.equal(table.get("01"), 0.5);
  assert.equal(table.get("10"), 0);
  assert.equal(table.get("11"), 0);
});
