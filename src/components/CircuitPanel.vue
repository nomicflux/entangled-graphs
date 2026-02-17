<template>
  <section class="panel panel-center">
    <div class="panel-header">
      <h2>Quantum Circuit</h2>
      <p>Drag gates into the grid. CNOT control is whichever row you place on. Alt+Click clears or deletes custom gates.</p>
    </div>

    <div class="circuit-tools">
      <div class="gate-palette">
        <button
          v-for="gate in builtinAndCnotGates"
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

        <button
          v-for="custom in state.customOperators"
          :key="custom.id"
          class="gate-chip custom-chip"
          :class="{ selected: state.selectedGate === custom.id }"
          :title="`Alt+Click to delete ${custom.label}`"
          type="button"
          draggable="true"
          @click="handleCustomChipClick(custom.id, $event)"
          @dragstart="startPaletteDrag(custom.id, $event)"
          @dragend="endDrag"
        >
          {{ custom.label }}
        </button>

        <button class="gate-chip custom-new" type="button" @click="openCustomModal">Custom</button>
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
                empty: slotGate(column, row) === null,
                draggable: slotGate(column, row) !== null,
                'is-drag-source': isDragSource(colIndex, row),
                'is-cnot-control': isCnotControl(column, row),
                'is-cnot-target': isCnotTarget(column, row),
                'is-cnot-control-up': isCnotControl(column, row) && row === 1,
                'is-cnot-control-down': isCnotControl(column, row) && row === 0,
              }"
              :draggable="slotGate(column, row) !== null"
              @dragstart="startCellDrag(colIndex, row, $event)"
              @dragend="endDrag"
            >
              {{ tokenFor(column, row) }}
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

  <div v-if="isCustomModalOpen" class="custom-modal-backdrop" @click.self="closeCustomModal">
    <section class="custom-modal">
      <h3>Create Custom Operator</h3>
      <p class="custom-modal-note">
        Define a 2x2 complex matrix U. Each entry is a complex number (real + imaginary i). Values are normalized on
        submit.
      </p>

      <label class="custom-label">
        Operator label
        <input v-model="customLabel" type="text" placeholder="U" />
      </label>

      <div class="matrix-help">
        <span>Row 0: [U[0,0] U[0,1]]</span>
        <span>Row 1: [U[1,0] U[1,1]]</span>
      </div>

      <div class="operator-grid">
        <div class="operator-cell">
          <p>U[0,0] (Row 0, Column 0)</p>
          <div class="operator-inputs">
            <label>
              Real part
              <input v-model="draft.o00r" type="text" placeholder="e.g. 0.7071" />
            </label>
            <label>
              Imaginary part
              <input v-model="draft.o00i" type="text" placeholder="e.g. 0" />
            </label>
          </div>
        </div>
        <div class="operator-cell">
          <p>U[0,1] (Row 0, Column 1)</p>
          <div class="operator-inputs">
            <label>
              Real part
              <input v-model="draft.o01r" type="text" placeholder="e.g. 0" />
            </label>
            <label>
              Imaginary part
              <input v-model="draft.o01i" type="text" placeholder="e.g. -0.7071" />
            </label>
          </div>
        </div>
        <div class="operator-cell">
          <p>U[1,0] (Row 1, Column 0)</p>
          <div class="operator-inputs">
            <label>
              Real part
              <input v-model="draft.o10r" type="text" placeholder="e.g. 0" />
            </label>
            <label>
              Imaginary part
              <input v-model="draft.o10i" type="text" placeholder="e.g. 0.7071" />
            </label>
          </div>
        </div>
        <div class="operator-cell">
          <p>U[1,1] (Row 1, Column 1)</p>
          <div class="operator-inputs">
            <label>
              Real part
              <input v-model="draft.o11r" type="text" placeholder="e.g. 0.7071" />
            </label>
            <label>
              Imaginary part
              <input v-model="draft.o11i" type="text" placeholder="e.g. 0" />
            </label>
          </div>
        </div>
      </div>

      <div class="custom-modal-actions">
        <button type="button" class="column-btn" @click="closeCustomModal">Cancel</button>
        <button type="button" class="column-btn primary" @click="submitCustomOperator">Save Operator</button>
      </div>
    </section>
  </div>
</template>

<script setup lang="ts">
import { computed, reactive, ref } from "vue";
import type { CircuitColumn, GateCell, GateId, Operator, QubitRow } from "../types";
import {
  appendColumn,
  clearGateAt,
  createCustomOperator,
  deleteCustomOperator,
  gateAt,
  gateLabel,
  qubitCount,
  removeLastColumn,
  selectedStage,
  setGateAt,
  setSelectedGate,
  setSelectedStage,
  stageViews,
  state,
} from "../state";
import * as complex from "../complex";
import BlochPairView from "./BlochPairView.vue";
import StageInspector from "./StageInspector.vue";

const builtinAndCnotGates = computed<GateId[]>(() =>
  qubitCount.value >= 2 ? ["I", "X", "H", "S", "CNOT"] : ["I", "X", "H", "S"],
);
const rows = computed<QubitRow[]>(() => (qubitCount.value >= 2 ? [0, 1] : [0]));

const isCustomModalOpen = ref(false);
const customLabel = ref("");

const draft = reactive({
  o00r: "1",
  o00i: "0",
  o01r: "0",
  o01i: "0",
  o10r: "0",
  o10i: "0",
  o11r: "1",
  o11i: "0",
});

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

const slotGate = (column: CircuitColumn, row: QubitRow): GateCell => gateAt(column, row);

const tokenFor = (column: CircuitColumn, row: QubitRow): string => {
  const gate = slotGate(column, row);
  if (gate === "CNOT") {
    return "";
  }
  return gateLabel(gate);
};

const isCnotControl = (column: CircuitColumn, row: QubitRow): boolean => column.kind === "cnot" && row === column.control;
const isCnotTarget = (column: CircuitColumn, row: QubitRow): boolean => column.kind === "cnot" && row === column.target;

const startPaletteDrag = (gate: GateId, event: DragEvent) => {
  dragging.value = { gate };
  event.dataTransfer?.setData("text/plain", gate);
};

const startCellDrag = (col: number, row: QubitRow, event: DragEvent) => {
  const gate = slotGate(state.columns[col]!, row);
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

  if (from && (from.col !== col || (from.row !== row && gate !== "CNOT"))) {
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

const handleCustomChipClick = (customId: string, event: MouseEvent) => {
  if (event.altKey) {
    deleteCustomOperator(customId);
    return;
  }
  selectGate(customId);
};

const resetDraft = () => {
  customLabel.value = "";
  draft.o00r = "1";
  draft.o00i = "0";
  draft.o01r = "0";
  draft.o01i = "0";
  draft.o10r = "0";
  draft.o10i = "0";
  draft.o11r = "1";
  draft.o11i = "0";
};

const openCustomModal = () => {
  resetDraft();
  isCustomModalOpen.value = true;
};

const closeCustomModal = () => {
  isCustomModalOpen.value = false;
};

const parseNumber = (input: string): number => {
  const parsed = Number.parseFloat(input);
  return Number.isFinite(parsed) ? parsed : 0;
};

const submitCustomOperator = () => {
  const operator: Operator = {
    o00: complex.complex(parseNumber(draft.o00r), parseNumber(draft.o00i)),
    o01: complex.complex(parseNumber(draft.o01r), parseNumber(draft.o01i)),
    o10: complex.complex(parseNumber(draft.o10r), parseNumber(draft.o10i)),
    o11: complex.complex(parseNumber(draft.o11r), parseNumber(draft.o11i)),
  };

  const createdId = createCustomOperator(customLabel.value, operator);
  setSelectedGate(createdId);
  closeCustomModal();
};

const isDropTarget = (col: number, row: QubitRow): boolean =>
  dropTarget.value !== null && dropTarget.value.col === col && dropTarget.value.row === row;

const isDragSource = (col: number, row: QubitRow): boolean => {
  if (!dragging.value?.from) {
    return false;
  }
  if (dragging.value.from.col !== col) {
    return false;
  }
  if (dragging.value.gate === "CNOT") {
    return true;
  }
  return dragging.value.from.row === row;
};

const formatPercent = (value: number): string => `${(value * 100).toFixed(1)}%`;
</script>
