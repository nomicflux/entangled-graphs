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
  assert.equal(byId.get("omega_0").omega, 1);
  assert.equal(byId.get("omega_1").omega, 0);
  assert.equal(byId.get("omega_0").valuation, 0);
  assert.equal(byId.get("omega_1").valuation, Number.POSITIVE_INFINITY);
  assert.equal(byId.get("omega_0").wNorm, 1);
  assert.equal(byId.get("omega_1").wNorm, 0);
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
