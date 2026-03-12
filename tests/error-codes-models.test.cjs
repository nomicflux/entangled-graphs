const test = require("node:test");
const assert = require("node:assert/strict");
const { effectScope } = require("vue");

const { useBitFlipRepetitionModel } = require("../.tmp-test/components/error-codes/bit-flip/useBitFlipRepetitionModel.js");
const { usePhaseFlipRepetitionModel } = require("../.tmp-test/components/error-codes/phase-flip/usePhaseFlipRepetitionModel.js");
const { useShorNineQubitModel } = require("../.tmp-test/components/error-codes/shor/useShorNineQubitModel.js");
const { useSteaneSevenQubitModel } = require("../.tmp-test/components/error-codes/steane/useSteaneSevenQubitModel.js");

const near = (actual, expected, epsilon = 1e-9) => Math.abs(actual - expected) <= epsilon;

const createScopedModel = (factory) => {
  const scope = effectScope();
  const model = scope.run(factory);
  assert.ok(model);
  return {
    model,
    stop: () => scope.stop(),
  };
};

test("bit-flip repetition preserves the logical state when no error is injected", (t) => {
  const { model, stop } = createScopedModel(useBitFlipRepetitionModel);
  t.after(stop);
  model.selectedPreset.value = "plus";
  model.clearInjectedError();

  assert.equal(model.visibleColumns.value.length, model.columns.value.length);
  assert.equal(model.stageSnapshots.value.length, model.visibleColumns.value.length + 1);
  assert.ok(near(model.recoveryFidelity.value, 1));
  assert.equal(model.dominantSyndrome.value.bits, "00");
});

test("bit-flip repetition corrects a single X error", (t) => {
  const { model, stop } = createScopedModel(useBitFlipRepetitionModel);
  t.after(stop);
  model.selectedPreset.value = "plus";
  assert.equal(model.setInjectedError("X", 2), true);

  assert.ok(model.recoveryFidelity.value > 0.999999);
  assert.equal(model.dominantSyndrome.value.bits, "01");
});

test("bit-flip repetition does not protect a phase error on a phase-sensitive input", (t) => {
  const { model, stop } = createScopedModel(useBitFlipRepetitionModel);
  t.after(stop);
  model.selectedPreset.value = "plus";
  assert.equal(model.setInjectedError("Z", 0), true);

  assert.ok(model.recoveryFidelity.value < 0.01);
});

test("bit-flip repetition supports multiple injected errors and fails outside the single-error regime", (t) => {
  const { model, stop } = createScopedModel(useBitFlipRepetitionModel);
  t.after(stop);
  model.selectedPreset.value = "zero";
  assert.equal(model.setInjectedError("X", 0), true);
  assert.equal(model.setInjectedError("X", 1), true);

  assert.equal(model.injectedErrors.value.length, 2);
  assert.deepEqual(
    model.injectedErrors.value.map((entry) => [entry.gate, entry.row]),
    [
      ["X", 0],
      ["X", 1],
    ],
  );
  assert.ok(model.recoveryFidelity.value < 0.01);
});

test("phase-flip repetition corrects a single Z error", (t) => {
  const { model, stop } = createScopedModel(usePhaseFlipRepetitionModel);
  t.after(stop);
  model.selectedPreset.value = "plus";
  assert.equal(model.setInjectedError("Z", 1), true);

  assert.ok(model.recoveryFidelity.value > 0.999999);
  assert.equal(model.dominantSyndrome.value.bits, "10");
});

test("phase-flip repetition does not protect an X error", (t) => {
  const { model, stop } = createScopedModel(usePhaseFlipRepetitionModel);
  t.after(stop);
  model.selectedPreset.value = "plus";
  assert.equal(model.setInjectedError("X", 1), true);

  assert.ok(model.recoveryFidelity.value < 0.01);
});

test("phase-flip repetition supports multiple injected errors and fails outside the single-error regime", (t) => {
  const { model, stop } = createScopedModel(usePhaseFlipRepetitionModel);
  t.after(stop);
  model.selectedPreset.value = "zero";
  assert.equal(model.setInjectedError("Z", 0), true);
  assert.equal(model.setInjectedError("Z", 1), true);

  assert.equal(model.injectedErrors.value.length, 2);
  assert.deepEqual(
    model.injectedErrors.value.map((entry) => [entry.gate, entry.row]),
    [
      ["Z", 0],
      ["Z", 1],
    ],
  );
  assert.ok(model.recoveryFidelity.value < 0.01);
});

test("shor code corrects a single X error", (t) => {
  const { model, stop } = createScopedModel(useShorNineQubitModel);
  t.after(stop);
  model.selectedPreset.value = "plus";
  assert.equal(model.setInjectedError("X", 4), true);

  assert.equal(model.visibleColumns.value.length, model.columns.value.length);
  assert.equal(model.stageSnapshots.value.length, model.visibleColumns.value.length + 1);
  assert.ok(model.recoveryFidelity.value > 0.999999);
  assert.equal(model.classicalLayout.value.lanes.length, 4);
  assert.deepEqual(model.classicalLayout.value.registers.map((entry) => entry.label), ["A", "B", "C", "Phase"]);
  assert.equal(model.blockSyndromes.value[1].dominantBits, "10");
  assert.equal(model.phaseSyndrome.value.dominantBits, "00");
  assert.match(model.classicalLayout.value.conditionBadges[0].text, /^flip q/);
});

test("shor code corrects a single Z error", (t) => {
  const { model, stop } = createScopedModel(useShorNineQubitModel);
  t.after(stop);
  model.selectedPreset.value = "plus";
  assert.equal(model.setInjectedError("Z", 7), true);

  assert.ok(model.recoveryFidelity.value > 0.999999);
  assert.equal(model.phaseSyndrome.value.dominantBits, "01");
});

test("shor code combines bit and phase syndromes for a Y error", (t) => {
  const { model, stop } = createScopedModel(useShorNineQubitModel);
  t.after(stop);
  model.selectedPreset.value = "plus";
  assert.equal(model.setInjectedError("Y", 1), true);

  assert.ok(model.recoveryFidelity.value > 0.999999);
  assert.equal(model.blockSyndromes.value[0].dominantBits, "10");
  assert.equal(model.phaseSyndrome.value.dominantBits, "11");
  assert.match(model.diagnosisSummary.value, /q1/);
});

test("shor code allows multiple injected errors and can fail outside the single-error regime", (t) => {
  const { model, stop } = createScopedModel(useShorNineQubitModel);
  t.after(stop);
  model.selectedPreset.value = "zero";
  assert.equal(model.setInjectedError("Y", 0), true);
  assert.equal(model.setInjectedError("Z", 3), true);

  assert.equal(model.injectedErrors.value.length, 2);
  assert.deepEqual(
    model.injectedErrors.value.map((entry) => [entry.gate, entry.row]),
    [
      ["Y", 0],
      ["Z", 3],
    ],
  );
  assert.ok(model.recoveryFidelity.value < 0.01);
});

test("steane code keeps a compact six-column lesson and reports no-error diagnosis", (t) => {
  const { model, stop } = createScopedModel(useSteaneSevenQubitModel);
  t.after(stop);
  model.selectedPreset.value = "plus";
  model.clearInjectedError();

  assert.equal(model.visibleColumns.value.length, 6);
  assert.deepEqual(
    model.visibleColumns.value.map((column) => column.kind),
    ["primitive", "error", "parity-family", "parity-family", "primitive", "primitive"],
  );
  assert.equal(model.visibleColumns.value[2].basis, "Z");
  assert.equal(model.visibleColumns.value[3].basis, "X");
  assert.equal(model.stageSnapshots.value.length, 7);
  assert.equal(model.diagnosisSummary.value, "—");
  assert.equal(model.xSyndromeBits.value, "000");
  assert.equal(model.zSyndromeBits.value, "000");
  assert.equal(model.classicalLayout.value.lanes.length, 2);
  assert.deepEqual(model.classicalLayout.value.registers.map((entry) => entry.label), ["Z", "X"]);
  assert.equal(model.classicalLayout.value.conditionBadges.length, 0);
  assert.ok(near(model.recoveryFidelity.value, 1));
});

test("steane code corrects a single X error", (t) => {
  const { model, stop } = createScopedModel(useSteaneSevenQubitModel);
  t.after(stop);
  model.selectedPreset.value = "plus";
  assert.equal(model.setInjectedError("X", 4), true);

  assert.ok(model.recoveryFidelity.value > 0.999999);
  assert.equal(model.xSyndromeBits.value, "000");
  assert.equal(model.zSyndromeBits.value, "101");
  assert.equal(model.diagnosisSummary.value, "X @ q4");
  assert.deepEqual(model.classicalLayout.value.conditionBadges.map((entry) => entry.text), ["X @ q4"]);
});

test("steane code corrects a single Z error", (t) => {
  const { model, stop } = createScopedModel(useSteaneSevenQubitModel);
  t.after(stop);
  model.selectedPreset.value = "plus";
  assert.equal(model.setInjectedError("Z", 6), true);

  assert.ok(model.recoveryFidelity.value > 0.999999);
  assert.equal(model.xSyndromeBits.value, "111");
  assert.equal(model.zSyndromeBits.value, "000");
  assert.equal(model.diagnosisSummary.value, "Z @ q6");
});

test("steane code combines syndromes for a single Y error", (t) => {
  const { model, stop } = createScopedModel(useSteaneSevenQubitModel);
  t.after(stop);
  model.selectedPreset.value = "plus";
  assert.equal(model.setInjectedError("Y", 1), true);

  assert.ok(model.recoveryFidelity.value > 0.999999);
  assert.equal(model.xSyndromeBits.value, "010");
  assert.equal(model.zSyndromeBits.value, "010");
  assert.equal(model.diagnosisSummary.value, "Y @ q1");
});

test("steane code keeps helper rows locked for error injection", (t) => {
  const { model, stop } = createScopedModel(useSteaneSevenQubitModel);
  t.after(stop);

  assert.equal(model.setInjectedError("X", 7), false);
  assert.equal(model.setInjectedError("Z", 8), false);
});

test("steane code marks mixed diagnosis and fails outside the single-error regime", (t) => {
  const { model, stop } = createScopedModel(useSteaneSevenQubitModel);
  t.after(stop);
  model.selectedPreset.value = "zero";
  assert.equal(model.setInjectedError("X", 0), true);
  assert.equal(model.setInjectedError("Z", 3), true);

  assert.equal(model.injectedErrors.value.length, 2);
  assert.equal(model.diagnosisSummary.value, "mixed");
  assert.ok(model.recoveryFidelity.value < 0.01);
});
