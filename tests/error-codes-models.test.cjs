const test = require("node:test");
const assert = require("node:assert/strict");
const { effectScope } = require("vue");

const { useBitFlipRepetitionModel } = require("../.tmp-test/components/error-codes/bit-flip/useBitFlipRepetitionModel.js");
const { usePhaseFlipRepetitionModel } = require("../.tmp-test/components/error-codes/phase-flip/usePhaseFlipRepetitionModel.js");
const { useShorNineQubitModel } = require("../.tmp-test/components/error-codes/shor/useShorNineQubitModel.js");

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
  assert.match(model.injectedErrorLabel.value, /2 injected errors:/);
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
  assert.match(model.injectedErrorLabel.value, /2 injected errors:/);
  assert.ok(model.recoveryFidelity.value < 0.01);
});

test("shor code corrects a single X error", (t) => {
  const { model, stop } = createScopedModel(useShorNineQubitModel);
  t.after(stop);
  model.selectedPreset.value = "plus";
  assert.equal(model.setInjectedError("X", 4), true);

  assert.ok(model.recoveryFidelity.value > 0.999999);
  assert.equal(model.blockSyndromes.value[1].dominantBits, "10");
  assert.equal(model.phaseSyndrome.value.dominantBits, "00");
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
  assert.match(model.injectedErrorLabel.value, /2 injected errors:/);
  assert.ok(model.recoveryFidelity.value < 0.01);
});
