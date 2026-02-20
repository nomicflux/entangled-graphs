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

const probabilitiesForQubit = (qubit) => ({
  p0: complex.magnitude_squared(qubit.a),
  p1: complex.magnitude_squared(qubit.b),
});

test("teleportation branch engine builds expected mapping and branch probabilities", () => {
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

test("branch-level outputs follow correction map for source |0>", () => {
  const source = { a: complex.from_real(1), b: complex.from_real(0) };
  const branches = teleportationEngine.buildTeleportationBranchResults(preMeasurementStateForSource(source), source);
  const branchByBasis = new Map(branches.map((entry) => [entry.basis, entry]));

  approx(probabilitiesForQubit(branchByBasis.get("00").withoutCorrection).p0, 1);
  approx(probabilitiesForQubit(branchByBasis.get("01").withoutCorrection).p1, 1);
  approx(probabilitiesForQubit(branchByBasis.get("10").withoutCorrection).p0, 1);
  approx(probabilitiesForQubit(branchByBasis.get("11").withoutCorrection).p1, 1);

  for (const basis of ["00", "01", "10", "11"]) {
    approx(probabilitiesForQubit(branchByBasis.get(basis).withCorrection).p0, 1);
  }
});

test("manual correction policy changes expected fidelity when one control is disabled", () => {
  const source = { a: complex.from_real(1), b: complex.from_real(0) };
  const branches = teleportationEngine.buildTeleportationBranchResults(preMeasurementStateForSource(source), source);
  const autoPolicy = teleportationEngine.teleportationSummaryForPolicy(branches, source, { applyZ: true, applyX: true });
  const zOnlyPolicy = teleportationEngine.teleportationSummaryForPolicy(branches, source, { applyZ: true, applyX: false });

  approx(autoPolicy.summary.fidelityToSource, 1);
  assert.ok(zOnlyPolicy.summary.fidelityToSource < 1);
});

test("auto-correction reaches unit fidelity for basis, superposition, and phase sources", () => {
  const sources = [
    { name: "|0>", value: { a: complex.from_real(1), b: complex.from_real(0) }, p0: 1, p1: 0 },
    { name: "|1>", value: { a: complex.from_real(0), b: complex.from_real(1) }, p0: 0, p1: 1 },
    {
      name: "|+>",
      value: { a: complex.complex(Math.SQRT1_2, 0), b: complex.complex(Math.SQRT1_2, 0) },
      p0: 0.5,
      p1: 0.5,
    },
    {
      name: "phase",
      value: { a: complex.complex(Math.SQRT1_2, 0), b: complex.complex(0, Math.SQRT1_2) },
      p0: 0.5,
      p1: 0.5,
    },
  ];

  for (const source of sources) {
    const branches = teleportationEngine.buildTeleportationBranchResults(preMeasurementStateForSource(source.value), source.value);
    const autoPolicy = teleportationEngine.teleportationSummaryForPolicy(branches, source.value, { applyZ: true, applyX: true });
    const summary = autoPolicy.summary;
    approx(summary.fidelityToSource, 1, 1e-6);
    approx(summary.q2P0, source.p0, 1e-6);
    approx(summary.q2P1, source.p1, 1e-6);
    for (const entry of branches) {
      approx(entry.probability, 0.25, 1e-6);
    }
  }
});
