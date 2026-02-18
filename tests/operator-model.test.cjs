const test = require("node:test");
const assert = require("node:assert/strict");

const complex = require("../.tmp-test/complex.js");
const operator = require("../.tmp-test/operator.js");
const quantum = require("../.tmp-test/quantum.js");

const zeroQubit = {
  a: complex.from_real(1),
  b: complex.from_real(0),
};

const zeroState = () => quantum.tensor_product_qubits([zeroQubit]);

test("built-in single-qubit operators have arity 1 and 2x2 matrices", () => {
  for (const gate of [operator.I, operator.X, operator.H, operator.S]) {
    assert.equal(gate.qubitArity, 1);
    assert.equal(gate.matrix.length, 2);
    assert.equal(gate.matrix[0].length, 2);
    assert.equal(gate.matrix[1].length, 2);
    assert.equal(gate.id, gate.label);
  }
});

test("single-qubit operator constructor creates labeled operator with matrix", () => {
  const entries = operator.singleQubitMatrix(
    complex.from_real(1),
    complex.from_real(0),
    complex.from_real(0),
    complex.from_real(1),
  );
  const custom = operator.makeSingleQubitOperator("U-id", "U", entries);

  assert.equal(custom.id, "U-id");
  assert.equal(custom.label, "U");
  assert.equal(custom.qubitArity, 1);
  assert.deepEqual(custom.matrix, entries);
});

test("n-qubit matrix constructor rejects matrices with wrong order", () => {
  assert.throws(() => {
    operator.matrixForQubitArity(2, [
      [complex.from_real(1), complex.from_real(0)],
      [complex.from_real(0), complex.from_real(1)],
    ]);
  });
});

test("simulation consumes matrix-based operator values (X maps |0> to |1>)", () => {
  const column = {
    gates: [{ id: "g1", kind: "single", gate: "X", target: 0 }],
  };
  const snapshots = quantum.simulate_columns(zeroState(), [column], (gate) => (gate === "X" ? operator.X : null), 1);
  const final = snapshots[snapshots.length - 1];

  assert.equal(final.length, 2);
  assert.equal(final[0].real.toFixed(6), "0.000000");
  assert.equal(final[0].imag.toFixed(6), "0.000000");
  assert.equal(final[1].real.toFixed(6), "1.000000");
  assert.equal(final[1].imag.toFixed(6), "0.000000");
});
