<template>
  <section class="panel panel-center">
    <div class="panel-header">
      <h2>Quantum Circuit</h2>
      <p>Drag single-qubit gates or click for staged multi-wire placement. M locks later columns on that row.</p>
    </div>

    <div class="circuit-tools">
      <CircuitGatePalette
        :groups="paletteGroups"
        :measurement-entries="measurementEntries"
        :selected-gate="state.pAdic.selectedGate"
        :is-palette-draggable="isPaletteDraggable"
        :show-custom-actions="false"
        @chip-click="handlePaletteChipClick"
        @palette-dragstart="startPaletteDrag"
        @drag-end="endDrag"
      />

      <div class="column-controls">
        <button class="column-btn" type="button" @click="appendPAdicColumn">Add column</button>
        <button class="column-btn" type="button" :disabled="state.pAdic.columns.length === 0" @click="removeLastPAdicColumn">
          Remove column
        </button>
      </div>
    </div>

    <p v-if="placementHint" class="placement-hint">{{ placementHint }}</p>

    <PAdicStateMap
      :stage="pAdicSelectedStageVisualization"
      :stage-label="pAdicSelectedStage.label"
      :prime="state.pAdic.prime"
      :selected-basis="state.pAdic.selectedBasis"
      @select-basis="setPAdicSelectedBasis"
    />

    <div class="circuit-shell">
      <div class="circuit-columns">
        <div
          v-for="(column, colIndex) in state.pAdic.columns"
          :key="colIndex"
          class="circuit-column"
          :style="{ gridTemplateRows: `repeat(${rows.length}, minmax(56px, 1fr))` }"
        >
          <svg class="column-entanglement" viewBox="0 0 100 100" preserveAspectRatio="none" aria-hidden="true">
            <rect
              v-for="band in multipartiteBandsForColumn(colIndex)"
              :key="`band-${colIndex}-${band.id}`"
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

          <div
            v-for="row in rows"
            :key="row"
            class="gate-slot"
            :class="{ 'is-drop-target': isDropTarget(colIndex, row), 'is-row-locked': isRowLocked(colIndex, row) }"
            :title="slotTitle(colIndex, row)"
            @dragover.prevent="handleDragOver(colIndex, row)"
            @dragleave="handleDragLeave(colIndex, row)"
            @drop.prevent="handleDrop(colIndex, row)"
            @click="handleSlotClick(colIndex, row, $event)"
          >
            <span class="gate-slot-label">q{{ row }}</span>
            <div
              class="gate-token"
              :class="{
                empty: slotGate(column, row) === null,
                'is-cnot-control': isCnotControl(column, row),
                'is-cnot-target': isCnotTarget(column, row),
                'is-toffoli-control': isToffoliControl(column, row),
                'is-toffoli-target': isToffoliTarget(column, row),
                'is-multi-custom-wire': isMultiWire(column, row),
                'is-measurement': isMeasurementToken(column, row),
                'is-row-locked-token': isRowLocked(colIndex, row),
              }"
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
          <span title="Pairwise entanglement link; dominant Bell color and Bell-derived strength.">Pairwise</span>
        </span>
        <span class="circuit-legend-item">
          <span class="circuit-legend-swatch multipartite"></span>
          <span title="Multipartite component; strength is minimum cut entropy across cuts that split the component.">Multipartite</span>
        </span>
      </div>
    </div>

    <p class="measurement-context">
      Stage distributions and overlays are model-weighted using {{ state.pAdic.measurementModel }} at p={{ state.pAdic.prime }}.
    </p>

    <CircuitStageSnapshots
      :stages="pAdicStageViews"
      :selected-stage-index="state.pAdic.selectedStageIndex"
      metric-label="w_p"
      metric-hint="Model weight"
      @select-stage="setPAdicSelectedStage"
    />

    <StageInspector
      :stage="pAdicSelectedStage"
      :animated="false"
      distribution-heading="Model-Weighted Distribution"
      distribution-hint="Entries are normalized w_p weights, not Born probabilities."
    />
  </section>
</template>

<script setup lang="ts">
import {
  appendPAdicColumn,
  pAdicSelectedStageVisualization,
  pAdicSelectedStage,
  pAdicStageViews,
  removeLastPAdicColumn,
  setPAdicSelectedBasis,
  setPAdicSelectedStage,
  state,
} from "../../state";
import type { GateId } from "../../types";
import CircuitGatePalette from "../circuit/CircuitGatePalette.vue";
import CircuitStageSnapshots from "../circuit/CircuitStageSnapshots.vue";
import StageInspector from "../StageInspector.vue";
import { usePAdicCircuitPalette } from "./circuit/usePAdicCircuitPalette";
import { usePAdicCircuitEntanglement } from "./circuit/usePAdicCircuitEntanglement";
import { usePAdicCircuitSlots } from "./circuit/usePAdicCircuitSlots";
import { usePAdicCircuitInteractions } from "./circuit/usePAdicCircuitInteractions";
import PAdicStateMap from "./PAdicStateMap.vue";

const { paletteGroups, measurementEntries, isPaletteDraggable } = usePAdicCircuitPalette();
const { rows, isRowLocked, slotTitle, slotGate, tokenFor, isCnotControl, isCnotTarget, isToffoliControl, isToffoliTarget, isMultiWire, isMeasurementToken } =
  usePAdicCircuitSlots();
const {
  placementHint,
  handlePaletteChipClick,
  startPaletteDrag: startPaletteDragRaw,
  endDrag,
  isDropTarget,
  handleDragOver,
  handleDragLeave,
  handleDrop,
  handleSlotClick,
} = usePAdicCircuitInteractions(isRowLocked);
const {
  entanglementLinksForColumn,
  multipartiteBandsForColumn,
  entanglementArcPath,
  entanglementArcStyle,
  multipartiteBandStyle,
  pairwiseTooltip,
  multipartiteTooltip,
} = usePAdicCircuitEntanglement(rows);

const startPaletteDrag = (gate: GateId, event: DragEvent) => {
  startPaletteDragRaw(gate, event, isPaletteDraggable);
};
</script>
