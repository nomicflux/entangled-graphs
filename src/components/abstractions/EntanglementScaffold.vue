<template>
  <main class="panels entanglement-panels">
    <section class="panel">
      <div class="panel-header">
        <h2>Entanglement Modules</h2>
        <p>Choose a module, then experiment in later steps to see how entanglement changes.</p>
      </div>

      <nav class="ent-module-nav" aria-label="Entanglement Modules">
        <button
          v-for="option in scenarioOptions"
          :key="option.id"
          class="ent-module-btn"
          :class="{ active: scenarioId === option.id }"
          type="button"
          @click="scenarioId = option.id"
        >
          {{ option.title }}
        </button>
      </nav>

      <div class="ent-core-card">
        <p class="ent-core-title">{{ scenario.title }}</p>
        <p class="ent-core-step">{{ scenario.subtitle }}</p>
      </div>

      <div class="ent-try-list">
        <h3>Module Goals</h3>
        <p v-for="(line, index) in scenario.instructions" :key="`goal-${index}`">{{ index + 1 }}. {{ line }}</p>
      </div>

      <div v-if="scenarioId === 'bell-family'" class="ent-bell-explainer">
        <h3>What |Phi/Psi><+/-> means</h3>
        <p><strong>Phi</strong> means both qubits match when measured (`00` or `11`).</p>
        <p><strong>Psi</strong> means qubits differ when measured (`01` or `10`).</p>
        <p><strong>+</strong> vs <strong>-</strong> is the relative phase sign between those branches.</p>
        <p>The phase sign is not directly visible in plain bit-counts; it appears after interference gates (for example `H`).</p>
        <p>Quick map: `X` toggles Phi/Psi, `Z` toggles +/-, and high pair strength means entanglement is still present.</p>
      </div>

      <div class="ent-measure-note">
        <p><strong>Measurement focus:</strong> {{ scenario.measurementPrompt }}</p>
      </div>

      <div class="ent-metric-grid">
        <article v-for="pair in focusPairMetrics" :key="pair.pairLabel" class="ent-metric-card">
          <h3>{{ pair.pairLabel }}</h3>
          <p>
            Start Bell:
            <strong class="ent-bell-pill">{{ formatBell(pair.coreBell) }}</strong>
          </p>
          <p>
            Selected Bell:
            <strong class="ent-bell-pill">{{ formatBell(pair.selectedBell) }}</strong>
          </p>
          <p>
            Final Bell:
            <strong class="ent-bell-pill">{{ formatBell(pair.finalBell) }}</strong>
          </p>
          <p>Selected strength: <strong>{{ formatPercent(pair.selectedStrength) }}</strong></p>
          <p>Final strength: <strong>{{ formatPercent(pair.finalStrength) }}</strong></p>
          <p v-if="pair.branchStrength !== null">Sampled branch strength: <strong>{{ formatPercent(pair.branchStrength) }}</strong></p>
        </article>
      </div>
    </section>

    <LessonCircuitPanel
      title="Entanglement Circuit"
      subtitle="Starting steps are fixed for this lesson. Add, remove, or modify only later steps."
      entanglement-key-prefix="ent"
      :columns="columns"
      :visible-columns="visibleColumns"
      :row-specs="rowSpecs"
      :rows="rows"
      :column-labels="columnLabels"
      :palette-groups="paletteGroups"
      :measurement-entries="measurementEntries"
      :selected-gate="selectedGate"
      :stage-snapshots="stageSnapshots"
      :selected-stage-index="selectedStageIndex"
      :selected-stage-snapshot="selectedStageSnapshot"
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
        <span class="prep-columns-lock">Editable columns: {{ editableColumnCount }}</span>
        <button class="column-btn" type="button" :disabled="!canAddColumn" @click="appendEditableColumn">Add column</button>
        <button class="column-btn" type="button" :disabled="!canRemoveColumn" @click="removeLastEditableColumn">
          Remove column
        </button>
        <button class="column-btn" type="button" @click="resetEditableColumns">Reset lesson</button>
      </template>
    </LessonCircuitPanel>

    <section class="panel">
      <div class="panel-header">
        <h2>Measurements & Outcome</h2>
        <p>Use both ensemble and sampled-branch measurements to see what averaging hides.</p>
      </div>

      <div class="ent-outcome-card">
        <p>{{ lessonStatus }}</p>
      </div>

      <div class="ent-metric-card">
        <h3>Primary Pair Readout</h3>
        <p>Selected Bell: <strong class="ent-bell-pill">{{ formatBell(selectedStageLink?.dominantBell ?? null) }}</strong></p>
        <p>Final Bell: <strong class="ent-bell-pill">{{ formatBell(finalStageLink?.dominantBell ?? null) }}</strong></p>
        <p>Selected same/opposite: <strong>{{ formatPercent(selectedCorrelation.same) }}</strong> / <strong>{{ formatPercent(selectedCorrelation.opposite) }}</strong></p>
        <p>Final same/opposite: <strong>{{ formatPercent(finalCorrelation.same) }}</strong> / <strong>{{ formatPercent(finalCorrelation.opposite) }}</strong></p>
      </div>

      <div class="ent-metric-card">
        <h3>Multipartite Summary</h3>
        <p>Selected: pairwise={{ selectedModelSummary.pairwiseCount }}, multipartite={{ selectedModelSummary.multipartiteCount }}</p>
        <p>Selected strongest: {{ formatKind(selectedModelSummary.strongestKind) }} {{ formatPercent(selectedModelSummary.strongestStrength) }}</p>
        <p>Final: pairwise={{ finalModelSummary.pairwiseCount }}, multipartite={{ finalModelSummary.multipartiteCount }}</p>
        <p>Final strongest: {{ formatKind(finalModelSummary.strongestKind) }} {{ formatPercent(finalModelSummary.strongestStrength) }}</p>
      </div>

      <div class="ent-measure-note" :class="{ active: hasEarlyMeasurement }">
        <p v-if="firstMeasurement">
          First in-circuit measurement at t{{ firstMeasurement.column + 1 }} on q{{ firstMeasurement.row }}.
          <span v-if="hasEarlyMeasurement">Later stages evolve collapsed branches.</span>
        </p>
        <p v-else>No in-circuit measurement yet. Place M to probe collapse behavior.</p>
      </div>

      <div class="ent-sample-card">
        <div class="ent-sample-head">
          <h3>Sampled Branch Measurement</h3>
          <button class="column-btn" type="button" @click="runBranchMeasurement">Sample branch</button>
        </div>
        <p v-if="!sampledBranch" class="muted">No branch sampled yet.</p>
        <template v-else>
          <p>Final sample: <strong>|{{ sampledBranch.finalBasis }}></strong> ({{ formatPercent(sampledBranch.finalBasisProbability) }})</p>
          <p>Primary pair sampled strength: <strong>{{ formatPercent(sampledBranchPrimaryLink?.strength ?? 0) }}</strong></p>
          <p v-if="sampledBranchCorrelation">
            Sampled same/opposite: <strong>{{ formatPercent(sampledBranchCorrelation.same) }}</strong> /
            <strong>{{ formatPercent(sampledBranchCorrelation.opposite) }}</strong>
          </p>
          <p v-if="sampledBranch.outcomes.length === 0">No in-circuit measurement gates were encountered in this run.</p>
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
import { useEntanglementModel } from "./entanglement/useEntanglementModel";

const model = useEntanglementModel();
useCircuitGridPlacementLifecycle({
  pendingPlacement: model.pendingPlacement,
  clearPendingPlacement: model.clearPendingPlacement,
});

const {
  scenarioId,
  scenario,
  scenarioOptions,
  rows,
  columns,
  visibleColumns,
  rowSpecs,
  columnLabels,
  paletteGroups,
  measurementEntries,
  selectedGate,
  selectedStageIndex,
  selectedStageSnapshot,
  stageSnapshots,
  focusPairMetrics,
  selectedStageLink,
  finalStageLink,
  finalDistribution,
  selectedCorrelation,
  finalCorrelation,
  selectedModelSummary,
  finalModelSummary,
  firstMeasurement,
  hasEarlyMeasurement,
  lessonStatus,
  sampledBranch,
  sampledBranchPrimaryLink,
  sampledBranchCorrelation,
  runBranchMeasurement,
  editableColumnCount,
  minEditableColumns,
  maxEditableColumns,
  appendEditableColumn,
  removeLastEditableColumn,
  resetEditableColumns,
  setSelectedStage,
  handlePaletteChipClick,
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

const canAddColumn = computed(() => editableColumnCount.value < maxEditableColumns.value);
const canRemoveColumn = computed(() => editableColumnCount.value > minEditableColumns.value);

const formatPercent = (value: number): string => `${(value * 100).toFixed(1)}%`;
const formatKind = (kind: string): string => {
  if (kind === "multipartite") {
    return "multipartite";
  }
  if (kind === "pairwise") {
    return "pairwise";
  }
  return "single";
};
const formatBell = (id: string | null): string => {
  if (id === "phi+") {
    return "|Phi+>";
  }
  if (id === "phi-") {
    return "|Phi->";
  }
  if (id === "psi+") {
    return "|Psi+>";
  }
  if (id === "psi-") {
    return "|Psi->";
  }
  return "--";
};
</script>
