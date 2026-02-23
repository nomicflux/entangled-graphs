const test = require("node:test");
const assert = require("node:assert/strict");

const prep = require("../.tmp-test/components/abstractions/preparing-qubits/engine.js");

const approx = (actual, expected, tolerance = 1e-6) => {
  assert.ok(Math.abs(actual - expected) <= tolerance, `expected ${actual} ≈ ${expected}`);
};

const probabilityOf = (distribution, basis) => {
  const entry = distribution.find((row) => row.basis === basis);
  return entry ? entry.probability : 0;
};

test("X prepares |1> from default |0>", () => {
  const distribution = prep.preparingSingleQubitFinalDistribution(["X"]);
  approx(probabilityOf(distribution, "0"), 0);
  approx(probabilityOf(distribution, "1"), 1);
});

test("H prepares |+> from default |0>", () => {
  const distribution = prep.preparingSingleQubitFinalDistribution(["H"]);
  approx(probabilityOf(distribution, "0"), 0.5);
  approx(probabilityOf(distribution, "1"), 0.5);
});

test("X then H prepares |-> with negative x-axis Bloch signature", () => {
  const distribution = prep.preparingSingleQubitFinalDistribution(["X", "H"]);
  const bloch = prep.preparingSingleQubitFinalBloch(["X", "H"]);

  approx(probabilityOf(distribution, "0"), 0.5);
  approx(probabilityOf(distribution, "1"), 0.5);
  approx(bloch.x, -1);
  approx(bloch.y, 0);
  approx(bloch.z, 0);
});
