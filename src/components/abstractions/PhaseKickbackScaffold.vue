<template>
  <main class="panels phase-kickback-panels">
    <section class="panel">
      <div class="panel-header">
        <h2>Phase Kickback Modules</h2>
        <p>Choose a module, then inspect how phase shows up as q0 readout bias.</p>
      </div>

      <nav class="ent-module-nav" aria-label="Phase Kickback Modules">
        <button
          v-for="option in moduleOptions"
          :key="option.id"
          class="ent-module-btn"
          :class="{ active: moduleId === option.id }"
          type="button"
          @click="setModuleId(option.id)"
        >
          {{ option.title }}
        </button>
      </nav>

      <div class="ent-core-card">
        <p class="ent-core-title">{{ module.title }}</p>
        <p class="ent-core-step">{{ module.subtitle }}</p>
      </div>

      <div v-if="moduleId === 'phase-gates'" class="kickback-mode-card">
        <h3>Target Phase Gate (q1 at Step 2)</h3>
        <div class="kickback-mode-row">
          <button
            v-for="gate in phaseGateChoices"
            :key="gate"
            class="kickback-mode-btn"
            :class="{ active: targetPhaseGate === gate }"
            type="button"
            @click="setTargetPhaseGate(gate)"
          >
            {{ gate }}
          </button>
        </div>
        <p>{{ phaseGateSummary }}</p>
      </div>

      <div v-else class="kickback-mode-card">
        <h3>Controlled-Phase Gate (Step 2)</h3>
        <div class="kickback-mode-row">
          <button
            v-for="gate in controlledPhaseChoices"
            :key="gate"
            class="kickback-mode-btn"
            :class="{ active: controlledPhaseGate === gate }"
            type="button"
            @click="setControlledPhaseGate(gate)"
          >
            {{ controlledGateButtonLabel(gate) }}
          </button>
        </div>
        <p>{{ controlledGateSummary }}</p>
      </div>

      <div class="ent-core-card">
        <p class="ent-core-title">Fixed Starting Steps</p>
        <p v-for="(line, index) in coreStepLines" :key="`kick-step-${index}`" class="ent-core-step">{{ line }}</p>
      </div>

      <div class="ent-try-list">
        <h3>Module Goals</h3>
        <p v-for="(line, index) in module.instructions" :key="`goal-${index}`">{{ index + 1 }}. {{ line }}</p>
      </div>

      <div class="ent-measure-note">
        <p><strong>Measurement focus:</strong> {{ module.measurementPrompt }}</p>
      </div>

      <div class="kickback-explainer">
        <h3>What Kickback Accomplishes</h3>
        <p>{{ kickbackExplainer[0] }}</p>
        <p>{{ kickbackExplainer[1] }}</p>
        <p>{{ kickbackExplainer[2] }}</p>
      </div>
    </section>

    <section class="panel panel-center">
      <div class="panel-header">
        <h2>Phase Kickback Circuit</h2>
        <p>Starting steps are fixed for the selected module. Edit only later exploration steps.</p>
      </div>

      <div class="circuit-tools">
        <CircuitGatePalette
          :groups="paletteGroups"
          :measurement-entries="measurementEntries"
          :selected-gate="selectedGate"
          :is-palette-draggable="isPaletteDraggable"
          :show-custom-actions="false"
          @chip-click="handlePaletteChipClick"
          @palette-dragstart="startPaletteDrag"
          @drag-end="endDrag"
        />

        <div class="column-controls">
          <span class="prep-columns-lock">Editable steps: {{ editableColumnCount }}</span>
          <button class="column-btn" type="button" :disabled="!canAddColumn" @click="appendEditableColumn">Add step</button>
          <button class="column-btn" type="button" :disabled="!canRemoveColumn" @click="removeLastEditableColumn">
            Remove step
          </button>
          <button class="column-btn" type="button" @click="resetEditableColumns">Reset lesson</button>
        </div>
      </div>

      <p v-if="placementHint" class="placement-hint">{{ placementHint }}</p>

      <div class="circuit-shell">
        <div class="circuit-columns">
          <div
            v-for="(column, colIndex) in columns"
            :key="colIndex"
            class="circuit-column"
            :style="{ gridTemplateRows: `repeat(${rows.length}, minmax(56px, 1fr))` }"
          >
            <p class="algorithm-column-label">{{ columnLabels[colIndex] }}</p>

            <svg
              class="column-entanglement"
              viewBox="0 0 100 100"
              preserveAspectRatio="none"
              aria-hidden="true"
            >
              <rect
                v-for="band in multipartiteBandsForColumn(colIndex)"
                :key="`kick-band-${colIndex}-${band.id}`"
                class="entanglement-multipartite-band"
                :x="band.x"
                :y="band.y"
                :width="band.width"
                :height="band.height"
                :rx="band.rx"
                :style="multipartiteBandStyle(band.strength)"
              >
                <title>{{ multipartiteTooltip(band.rows, band.strength) }}</title>
              </rect>
              <path
                v-for="(link, linkIndex) in entanglementLinksForColumn(colIndex)"
                :key="`${colIndex}-${link.fromRow}-${link.toRow}-${linkIndex}`"
                class="entanglement-arc"
                :d="entanglementArcPath(link)"
                :style="entanglementArcStyle(link)"
              >
                <title>{{ pairwiseTooltip(link) }}</title>
              </path>
            </svg>

            <div class="column-connectors">
              <div
                v-for="connector in connectorSegments(column, colIndex)"
                :key="connector.id"
                class="column-connector"
                :class="[connector.kind, { preview: connector.preview }]"
                :style="connectorStyle(connector)"
              ></div>
            </div>

            <div
              v-for="row in rows"
              :key="row"
              class="gate-slot"
              :class="{
                'is-drop-target': isDropTarget(colIndex, row),
                'is-row-locked': isRowLockedAt(colIndex, row),
                'is-core-locked': isCellLockedAt(colIndex, row),
              }"
              :title="slotTitle(colIndex, row)"
              @dragover.prevent="handleDragOver(colIndex, row)"
              @dragleave="handleDragLeave(colIndex, row)"
              @drop.prevent="handleDrop(colIndex, row)"
              @mouseenter="handleSlotHover(colIndex, row)"
              @mousemove="handleSlotHover(colIndex, row)"
              @mouseleave="handleSlotLeave(colIndex, row)"
              @click="handleSlotClick(colIndex, row, $event)"
            >
              <span class="gate-slot-label">q{{ row }}</span>
              <div
                class="gate-token"
                :class="{
                  empty: slotInstance(column, row) === null,
                  draggable: isDraggableToken(column, row, colIndex),
                  'is-drag-source': isDragSource(colIndex, row),
                  'is-cnot-control': isCnotControl(column, row) || isPendingCnotControl(colIndex, row),
                  'is-cnot-target': isCnotTarget(column, row) || isPendingCnotTarget(colIndex, row),
                  'is-toffoli-control': isToffoliControl(column, row) || isPendingToffoliControl(colIndex, row),
                  'is-toffoli-target': isToffoliTarget(column, row) || isPendingToffoliTarget(colIndex, row),
                  'is-multi-custom-wire': isCustomMultiWire(column, row) || isPendingMultiWire(colIndex, row),
                  'is-multi-custom-hover': isPendingMultiHover(colIndex, row),
                  'is-measurement': isMeasurementToken(column, row),
                  'is-row-locked-token': isRowLockedAt(colIndex, row),
                  'is-core-locked-token': isCellLockedAt(colIndex, row),
                }"
                :draggable="isDraggableToken(column, row, colIndex)"
                @dragstart="startCellDrag(colIndex, row, $event)"
                @dragend="endDrag"
              >
                {{ tokenFor(column, row) }}
              </div>
            </div>
          </div>
        </div>

        <div class="circuit-legend">
          <span class="circuit-legend-time">Time -></span>
          <span class="circuit-legend-item">
            <span class="circuit-legend-swatch pairwise"></span>
            <span>Pairwise</span>
          </span>
          <span class="circuit-legend-item">
            <span class="circuit-legend-swatch multipartite"></span>
            <span>Multipartite</span>
          </span>
        </div>
      </div>

      <CircuitStageSnapshots
        :stages="stageViews"
        :selected-stage-index="selectedStageIndex"
        @select-stage="setSelectedStage"
      />

      <StageInspector :stage="selectedStage" :animated="false" />
    </section>

    <section class="panel">
      <div class="panel-header">
        <h2>Kickback Readout</h2>
        <p>Track phase transfer first, then verify readout on q0.</p>
      </div>

      <div class="ent-outcome-card">
        <p>{{ lessonStatus }}</p>
      </div>

      <div class="ent-metric-card">
        <h3>Control Phase Around Kickback</h3>
        <p>Before kickback: <strong>{{ controlPhaseBeforeLabel }}</strong> (x={{ formatSigned(controlBeforeKickback.x) }})</p>
        <p>After kickback: <strong>{{ controlPhaseAfterLabel }}</strong> (x={{ formatSigned(controlAfterKickback.x) }})</p>
        <p>Kickback detected: <strong>{{ phaseFlipDetected ? "yes" : "not yet" }}</strong></p>
        <p>Effective factor on q0 coherence: <strong>{{ formatSigned(effectiveKickbackFactor) }}</strong></p>
        <p>Classification: <strong>{{ fullPhaseInterpretation }}</strong></p>
      </div>

      <div class="ent-metric-card">
        <h3>Phase Multiplier View</h3>
        <p>{{ phaseSourceLabel }}: <strong>{{ sourcePhaseDisplay }}</strong></p>
        <p>Equivalent multiplier: <strong>{{ phaseMultiplierDisplay }}</strong></p>
        <p>
          Full-phase behavior is near +1 or -1. Intermediate/complex phase gives partial kickback and biased readout.
        </p>
      </div>

      <div class="ent-metric-card">
        <h3>Target Stability</h3>
        <p>Before kickback target x: <strong>{{ formatSigned(targetBeforeKickback.x) }}</strong></p>
        <p>After kickback target x: <strong>{{ formatSigned(targetAfterKickback.x) }}</strong></p>
        <p>{{ targetExpectationNote }}</p>
      </div>

      <div class="ent-metric-card">
        <h3>q0 Readout</h3>
        <p>After fixed core: P(q0=1)=<strong>{{ formatPercent(baselineReadoutQ0P1) }}</strong></p>
        <p>Final stage: P(q0=1)=<strong>{{ formatPercent(finalQ0P1) }}</strong></p>
        <p>Final stage: P(q0=0)=<strong>{{ formatPercent(finalQ0P0) }}</strong></p>
      </div>

      <div class="ent-measure-note" :class="{ active: hasEarlyMeasurement }">
        <p v-if="firstMeasurement">
          First in-circuit measurement at t{{ firstMeasurement.column + 1 }} on q{{ firstMeasurement.row }}.
          <span v-if="hasEarlyMeasurement">Later steps run on collapsed branches.</span>
        </p>
        <p v-else>No in-circuit measurement yet. Add M to inspect branch changes.</p>
      </div>

      <div class="ent-sample-card">
        <div class="ent-sample-head">
          <h3>Sampled Branch</h3>
          <button class="column-btn" type="button" @click="runSampledBranch">Sample</button>
        </div>
        <p v-if="!sampledBranch" class="muted">No branch sampled yet.</p>
        <template v-else>
          <p>Final sample: <strong>|{{ sampledBranch.finalBasis }}></strong> ({{ formatPercent(sampledBranch.finalBasisProbability) }})</p>
          <p v-if="sampledBranch.outcomes.length === 0">No in-circuit measurement gate was sampled.</p>
          <ul v-else class="ent-outcome-list">
            <li v-for="entry in sampledBranch.outcomes" :key="entry.gateId">
              t{{ entry.column + 1 }} M(q{{ entry.wire }})={{ entry.value }} (p={{ formatPercent(entry.probability) }})
            </li>
          </ul>
        </template>
      </div>

      <div class="probability-list">
        <h3>Final Ensemble Distribution</h3>
        <div v-for="entry in finalDistribution" :key="entry.basis" class="prob-row">
          <span>|{{ entry.basis }}></span>
          <div class="prob-bar-wrap">
            <div class="prob-bar" :style="{ width: `${entry.probability * 100}%` }"></div>
          </div>
          <span>{{ formatPercent(entry.probability) }}</span>
        </div>
      </div>
    </section>
  </main>
</template>

<script setup lang="ts">
import { computed } from "vue";
import StageInspector from "../StageInspector.vue";
import CircuitGatePalette from "../circuit/CircuitGatePalette.vue";
import CircuitStageSnapshots from "../circuit/CircuitStageSnapshots.vue";
import type { ControlledPhaseGate, KickbackPhaseGate } from "./phase-kickback/engine";
import { usePhaseKickbackModel } from "./phase-kickback/usePhaseKickbackModel";

const {
  moduleId,
  setModuleId,
  moduleOptions,
  module,
  rows,
  columns,
  targetPhaseGate,
  setTargetPhaseGate,
  phaseGateChoices,
  controlledPhaseGate,
  setControlledPhaseGate,
  controlledPhaseChoices,
  columnLabels,
  paletteGroups,
  measurementEntries,
  selectedGate,
  selectedStageIndex,
  selectedStage,
  stageViews,
  controlBeforeKickback,
  controlAfterKickback,
  targetBeforeKickback,
  targetAfterKickback,
  controlPhaseBeforeLabel,
  controlPhaseAfterLabel,
  phaseFlipDetected,
  effectiveKickbackFactor,
  sourcePhaseAngleRadians,
  baselineReadoutQ0P1,
  finalQ0P1,
  finalQ0P0,
  finalDistribution,
  firstMeasurement,
  hasEarlyMeasurement,
  lessonStatus,
  sampledBranch,
  editableColumnCount,
  minEditableColumns,
  maxEditableColumns,
  appendEditableColumn,
  removeLastEditableColumn,
  resetEditableColumns,
  setSelectedStage,
  handlePaletteChipClick,
  runSampledBranch,
  placementHint,
  isPaletteDraggable,
  slotInstance,
  tokenFor,
  isDraggableToken,
  isCnotControl,
  isCnotTarget,
  isToffoliControl,
  isToffoliTarget,
  isCustomMultiWire,
  isMeasurementToken,
  isPendingCnotControl,
  isPendingCnotTarget,
  isPendingToffoliControl,
  isPendingToffoliTarget,
  isPendingMultiWire,
  isPendingMultiHover,
  connectorSegments,
  connectorStyle,
  entanglementLinksForColumn,
  multipartiteBandsForColumn,
  entanglementArcPath,
  entanglementArcStyle,
  multipartiteBandStyle,
  pairwiseTooltip,
  multipartiteTooltip,
  startPaletteDrag,
  startCellDrag,
  handleDragOver,
  handleDragLeave,
  handleDrop,
  endDrag,
  handleSlotHover,
  handleSlotLeave,
  handleSlotClick,
  isDropTarget,
  isDragSource,
  isCellLockedAt,
  isRowLockedAt,
  slotTitle,
} = usePhaseKickbackModel();

const canAddColumn = computed(() => editableColumnCount.value < maxEditableColumns);
const canRemoveColumn = computed(() => editableColumnCount.value > minEditableColumns);

const phaseGateSummaryMap: Record<KickbackPhaseGate, string> = {
  I: "I keeps q1 in the +1 X-eigenphase, so kickback stays in the +1 full-phase case.",
  X: "X also keeps q1 in the +1 X-eigenphase after Step 1, matching the +1 full-phase case.",
  Y: "Y maps q1 to the -1 X-eigenphase (up to global phase), giving a full -1 kickback.",
  Z: "Z maps q1 to the -1 X-eigenphase, giving a full -1 kickback.",
  S: "S adds a quarter-turn phase (pi/2), producing a complex multiplier and partial kickback.",
  T: "T adds an eighth-turn phase (pi/4), producing a complex multiplier and partial kickback.",
};

const controlledGateSummaryMap: Record<ControlledPhaseGate, string> = {
  CZ: "CZ applies a -1 phase to |11>, giving a full -1 kickback when q1 is prepared in |1>.",
  CP: "CP applies e^{i*pi/2}=+i to |11>, producing a complex kickback and intermediate readout bias.",
};

const phaseGateSummary = computed(() => phaseGateSummaryMap[targetPhaseGate.value]);
const controlledGateSummary = computed(() => controlledGateSummaryMap[controlledPhaseGate.value]);

const coreStepLines = computed(() => {
  if (moduleId.value === "controlled-phase-variants") {
    return [
      "1. H on q0 and X on q1 (prepare control superposition with target fixed at |1>)",
      `2. ${controlledGateButtonLabel(controlledPhaseGate.value)} on q0,q1 (controlled-phase kickback step)`,
      "3. H on q0 (phase-to-bit readout)",
    ];
  }

  return [
    "1. H on q1",
    `2. ${targetPhaseGate.value} on q1 and H on q0 (same column, shared time step)`,
    "3. CNOT q0 -> q1 (kickback step)",
    "4. H on q0 (phase-to-bit readout)",
  ];
});

const kickbackExplainer = computed(() => {
  if (moduleId.value === "controlled-phase-variants") {
    return [
      "Controlled-phase kickback writes phase directly onto q0 when q1 is in |1>.",
      "CZ gives full binary phase (-1), while CP=e^{i*pi/2} gives an intermediate complex phase.",
      "Final H on q0 converts that phase multiplier into measurable q0 bit bias.",
    ];
  }

  return [
    "Kickback moves target phase onto control coherence. In this setup, transfer is tracked by q0 x-value after the kickback gate.",
    "Full phase cases give x≈+1 (no flip) or x≈-1 (full flip); complex phases give intermediate x between -1 and +1.",
    "Final H on q0 converts that phase factor into measurable q0 bit bias.",
  ];
});

const phaseSourceLabel = computed(() =>
  moduleId.value === "controlled-phase-variants"
    ? "Control relative phase after controlled-phase"
    : "Target relative phase before kickback",
);

const targetExpectationNote = computed(() =>
  moduleId.value === "controlled-phase-variants"
    ? "In this module q1 is prepared in |1>; kickback shows up mainly on q0 coherence."
    : "Expected: I/X near +1, Y/Z near -1, S/T intermediate.",
);

const normalizedPhaseAngle = computed(() => {
  const raw = sourcePhaseAngleRadians.value;
  const wrapped = ((raw + Math.PI) % (2 * Math.PI) + 2 * Math.PI) % (2 * Math.PI) - Math.PI;
  return Math.abs(wrapped + Math.PI) < 1e-9 ? Math.PI : wrapped;
});

const sourcePhaseDisplay = computed(() => {
  const turnsOverPi = normalizedPhaseAngle.value / Math.PI;
  const sign = turnsOverPi >= 0 ? "+" : "";
  return `${sign}${turnsOverPi.toFixed(3)}pi rad`;
});

const phaseMultiplierDisplay = computed(() => {
  const turnsOverPi = normalizedPhaseAngle.value / Math.PI;
  const sign = turnsOverPi >= 0 ? "+" : "";
  return `exp(i ${sign}${turnsOverPi.toFixed(3)}pi)`;
});

const controlledGateButtonLabel = (gate: ControlledPhaseGate): string =>
  gate === "CP" ? "CP (e^{i*pi/2})" : "CZ";

const fullPhaseInterpretation = computed(() => {
  const factor = effectiveKickbackFactor.value;
  if (factor >= 0.95) {
    return "+1 (full no-flip)";
  }
  if (factor <= -0.95) {
    return "-1 (full flip)";
  }
  return "intermediate complex phase";
});

const formatPercent = (value: number): string => `${(value * 100).toFixed(1)}%`;
const formatSigned = (value: number): string => (value >= 0 ? `+${value.toFixed(3)}` : value.toFixed(3));
</script>
