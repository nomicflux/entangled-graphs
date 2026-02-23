const test = require("node:test");
const assert = require("node:assert/strict");

const ent = require("../.tmp-test/components/abstractions/entanglement/engine.js");
const quantum = require("../.tmp-test/quantum.js");

const approx = (actual, expected, tolerance = 1e-6) => {
  assert.ok(Math.abs(actual - expected) <= tolerance, `expected ${actual} ≈ ${expected}`);
};

const probabilityOf = (distribution, basis) => {
  const entry = distribution.find((row) => row.basis === basis);
  return entry ? entry.probability : 0;
};

test("locked H + CNOT core prepares a Bell pair", () => {
  const distribution = ent.entanglementLessonFinalDistribution([]);
  const link = ent.entanglementLessonFinalLink([]);

  approx(probabilityOf(distribution, "00"), 0.5);
  approx(probabilityOf(distribution, "11"), 0.5);
  approx(probabilityOf(distribution, "01"), 0);
  approx(probabilityOf(distribution, "10"), 0);
  assert.ok(link, "expected a pairwise link for q0-q1");
  assert.ok(link.strength > 0.98, `expected strong entanglement, got ${link.strength}`);
});

test("post-core X on q0 moves mass to 01/10 while preserving entanglement", () => {
  const distribution = ent.entanglementLessonFinalDistribution([
    {
      gates: [{ id: "x-q0", gate: "X", wires: [0] }],
    },
  ]);
  const link = ent.entanglementLessonFinalLink([
    {
      gates: [{ id: "x-q0", gate: "X", wires: [0] }],
    },
  ]);

  approx(probabilityOf(distribution, "00"), 0);
  approx(probabilityOf(distribution, "11"), 0);
  approx(probabilityOf(distribution, "01"), 0.5);
  approx(probabilityOf(distribution, "10"), 0.5);
  assert.ok(link, "expected a pairwise link for q0-q1");
  assert.ok(link.strength > 0.98, `expected strong entanglement, got ${link.strength}`);
});

test("measuring early collapses Bell coherence and weakens pairwise link", () => {
  const editableColumns = [
    {
      gates: [{ id: "m-q0", gate: "M", wires: [0] }],
    },
    {
      gates: [{ id: "x-q1", gate: "X", wires: [1] }],
    },
  ];

  const distribution = ent.entanglementLessonFinalDistribution(editableColumns);
  const link = ent.entanglementLessonFinalLink(editableColumns);

  approx(probabilityOf(distribution, "01"), 0.5);
  approx(probabilityOf(distribution, "10"), 0.5);
  approx(probabilityOf(distribution, "00"), 0);
  approx(probabilityOf(distribution, "11"), 0);
  assert.ok(link, "expected a pairwise link for q0-q1");
  assert.ok(link.strength < 0.2, `expected weak entanglement after early measurement, got ${link.strength}`);
});

test("GHZ module keeps strong multipartite signature with weak pairwise Bell links", () => {
  const distribution = ent.entanglementScenarioFinalDistribution("ghz-growth", []);
  const snapshots = ent.entanglementScenarioSnapshots("ghz-growth", []);
  const pair01 = ent.entanglementScenarioFinalLinkForPair("ghz-growth", [], 0, 1);
  const models = quantum.stage_entanglement_models_from_snapshots(snapshots);
  const finalModel = models[models.length - 1];

  approx(probabilityOf(distribution, "000"), 0.5);
  approx(probabilityOf(distribution, "111"), 0.5);
  assert.ok(pair01, "expected pair link for q0-q1");
  assert.ok(pair01.strength < 0.2, `expected weak pairwise link, got ${pair01.strength}`);
  assert.ok(
    finalModel.components.some((component) => component.kind === "multipartite" && component.rows.length === 3 && component.strength > 0.9),
    "expected strong three-qubit multipartite component",
  );
});

test("entanglement swapping branch sampling reveals outer-pair entanglement", () => {
  const sample = ent.entanglementScenarioBranchSample("entanglement-swapping", [], () => 0);
  const link = sample.links.find((entry) => entry.fromRow === 0 && entry.toRow === 3);

  assert.ok(link, "expected sampled q0-q3 link");
  assert.ok(link.strength > 0.9, `expected strong swapped link in sampled branch, got ${link.strength}`);
  assert.ok(sample.outcomes.length >= 2, "expected Bell-basis measurement outcomes on q1 and q2");
});
