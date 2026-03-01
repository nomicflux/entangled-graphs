<template>
  <main class="panels">
    <LogicalSourcePresetPanel
      :selected-preset="selectedPreset"
      note="Hadamards move the protection into the X basis."
      @select-preset="selectedPreset = $event"
    />

    <LessonCircuitPanel
      title="3-Qubit Phase-Flip Code"
      subtitle="The repetition code, viewed in the X basis."
      entanglement-key-prefix="phase-code"
      :show-entanglement="false"
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
    >
      <template #controls>
        <span class="prep-columns-lock">Edit only Inject errors.</span>
        <button class="column-btn" type="button" @click="clearInjectedError">Clear</button>
      </template>
    </LessonCircuitPanel>

    <div class="error-code-side-column">
      <ErrorInjectionPanel
        :instructions="phaseFlipInstructions"
        :current-error-label="injectedErrorLabel"
        :status-summary="statusSummary"
        :allowed-gates="allowedErrorGates"
        @clear-error="clearInjectedError"
      />

      <section class="panel">
        <div class="panel-header">
          <h2>Output</h2>
          <p>Compare output with input and read the syndrome bits.</p>
        </div>

        <div class="error-code-kv">
          <article>
            <h3>Recovered Logical State</h3>
            <p><strong>Target:</strong> {{ selectedPresetLabel }}</p>
            <p><strong>Recovery fidelity:</strong> {{ formatPercent(recoveryFidelity) }}</p>
          </article>
        </div>

        <div class="error-code-syndrome-card">
          <h3>Syndrome</h3>
          <p>
            Most likely syndrome:
            <span class="error-code-pill">{{ dominantSyndrome.bits }}</span>
            {{ repetitionSyndromeMeaning(dominantSyndrome.bits) }}
          </p>
          <ul class="error-code-syndrome-list">
            <li v-for="row in syndromeRows" :key="row.bits">
              {{ row.bits }} -> {{ formatPercent(row.probability) }}. {{ repetitionSyndromeMeaning(row.bits) }}
            </li>
          </ul>
        </div>
      </section>
    </div>
  </main>
</template>

<script setup lang="ts">
import LessonCircuitPanel from "../../circuit/LessonCircuitPanel.vue";
import { useCircuitGridPlacementLifecycle } from "../../circuit/useCircuitGridPlacementLifecycle";
import ErrorInjectionPanel from "../shared/ErrorInjectionPanel.vue";
import LogicalSourcePresetPanel from "../shared/LogicalSourcePresetPanel.vue";
import { usePhaseFlipRepetitionModel } from "./usePhaseFlipRepetitionModel";

const model = usePhaseFlipRepetitionModel();
useCircuitGridPlacementLifecycle({
  pendingPlacement: model.pendingPlacement,
  clearPendingPlacement: model.clearPendingPlacement,
});

const {
  selectedPreset,
  selectedPresetLabel,
  injectedErrorLabel,
  statusSummary,
  recoveryFidelity,
  dominantSyndrome,
  syndromeRows,
  clearInjectedError,
  repetitionSyndromeMeaning,
  rows,
  columns,
  columnLabels,
  allowedErrorGates,
  paletteGroups,
  measurementEntries,
  selectedGate,
  stageViews,
  selectedStageIndex,
  selectedStage,
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

const phaseFlipInstructions = [
  "Place X or Z gates in Inject errors.",
  "Try one error, then more.",
] as const;

const formatPercent = (value: number): string => `${(value * 100).toFixed(1)}%`;
</script>
