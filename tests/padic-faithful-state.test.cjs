const test = require("node:test");
const assert = require("node:assert/strict");

const faithful = require("../.tmp-test/padic-faithful/index.js");

const cloneState = () => JSON.parse(JSON.stringify(faithful.pAdicFaithfulState));

const restoreState = (snapshot) => {
  faithful.pAdicFaithfulState.prime = snapshot.prime;
  faithful.pAdicFaithfulState.viewMode = snapshot.viewMode;
  faithful.pAdicFaithfulState.rhoRows = snapshot.rhoRows;
  faithful.pAdicFaithfulState.effects = snapshot.effects;
  faithful.pAdicFaithfulState.selectedOutcomeId = snapshot.selectedOutcomeId;
};

test("faithful state selectors produce valuation-shell-first rows", () => {
  const original = cloneState();

  try {
    faithful.setFaithfulPrime(3);
    faithful.pAdicFaithfulState.rhoRows = [
      ["1", "0"],
      ["0", "0"],
    ];
    faithful.pAdicFaithfulState.effects = [
      {
        id: "omega_a",
        label: "A",
        rows: [
          ["1", "0"],
          ["0", "0"],
        ],
      },
      {
        id: "omega_b",
        label: "B",
        rows: [
          ["0", "0"],
          ["0", "1"],
        ],
      },
    ];

    const rows = faithful.faithfulOutcomeRows.value;
    assert.equal(rows.length, 2);
    assert.equal(rows[0].id, "omega_a");
    assert.equal(rows[1].id, "omega_b");

    const shells = faithful.faithfulOutcomeShells.value;
    assert.equal(shells.length, 2);
    assert.ok(shells[0].valuation <= shells[1].valuation);

    faithful.setFaithfulSelectedOutcome("omega_a");
    assert.equal(faithful.faithfulSelectedOutcome.value.id, "omega_a");

    faithful.setFaithfulViewMode("digit_vector");
    assert.equal(faithful.pAdicFaithfulState.viewMode, "digit_vector");
    assert.ok(faithful.faithfulDerivedNodes.value.length >= 1);
  } finally {
    restoreState(original);
  }
});
