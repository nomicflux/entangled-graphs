const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");

const readSource = (workspacePath) =>
  fs.readFileSync(path.join(process.cwd(), workspacePath), "utf8");

test("error-code scaffolds keep a distinct output panel without a separate error-injection side panel", () => {
  const bitFlip = readSource("src/components/error-codes/bit-flip/BitFlipRepetitionScaffold.vue");
  const phaseFlip = readSource("src/components/error-codes/phase-flip/PhaseFlipRepetitionScaffold.vue");
  const shor = readSource("src/components/error-codes/shor/ShorNineQubitScaffold.vue");
  const steane = readSource("src/components/error-codes/steane/SteaneSevenQubitScaffold.vue");

  for (const source of [bitFlip, phaseFlip, shor, steane]) {
    assert.doesNotMatch(source, /ErrorInjectionPanel/);
    assert.match(source, /<h2>Output<\/h2>/);
    assert.match(source, /error-code-side-column/);
    assert.match(source, /:visible-columns="visibleColumns"/);
  }
});

test("lesson circuit panel supports shared parity-family visual columns", () => {
  const panel = readSource("src/components/circuit/LessonCircuitPanel.vue");

  assert.match(panel, /visibleColumns/);
  assert.match(panel, /parity-family/);
  assert.match(panel, /parity-family-rails/);
  assert.match(panel, /parity-slot-grid/);
});

test("error-code workbench exposes a steane tab and scaffold", () => {
  const workbench = readSource("src/components/error-codes/ErrorCodesWorkbench.vue");

  assert.match(workbench, /SteaneSevenQubitScaffold/);
  assert.match(workbench, /steane-seven-qubit/);
  assert.match(workbench, /7-Qubit Steane/);
});

test("circuit stage snapshots default to showing probabilities and can hide them for error-code views", () => {
  const snapshots = readSource("src/components/circuit/CircuitStageSnapshots.vue");
  const panel = readSource("src/components/circuit/LessonCircuitPanel.vue");
  const shor = readSource("src/components/error-codes/shor/ShorNineQubitScaffold.vue");
  const steane = readSource("src/components/error-codes/steane/SteaneSevenQubitScaffold.vue");

  assert.match(snapshots, /showDistributionDetails\?: boolean/);
  assert.match(snapshots, /showDistributionDetails: true/);
  assert.match(snapshots, /<template v-if="props\.showDistributionDetails">/);
  assert.match(snapshots, /More rows/);
  assert.match(panel, /showDistributionDetails\?: boolean/);
  assert.match(panel, /showDistributionDetails: true/);
  assert.match(panel, /:show-distribution-details="props\.showDistributionDetails"/);
  assert.doesNotMatch(panel, /showStageDistributionDetails/);
  assert.match(shor, /:show-distribution-details="false"/);
  assert.match(steane, /:show-distribution-details="false"/);
});

test("stage inspector defaults to showing zero-probability rows and shor/steane can hide them", () => {
  const inspector = readSource("src/components/StageInspector.vue");
  const panel = readSource("src/components/circuit/LessonCircuitPanel.vue");
  const shor = readSource("src/components/error-codes/shor/ShorNineQubitScaffold.vue");
  const steane = readSource("src/components/error-codes/steane/SteaneSevenQubitScaffold.vue");

  assert.match(inspector, /showZeroProbabilityRows\?: boolean/);
  assert.match(inspector, /showZeroProbabilityRows: true/);
  assert.match(inspector, /filter\(\(entry\) => props\.showZeroProbabilityRows \|\| entry\.probability > 0\)/);
  assert.match(panel, /showZeroProbabilityRows\?: boolean/);
  assert.match(panel, /showZeroProbabilityRows: true/);
  assert.match(panel, /:show-zero-probability-rows="props\.showZeroProbabilityRows"/);
  assert.match(shor, /:show-zero-probability-rows="false"/);
  assert.match(steane, /:show-zero-probability-rows="false"/);
});
