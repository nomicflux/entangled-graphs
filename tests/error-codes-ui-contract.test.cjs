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
  const layout = readSource("src/components/circuit/fixed-panel-classical-layout.ts");
  const geometry = readSource("src/components/circuit/quantum-register-layout.ts");

  assert.match(panel, /visibleColumns/);
  assert.match(panel, /parity-family/);
  assert.match(panel, /parity-family-rails/);
  assert.match(panel, /parity-slot-grid/);
  assert.match(panel, /column-quantum-register/);
  assert.match(panel, /classical-route-overlay/);
  assert.match(panel, /classical-band-spacer/);
  assert.match(panel, /circuit-scroll-viewport/);
  assert.match(panel, /panelContentWidth/);
  assert.match(layout, /routeRailPathForOverlay/);
  assert.match(layout, /route\.to\.kind === "below-register"/);
  assert.match(panel, /visibleColumns: readonly VisibleLessonColumn\[\]/);
  assert.match(panel, /rowSpecs: readonly LessonRowSpec\[\]/);
  assert.doesNotMatch(panel, /resolvedVisibleColumns/);
  assert.match(geometry, /--circuit-quantum-height/);
  assert.match(panel, /rowSpecs/);
});

test("fixed algorithm panel supports classical wire overlays and teleportation uses real correction gates", () => {
  const panel = readSource("src/components/algorithms/shared/FixedCircuitPanel.vue");
  const teleport = readSource("src/components/algorithms/teleportation/TeleportationCircuitPanel.vue");
  const model = readSource("src/components/algorithms/teleportation/useTeleportationModel.ts");

  assert.match(panel, /classical-route-overlay/);
  assert.match(panel, /classicalLayout/);
  assert.match(panel, /classical-route-rail/);
  assert.match(panel, /circuit-header-row/);
  assert.match(panel, /circuit-scroll-viewport/);
  assert.match(panel, /panelContentWidth/);
  assert.match(panel, /column-quantum-register/);
  assert.match(teleport, /:classical-layout="props\.classicalLayout"/);
  assert.doesNotMatch(teleport, /placeholderToken/);
  assert.match(model, /writesClassicalBit/);
  assert.match(model, /condition: \{ kind: "bit-equals"/);
});

test("error-code workbench exposes a steane tab and scaffold", () => {
  const workbench = readSource("src/components/error-codes/ErrorCodesWorkbench.vue");

  assert.match(workbench, /SteaneSevenQubitScaffold/);
  assert.match(workbench, /steane-seven-qubit/);
  assert.match(workbench, /7-Qubit Steane/);
});

test("steane and shor scaffolds thread row specs and classical layout into the lesson panel", () => {
  const shor = readSource("src/components/error-codes/shor/ShorNineQubitScaffold.vue");
  const steane = readSource("src/components/error-codes/steane/SteaneSevenQubitScaffold.vue");

  for (const source of [shor, steane]) {
    assert.match(source, /:row-specs="rowSpecs"/);
    assert.match(source, /:classical-layout="classicalLayout"/);
  }
});

test("steane and shor project real visible correction gates and route ambiguous cases below the register", () => {
  const steane = readSource("src/components/error-codes/steane/useSteaneSevenQubitModel.ts");
  const shor = readSource("src/components/error-codes/shor/useShorNineQubitModel.ts");

  assert.match(steane, /visibleProjection: \{ kind: "active-conditioned-gates" \}/);
  assert.match(shor, /visibleProjection: \{ kind: "active-conditioned-gates" \}/);
  assert.match(steane, /kind: "gate"/);
  assert.match(steane, /kind: "below-register"/);
  assert.match(shor, /kind: "gate"/);
  assert.match(shor, /kind: "below-register"/);
  assert.match(steane, /conditionBadges: \[\]/);
  assert.match(shor, /conditionBadges: \[\]/);
});

test("abstraction scaffolds also pass explicit visible columns and row specs into the lesson panel", () => {
  const preparing = readSource("src/components/abstractions/PreparingQubitsScaffold.vue");
  const kickback = readSource("src/components/abstractions/PhaseKickbackScaffold.vue");
  const entanglement = readSource("src/components/abstractions/EntanglementScaffold.vue");

  for (const source of [preparing, kickback, entanglement]) {
    assert.match(source, /:visible-columns="visibleColumns"/);
    assert.match(source, /:row-specs="rowSpecs"/);
  }
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

test("shared entanglement geometry no longer uses percentage-normalized viewbox math", () => {
  const entanglement = readSource("src/components/circuit/useCircuitGridEntanglement.ts");
  const fixedEntanglement = readSource("src/components/algorithms/shared/useAlgorithmEntanglement.ts");
  const connectors = readSource("src/components/circuit/useCircuitGridConnectors.ts");

  assert.doesNotMatch(entanglement, /rowCenterViewBox/);
  assert.doesNotMatch(fixedEntanglement, /rowCenterViewBox/);
  assert.doesNotMatch(connectors, /%/);
  assert.match(connectors, /quantumRowCenterY/);
});
