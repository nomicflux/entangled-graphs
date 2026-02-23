const test = require("node:test");
const assert = require("node:assert/strict");

const kick = require("../.tmp-test/components/abstractions/phase-kickback/engine.js");

const approx = (actual, expected, tolerance = 1e-6) => {
  assert.ok(Math.abs(actual - expected) <= tolerance, `expected ${actual} ≈ ${expected}`);
};

const probabilityOf = (distribution, basis) => {
  const entry = distribution.find((row) => row.basis === basis);
  return entry ? entry.probability : 0;
};

test("kickback step flips control phase while target stays near |->", () => {
  const metrics = kick.phaseKickbackCoreMetrics([]);

  assert.equal(metrics.phaseFlipDetected, true);
  assert.ok(metrics.controlBeforeKickback.x > 0.9);
  assert.ok(metrics.controlAfterKickback.x < -0.9);
  assert.ok(metrics.targetBeforeKickback.x < -0.9);
  assert.ok(metrics.targetAfterKickback.x < -0.9);
});

test("baseline kickback readout yields q0=1 with certainty after fixed steps", () => {
  const distribution = kick.phaseKickbackFinalDistribution([]);
  const q0One = kick.phaseKickbackFinalQ0OneProbability([]);

  approx(q0One, 1);
  approx(probabilityOf(distribution, "10"), 0.5);
  approx(probabilityOf(distribution, "11"), 0.5);
  approx(probabilityOf(distribution, "00"), 0);
  approx(probabilityOf(distribution, "01"), 0);
});

test("I gate keeps +1 full-phase behavior and reads out q0=0 baseline", () => {
  const metrics = kick.phaseKickbackCoreMetrics([], "I");
  const distribution = kick.phaseKickbackFinalDistribution([], "I");
  const q0One = kick.phaseKickbackFinalQ0OneProbability([], "I");

  assert.equal(metrics.phaseFlipDetected, false);
  assert.ok(metrics.controlBeforeKickback.x > 0.9);
  assert.ok(metrics.controlAfterKickback.x > 0.9);
  assert.ok(metrics.effectiveFactor > 0.9);
  approx(q0One, 0);
  approx(probabilityOf(distribution, "00"), 0.5);
  approx(probabilityOf(distribution, "01"), 0.5);
  approx(probabilityOf(distribution, "10"), 0);
  approx(probabilityOf(distribution, "11"), 0);
});

test("Y gate also yields full -1 kickback (up to global phase)", () => {
  const metrics = kick.phaseKickbackCoreMetrics([], "Y");
  const q0One = kick.phaseKickbackFinalQ0OneProbability([], "Y");

  assert.equal(metrics.phaseFlipDetected, true);
  assert.ok(metrics.controlAfterKickback.x < -0.9);
  assert.ok(metrics.effectiveFactor < -0.9);
  approx(q0One, 1);
});

test("S gate produces intermediate kickback instead of full +/-1", () => {
  const metrics = kick.phaseKickbackCoreMetrics([], "S");
  const q0One = kick.phaseKickbackFinalQ0OneProbability([], "S");

  assert.ok(Math.abs(metrics.effectiveFactor) < 0.1);
  approx(q0One, 0.5);
});

test("controlled-phase CZ variant yields full -1 kickback", () => {
  const config = { moduleId: "controlled-phase-variants", controlledPhaseGate: "CZ" };
  const metrics = kick.phaseKickbackCoreMetrics([], config);
  const q0One = kick.phaseKickbackFinalQ0OneProbability([], config);

  assert.ok(metrics.controlBeforeKickback.x > 0.9);
  assert.ok(metrics.controlAfterKickback.x < -0.9);
  assert.ok(metrics.effectiveFactor < -0.9);
  approx(q0One, 1);
});

test("controlled-phase CP variant yields intermediate complex kickback", () => {
  const config = { moduleId: "controlled-phase-variants", controlledPhaseGate: "CP" };
  const metrics = kick.phaseKickbackCoreMetrics([], config);
  const q0One = kick.phaseKickbackFinalQ0OneProbability([], config);

  assert.ok(Math.abs(metrics.effectiveFactor) < 0.1);
  assert.ok(metrics.controlAfterKickback.y > 0.9);
  approx(q0One, 0.5);
});

test("post-setup exploration gate can change q0 readout expectation", () => {
  const editableColumns = [
    {
      gates: [{ id: "x-q0-after", gate: "X", wires: [0] }],
    },
  ];

  const q0One = kick.phaseKickbackFinalQ0OneProbability(editableColumns);
  approx(q0One, 0);
});
