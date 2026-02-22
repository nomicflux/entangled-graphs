const test = require("node:test");
const assert = require("node:assert/strict");

const faithful = require("../.tmp-test/padic-faithful/index.js");

test("sortOutcomeRowsByShell orders by valuation shell then residue", () => {
  const rows = [
    {
      id: "a",
      label: "A",
      omega: 1,
      valuation: 2,
      norm: 0.1,
      unitResidue: 2,
      digits: { sign: 1, digits: [1], truncated: false, text: "1" },
      wNorm: 0.2,
    },
    {
      id: "b",
      label: "B",
      omega: 1,
      valuation: 1,
      norm: 0.2,
      unitResidue: 1,
      digits: { sign: 1, digits: [1], truncated: false, text: "1" },
      wNorm: 0.3,
    },
    {
      id: "c",
      label: "C",
      omega: 1,
      valuation: 1,
      norm: 0.2,
      unitResidue: 0,
      digits: { sign: 1, digits: [1], truncated: false, text: "1" },
      wNorm: 0.5,
    },
  ];

  const sorted = faithful.sortOutcomeRowsByShell(rows);
  assert.deepEqual(
    sorted.map((entry) => entry.id),
    ["c", "b", "a"],
  );
});
