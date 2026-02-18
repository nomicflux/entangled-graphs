const test = require("node:test");
const assert = require("node:assert/strict");

const complex = require("../.tmp-test/complex.js");
const quantum = require("../.tmp-test/quantum.js");
const operator = require("../.tmp-test/operator.js");

const ketZero = { a: complex.from_real(1), b: complex.from_real(0) };
const ketOne = { a: complex.from_real(0), b: complex.from_real(1) };

const qubitForBit = (bit) => (bit === "0" ? ketZero : ketOne);

const basisState = (bits) => quantum.tensor_product_qubits(bits.split("").map(qubitForBit));

const hotIndex = (state) => state.findIndex((amp) => amp.real.toFixed(6) === "1.000000" && amp.imag.toFixed(6) === "0.000000");

test("CNOT truth table (control q0, target q1)", () => {
  const mapping = {
    "00": "00",
    "01": "01",
    "10": "11",
    "11": "10",
  };

  for (const [input, expected] of Object.entries(mapping)) {
    const prepared = basisState(input);
    const column = { gates: [{ id: `g-cnot-${input}`, gate: "CNOT", wires: [0, 1] }] };
    const snapshots = quantum.simulate_columns(prepared, [column], (gate) => (gate === "CNOT" ? operator.CNOT : null), 2);
    const final = snapshots[snapshots.length - 1];
    const actualIndex = hotIndex(final);
    const expectedIndex = Number.parseInt(expected, 2);

    assert.equal(actualIndex, expectedIndex, `${input} should map to ${expected}`);
  }
});

test("Toffoli truth table (controls q0,q1 target q2)", () => {
  for (let index = 0; index < 8; index += 1) {
    const bits = index.toString(2).padStart(3, "0");
    const controlsAreOne = bits[0] === "1" && bits[1] === "1";
    const expectedTarget = controlsAreOne ? (bits[2] === "1" ? "0" : "1") : bits[2];
    const expected = `${bits[0]}${bits[1]}${expectedTarget}`;

    const prepared = basisState(bits);
    const column = { gates: [{ id: `g-toffoli-${bits}`, gate: "TOFFOLI", wires: [0, 1, 2] }] };
    const snapshots = quantum.simulate_columns(
      prepared,
      [column],
      (gate) => (gate === "TOFFOLI" ? operator.TOFFOLI : null),
      3,
    );
    const final = snapshots[snapshots.length - 1];
    const actualIndex = hotIndex(final);
    const expectedIndex = Number.parseInt(expected, 2);

    assert.equal(actualIndex, expectedIndex, `${bits} should map to ${expected}`);
  }
});

test("generic multi-qubit apply works on non-adjacent wires", () => {
  const prepared = basisState("110");
  const column = { gates: [{ id: "g-cnot-non-adj", gate: "CNOT", wires: [0, 2] }] };
  const snapshots = quantum.simulate_columns(prepared, [column], (gate) => (gate === "CNOT" ? operator.CNOT : null), 3);
  const final = snapshots[snapshots.length - 1];

  // control q0=1 so target q2 flips: 110 -> 111
  assert.equal(hotIndex(final), 7);
});
