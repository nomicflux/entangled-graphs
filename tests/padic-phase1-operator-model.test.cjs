const test = require("node:test");
const assert = require("node:assert/strict");

const padic = require("../.tmp-test/quantum/padic.js");

test("p-adic operator constructor enforces square finite matrices", () => {
  assert.equal(
    padic.p_adic_operator_from_rows([
      [1, 0],
      [0, 1],
    ])?.dimension,
    2,
  );

  assert.equal(
    padic.p_adic_operator_from_rows([
      [1, 0, 0],
      [0, 1, 0],
    ]),
    null,
  );
});

test("p-adic statistical operator requires selfadjoint trace-one form", () => {
  const valid = padic.p_adic_statistical_operator_from_rows([
    [1, 0],
    [0, 0],
  ]);
  assert.equal(valid?.kind, "statistical_operator");

  assert.equal(
    padic.p_adic_statistical_operator_from_rows([
      [2, 0],
      [0, 0],
    ]),
    null,
  );

  assert.equal(
    padic.p_adic_statistical_operator_from_rows([
      [0.5, 1],
      [0, 0.5],
    ]),
    null,
  );
});

test("p-adic sovm constructor validates selfadjoint common-dimension identity sum", () => {
  const sovm = padic.p_adic_sovm_from_rows([
    {
      id: "z0",
      label: "|0><0|",
      rows: [
        [1, 0],
        [0, 0],
      ],
    },
    {
      id: "z1",
      label: "|1><1|",
      rows: [
        [0, 0],
        [0, 1],
      ],
    },
  ]);
  assert.equal(sovm?.dimension, 2);
  assert.equal(sovm?.effects.length, 2);

  assert.equal(
    padic.p_adic_sovm_from_rows([
      {
        id: "bad",
        label: "half projector",
        rows: [
          [0.5, 0],
          [0, 0],
        ],
      },
      {
        id: "also-bad",
        label: "half projector",
        rows: [
          [0, 0],
          [0, 0.5],
        ],
      },
    ]),
    null,
  );
});

test("trace pairing and sovm pairings produce p-adic outputs and valuation metrics", () => {
  const rho = padic.p_adic_statistical_operator_from_rows([
    [1, 0],
    [0, 0],
  ]);
  const sovm = padic.p_adic_sovm_from_rows([
    {
      id: "z0",
      label: "|0><0|",
      rows: [
        [1, 0],
        [0, 0],
      ],
    },
    {
      id: "z1",
      label: "|1><1|",
      rows: [
        [0, 0],
        [0, 1],
      ],
    },
  ]);

  assert.ok(rho);
  assert.ok(sovm);

  assert.equal(padic.p_adic_trace_pairing(rho, sovm.effects[0].operator), 1);
  assert.equal(padic.p_adic_trace_pairing(rho, sovm.effects[1].operator), 0);

  const pairings = padic.p_adic_sovm_pairings(rho, sovm, 2);
  assert.ok(pairings);
  assert.equal(pairings.length, 2);
  assert.equal(pairings[0].id, "z0");
  assert.equal(pairings[0].omega, 1);
  assert.equal(pairings[0].valuation, 0);
  assert.equal(pairings[0].norm, 1);
  assert.equal(pairings[1].id, "z1");
  assert.equal(pairings[1].omega, 0);
  assert.equal(pairings[1].valuation, Number.POSITIVE_INFINITY);
  assert.equal(pairings[1].norm, 0);
});
