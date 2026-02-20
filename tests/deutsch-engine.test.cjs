const test = require("node:test");
const assert = require("node:assert/strict");

const complex = require("../.tmp-test/complex.js");
const deutsch = require("../.tmp-test/components/algorithms/deutsch/engine.js");

const approx = (actual, expected, tolerance = 1e-6) => {
  assert.ok(Math.abs(actual - expected) <= tolerance, `expected ${actual} ≈ ${expected}`);
};

test("deutsch oracle tables and classes match the standard 4", () => {
  assert.equal(deutsch.deutschOracleClass("const-0"), "constant");
  assert.equal(deutsch.deutschOracleClass("const-1"), "constant");
  assert.equal(deutsch.deutschOracleClass("balanced-id"), "balanced");
  assert.equal(deutsch.deutschOracleClass("balanced-not"), "balanced");

  assert.deepEqual(deutsch.deutschOracleTruthTable("const-0"), [
    { x: 0, fx: 0 },
    { x: 1, fx: 0 },
  ]);
  assert.deepEqual(deutsch.deutschOracleTruthTable("const-1"), [
    { x: 0, fx: 1 },
    { x: 1, fx: 1 },
  ]);
  assert.deepEqual(deutsch.deutschOracleTruthTable("balanced-id"), [
    { x: 0, fx: 0 },
    { x: 1, fx: 1 },
  ]);
  assert.deepEqual(deutsch.deutschOracleTruthTable("balanced-not"), [
    { x: 0, fx: 1 },
    { x: 1, fx: 0 },
  ]);
});

test("deutsch expected decision classifies constant vs balanced with one oracle call", () => {
  for (const oracleId of ["const-0", "const-1", "balanced-id", "balanced-not"]) {
    const expected = deutsch.deutschExpectedResult(oracleId);
    const oracleClass = deutsch.deutschOracleClass(oracleId);

    assert.equal(expected.predictedDecision, oracleClass);
    if (oracleClass === "constant") {
      approx(expected.q0ConstantProbability, 1);
      approx(expected.q0BalancedProbability, 0);
    } else {
      approx(expected.q0ConstantProbability, 0);
      approx(expected.q0BalancedProbability, 1);
    }
  }
});

test("deutsch sampled run matches expected class for canonical setup", () => {
  const deterministicRandom = () => 0.125;

  const constantSample = deutsch.deutschSampleResult("const-0", deutsch.DEFAULT_DEUTSCH_INPUTS, deterministicRandom);
  const balancedSample = deutsch.deutschSampleResult("balanced-id", deutsch.DEFAULT_DEUTSCH_INPUTS, deterministicRandom);

  assert.equal(constantSample.predictedDecision, "constant");
  assert.equal(constantSample.q0Value, 0);
  assert.equal(balancedSample.predictedDecision, "balanced");
  assert.equal(balancedSample.q0Value, 1);
});

test("deutsch expected result accepts user-edited input states", () => {
  const plus = {
    a: complex.from_real(Math.SQRT1_2),
    b: complex.from_real(Math.SQRT1_2),
  };
  const customInputs = [plus, plus];
  const expected = deutsch.deutschExpectedResult("const-1", customInputs);
  const total = expected.finalDistribution.reduce((sum, entry) => sum + entry.probability, 0);

  approx(total, 1);
});
