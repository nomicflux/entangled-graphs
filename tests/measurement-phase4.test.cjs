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

const scriptedRandom = (values) => {
  let cursor = 0;
  return () => {
    const value = values[Math.min(cursor, values.length - 1)];
    cursor += 1;
    return value;
  };
};

test("sampled run follows sampled in-circuit measurement branch (0 branch)", () => {
  const prepared = quantum.tensor_product_qubits([ketZero, ketZero]);
  const columns = [
    { gates: [{ id: "h", gate: "H", wires: [0] }] },
    { gates: [{ id: "cx", gate: "CNOT", wires: [0, 1] }] },
    { gates: [{ id: "m", gate: "M", wires: [0] }] },
    { gates: [{ id: "x", gate: "X", wires: [1] }] },
  ];

  const sampled = quantum.sample_circuit_run(prepared, columns, resolver, 2, scriptedRandom([0.1, 0.4]));

  assert.equal(sampled.outcomes.length, 1);
  assert.equal(sampled.outcomes[0].column, 2);
  assert.equal(sampled.outcomes[0].wire, 0);
  assert.equal(sampled.outcomes[0].value, 0);
  assert.equal(Number(sampled.outcomes[0].probability.toFixed(6)), 0.5);
  assert.equal(sampled.finalSample.basis, "01");
  assert.equal(Number(sampled.finalSample.probability.toFixed(6)), 1);
});

test("sampled run follows sampled in-circuit measurement branch (1 branch)", () => {
  const prepared = quantum.tensor_product_qubits([ketZero, ketZero]);
  const columns = [
    { gates: [{ id: "h", gate: "H", wires: [0] }] },
    { gates: [{ id: "cx", gate: "CNOT", wires: [0, 1] }] },
    { gates: [{ id: "m", gate: "M", wires: [0] }] },
    { gates: [{ id: "x", gate: "X", wires: [1] }] },
  ];

  const sampled = quantum.sample_circuit_run(prepared, columns, resolver, 2, scriptedRandom([0.9, 0.4]));

  assert.equal(sampled.outcomes.length, 1);
  assert.equal(sampled.outcomes[0].value, 1);
  assert.equal(sampled.finalSample.basis, "00");
  assert.equal(Number(sampled.finalSample.probability.toFixed(6)), 1);
});

test("resample-from-point replays earlier measurements and resamples from selected gate onward", () => {
  const prepared = quantum.tensor_product_qubits([ketZero, ketZero]);
  const columns = [
    { gates: [{ id: "h", gate: "H", wires: [0] }] },
    { gates: [{ id: "cx", gate: "CNOT", wires: [0, 1] }] },
    { gates: [{ id: "m0", gate: "M", wires: [0] }] },
    { gates: [{ id: "h1", gate: "H", wires: [1] }] },
    { gates: [{ id: "m1", gate: "M", wires: [1] }] },
  ];

  const firstRun = quantum.sample_circuit_run(prepared, columns, resolver, 2, scriptedRandom([0.9, 0.2, 0.1]));
  assert.equal(firstRun.outcomes.length, 2);
  assert.equal(firstRun.outcomes[0].gateId, "m0");
  assert.equal(firstRun.outcomes[0].value, 1);
  assert.equal(firstRun.outcomes[1].gateId, "m1");
  assert.equal(firstRun.outcomes[1].value, 0);

  const replayed = quantum.sample_circuit_run(
    prepared,
    columns,
    resolver,
    2,
    scriptedRandom([0.8, 0.3]),
    {
      priorOutcomes: firstRun.outcomes.map((entry) => ({ gateId: entry.gateId, value: entry.value })),
      resampleFromGateId: "m1",
    },
  );

  assert.equal(replayed.outcomes.length, 2);
  assert.equal(replayed.outcomes[0].gateId, "m0");
  assert.equal(replayed.outcomes[0].value, 1);
  assert.equal(replayed.outcomes[1].gateId, "m1");
  assert.equal(replayed.outcomes[1].value, 1);
});
