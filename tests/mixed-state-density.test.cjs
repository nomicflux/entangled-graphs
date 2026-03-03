const test = require("node:test");
const assert = require("node:assert/strict");

const complex = require("../.tmp-test/complex.js");
const density = require("../.tmp-test/quantum/density.js");
const mixedInputs = require("../.tmp-test/mixed-state/rho-inputs.js");
const operator = require("../.tmp-test/operator.js");
const quantum = require("../.tmp-test/quantum.js");
const stateOperators = require("../.tmp-test/state/operators.js");

const densityMap = (distribution) => new Map(distribution.map((entry) => [entry.basis, Number(entry.probability.toFixed(6))]));

const builtinResolver = (gate) => {
  if (stateOperators.isBuiltinGate(gate)) {
    return stateOperators.builtinOperatorMap[gate];
  }
  return null;
};

const ketZero = { a: complex.from_real(1), b: complex.from_real(0) };

test("rho parser accepts valid mixed states and rejects invalid trace or PSD inputs", () => {
  const plus = mixedInputs.parseSingleQubitDensityInput({
    rho00: "0.5",
    rho11: "0.5",
    rho01Real: "0.5",
    rho01Imag: "0",
  });
  const invalidTrace = mixedInputs.parseSingleQubitDensityInput({
    rho00: "0.7",
    rho11: "0.7",
    rho01Real: "0",
    rho01Imag: "0",
  });
  const invalidPsd = mixedInputs.parseSingleQubitDensityInput({
    rho00: "0.5",
    rho11: "0.5",
    rho01Real: "0.8",
    rho01Imag: "0",
  });

  assert.notEqual(plus.validDensity, null);
  assert.equal(invalidTrace.validDensity, null);
  assert.equal(invalidPsd.validDensity, null);
  assert.match(invalidTrace.errors.join(" "), /Trace/);
  assert.match(invalidPsd.errors.join(" "), /positive semidefinite/i);
});

test("unitary-only mixed evolution matches pure-state measurement distributions", () => {
  const preparedPure = quantum.tensor_product_qubits([ketZero]);
  const preparedDensity = density.densityMatrixForSingleQubitPureState(ketZero);
  const columnsPure = [{ gates: [{ id: "h1", gate: "H", wires: [0] }] }];
  const columnsMixed = [{ gates: [{ id: "h1", process: { kind: "unitary", gateId: "H" }, wires: [0] }] }];

  const pureSnapshots = quantum.simulate_columns(preparedPure, columnsPure, builtinResolver, 1);
  const mixedSnapshots = density.simulateMixedColumns(preparedDensity, columnsMixed, builtinResolver, 1);

  assert.deepEqual(
    densityMap(quantum.measurement_distribution(pureSnapshots[pureSnapshots.length - 1])),
    densityMap(density.measurementDistributionForDensityMatrix(mixedSnapshots[mixedSnapshots.length - 1])),
  );
});

test("noise channels update populations or coherence in the expected direction", () => {
  const zero = density.singleQubitDensityMatrix({ rho00: 1, rho11: 0, rho01: complex.complex(0, 0) });
  const one = density.singleQubitDensityMatrix({ rho00: 0, rho11: 1, rho01: complex.complex(0, 0) });
  const plus = density.singleQubitDensityMatrix({ rho00: 0.5, rho11: 0.5, rho01: complex.complex(0.5, 0) });

  const flipped = density.applyNoiseChannelToDensityMatrix(zero, "bit-flip", 0.5, 0, 1);
  const phaseFlipped = density.applyNoiseChannelToDensityMatrix(plus, "phase-flip", 0.5, 0, 1);
  const dephased = density.applyNoiseChannelToDensityMatrix(plus, "dephasing", 0.5, 0, 1);
  const depolarized = density.applyNoiseChannelToDensityMatrix(zero, "depolarizing", 0.5, 0, 1);
  const damped = density.applyNoiseChannelToDensityMatrix(one, "amplitude-damping", 0.5, 0, 1);

  assert.equal(densityMap(density.measurementDistributionForDensityMatrix(flipped)).get("1"), 0.5);
  assert.equal(Number(phaseFlipped[0][1].real.toFixed(6)), 0);
  assert.equal(Number(dephased[0][1].real.toFixed(6)), 0.25);
  assert.equal(Number(depolarized[1][1].real.toFixed(6)), 0.25);
  assert.equal(Number(damped[0][0].real.toFixed(6)), 0.5);
});

test("mixed measurement snapshots are non-selective while sampled runs collapse selectively", () => {
  const plus = density.singleQubitDensityMatrix({ rho00: 0.5, rho11: 0.5, rho01: complex.complex(0.5, 0) });
  const columns = [{ gates: [{ id: "m1", process: { kind: "measurement" }, wires: [0] }] }];
  const snapshots = density.simulateMixedColumns(plus, columns, builtinResolver, 1);
  const sampled = density.sampleMixedCircuitRun(plus, columns, builtinResolver, 1, () => 0);

  assert.equal(densityMap(density.measurementDistributionForDensityMatrix(snapshots[1])).get("0"), 0.5);
  assert.equal(sampled.outcomes[0].value, 0);
  assert.equal(densityMap(density.measurementDistributionForDensityMatrix(sampled.finalRho)).get("0"), 1);
});

test("basis-aware distributions expose coherence changes and 0% noise acts as identity", () => {
  const plus = density.singleQubitDensityMatrix({ rho00: 0.5, rho11: 0.5, rho01: complex.complex(0.5, 0) });
  const dephased = density.applyNoiseChannelToDensityMatrix(plus, "dephasing", 0.5, 0, 1);
  const untouched = density.applyNoiseChannelToDensityMatrix(plus, "dephasing", 0, 0, 1);

  assert.equal(densityMap(density.measurementDistributionForDensityMatrixInBasis(plus, "x")).get("0"), 1);
  assert.equal(densityMap(density.measurementDistributionForDensityMatrixInBasis(dephased, "x")).get("0"), 0.75);
  assert.deepEqual(
    densityMap(density.measurementDistributionForDensityMatrix(plus)),
    densityMap(density.measurementDistributionForDensityMatrix(untouched)),
  );
});
