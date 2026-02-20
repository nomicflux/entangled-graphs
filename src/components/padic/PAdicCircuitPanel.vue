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

    <div class="circuit-shell">
      <div class="circuit-columns">
        <div
          v-for="(column, colIndex) in state.pAdic.columns"
          :key="colIndex"
          class="circuit-column"
          :style="{ gridTemplateRows: `repeat(${rows.length}, minmax(56px, 1fr))` }"
        >
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
    </div>
  </section>
</template>

<script setup lang="ts">
import { appendPAdicColumn, removeLastPAdicColumn, state } from "../../state";
import type { GateId } from "../../types";
import CircuitGatePalette from "../circuit/CircuitGatePalette.vue";
import { usePAdicCircuitPalette } from "./circuit/usePAdicCircuitPalette";
import { usePAdicCircuitSlots } from "./circuit/usePAdicCircuitSlots";
import { usePAdicCircuitInteractions } from "./circuit/usePAdicCircuitInteractions";

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

const startPaletteDrag = (gate: GateId, event: DragEvent) => {
  startPaletteDragRaw(gate, event, isPaletteDraggable);
};
</script>
