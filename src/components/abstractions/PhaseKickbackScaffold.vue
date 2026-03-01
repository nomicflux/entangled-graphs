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

    <LessonCircuitPanel
      title="Phase Kickback Circuit"
      subtitle="Starting steps are fixed for the selected module. Edit only later exploration steps."
      entanglement-key-prefix="kick"
      :columns="columns"
      :rows="rows"
      :column-labels="columnLabels"
      :palette-groups="paletteGroups"
      :measurement-entries="measurementEntries"
      :selected-gate="selectedGate"
      :stage-views="stageViews"
      :selected-stage-index="selectedStageIndex"
      :selected-stage="selectedStage"
      :is-palette-draggable="isPaletteDraggable"
      :handle-palette-chip-click="handlePaletteChipClick"
      :start-palette-drag="startPaletteDrag"
      :end-drag="endDrag"
      :placement-hint="placementHint"
      :slot-instance="slotInstance"
      :token-for="tokenFor"
      :is-draggable-token="isDraggableToken"
      :is-drag-source="isDragSource"
      :is-cnot-control="isCnotControl"
      :is-cnot-target="isCnotTarget"
      :is-toffoli-control="isToffoliControl"
      :is-toffoli-target="isToffoliTarget"
      :is-custom-multi-wire="isCustomMultiWire"
      :is-measurement-token="isMeasurementToken"
      :is-pending-cnot-control="isPendingCnotControl"
      :is-pending-cnot-target="isPendingCnotTarget"
      :is-pending-toffoli-control="isPendingToffoliControl"
      :is-pending-toffoli-target="isPendingToffoliTarget"
      :is-pending-multi-wire="isPendingMultiWire"
      :is-pending-multi-hover="isPendingMultiHover"
      :connector-segments="connectorSegments"
      :connector-style="connectorStyle"
      :handle-drag-over="handleDragOver"
      :handle-drag-leave="handleDragLeave"
      :handle-drop="handleDrop"
      :handle-slot-hover="handleSlotHover"
      :handle-slot-leave="handleSlotLeave"
      :handle-slot-click="handleSlotClick"
      :start-cell-drag="startCellDrag"
      :is-drop-target="isDropTarget"
      :is-cell-locked-at="isCellLockedAt"
      :is-row-locked-at="isRowLockedAt"
      :slot-title="slotTitle"
      :select-stage="setSelectedStage"
      :entanglement-links-for-column="entanglementLinksForColumn"
      :multipartite-bands-for-column="multipartiteBandsForColumn"
      :entanglement-arc-path="entanglementArcPath"
      :entanglement-arc-style="entanglementArcStyle"
      :multipartite-band-style="multipartiteBandStyle"
      :pairwise-tooltip="pairwiseTooltip"
      :multipartite-tooltip="multipartiteTooltip"
    >
      <template #controls>
        <span class="prep-columns-lock">Editable steps: {{ editableColumnCount }}</span>
        <button class="column-btn" type="button" :disabled="!canAddColumn" @click="appendEditableColumn">Add step</button>
        <button class="column-btn" type="button" :disabled="!canRemoveColumn" @click="removeLastEditableColumn">
          Remove step
        </button>
        <button class="column-btn" type="button" @click="resetEditableColumns">Reset lesson</button>
      </template>
    </LessonCircuitPanel>

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
import LessonCircuitPanel from "../circuit/LessonCircuitPanel.vue";
import { useCircuitGridPlacementLifecycle } from "../circuit/useCircuitGridPlacementLifecycle";
import type { ControlledPhaseGate, KickbackPhaseGate } from "./phase-kickback/engine";
import { usePhaseKickbackModel } from "./phase-kickback/usePhaseKickbackModel";

const model = usePhaseKickbackModel();
useCircuitGridPlacementLifecycle({
  pendingPlacement: model.pendingPlacement,
  clearPendingPlacement: model.clearPendingPlacement,
});

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
} = model;

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
