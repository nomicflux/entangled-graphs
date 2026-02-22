const test = require("node:test");
const assert = require("node:assert/strict");

const faithful = require("../.tmp-test/padic-faithful/index.js");

test("sortOutcomeRowsByShell orders by valuation shell then residue", () => {
  const rows = [
    {
      id: "a",
      label: "A",
      basis: "a",
      w_raw: 1,
      v_p: 2,
      abs_p: 0.1,
      unitResidue: 2,
      digits: { sign: 1, digits: [1], truncated: false, text: "1" },
      w_norm: 0.2,
    },
    {
      id: "b",
      label: "B",
      basis: "b",
      w_raw: 1,
      v_p: 1,
      abs_p: 0.2,
      unitResidue: 1,
      digits: { sign: 1, digits: [1], truncated: false, text: "1" },
      w_norm: 0.3,
    },
    {
      id: "c",
      label: "C",
      basis: "c",
      w_raw: 1,
      v_p: 1,
      abs_p: 0.2,
      unitResidue: 0,
      digits: { sign: 1, digits: [1], truncated: false, text: "1" },
      w_norm: 0.5,
    },
  ];

  const sorted = faithful.sortOutcomeRowsByShell(rows);
  assert.deepEqual(
    sorted.map((entry) => entry.id),
    ["c", "b", "a"],
  );
});
