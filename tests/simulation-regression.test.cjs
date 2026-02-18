const test = require("node:test");
const assert = require("node:assert/strict");

const complex = require("../.tmp-test/complex.js");
const quantum = require("../.tmp-test/quantum.js");
const operator = require("../.tmp-test/operator.js");
const stateOperators = require("../.tmp-test/state/operators.js");

const ketZero = { a: complex.from_real(1), b: complex.from_real(0) };

const resolver = (gate) => {
  if (stateOperators.isBuiltinGate(gate)) {
    return stateOperators.builtinOperatorMap[gate];
  }
  return null;
};

const distributionMap = (distribution) => new Map(distribution.map((entry) => [entry.basis, Number(entry.probability.toFixed(6))]));

test("canonical bell circuit snapshot distributions remain correct", () => {
  const plusOnQ0 = {
    a: complex.complex(Math.SQRT1_2, 0),
    b: complex.complex(Math.SQRT1_2, 0),
  };
  const prepared = quantum.tensor_product_qubits([plusOnQ0, ketZero]);
  const columns = [
    { gates: [{ id: "c1", gate: "CNOT", wires: [0, 1] }] },
  ];
  const snapshots = quantum.simulate_columns(prepared, columns, resolver, 2);

  assert.equal(snapshots.length, 2);
  const preparedDist = distributionMap(quantum.measurement_distribution(snapshots[0]));
  const finalDist = distributionMap(quantum.measurement_distribution(snapshots[1]));

  assert.equal(preparedDist.get("00"), 0.5);
  assert.equal(preparedDist.get("10"), 0.5);
  assert.equal(finalDist.get("00"), 0.5);
  assert.equal(finalDist.get("11"), 0.5);
});

test("single-qubit phase gate changes phase without changing measurement distribution", () => {
  const prepared = quantum.tensor_product_qubits([
    {
      a: complex.complex(Math.SQRT1_2, 0),
      b: complex.complex(Math.SQRT1_2, 0),
    },
  ]);
  const columns = [{ gates: [{ id: "s1", gate: "S", wires: [0] }] }];
  const snapshots = quantum.simulate_columns(prepared, columns, resolver, 1);
  const before = distributionMap(quantum.measurement_distribution(snapshots[0]));
  const after = distributionMap(quantum.measurement_distribution(snapshots[1]));

  assert.equal(before.get("0"), 0.5);
  assert.equal(before.get("1"), 0.5);
  assert.equal(after.get("0"), 0.5);
  assert.equal(after.get("1"), 0.5);
});

test("arity-based builtin gate eligibility", () => {
  assert.deepEqual(stateOperators.availableBuiltinGatesForQubitCount(1), ["I", "X", "H", "S"]);
  assert.deepEqual(stateOperators.availableBuiltinGatesForQubitCount(2), ["I", "X", "H", "S", "CNOT"]);
  assert.deepEqual(stateOperators.availableBuiltinGatesForQubitCount(3), ["I", "X", "H", "S", "CNOT", "TOFFOLI"]);
});
