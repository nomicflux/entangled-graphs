const test = require("node:test");
const assert = require("node:assert/strict");

const persistence = require("../.tmp-test/app/persistence.js");
const deutsch = require("../.tmp-test/components/algorithms/deutsch/engine.js");
const guessMode = require("../.tmp-test/components/algorithms/deutsch/guess-mode.js");

const approx = (actual, expected, tolerance = 1e-6) => {
  assert.ok(Math.abs(actual - expected) <= tolerance, `expected ${actual} ≈ ${expected}`);
};

const fakeStorage = (initial = {}) => {
  const store = new Map(Object.entries(initial));
  return {
    getItem: (key) => (store.has(key) ? store.get(key) : null),
    setItem: (key, value) => {
      store.set(key, value);
    },
  };
};

test("algorithm persistence keeps deutsch selection across read/write cycle", () => {
  const storage = fakeStorage({
    [persistence.ALGORITHM_STORAGE_KEY]: "deutsch",
    [persistence.WORKSPACE_STORAGE_KEY]: "algorithms",
  });

  assert.equal(persistence.readAlgorithmFromStorage(storage), "deutsch");
  persistence.writeAlgorithmToStorage(storage, "deutsch");
  assert.equal(persistence.readAlgorithmFromStorage(storage), "deutsch");
});

test("oracle switching remains stable when revisiting previous oracle", () => {
  const first = deutsch.deutschExpectedResult("const-0");
  const switched = ["balanced-id", "const-1", "balanced-not"].map((oracle) => deutsch.deutschExpectedResult(oracle));
  const revisited = deutsch.deutschExpectedResult("const-0");

  for (const result of switched) {
    assert.equal(result.predictedDecision, result.oracle.oracleClass);
  }
  assert.equal(revisited.predictedDecision, first.predictedDecision);
  approx(revisited.q0ConstantProbability, first.q0ConstantProbability);
  approx(revisited.q0BalancedProbability, first.q0BalancedProbability);
});

test("sampled verdict matches expected verdict for each canonical oracle", () => {
  const deterministicRandom = () => 0.173;
  for (const oracleId of ["const-0", "const-1", "balanced-id", "balanced-not"]) {
    const expected = deutsch.deutschExpectedResult(oracleId);
    const sampled = deutsch.deutschSampleResult(oracleId, deutsch.DEFAULT_DEUTSCH_INPUTS, deterministicRandom);
    assert.equal(sampled.predictedDecision, expected.predictedDecision);
  }
});

test("guess mode reveal and reset behavior remains consistent", () => {
  const round = guessMode.startDeutschGuessRound(() => 0.2);
  const revealed = guessMode.submitDeutschGuess(round, "constant");
  assert.equal(revealed.revealed, true);
  assert.equal(revealed.guess, "constant");
  assert.equal(revealed.correct, true);

  const reset = guessMode.startDeutschGuessRound(() => 0.8);
  assert.equal(reset.revealed, false);
  assert.equal(reset.guess, null);
  assert.equal(reset.correct, null);
  assert.equal(reset.activeOracle, "balanced-not");
});
