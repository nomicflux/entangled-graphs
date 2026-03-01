<template>
  <main class="panels error-code-layout">
    <div class="error-code-side-column">
      <LogicalSourcePresetPanel
        :selected-preset="selectedPreset"
        @select-preset="selectedPreset = $event"
      />

      <section class="panel">
        <div class="panel-header">
          <h2>Output</h2>
          <p>Current output and syndromes.</p>
        </div>

        <div class="error-code-summary-grid">
          <ErrorCodeSummaryCard label="Input" :value="selectedPresetLabel" mono />
          <ErrorCodeSummaryCard label="Output" :value="outputPresetLabel" detail="closest preset" mono />
          <ErrorCodeSummaryCard
            label="Match"
            :value="formatPercent(recoveryFidelity)"
            :tone="recoveryFidelity > 0.99 ? 'good' : 'warn'"
          />
          <ErrorCodeSummaryCard label="Diagnosis" :value="diagnosisSummary" mono />
        </div>

        <div class="error-code-summary-grid">
          <ErrorCodeSummaryCard
            v-for="block in blockSyndromes"
            :key="block.blockLabel"
            :label="block.blockLabel"
            :value="block.dominantBits"
            :detail="block.wireLabel ?? '—'"
            mono
          />
          <ErrorCodeSummaryCard
            label="Phase"
            :value="phaseSyndrome.dominantBits"
            :detail="phaseSyndrome.blockLabel ?? '—'"
            mono
          />
        </div>
      </section>
    </div>

    <LessonCircuitPanel
      title="Shor's 9-Qubit Code"
      subtitle="Nested bit-flip and phase-flip protection."
      entanglement-key-prefix="shor-code"
      :show-entanglement="false"
      :max-stage-distribution-rows="8"
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
    >
      <template #controls>
        <button class="column-btn" type="button" @click="clearInjectedError">Clear</button>
      </template>
    </LessonCircuitPanel>
  </main>
</template>

<script setup lang="ts">
import LessonCircuitPanel from "../../circuit/LessonCircuitPanel.vue";
import { useCircuitGridPlacementLifecycle } from "../../circuit/useCircuitGridPlacementLifecycle";
import ErrorCodeSummaryCard from "../shared/ErrorCodeSummaryCard.vue";
import LogicalSourcePresetPanel from "../shared/LogicalSourcePresetPanel.vue";
import { useShorNineQubitModel } from "./useShorNineQubitModel";

const model = useShorNineQubitModel();
useCircuitGridPlacementLifecycle({
  pendingPlacement: model.pendingPlacement,
  clearPendingPlacement: model.clearPendingPlacement,
});

const {
  selectedPreset,
  selectedPresetLabel,
  outputPresetLabel,
  recoveryFidelity,
  diagnosisSummary,
  blockSyndromes,
  phaseSyndrome,
  clearInjectedError,
  rows,
  columns,
  columnLabels,
  paletteGroups,
  measurementEntries,
  selectedGate,
  stageSnapshots,
  selectedStageIndex,
  selectedStageSnapshot,
  setSelectedStage,
  handlePaletteChipClick,
  placementHint,
  isPaletteDraggable,
  slotInstance,
  tokenFor,
  isDraggableToken,
  isDragSource,
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
  isCellLockedAt,
  isRowLockedAt,
  slotTitle,
} = model;

const formatPercent = (value: number): string => `${(value * 100).toFixed(1)}%`;
</script>
