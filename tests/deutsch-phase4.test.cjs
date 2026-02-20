const test = require("node:test");
const assert = require("node:assert/strict");

const deutsch = require("../.tmp-test/components/algorithms/deutsch/engine.js");
const guessMode = require("../.tmp-test/components/algorithms/deutsch/guess-mode.js");

const approx = (actual, expected, tolerance = 1e-6) => {
  assert.ok(Math.abs(actual - expected) <= tolerance, `expected ${actual} ≈ ${expected}`);
};

test("oracle-stage interference channels separate constant vs balanced", () => {
  const constantTimeline = deutsch.deutschInterferenceTimeline("const-0", deutsch.DEFAULT_DEUTSCH_INPUTS);
  const balancedTimeline = deutsch.deutschInterferenceTimeline("balanced-id", deutsch.DEFAULT_DEUTSCH_INPUTS);

  const constantOracleStage = constantTimeline[3];
  const balancedOracleStage = balancedTimeline[3];

  approx(constantOracleStage.constantChannel, 1);
  approx(constantOracleStage.balancedChannel, 0);
  approx(balancedOracleStage.constantChannel, 0);
  approx(balancedOracleStage.balancedChannel, 1);
});

test("interference visualization payload is stage-aligned and normalized", () => {
  const timeline = deutsch.deutschInterferenceTimeline("balanced-not", deutsch.DEFAULT_DEUTSCH_INPUTS);

  assert.equal(timeline.length, deutsch.deutschStageLabels.length);
  for (const frame of timeline) {
    assert.equal(frame.contributions.length, 2);
    assert.equal(frame.stageLabel, deutsch.deutschStageLabels[frame.stageIndex]);
    assert.ok(frame.supportInMinusSubspace >= 0);
    assert.ok(frame.supportInMinusSubspace <= 1 + 1e-6);
  }
});

test("guess-mode state transitions reveal correctness deterministically", () => {
  const round = guessMode.startDeutschGuessRound(() => 0.75);
  assert.equal(round.revealed, false);
  assert.equal(round.guess, null);
  assert.equal(round.correct, null);

  const submittedCorrect = guessMode.submitDeutschGuess(round, "balanced");
  assert.equal(submittedCorrect.revealed, true);
  assert.equal(submittedCorrect.guess, "balanced");
  assert.equal(submittedCorrect.correct, true);

  const submittedIncorrect = guessMode.submitDeutschGuess(round, "constant");
  assert.equal(submittedIncorrect.revealed, true);
  assert.equal(submittedIncorrect.guess, "constant");
  assert.equal(submittedIncorrect.correct, false);
});
