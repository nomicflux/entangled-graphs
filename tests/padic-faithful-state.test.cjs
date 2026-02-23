const test = require("node:test");
const assert = require("node:assert/strict");

const faithful = require("../.tmp-test/padic-faithful/index.js");

const cloneState = () => JSON.parse(JSON.stringify(faithful.pAdicFaithfulState));

const restoreState = (snapshot) => {
  faithful.pAdicFaithfulState.prime = snapshot.prime;
  faithful.pAdicFaithfulState.viewMode = snapshot.viewMode;
  faithful.pAdicFaithfulState.qubitCount = snapshot.qubitCount;
  faithful.pAdicFaithfulState.preparedInputs = snapshot.preparedInputs;
  faithful.pAdicFaithfulState.columns = snapshot.columns;
  faithful.pAdicFaithfulState.selectedGate = snapshot.selectedGate;
  faithful.pAdicFaithfulState.selectedOutcomeId = snapshot.selectedOutcomeId;
};

test("faithful state selectors produce valuation-shell-first rows", () => {
  const original = cloneState();

  try {
    faithful.setFaithfulPrime(3);
    faithful.setFaithfulQubitCount(1);
    faithful.setFaithfulPreparedPreset(0, "basis_0");

    const rows = faithful.faithfulOutcomeRows.value;
    assert.equal(rows.length, 2);
    assert.equal(rows[0].id, "omega_0");
    assert.equal(rows[1].id, "omega_1");

    const shells = faithful.faithfulOutcomeShells.value;
    assert.equal(shells.length, 2);
    assert.ok(shells[0].valuation <= shells[1].valuation);
    assert.ok(shells[0].prefixGroups.length >= 1);
    assert.ok(typeof shells[0].prefixGroups[0].prefix === "string");

    faithful.setFaithfulSelectedOutcome("omega_0");
    assert.equal(faithful.faithfulSelectedOutcome.value.id, "omega_0");

    faithful.setFaithfulViewMode("digit_vector");
    assert.equal(faithful.pAdicFaithfulState.viewMode, "digit_vector");
    assert.ok(faithful.faithfulDerivedNodes.value.length >= 1);
  } finally {
    restoreState(original);
  }
});

test("faithful shell grouping includes shared-prefix buckets within a valuation shell", () => {
  const original = cloneState();

  try {
    faithful.setFaithfulPrime(3);
    faithful.setFaithfulQubitCount(1);
    faithful.setFaithfulPreparedPreset(0, "shell_weighted");

    const shells = faithful.faithfulOutcomeShells.value;
    assert.equal(shells.length, 1);
    assert.equal(shells[0].valuation, -1);
    assert.equal(shells[0].prefixGroups.length, 2);

    const groupedIds = shells[0].prefixGroups.map((group) => group.rows.map((row) => row.id).join(","));
    assert.deepEqual(groupedIds, ["omega_1", "omega_0"]);
  } finally {
    restoreState(original);
  }
});

test("faithful prep state composes per-qubit presets into an n-qubit density operator", () => {
  const original = cloneState();

  try {
    faithful.setFaithfulPrime(3);
    faithful.setFaithfulQubitCount(2);
    assert.equal(faithful.pAdicFaithfulState.preparedInputs.length, 2);
    assert.equal(faithful.faithfulRhoResult.value.error, null);
    assert.equal(faithful.faithfulRhoResult.value.operator.dimension, 4);

    let rows = faithful.faithfulOutcomeRows.value;
    let byId = new Map(rows.map((row) => [row.id, row]));
    assert.equal(byId.get("omega_0").w_raw, 1);
    assert.equal(byId.get("omega_1").w_raw, 0);

    faithful.setFaithfulPreparedPreset(1, "basis_1");
    rows = faithful.faithfulOutcomeRows.value;
    byId = new Map(rows.map((row) => [row.id, row]));
    assert.equal(byId.get("omega_0").w_raw, 0);
    assert.equal(byId.get("omega_1").w_raw, 1);

    // Off-diagonal coherence remains in rho while computational-basis outcomes stay balanced.
    faithful.setFaithfulPreparedPreset(0, "offdiag_pos");
    faithful.setFaithfulPreparedPreset(1, "offdiag_neg");
    rows = faithful.faithfulOutcomeRows.value;
    byId = new Map(rows.map((row) => [row.id, row]));
    assert.equal(byId.get("omega_0").w_raw, 0.25);
    assert.equal(byId.get("omega_1").w_raw, 0.25);
    assert.equal(byId.get("omega_2").w_raw, 0.25);
    assert.equal(byId.get("omega_3").w_raw, 0.25);

    faithful.setFaithfulPreparedPreset(0, "basis_0");
    faithful.setFaithfulPreparedPreset(1, "shell_weighted");
    rows = faithful.faithfulOutcomeRows.value;
    byId = new Map(rows.map((row) => [row.id, row]));
    assert.equal(byId.get("omega_0").w_raw, 2 / 3);
    assert.equal(byId.get("omega_1").w_raw, 1 / 3);

    faithful.setFaithfulPrime(5);
    rows = faithful.faithfulOutcomeRows.value;
    byId = new Map(rows.map((row) => [row.id, row]));
    assert.equal(byId.get("omega_0").w_raw, 4 / 5);
    assert.equal(byId.get("omega_1").w_raw, 1 / 5);
  } finally {
    restoreState(original);
  }
});

test("faithful circuit gates evolve full n-qubit operator outcomes", () => {
  const original = cloneState();

  try {
    faithful.setFaithfulPrime(3);
    faithful.setFaithfulQubitCount(1);
    faithful.setFaithfulPreparedPreset(0, "basis_0");

    let rows = faithful.faithfulOutcomeRows.value;
    let byId = new Map(rows.map((row) => [row.id, row]));
    assert.equal(byId.get("omega_0").w_raw, 1);
    assert.equal(byId.get("omega_1").w_raw, 0);

    faithful.setFaithfulColumnGate(0, 0, "X");
    rows = faithful.faithfulOutcomeRows.value;
    byId = new Map(rows.map((row) => [row.id, row]));
    assert.equal(byId.get("omega_0").w_raw, 0);
    assert.equal(byId.get("omega_1").w_raw, 1);

    faithful.setFaithfulColumnGate(0, 0, "Z");
    rows = faithful.faithfulOutcomeRows.value;
    byId = new Map(rows.map((row) => [row.id, row]));
    assert.equal(byId.get("omega_0").w_raw, 1);
    assert.equal(byId.get("omega_1").w_raw, 0);

    faithful.setFaithfulPreparedPreset(0, "offdiag_pos");
    faithful.setFaithfulColumnGate(0, 0, "M");
    rows = faithful.faithfulOutcomeRows.value;
    byId = new Map(rows.map((row) => [row.id, row]));
    assert.equal(byId.get("omega_0").w_raw, 0.5);
    assert.equal(byId.get("omega_1").w_raw, 0.5);

    faithful.setFaithfulQubitCount(2);
    faithful.setFaithfulPreparedPreset(0, "basis_1");
    faithful.setFaithfulPreparedPreset(1, "basis_0");
    faithful.pAdicFaithfulState.columns = [{ gates: [null, null] }];
    faithful.setFaithfulColumnGate(0, 0, "CNOT_CONTROL");
    faithful.setFaithfulColumnGate(0, 1, "CNOT_TARGET");
    rows = faithful.faithfulOutcomeRows.value;
    byId = new Map(rows.map((row) => [row.id, row]));
    assert.equal(byId.get("omega_0").w_raw, 0);
    assert.equal(byId.get("omega_1").w_raw, 0);
    assert.equal(byId.get("omega_2").w_raw, 0);
    assert.equal(byId.get("omega_3").w_raw, 1);

    faithful.setFaithfulQubitCount(1);
    faithful.setFaithfulPreparedPreset(0, "basis_0");
    faithful.pAdicFaithfulState.columns = [{ gates: [null] }];
    faithful.setFaithfulColumnGate(0, 0, "H");
    rows = faithful.faithfulOutcomeRows.value;
    byId = new Map(rows.map((row) => [row.id, row]));
    assert.equal(byId.get("omega_0").w_raw, 0.5);
    assert.equal(byId.get("omega_1").w_raw, 0.5);
  } finally {
    restoreState(original);
  }
});

test("faithful stage views expose per-column valuation-shell snapshots", () => {
  const original = cloneState();

  try {
    faithful.setFaithfulPrime(3);
    faithful.setFaithfulQubitCount(1);
    faithful.setFaithfulPreparedPreset(0, "basis_0");

    faithful.pAdicFaithfulState.columns = [
      { gates: ["X"] },
      { gates: ["M"] },
    ];

    const stages = faithful.faithfulStageViews.value;
    assert.equal(stages.length, 3);
    assert.equal(stages[0].label, "Input");
    assert.equal(stages[1].label, "After C1");
    assert.equal(stages[2].label, "After C2");
    assert.equal(stages[0].entries.length, 4);
    assert.equal(stages[1].entries.length, 4);
    assert.equal(stages[0].nonZeroEntryCount, 1);
    assert.equal(stages[1].nonZeroEntryCount, 1);

    const inputRows = new Map(stages[0].rows.map((row) => [row.id, row]));
    assert.equal(inputRows.get("omega_0").w_raw, 1);
    assert.equal(inputRows.get("omega_1").w_raw, 0);

    const afterXRows = new Map(stages[1].rows.map((row) => [row.id, row]));
    assert.equal(afterXRows.get("omega_0").w_raw, 0);
    assert.equal(afterXRows.get("omega_1").w_raw, 1);

    assert.ok(stages[2].shells.length >= 1);
    assert.ok(stages[2].shells[0].prefixGroups.length >= 1);
  } finally {
    restoreState(original);
  }
});

test("faithful stage visuals react to off-diagonal entry changes even when omega_i rows are unchanged", () => {
  const original = cloneState();

  try {
    faithful.setFaithfulPrime(3);
    faithful.setFaithfulQubitCount(1);
    faithful.setFaithfulPreparedPreset(0, "offdiag_pos");

    const rowsBefore = new Map(
      faithful.faithfulOutcomeRows.value.map((row) => [row.id, `${row.w_raw}|${row.v_p}|${row.abs_p}|${row.digits.text}`]),
    );
    const nodesBefore = new Map(
      faithful.faithfulDerivedNodes.value.map((node) => [node.id, `${node.x.toFixed(6)}|${node.y.toFixed(6)}`]),
    );

    faithful.setFaithfulColumnGate(0, 0, "Z");

    const stages = faithful.faithfulStageViews.value;
    assert.ok(stages.length >= 2);
    const inputStage = stages[0];
    const afterZStage = stages[1];

    const diagonalBefore = new Map(inputStage.rows.map((row) => [row.id, row.w_raw]));
    const diagonalAfter = new Map(afterZStage.rows.map((row) => [row.id, row.w_raw]));
    assert.equal(diagonalBefore.get("omega_0"), diagonalAfter.get("omega_0"));
    assert.equal(diagonalBefore.get("omega_1"), diagonalAfter.get("omega_1"));

    const entryBefore = new Map(inputStage.entries.map((entry) => [entry.id, entry.value_text]));
    const entryAfter = new Map(afterZStage.entries.map((entry) => [entry.id, entry.value_text]));
    assert.equal(entryBefore.get("rho_0_1"), "1/2");
    assert.equal(entryAfter.get("rho_0_1"), "-1/2");
    assert.equal(entryBefore.get("rho_1_0"), "1/2");
    assert.equal(entryAfter.get("rho_1_0"), "-1/2");

    const rowsAfter = faithful.faithfulOutcomeRows.value;
    const unchangedRowIds = rowsAfter
      .map((row) => row.id)
      .filter((id) => rowsBefore.get(id) === `${rowsAfter.find((row) => row.id === id).w_raw}|${rowsAfter.find((row) => row.id === id).v_p}|${rowsAfter.find((row) => row.id === id).abs_p}|${rowsAfter.find((row) => row.id === id).digits.text}`);
    assert.equal(unchangedRowIds.length, rowsAfter.length);

    const nodesAfter = faithful.faithfulDerivedNodes.value;
    const movedNodeIds = nodesAfter
      .map((node) => node.id)
      .filter((id) => nodesBefore.get(id) !== `${nodesAfter.find((node) => node.id === id).x.toFixed(6)}|${nodesAfter.find((node) => node.id === id).y.toFixed(6)}`);
    assert.ok(movedNodeIds.includes("rho_0_1") || movedNodeIds.includes("rho_1_0"));
  } finally {
    restoreState(original);
  }
});

test("faithful derived geometry reacts to omega_i numeric changes", () => {
  const original = cloneState();

  try {
    faithful.setFaithfulPrime(3);
    faithful.setFaithfulQubitCount(1);
    faithful.setFaithfulPreparedPreset(0, "basis_0");
    faithful.pAdicFaithfulState.columns = [{ gates: [null] }];

    let rows = faithful.faithfulOutcomeRows.value;
    const baselineRows = new Map(rows.map((row) => [row.id, `${row.w_raw}|${row.v_p}|${row.abs_p}|${row.digits.text}`]));
    let nodes = faithful.faithfulDerivedNodes.value;
    const baselineNodes = new Map(nodes.map((node) => [node.id, `${node.x.toFixed(6)}|${node.y.toFixed(6)}`]));

    faithful.setFaithfulColumnGate(0, 0, "X");
    rows = faithful.faithfulOutcomeRows.value;
    nodes = faithful.faithfulDerivedNodes.value;

    const changedRowIds = rows
      .map((row) => row.id)
      .filter((id) => baselineRows.get(id) !== `${rows.find((row) => row.id === id).w_raw}|${rows.find((row) => row.id === id).v_p}|${rows.find((row) => row.id === id).abs_p}|${rows.find((row) => row.id === id).digits.text}`);
    assert.ok(changedRowIds.length > 0);

    const movedNodeIds = nodes
      .map((node) => node.id)
      .filter((id) => baselineNodes.get(id) !== `${nodes.find((node) => node.id === id).x.toFixed(6)}|${nodes.find((node) => node.id === id).y.toFixed(6)}`);
    assert.ok(movedNodeIds.length > 0);
  } finally {
    restoreState(original);
  }
});

test("faithful digit-vector map distinguishes X vs no-X by entry support coordinates", () => {
  const original = cloneState();

  try {
    faithful.setFaithfulPrime(3);
    faithful.setFaithfulViewMode("digit_vector");
    faithful.setFaithfulQubitCount(1);
    faithful.setFaithfulPreparedPreset(0, "basis_0");
    faithful.pAdicFaithfulState.columns = [{ gates: [null] }];

    let stages = faithful.faithfulStageViews.value;
    const noGateStage = stages[stages.length - 1];
    const noGateSupport = noGateStage.entries.filter((entry) => entry.abs_p > 0).map((entry) => entry.id);
    assert.deepEqual(noGateSupport, ["rho_0_0"]);

    let nodes = faithful.faithfulDerivedNodes.value;
    const nodeByIdNoGate = new Map(nodes.map((node) => [node.id, `${node.x.toFixed(6)}|${node.y.toFixed(6)}`]));
    assert.notEqual(nodeByIdNoGate.get("rho_0_0"), nodeByIdNoGate.get("rho_1_1"));

    faithful.setFaithfulColumnGate(0, 0, "X");
    stages = faithful.faithfulStageViews.value;
    const withXStage = stages[stages.length - 1];
    const withXSupport = withXStage.entries.filter((entry) => entry.abs_p > 0).map((entry) => entry.id);
    assert.deepEqual(withXSupport, ["rho_1_1"]);

    nodes = faithful.faithfulDerivedNodes.value;
    const nodeByIdWithX = new Map(nodes.map((node) => [node.id, `${node.x.toFixed(6)}|${node.y.toFixed(6)}`]));
    assert.notEqual(nodeByIdWithX.get("rho_0_0"), nodeByIdWithX.get("rho_1_1"));
  } finally {
    restoreState(original);
  }
});
