<template>
  <section class="panel panel-center">
    <div class="panel-header">
      <h2>Quantum Circuit</h2>
      <p>Drag gates into the grid. Alt+Click clears or deletes custom gates.</p>
    </div>

    <div class="circuit-tools">
      <div class="gate-palette">
        <button
          v-for="gate in paletteGates"
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
        <div
          v-for="(column, colIndex) in state.columns"
          :key="colIndex"
          class="circuit-column"
          :style="{ gridTemplateRows: `repeat(${rows.length}, minmax(56px, 1fr))` }"
        >
          <div class="column-connectors">
            <div
              v-for="connector in connectorSegments(column)"
              :key="connector.id"
              class="column-connector"
              :style="connectorStyle(connector)"
            ></div>
          </div>

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
                empty: slotInstance(column, row) === null,
                draggable: isDraggableToken(column, row),
                'is-drag-source': isDragSource(colIndex, row),
                'is-cnot-control': isCnotControl(column, row),
                'is-cnot-target': isCnotTarget(column, row),
                'is-toffoli-control': isToffoliControl(column, row),
                'is-toffoli-target': isToffoliTarget(column, row),
              }"
              :draggable="isDraggableToken(column, row)"
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
import type { CircuitColumn, GateId, Operator, QubitRow } from "../types";
import {
  appendColumn,
  clearGateAt,
  createCustomOperator,
  deleteCustomOperator,
  gateAt,
  gateInstanceAt,
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

const paletteGates = computed<GateId[]>(() => {
  const gates: GateId[] = ["I", "X", "H", "S"];
  if (qubitCount.value >= 2) {
    gates.push("CNOT");
  }
  if (qubitCount.value >= 3) {
    gates.push("TOFFOLI");
  }
  return gates;
});

const rows = computed<QubitRow[]>(() => Array.from({ length: qubitCount.value }, (_, index) => index));

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

const slotInstance = (column: CircuitColumn, row: QubitRow) => gateInstanceAt(column, row);

const tokenFor = (column: CircuitColumn, row: QubitRow): string => {
  const gate = gateAt(column, row);
  if (gate === "CNOT" || gate === "TOFFOLI") {
    return "";
  }
  return gateLabel(gate);
};

const isDraggableToken = (column: CircuitColumn, row: QubitRow): boolean => slotInstance(column, row)?.kind === "single";

const isCnotControl = (column: CircuitColumn, row: QubitRow): boolean => {
  const gate = slotInstance(column, row);
  return gate?.kind === "cnot" && gate.control === row;
};

const isCnotTarget = (column: CircuitColumn, row: QubitRow): boolean => {
  const gate = slotInstance(column, row);
  return gate?.kind === "cnot" && gate.target === row;
};

const isToffoliControl = (column: CircuitColumn, row: QubitRow): boolean => {
  const gate = slotInstance(column, row);
  return gate?.kind === "toffoli" && (gate.controlA === row || gate.controlB === row);
};

const isToffoliTarget = (column: CircuitColumn, row: QubitRow): boolean => {
  const gate = slotInstance(column, row);
  return gate?.kind === "toffoli" && gate.target === row;
};

type ConnectorSegment = {
  id: string;
  fromRow: number;
  toRow: number;
};

const connectorSegments = (column: CircuitColumn): ConnectorSegment[] =>
  column.gates.flatMap((gate): ConnectorSegment[] => {
    if (gate.kind === "single") {
      return [];
    }

    if (gate.kind === "cnot") {
      return [{ id: gate.id, fromRow: gate.control, toRow: gate.target }];
    }

    const minRow = Math.min(gate.controlA, gate.controlB, gate.target);
    const maxRow = Math.max(gate.controlA, gate.controlB, gate.target);
    return [{ id: gate.id, fromRow: minRow, toRow: maxRow }];
  });

const rowCenterPercent = (row: number): number => ((row + 0.5) / rows.value.length) * 100;

const connectorStyle = (segment: ConnectorSegment): Record<string, string> => {
  const start = rowCenterPercent(Math.min(segment.fromRow, segment.toRow));
  const end = rowCenterPercent(Math.max(segment.fromRow, segment.toRow));

  return {
    top: `${start}%`,
    height: `${Math.max(0, end - start)}%`,
  };
};

const startPaletteDrag = (gate: GateId, event: DragEvent) => {
  dragging.value = { gate };
  event.dataTransfer?.setData("text/plain", gate);
};

const startCellDrag = (col: number, row: QubitRow, event: DragEvent) => {
  const gate = slotInstance(state.columns[col]!, row);
  if (!gate || gate.kind !== "single") {
    return;
  }
  dragging.value = { gate: gate.gate, from: { col, row } };
  event.dataTransfer?.setData("text/plain", gate.gate);
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
  return dragging.value.from.row === row;
};

const formatPercent = (value: number): string => `${(value * 100).toFixed(1)}%`;
</script>
