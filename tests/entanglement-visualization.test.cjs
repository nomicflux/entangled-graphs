const test = require("node:test");
const assert = require("node:assert/strict");

const complex = require("../.tmp-test/complex.js");
const quantum = require("../.tmp-test/quantum.js");
const stateOperators = require("../.tmp-test/state/operators.js");

const ketZero = { a: complex.from_real(1), b: complex.from_real(0) };

const resolver = (gate) => {
  if (stateOperators.isBuiltinGate(gate)) {
    return stateOperators.builtinOperatorMap[gate];
  }
  return null;
};

const linkBetween = (links, left, right) => links.find((entry) => entry.fromRow === left && entry.toRow === right);

test("product state has zero Bell-derived entanglement strength", () => {
  const prepared = quantum.tensor_product_qubits([ketZero, ketZero]);
  const snapshots = quantum.simulate_columns_ensemble(prepared, [], resolver, 2);
  const links = quantum.entanglement_links_from_ensemble(snapshots[0]);
  const pair = linkBetween(links, 0, 1);

  assert.ok(pair);
  assert.equal(Number(pair.strength.toFixed(6)), 0);
});

test("Bell pair is marked with strong phi+ entanglement", () => {
  const prepared = quantum.tensor_product_qubits([ketZero, ketZero]);
  const columns = [
    { gates: [{ id: "h", gate: "H", wires: [0] }] },
    { gates: [{ id: "cx", gate: "CNOT", wires: [0, 1] }] },
  ];
  const snapshots = quantum.simulate_columns_ensemble(prepared, columns, resolver, 2);
  const links = quantum.entanglement_links_from_ensemble(snapshots[snapshots.length - 1]);
  const pair = linkBetween(links, 0, 1);

  assert.ok(pair);
  assert.equal(pair.dominantBell, "phi+");
  assert.equal(Number(pair.dominantProbability.toFixed(6)), 1);
  assert.equal(Number(pair.strength.toFixed(6)), 1);
});

test("measurement collapse removes Bell entanglement link strength", () => {
  const prepared = quantum.tensor_product_qubits([ketZero, ketZero]);
  const columns = [
    { gates: [{ id: "h", gate: "H", wires: [0] }] },
    { gates: [{ id: "cx", gate: "CNOT", wires: [0, 1] }] },
    { gates: [{ id: "m", gate: "M", wires: [0] }] },
  ];
  const snapshots = quantum.simulate_columns_ensemble(prepared, columns, resolver, 2);
  const links = quantum.entanglement_links_from_ensemble(snapshots[snapshots.length - 1]);
  const pair = linkBetween(links, 0, 1);

  assert.ok(pair);
  assert.equal(Number(pair.strength.toFixed(6)), 0);
});
