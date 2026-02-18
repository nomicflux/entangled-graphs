const test = require("node:test");
const assert = require("node:assert/strict");

const complex = require("../.tmp-test/complex.js");
const operator = require("../.tmp-test/operator.js");
const quantum = require("../.tmp-test/quantum.js");
const stateOperators = require("../.tmp-test/state/operators.js");

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
    gates: [{ id: "g1", gate: "X", wires: [0] }],
  };
  const snapshots = quantum.simulate_columns(zeroState(), [column], (gate) => (gate === "X" ? operator.X : null), 1);
  const final = snapshots[snapshots.length - 1];

  assert.equal(final.length, 2);
  assert.equal(final[0].real.toFixed(6), "0.000000");
  assert.equal(final[0].imag.toFixed(6), "0.000000");
  assert.equal(final[1].real.toFixed(6), "1.000000");
  assert.equal(final[1].imag.toFixed(6), "0.000000");
});

test("generic multi-qubit path applies CNOT operator", () => {
  const plus = {
    a: complex.complex(Math.SQRT1_2, 0),
    b: complex.complex(Math.SQRT1_2, 0),
  };
  const prepared = quantum.tensor_product_qubits([plus, zeroQubit]); // (|00> + |10>)/sqrt(2)
  const column = {
    gates: [{ id: "g2", gate: "CNOT", wires: [0, 1] }],
  };

  const snapshots = quantum.simulate_columns(prepared, [column], (gate) => {
    if (gate === "CNOT") {
      return operator.CNOT;
    }
    return null;
  }, 2);
  const final = snapshots[snapshots.length - 1];

  // Expect (|00> + |11>)/sqrt(2)
  assert.equal(final[0].real.toFixed(6), Math.SQRT1_2.toFixed(6));
  assert.equal(final[1].real.toFixed(6), "0.000000");
  assert.equal(final[2].real.toFixed(6), "0.000000");
  assert.equal(final[3].real.toFixed(6), Math.SQRT1_2.toFixed(6));
});

test("palette arity data comes from unified operators", () => {
  assert.equal(stateOperators.operatorArityForGate("I", []), 1);
  assert.equal(stateOperators.operatorArityForGate("CNOT", []), 2);
  assert.equal(stateOperators.operatorArityForGate("TOFFOLI", []), 3);
});

test("block-matrix controlled constructor produces CNOT matrix", () => {
  const reconstructed = operator.controlledOperator("CNOT-rebuilt", "CNOT-rebuilt", operator.X);

  assert.equal(reconstructed.qubitArity, 2);
  assert.deepEqual(reconstructed.matrix, operator.CNOT.matrix);
});

test("toffoli built from composition flips target when both controls are 1", () => {
  const prepared = quantum.tensor_product_qubits([
    { a: complex.from_real(0), b: complex.from_real(1) }, // |1>
    { a: complex.from_real(0), b: complex.from_real(1) }, // |1>
    zeroQubit, // |0>
  ]); // |110>

  const column = {
    gates: [{ id: "g3", gate: "TOFFOLI", wires: [0, 1, 2] }],
  };
  const snapshots = quantum.simulate_columns(prepared, [column], (gate) => {
    if (gate === "TOFFOLI") {
      return operator.TOFFOLI;
    }
    return null;
  }, 3);
  const final = snapshots[snapshots.length - 1];

  // |111> basis index 7 has amplitude 1
  assert.equal(final[6].real.toFixed(6), "0.000000");
  assert.equal(final[7].real.toFixed(6), "1.000000");
});
