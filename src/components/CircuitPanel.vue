<template>
  <section class="panel panel-center">
    <div class="panel-header">
      <h2>Quantum Circuit</h2>
      <p>Drag gates into the grid. Click places the selected gate. Alt+Click clears a slot.</p>
    </div>

    <div class="circuit-tools">
      <div class="gate-palette">
        <button
          v-for="gate in gates"
          :key="gate"
          class="gate-chip"
          :class="{ selected: state.selectedGate === gate }"
          type="button"
          draggable="true"
          @click="selectGate(gate)"
          @dragstart="startPaletteDrag(gate, $event)"
          @dragend="endDrag"
        >
          {{ gate }}
        </button>
      </div>

      <div class="column-controls">
        <button class="column-btn" type="button" @click="appendColumn">Add column</button>
        <button class="column-btn" type="button" :disabled="state.columns.length === 0" @click="removeLastColumn">
          Remove column
        </button>
      </div>
    </div>

    <div class="circuit-shell">
      <div class="circuit-columns">
        <div v-for="(column, colIndex) in state.columns" :key="colIndex" class="circuit-column">
          <div
            v-for="row in rows"
            :key="row"
            class="gate-slot"
            :class="{ 'is-drop-target': isDropTarget(colIndex, row) }"
            @dragover.prevent="handleDragOver(colIndex, row)"
            @dragleave="handleDragLeave(colIndex, row)"
            @drop.prevent="handleDrop(colIndex, row)"
            @click="handleSlotClick(colIndex, row, $event)"
          >
            <span class="gate-slot-label">q{{ row }}</span>
            <div
              class="gate-token"
              :class="{
                empty: !column[row],
                draggable: !!column[row],
                'is-drag-source': isDragSource(colIndex, row),
              }"
              :draggable="column[row] !== null"
              @dragstart="startCellDrag(column[row], colIndex, row, $event)"
              @dragend="endDrag"
            >
              {{ column[row] ?? "" }}
            </div>
          </div>
        </div>
      </div>
      <div class="circuit-legend">
        <span>Time -></span>
      </div>
    </div>

    <div class="snapshot-grid">
      <button
        v-for="stage in stageViews"
        :key="stage.id"
        class="snapshot-card"
        :class="{ selected: state.selectedStageIndex === stage.index }"
        type="button"
        @click="setSelectedStage(stage.index)"
      >
        <p class="snapshot-title">{{ stage.label }}</p>
        <BlochPairView :pair="stage.blochPair" size="sm" :animated="false" compact />
        <p v-for="entry in stage.distribution" :key="entry.basis" class="snapshot-row">
          <span>|{{ entry.basis }}></span>
          <span>{{ formatPercent(entry.probability) }}</span>
        </p>
      </button>
    </div>

    <StageInspector :stage="selectedStage" :animated="false" />
  </section>
</template>

<script setup lang="ts">
import { ref } from "vue";
import type { GateId, QubitRow } from "../types";
import {
  appendColumn,
  clearGateAt,
  removeLastColumn,
  selectedStage,
  setGateAt,
  setSelectedGate,
  setSelectedStage,
  stageViews,
  state,
} from "../state";
import BlochPairView from "./BlochPairView.vue";
import StageInspector from "./StageInspector.vue";

const gates: GateId[] = ["I", "X", "H", "S"];
const rows: QubitRow[] = [0, 1];

type DragSource = {
  col: number;
  row: QubitRow;
};

type DragPayload = {
  gate: GateId;
  from?: DragSource;
};

const dragging = ref<DragPayload | null>(null);
const dropTarget = ref<DragSource | null>(null);

const selectGate = (gate: GateId) => {
  setSelectedGate(state.selectedGate === gate ? null : gate);
};

const startPaletteDrag = (gate: GateId, event: DragEvent) => {
  dragging.value = { gate };
  event.dataTransfer?.setData("text/plain", gate);
};

const startCellDrag = (gate: GateId | null, col: number, row: QubitRow, event: DragEvent) => {
  if (gate === null) {
    return;
  }
  dragging.value = { gate, from: { col, row } };
  event.dataTransfer?.setData("text/plain", gate);
};

const handleDragOver = (col: number, row: QubitRow) => {
  if (dragging.value === null) {
    return;
  }
  dropTarget.value = { col, row };
};

const handleDragLeave = (col: number, row: QubitRow) => {
  if (dropTarget.value && dropTarget.value.col === col && dropTarget.value.row === row) {
    dropTarget.value = null;
  }
};

const handleDrop = (col: number, row: QubitRow) => {
  if (dragging.value === null) {
    return;
  }

  const { gate, from } = dragging.value;
  setGateAt(col, row, gate);

  if (from && (from.col !== col || from.row !== row)) {
    clearGateAt(from.col, from.row);
  }

  setSelectedGate(gate);
  dragging.value = null;
  dropTarget.value = null;
};

const endDrag = () => {
  dragging.value = null;
  dropTarget.value = null;
};

const handleSlotClick = (col: number, row: QubitRow, event: MouseEvent) => {
  if (event.altKey) {
    clearGateAt(col, row);
    return;
  }

  if (state.selectedGate === null) {
    return;
  }

  setGateAt(col, row, state.selectedGate);
};

const isDropTarget = (col: number, row: QubitRow): boolean =>
  dropTarget.value !== null && dropTarget.value.col === col && dropTarget.value.row === row;

const isDragSource = (col: number, row: QubitRow): boolean =>
  dragging.value?.from !== undefined && dragging.value.from.col === col && dragging.value.from.row === row;

const formatPercent = (value: number): string => `${(value * 100).toFixed(1)}%`;
</script>
