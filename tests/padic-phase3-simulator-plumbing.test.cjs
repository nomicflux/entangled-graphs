const test = require("node:test");
const assert = require("node:assert/strict");

const padic = require("../.tmp-test/quantum/padic.js");

test("p-adic sampling applies supported native gates directly", () => {
  const prepared = padic.p_adic_prepared_state_from_raw_qubits(
    [
      {
        localStates: [
          { value: 0, amplitude: { raw: "1" } },
          { value: 1, amplitude: { raw: "0" } },
        ],
      },
    ],
    2,
  );

  const run = padic.sample_padic_circuit_run(
    prepared,
    [{ gates: [{ id: "x", gate: "X", wires: [0] }] }],
    1,
    2,
    "valuation_weight",
    () => 0,
  );

  assert.equal(run.finalState.get("1"), 1);
  assert.equal(run.finalState.get("0") ?? 0, 0);
  assert.equal(run.finalSample.basis, "1");
});

test("p-adic prepared-state parser keys local amplitudes by value", () => {
  const prepared = padic.p_adic_prepared_state_from_raw_qubits(
    [
      {
        localStates: [
          { value: 0, amplitude: { raw: "1" } },
          { value: 0, amplitude: { raw: "2" } },
          { value: 2, amplitude: { raw: "3" } },
        ],
      },
    ],
    3,
  );

  assert.equal(prepared.get("0"), 2);
  assert.equal(prepared.get("2"), 3);
});
