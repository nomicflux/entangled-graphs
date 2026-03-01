<template>
  <main class="panels preparing-panels">
    <section class="panel">
      <div class="panel-header">
        <h2>Target Assignment</h2>
        <p>Task: from <strong>|00></strong>, place only X/H in two steps so each row reaches its target.</p>
      </div>

      <div class="prep-task-card">
        <p class="prep-task-title">Current Task</p>
        <p class="prep-task-summary">{{ taskSummary }}</p>
      </div>

      <div class="prep-target-grid">
        <article v-for="row in rows" :key="row" class="prep-target-row">
          <h3>q{{ row }} target</h3>
          <div class="prep-target-buttons">
            <button
              v-for="option in targetOptions"
              :key="`q${row}-${option.id}`"
              class="prep-target-btn"
              :class="{ active: targetIds[row] === option.id }"
              type="button"
              @click="setTargetForRow(row, option.id)"
            >
              {{ option.label }}
            </button>
          </div>
          <details class="prep-target-hint-spoiler">
            <summary>Show hint</summary>
            <p class="prep-target-hint">{{ selectedTargetsByRow[row]?.hint }}</p>
          </details>
        </article>
      </div>

      <div class="prep-readout-grid">
        <article v-for="entry in rowReadouts" :key="entry.row" class="prep-readout-card" :class="{ reached: entry.reached }">
          <h3>q{{ entry.row }}</h3>
          <p>Target {{ entry.targetLabel }} fidelity: <strong>{{ formatPercent(entry.fidelity) }}</strong></p>
          <p>P(|0>)={{ formatPercent(entry.p0) }} • P(|1>)={{ formatPercent(entry.p1) }}</p>
        </article>
      </div>
    </section>

    <LessonCircuitPanel
      title="Preparation Circuit"
      subtitle="The start state is fixed at |00>; use the two steps below for X/H placement."
      entanglement-key-prefix="prep"
      :columns="columns"
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
        <span class="prep-columns-lock">Steps: {{ fixedColumnCount }} total</span>
        <button class="column-btn" type="button" @click="resetEditableColumns">Reset lesson</button>
      </template>
    </LessonCircuitPanel>

    <section class="panel">
      <div class="panel-header">
        <h2>Lesson Outcome</h2>
        <p>Success when each row reaches target fidelity.</p>
      </div>

      <div class="prep-outcome" :class="{ complete: allRowsReady }">
        <p v-if="allRowsReady"><strong>Complete:</strong> every row now matches its own assigned target.</p>
        <p v-else><strong>In progress:</strong> adjust X/H placement until each row target is reached.</p>
      </div>

      <div class="probability-list">
        <h3>Final Distribution</h3>
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
import LessonCircuitPanel from "../circuit/LessonCircuitPanel.vue";
import { useCircuitGridPlacementLifecycle } from "../circuit/useCircuitGridPlacementLifecycle";
import { usePreparingQubitsModel } from "./preparing-qubits/usePreparingQubitsModel";

const model = usePreparingQubitsModel();
useCircuitGridPlacementLifecycle({
  pendingPlacement: model.pendingPlacement,
  clearPendingPlacement: model.clearPendingPlacement,
});

const {
  rows,
  columns,
  columnLabels,
  paletteGroups,
  measurementEntries,
  selectedGate,
  selectedStageIndex,
  selectedStageSnapshot,
  stageSnapshots,
  targetIds,
  targetOptions,
  selectedTargetsByRow,
  taskSummary,
  rowReadouts,
  allRowsReady,
  finalDistribution,
  fixedColumnCount,
  resetEditableColumns,
  setTargetForRow,
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

const formatPercent = (value: number): string => `${(value * 100).toFixed(1)}%`;
</script>
