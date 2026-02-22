const test = require("node:test");
const assert = require("node:assert/strict");

const faithful = require("../.tmp-test/padic-faithful/index.js");

test("faithful engine validates rho and sovm and computes omega_i pairings", () => {
  const rho = faithful.statisticalOperatorFromRaw(
    [
      ["1", "0"],
      ["0", "0"],
    ],
    3,
  );
  assert.equal(rho.error, null);
  assert.ok(rho.operator);

  const sovm = faithful.sovmFromRawEffects(
    [
      {
        id: "omega_0",
        label: "F0",
        rows: [
          ["1", "0"],
          ["0", "0"],
        ],
      },
      {
        id: "omega_1",
        label: "F1",
        rows: [
          ["0", "0"],
          ["0", "1"],
        ],
      },
    ],
    3,
  );

  assert.equal(sovm.error, null);
  assert.ok(sovm.sovm);

  const rows = faithful.outcomeRowsFromPairing(rho.operator, sovm.sovm, 3);
  assert.equal(rows.length, 2);

  const byId = new Map(rows.map((row) => [row.id, row]));
  assert.equal(byId.get("omega_0").basis, "omega_0");
  assert.equal(byId.get("omega_0").w_raw, 1);
  assert.equal(byId.get("omega_1").w_raw, 0);
  assert.equal(byId.get("omega_0").v_p, 0);
  assert.equal(byId.get("omega_1").v_p, Number.POSITIVE_INFINITY);
  assert.equal(byId.get("omega_0").w_norm, 1);
  assert.equal(byId.get("omega_1").w_norm, 0);
  assert.equal(Object.hasOwn(byId.get("omega_0"), "omega"), false);
  assert.equal(Object.hasOwn(byId.get("omega_0"), "valuation"), false);
  assert.equal(Object.hasOwn(byId.get("omega_0"), "norm"), false);
  assert.equal(Object.hasOwn(byId.get("omega_0"), "wNorm"), false);
});

test("faithful engine rejects non-trace-one rho and non-identity-summing sovm", () => {
  const rho = faithful.statisticalOperatorFromRaw(
    [
      ["2", "0"],
      ["0", "0"],
    ],
    5,
  );
  assert.equal(rho.operator, null);
  assert.match(rho.error, /trace one/i);

  const sovm = faithful.sovmFromRawEffects(
    [
      {
        id: "a",
        label: "A",
        rows: [
          ["0.5", "0"],
          ["0", "0"],
        ],
      },
      {
        id: "b",
        label: "B",
        rows: [
          ["0", "0"],
          ["0", "0.5"],
        ],
      },
    ],
    5,
  );

  assert.equal(sovm.sovm, null);
  assert.match(sovm.error, /sum to identity/i);
});

test("faithful engine uses exact scalar checks for trace and p-adic valuation", () => {
  const rhoAlmostOne = faithful.statisticalOperatorFromRaw(
    [
      ["0.1", "0"],
      ["0", "0.899999999999"],
    ],
    3,
  );
  assert.equal(rhoAlmostOne.operator, null);
  assert.match(rhoAlmostOne.error, /trace one/i);

  const rho = faithful.statisticalOperatorFromRaw(
    [
      ["1", "0"],
      ["0", "0"],
    ],
    3,
  );
  assert.equal(rho.error, null);
  assert.ok(rho.operator);

  const sovm = faithful.sovmFromRawEffects(
    [
      {
        id: "omega_0",
        label: "F0",
        rows: [
          ["1-p^-1", "0"],
          ["0", "0"],
        ],
      },
      {
        id: "omega_1",
        label: "F1",
        rows: [
          ["p^-1", "0"],
          ["0", "1"],
        ],
      },
    ],
    3,
  );
  assert.equal(sovm.error, null);
  assert.ok(sovm.sovm);

  const rows = faithful.outcomeRowsFromPairing(rho.operator, sovm.sovm, 3);
  const byId = new Map(rows.map((row) => [row.id, row]));
  assert.equal(byId.get("omega_0").v_p, -1);
  assert.equal(byId.get("omega_1").v_p, -1);
  assert.equal(byId.get("omega_0").unitResidue, 2);
  assert.equal(byId.get("omega_1").unitResidue, 1);
});

test("faithful engine returns full stage operator sequence across circuit columns", () => {
  const staged = faithful.stageOperatorsFromPreparedInputsAndCircuit(
    [{ preset: "basis_0" }],
    [
      { gates: ["X"] },
      { gates: ["M"] },
    ],
    1,
    3,
  );

  assert.equal(staged.error, null);
  assert.equal(staged.stages.length, 3);
  assert.equal(staged.stages[0].label, "Input");
  assert.equal(staged.stages[1].label, "After C1");
  assert.equal(staged.stages[2].label, "After C2");
  assert.equal(staged.stages[0].operator.dimension, 2);
  assert.equal(staged.stages[2].operator.trace, 1);
});
