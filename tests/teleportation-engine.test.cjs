const test = require("node:test");
const assert = require("node:assert/strict");

const complex = require("../.tmp-test/complex.js");
const quantum = require("../.tmp-test/quantum.js");
const stateOperators = require("../.tmp-test/state/operators.js");
const teleportationEngine = require("../.tmp-test/components/algorithms/teleportation/engine.js");

const approx = (actual, expected, tolerance = 1e-6) => {
  assert.ok(Math.abs(actual - expected) <= tolerance, `expected ${actual} ≈ ${expected}`);
};

const ketZero = { a: complex.from_real(1), b: complex.from_real(0) };

const resolver = (gate) => {
  if (stateOperators.isBuiltinGate(gate)) {
    return stateOperators.builtinOperatorMap[gate];
  }
  return null;
};

const preMeasurementStateForSource = (source) => {
  const prepared = quantum.tensor_product_qubits([source, ketZero, ketZero]);
  const columns = [
    { gates: [{ id: "bell-h", gate: "H", wires: [1] }] },
    { gates: [{ id: "bell-cnot", gate: "CNOT", wires: [1, 2] }] },
    { gates: [{ id: "alice-cnot", gate: "CNOT", wires: [0, 1] }] },
    { gates: [{ id: "alice-h", gate: "H", wires: [0] }] },
  ];
  const snapshots = quantum.simulate_columns(prepared, columns, resolver, 3);
  return snapshots[snapshots.length - 1];
};

test("teleportation branch engine builds expected m0,m1 branches for |0>", () => {
  const source = { a: complex.from_real(1), b: complex.from_real(0) };
  const branches = teleportationEngine.buildTeleportationBranchResults(preMeasurementStateForSource(source), source);
  const summary = teleportationEngine.teleportationSummaries(branches, source);

  assert.equal(branches.length, 4);
  assert.deepEqual(branches.map((entry) => entry.basis), ["00", "01", "10", "11"]);
  assert.deepEqual(branches.map((entry) => entry.operation), ["I", "X", "Z", "XZ"]);

  for (const entry of branches) {
    approx(entry.probability, 0.25);
    approx(entry.fidelityWithCorrection, 1);
  }

  approx(summary.withCorrection.fidelityToSource, 1);
  approx(summary.withoutCorrection.fidelityToSource, 0.5);

  const correctedTable = new Map(summary.withCorrectionDistribution.map((entry) => [entry.basis, entry.probability]));
  approx(correctedTable.get("000"), 0.25);
  approx(correctedTable.get("010"), 0.25);
  approx(correctedTable.get("100"), 0.25);
  approx(correctedTable.get("110"), 0.25);
});

test("teleportation branch engine preserves phase-carrying source after correction", () => {
  const source = { a: complex.complex(Math.SQRT1_2, 0), b: complex.complex(0, Math.SQRT1_2) };
  const branches = teleportationEngine.buildTeleportationBranchResults(preMeasurementStateForSource(source), source);
  const summary = teleportationEngine.teleportationSummaries(branches, source);

  for (const entry of branches) {
    approx(entry.fidelityWithCorrection, 1);
  }

  approx(summary.withCorrection.fidelityToSource, 1);
  approx(summary.withCorrection.q2P0, 0.5);
  approx(summary.withCorrection.q2P1, 0.5);
});

test("manual correction policy changes expected fidelity when one control is disabled", () => {
  const source = { a: complex.from_real(1), b: complex.from_real(0) };
  const branches = teleportationEngine.buildTeleportationBranchResults(preMeasurementStateForSource(source), source);
  const autoPolicy = teleportationEngine.teleportationSummaryForPolicy(branches, source, { applyZ: true, applyX: true });
  const zOnlyPolicy = teleportationEngine.teleportationSummaryForPolicy(branches, source, { applyZ: true, applyX: false });

  approx(autoPolicy.summary.fidelityToSource, 1);
  assert.ok(zOnlyPolicy.summary.fidelityToSource < 1);
});
