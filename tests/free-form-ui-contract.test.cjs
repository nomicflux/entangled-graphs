const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");

const mixedStore = require("../.tmp-test/mixed-state/store.js");
const mixedActions = require("../.tmp-test/mixed-state/actions.js");
const mixedGates = require("../.tmp-test/mixed-state/gates.js");
const pureStore = require("../.tmp-test/state/store.js");

const readSource = (workspacePath) => fs.readFileSync(path.join(process.cwd(), workspacePath), "utf8");

const cloneMixedColumns = (columns) =>
  columns.map((column) => ({
    gates: column.gates.map((gate) => ({
      id: gate.id,
      process: gate.process.kind === "unitary"
        ? { kind: "unitary", gateId: gate.process.gateId }
        : gate.process.kind === "measurement"
          ? { kind: "measurement" }
          : { kind: "noise", channelId: gate.process.channelId, strength: gate.process.strength },
      wires: [...gate.wires],
    })),
  }));

const clonePreparedInputs = (preparedInputs) => preparedInputs.map((entry) => ({ ...entry }));
const clonePureColumns = (columns) =>
  columns.map((column) => ({
    gates: column.gates.map((gate) => ({ id: gate.id, gate: gate.gate, wires: [...gate.wires] })),
  }));
const clonePureBloch = (preparedBloch) => preparedBloch.map((entry) => ({ ...entry }));

test("free-form workbench exposes pure and mixed subtabs with persisted selection", () => {
  const source = readSource("src/components/FreeFormWorkbench.vue");

  assert.match(source, /Pure States/);
  assert.match(source, /Density Matrices/);
  assert.match(source, /readFreeFormSectionFromStorage/);
  assert.match(source, /writeFreeFormSectionToStorage/);
});

test("pure and mixed stores stay isolated", () => {
  const originalMixedInputs = clonePreparedInputs(mixedStore.mixedState.preparedInputs);
  const originalMixedColumns = cloneMixedColumns(mixedStore.mixedState.columns);
  const originalPureBloch = clonePureBloch(pureStore.state.preparedBloch);
  const originalPureColumns = clonePureColumns(pureStore.state.columns);

  try {
    mixedStore.mixedState.preparedInputs = [{ rho00: "0.5", rho11: "0.5", rho01Real: "0.5", rho01Imag: "0" }];
    pureStore.state.preparedBloch = [{ theta: 0, phi: 0 }, { theta: Math.PI / 2, phi: 0 }];

    assert.equal(mixedStore.mixedState.preparedInputs.length, 1);
    assert.equal(pureStore.state.preparedBloch.length, 2);
    assert.equal(pureStore.state.columns.length, originalPureColumns.length);
    assert.equal(mixedStore.mixedState.columns.length, originalMixedColumns.length);
  } finally {
    mixedStore.mixedState.preparedInputs = originalMixedInputs;
    mixedStore.mixedState.columns = originalMixedColumns;
    pureStore.state.preparedBloch = originalPureBloch;
    pureStore.state.columns = originalPureColumns;
  }
});

test("placing mixed-state noise on an occupied slot inserts a new column instead of overwriting the gate", () => {
  const originalInputs = clonePreparedInputs(mixedStore.mixedState.preparedInputs);
  const originalColumns = cloneMixedColumns(mixedStore.mixedState.columns);
  const originalSelectedStageIndex = mixedStore.mixedState.selectedStageIndex;
  const originalNoiseStrength = mixedStore.mixedState.noiseStrength;

  try {
    mixedStore.mixedState.preparedInputs = [
      { rho00: "1", rho11: "0", rho01Real: "0", rho01Imag: "0" },
      { rho00: "1", rho11: "0", rho01Real: "0", rho01Imag: "0" },
    ];
    mixedStore.mixedState.columns = [
      {
        gates: [
          { id: "u1", process: { kind: "unitary", gateId: "H" }, wires: [0] },
        ],
      },
    ];
    mixedStore.mixedState.selectedStageIndex = 1;
    mixedActions.setMixedNoiseStrength(0.25);

    const placed = mixedActions.setMixedGateAt(0, 0, mixedGates.noiseToolId("bit-flip", 0.25));

    assert.equal(placed, true);
    assert.equal(mixedStore.mixedState.columns.length, 2);
    assert.equal(mixedStore.mixedState.columns[0].gates[0].process.kind, "unitary");
    assert.equal(mixedStore.mixedState.columns[1].gates[0].process.kind, "noise");
    assert.equal(mixedStore.mixedState.columns[1].gates[0].process.channelId, "bit-flip");
    assert.equal(mixedStore.mixedState.columns[1].gates[0].process.strength, 0.25);
  } finally {
    mixedStore.mixedState.preparedInputs = originalInputs;
    mixedStore.mixedState.columns = originalColumns;
    mixedStore.mixedState.selectedStageIndex = originalSelectedStageIndex;
    mixedStore.mixedState.noiseStrength = originalNoiseStrength;
  }
});

test("0% noise tools round-trip through the tool id parser", () => {
  const toolId = mixedGates.noiseToolId("bit-flip", 0);
  const parsed = mixedGates.parseNoiseToolId(toolId);

  assert.equal(toolId, "noise:bit-flip:0");
  assert.deepEqual(parsed, { channelId: "bit-flip", strength: 0 });
});
