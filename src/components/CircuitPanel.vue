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
          :draggable="isPaletteDraggable(gate)"
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

    <p v-if="placementHint" class="placement-hint">{{ placementHint }}</p>

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
              v-for="connector in connectorSegments(column, colIndex)"
              :key="connector.id"
              class="column-connector"
              :class="[connector.kind, { preview: connector.preview }]"
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
            @mouseenter="handleSlotHover(colIndex, row)"
            @mousemove="handleSlotHover(colIndex, row)"
            @mouseleave="handleSlotLeave(colIndex, row)"
            @click="handleSlotClick(colIndex, row, $event)"
          >
            <span class="gate-slot-label">q{{ row }}</span>
            <div
              class="gate-token"
              :class="{
                empty: slotInstance(column, row) === null,
                draggable: isDraggableToken(column, row),
                'is-drag-source': isDragSource(colIndex, row),
                'is-cnot-control': isCnotControl(column, row) || isPendingCnotControl(colIndex, row),
                'is-cnot-target': isCnotTarget(column, row) || isPendingCnotTarget(colIndex, row),
                'is-toffoli-control': isToffoliControl(column, row) || isPendingToffoliControl(colIndex, row),
                'is-toffoli-target': isToffoliTarget(column, row) || isPendingToffoliTarget(colIndex, row),
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
import { computed, onMounted, onUnmounted, reactive, ref, watch } from "vue";
import type { CircuitColumn, GateId, QubitRow } from "../types";
import {
  appendColumn,
  clearGateAt,
  createCustomOperator,
  deleteCustomOperator,
  gateAt,
  gateInstanceAt,
  gateLabel,
  placeCnot,
  placeToffoli,
  qubitCount,
  removeLastColumn,
  selectedStage,
  setGateAt,
  setSelectedGate,
  setSelectedStage,
  stageViews,
  state,
  toCellRef,
  toCnotPlacement,
  toSingleGatePlacement,
  toToffoliPlacement,
} from "../state";
import * as complex from "../complex";
import { singleQubitMatrix } from "../operator";
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

type PendingCnotPlacement = {
  kind: "cnot";
  column: number;
  control: QubitRow;
  hoverRow: QubitRow | null;
};

type PendingToffoliPlacement = {
  kind: "toffoli";
  column: number;
  controlA: QubitRow;
  controlB: QubitRow | null;
  hoverRow: QubitRow | null;
};

type PendingPlacement = PendingCnotPlacement | PendingToffoliPlacement;

const dragging = ref<DragPayload | null>(null);
const dropTarget = ref<DragSource | null>(null);
const pendingPlacement = ref<PendingPlacement | null>(null);
const placementError = ref<string | null>(null);

const placementHint = computed<string | null>(() => {
  if (placementError.value) {
    return placementError.value;
  }

  const pending = pendingPlacement.value;
  if (pending?.kind === "cnot") {
    return `CNOT in t${pending.column + 1}: click target wire (Esc to cancel).`;
  }
  if (pending?.kind === "toffoli" && pending.controlB === null) {
    return `Toffoli in t${pending.column + 1}: click second control wire (Esc to cancel).`;
  }
  if (pending?.kind === "toffoli") {
    return `Toffoli in t${pending.column + 1}: click target wire (Esc to cancel).`;
  }
  if (state.selectedGate === "CNOT") {
    return "CNOT: click a control wire to start placement.";
  }
  if (state.selectedGate === "TOFFOLI") {
    return "Toffoli: click the first control wire to start placement.";
  }
  return null;
});

const clearPendingPlacement = () => {
  pendingPlacement.value = null;
  placementError.value = null;
};

const isPaletteDraggable = (gate: GateId): boolean => gate !== "CNOT" && gate !== "TOFFOLI";

const selectGate = (gate: GateId) => {
  const next = state.selectedGate === gate ? null : gate;
  setSelectedGate(next);
  clearPendingPlacement();
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

const isPendingCnotControl = (columnIndex: number, row: QubitRow): boolean => {
  const pending = pendingPlacement.value;
  return pending?.kind === "cnot" && pending.column === columnIndex && pending.control === row;
};

const isPendingCnotTarget = (columnIndex: number, row: QubitRow): boolean => {
  const pending = pendingPlacement.value;
  return (
    pending?.kind === "cnot" &&
    pending.column === columnIndex &&
    pending.hoverRow !== null &&
    pending.hoverRow !== pending.control &&
    pending.hoverRow === row
  );
};

const isPendingToffoliControl = (columnIndex: number, row: QubitRow): boolean => {
  const pending = pendingPlacement.value;
  if (pending?.kind !== "toffoli" || pending.column !== columnIndex) {
    return false;
  }
  return pending.controlA === row || pending.controlB === row;
};

const isPendingToffoliTarget = (columnIndex: number, row: QubitRow): boolean => {
  const pending = pendingPlacement.value;
  if (pending?.kind !== "toffoli" || pending.column !== columnIndex || pending.controlB === null || pending.hoverRow === null) {
    return false;
  }
  if (pending.hoverRow === pending.controlA || pending.hoverRow === pending.controlB) {
    return false;
  }
  return pending.hoverRow === row;
};

type ConnectorSegment = {
  id: string;
  kind: "cnot" | "toffoli";
  fromRow: number;
  toRow: number;
  preview: boolean;
};

const connectorSegments = (column: CircuitColumn, columnIndex: number): ConnectorSegment[] => {
  const committedSegments = column.gates.flatMap((gate): ConnectorSegment[] => {
    if (gate.kind === "single") {
      return [];
    }

    if (gate.kind === "cnot") {
      return [{ id: gate.id, kind: "cnot", fromRow: gate.control, toRow: gate.target, preview: false }];
    }

    const minRow = Math.min(gate.controlA, gate.controlB, gate.target);
    const maxRow = Math.max(gate.controlA, gate.controlB, gate.target);
    return [{ id: gate.id, kind: "toffoli", fromRow: minRow, toRow: maxRow, preview: false }];
  });

  const pending = pendingPlacement.value;
  if (!pending || pending.column !== columnIndex) {
    return committedSegments;
  }

  if (pending.kind === "cnot") {
    const hover = pending.hoverRow ?? pending.control;
    return [
      ...committedSegments,
      {
        id: `pending-cnot-${columnIndex}`,
        kind: "cnot",
        fromRow: pending.control,
        toRow: hover,
        preview: true,
      },
    ];
  }

  if (pending.controlB === null) {
    const hover = pending.hoverRow ?? pending.controlA;
    return [
      ...committedSegments,
      {
        id: `pending-toffoli-c2-${columnIndex}`,
        kind: "toffoli",
        fromRow: pending.controlA,
        toRow: hover,
        preview: true,
      },
    ];
  }

  const hoverTarget = pending.hoverRow ?? pending.controlB;
  return [
    ...committedSegments,
    {
      id: `pending-toffoli-target-${columnIndex}`,
      kind: "toffoli",
      fromRow: Math.min(pending.controlA, pending.controlB, hoverTarget),
      toRow: Math.max(pending.controlA, pending.controlB, hoverTarget),
      preview: true,
    },
  ];
};

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
  if (!isPaletteDraggable(gate)) {
    event.preventDefault();
    return;
  }

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
  if (gate === "CNOT" || gate === "TOFFOLI") {
    placementError.value = `${gate} placement uses click flow on the grid.`;
    dragging.value = null;
    dropTarget.value = null;
    return;
  }

  clearPendingPlacement();
  const placement = toSingleGatePlacement(col, row, gate);
  if (!placement) {
    dragging.value = null;
    dropTarget.value = null;
    return;
  }
  setGateAt(placement);

  if (from && (from.col !== col || from.row !== row)) {
    const source = toCellRef(from.col, from.row);
    if (source) {
      clearGateAt(source);
    }
  }

  setSelectedGate(gate);
  dragging.value = null;
  dropTarget.value = null;
};

const endDrag = () => {
  dragging.value = null;
  dropTarget.value = null;
};

const handleSlotHover = (col: number, row: QubitRow) => {
  const pending = pendingPlacement.value;
  if (!pending || pending.column !== col) {
    return;
  }

  pending.hoverRow = row;
};

const handleSlotLeave = (col: number, row: QubitRow) => {
  const pending = pendingPlacement.value;
  if (!pending || pending.column !== col || pending.hoverRow !== row) {
    return;
  }

  pending.hoverRow = null;
};

const beginCnotPlacement = (column: number, control: QubitRow) => {
  pendingPlacement.value = { kind: "cnot", column, control, hoverRow: control };
  placementError.value = null;
};

const beginToffoliPlacement = (column: number, controlA: QubitRow) => {
  pendingPlacement.value = { kind: "toffoli", column, controlA, controlB: null, hoverRow: controlA };
  placementError.value = null;
};

const handleCnotSlotClick = (col: number, row: QubitRow) => {
  if (qubitCount.value < 2) {
    return;
  }

  const pending = pendingPlacement.value;
  if (!pending || pending.kind !== "cnot" || pending.column !== col) {
    beginCnotPlacement(col, row);
    return;
  }

  if (row === pending.control) {
    placementError.value = "CNOT target must be on a different wire.";
    pending.hoverRow = row;
    return;
  }

  const placement = toCnotPlacement(col, pending.control, row);
  if (!placement) {
    placementError.value = "CNOT placement is invalid for the current circuit.";
    return;
  }

  placeCnot(placement);
  clearPendingPlacement();
};

const handleToffoliSlotClick = (col: number, row: QubitRow) => {
  if (qubitCount.value < 3) {
    return;
  }

  const pending = pendingPlacement.value;
  if (!pending || pending.kind !== "toffoli" || pending.column !== col) {
    beginToffoliPlacement(col, row);
    return;
  }

  if (pending.controlB === null) {
    if (row === pending.controlA) {
      placementError.value = "Second Toffoli control must be on a different wire.";
      pending.hoverRow = row;
      return;
    }

    pendingPlacement.value = { ...pending, controlB: row, hoverRow: row };
    placementError.value = null;
    return;
  }

  if (row === pending.controlA || row === pending.controlB) {
    placementError.value = "Toffoli target must be different from both controls.";
    pending.hoverRow = row;
    return;
  }

  const placement = toToffoliPlacement(col, pending.controlA, pending.controlB, row);
  if (!placement) {
    placementError.value = "Toffoli placement is invalid for the current circuit.";
    return;
  }

  placeToffoli(placement);
  clearPendingPlacement();
};

const handleSlotClick = (col: number, row: QubitRow, event: MouseEvent) => {
  if (event.altKey) {
    const cell = toCellRef(col, row);
    if (cell) {
      clearGateAt(cell);
    }
    if (pendingPlacement.value?.column === col) {
      clearPendingPlacement();
    }
    return;
  }

  if (state.selectedGate === null) {
    return;
  }

  if (state.selectedGate === "CNOT") {
    handleCnotSlotClick(col, row);
    return;
  }

  if (state.selectedGate === "TOFFOLI") {
    handleToffoliSlotClick(col, row);
    return;
  }

  clearPendingPlacement();
  const placement = toSingleGatePlacement(col, row, state.selectedGate);
  if (!placement) {
    return;
  }
  setGateAt(placement);
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
  const entries = singleQubitMatrix(
    complex.complex(parseNumber(draft.o00r), parseNumber(draft.o00i)),
    complex.complex(parseNumber(draft.o01r), parseNumber(draft.o01i)),
    complex.complex(parseNumber(draft.o10r), parseNumber(draft.o10i)),
    complex.complex(parseNumber(draft.o11r), parseNumber(draft.o11i)),
  );

  const createdId = createCustomOperator(customLabel.value, entries);
  setSelectedGate(createdId);
  clearPendingPlacement();
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

const validatePendingPlacement = () => {
  const pending = pendingPlacement.value;
  if (!pending) {
    return;
  }

  if (pending.column >= state.columns.length) {
    clearPendingPlacement();
    return;
  }

  if (pending.kind === "cnot") {
    if (qubitCount.value < 2 || pending.control >= qubitCount.value || (pending.hoverRow ?? 0) >= qubitCount.value) {
      clearPendingPlacement();
    }
    return;
  }

  if (qubitCount.value < 3 || pending.controlA >= qubitCount.value) {
    clearPendingPlacement();
    return;
  }

  if (pending.controlB !== null && pending.controlB >= qubitCount.value) {
    clearPendingPlacement();
    return;
  }

  if (pending.hoverRow !== null && pending.hoverRow >= qubitCount.value) {
    pending.hoverRow = null;
  }
};

watch(
  () => state.selectedGate,
  (gate) => {
    if (gate !== "CNOT" && gate !== "TOFFOLI") {
      clearPendingPlacement();
      return;
    }

    const pending = pendingPlacement.value;
    if (!pending) {
      placementError.value = null;
      return;
    }

    if ((gate === "CNOT" && pending.kind !== "cnot") || (gate === "TOFFOLI" && pending.kind !== "toffoli")) {
      clearPendingPlacement();
    }
  },
);

watch(
  [() => qubitCount.value, () => state.columns.length],
  () => {
    validatePendingPlacement();
  },
);

const onWindowKeyDown = (event: KeyboardEvent) => {
  if (event.key !== "Escape") {
    return;
  }
  if (pendingPlacement.value) {
    clearPendingPlacement();
  }
};

onMounted(() => {
  window.addEventListener("keydown", onWindowKeyDown);
});

onUnmounted(() => {
  window.removeEventListener("keydown", onWindowKeyDown);
});
</script>
