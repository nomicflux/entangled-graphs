<template>
  <section class="panel panel-center padic-circuit-panel">
    <div class="panel-header">
      <h2>p-adic Circuit</h2>
      <p>Build a wire-by-wire gate sequence. This restores the circuit workflow view for the p-adic page.</p>
    </div>

    <div class="circuit-tools">
      <div class="gate-palette">
        <p class="gate-group-title">Gate Palette</p>
        <div class="gate-group-chips">
          <button
            v-for="gate in gates"
            :key="gate"
            type="button"
            class="gate-chip"
            :class="{ selected: pAdicFaithfulState.selectedGate === gate, 'measurement-chip': gate === 'M' }"
            :draggable="isPaletteDraggable(gate)"
            @click="selectGate(gate)"
            @dragstart="startPaletteDrag(gate, $event)"
            @dragend="endDrag"
          >
            {{ gate }}
          </button>
        </div>
        <p class="padic-circuit-tool-label">active tool: {{ activeToolLabel }}</p>
        <p class="padic-circuit-tool-note">I is identity. CNOT uses control-then-target click placement. Alt+Click a slot clears that slot.</p>
      </div>

      <div class="column-controls">
        <button class="column-btn" type="button" @click="addFaithfulColumn">Add column</button>
        <button class="column-btn" type="button" :disabled="pAdicFaithfulState.columns.length === 0" @click="removeFaithfulColumn">
          Remove column
        </button>
      </div>
    </div>

    <div class="circuit-shell">
      <div class="circuit-columns">
        <div
          v-for="(column, columnIndex) in pAdicFaithfulState.columns"
          :key="`padic-column-${columnIndex}`"
          class="circuit-column"
          :style="{ gridTemplateRows: `repeat(${rows.length}, minmax(56px, 1fr))` }"
        >
          <div class="column-connectors">
            <div
              v-for="connector in connectorSegments(columnIndex)"
              :key="connector.id"
              class="column-connector cnot"
              :class="{ preview: connector.preview }"
              :style="connectorStyle(connector)"
            ></div>
          </div>

          <div
            v-for="row in rows"
            :key="`padic-slot-${columnIndex}-${row}`"
            class="gate-slot"
            :class="{ 'is-drop-target': isDropTarget(columnIndex, row) }"
            @dragover.prevent="handleDragOver(columnIndex, row)"
            @dragleave="handleDragLeave(columnIndex, row)"
            @drop.prevent="handleDrop(columnIndex, row)"
            @mouseenter="handleSlotHover(columnIndex, row)"
            @mousemove="handleSlotHover(columnIndex, row)"
            @mouseleave="handleSlotLeave(columnIndex, row)"
            @click="handleSlotClick($event, columnIndex, row)"
          >
            <span class="gate-slot-label">q{{ row }}</span>
            <div
              class="gate-token"
              :class="tokenClasses(column.gates[row] ?? null, columnIndex, row)"
              :draggable="isDraggableToken(column.gates[row] ?? null)"
              @dragstart="startCellDrag(columnIndex, row, $event)"
              @dragend="endDrag"
            >
              {{ tokenLabel(column.gates[row] ?? null, columnIndex, row) }}
            </div>
          </div>
        </div>
      </div>
      <div class="circuit-legend">
        <span class="circuit-legend-time">Time -></span>
      </div>
    </div>
  </section>
</template>

<script setup lang="ts">
import { computed, ref } from "vue";
import {
  addFaithfulColumn,
  pAdicFaithfulState,
  removeFaithfulColumn,
  setFaithfulColumnGate,
  setFaithfulSelectedGate,
  type PAdicCircuitGate,
} from "../../padic-faithful";

const gates = ["I", "X", "Z", "H", "CNOT", "M"] as const;
type PaletteGate = (typeof gates)[number];
type SingleGate = "I" | "X" | "Z" | "H" | "M";

const rows = computed(() =>
  Array.from({ length: pAdicFaithfulState.qubitCount }, (_, index) => index),
);

type PAdicDragSource = {
  columnIndex: number;
  rowIndex: number;
};

type PAdicDragPayload = {
  gate: SingleGate;
  from?: PAdicDragSource;
};

type PAdicCnotConnector = {
  id: string;
  fromRow: number;
  toRow: number;
  preview: boolean;
};

const dragging = ref<PAdicDragPayload | null>(null);
const dropTarget = ref<PAdicDragSource | null>(null);
const pendingCnotColumn = ref<number | null>(null);
const pendingCnotControlRow = ref<number | null>(null);
const pendingCnotHoverRow = ref<number | null>(null);

const isSingleGate = (gate: PAdicCircuitGate): gate is SingleGate =>
  gate === "I" || gate === "X" || gate === "Z" || gate === "H" || gate === "M";

const isCnotToken = (gate: PAdicCircuitGate): boolean =>
  gate === "CNOT_CONTROL" || gate === "CNOT_TARGET";

const isPaletteDraggable = (gate: PaletteGate): gate is SingleGate =>
  gate !== "CNOT";

const clearPendingCnot = (): void => {
  pendingCnotColumn.value = null;
  pendingCnotControlRow.value = null;
  pendingCnotHoverRow.value = null;
};

const clearCnotPairAt = (columnIndex: number, rowIndex: number): void => {
  const column = pAdicFaithfulState.columns[columnIndex];
  if (!column) {
    return;
  }
  const gate = column.gates[rowIndex] ?? null;
  if (!isCnotToken(gate)) {
    return;
  }

  const peerToken = gate === "CNOT_CONTROL" ? "CNOT_TARGET" : "CNOT_CONTROL";
  const peerRow = column.gates.findIndex((entry, index) => entry === peerToken && index !== rowIndex);

  setFaithfulColumnGate(columnIndex, rowIndex, null);
  if (peerRow >= 0) {
    setFaithfulColumnGate(columnIndex, peerRow, null);
  }
};

const clearAllCnotInColumn = (columnIndex: number): void => {
  const column = pAdicFaithfulState.columns[columnIndex];
  if (!column) {
    return;
  }

  column.gates.forEach((gate, rowIndex) => {
    if (gate === "CNOT_CONTROL" || gate === "CNOT_TARGET") {
      setFaithfulColumnGate(columnIndex, rowIndex, null);
    }
  });
};

const clearSlot = (columnIndex: number, rowIndex: number): void => {
  clearCnotPairAt(columnIndex, rowIndex);
  setFaithfulColumnGate(columnIndex, rowIndex, null);
};

const placeSingleGate = (columnIndex: number, rowIndex: number, gate: SingleGate): void => {
  clearCnotPairAt(columnIndex, rowIndex);
  setFaithfulColumnGate(columnIndex, rowIndex, gate);
};

const placeCnot = (columnIndex: number, controlRow: number, targetRow: number): void => {
  if (controlRow === targetRow) {
    return;
  }

  clearAllCnotInColumn(columnIndex);
  clearCnotPairAt(columnIndex, controlRow);
  clearCnotPairAt(columnIndex, targetRow);
  setFaithfulColumnGate(columnIndex, controlRow, "CNOT_CONTROL");
  setFaithfulColumnGate(columnIndex, targetRow, "CNOT_TARGET");
};

const selectGate = (gate: PaletteGate): void => {
  clearPendingCnot();
  setFaithfulSelectedGate(pAdicFaithfulState.selectedGate === gate ? null : gate);
};

const handleCnotSlotClick = (columnIndex: number, rowIndex: number): void => {
  if (rows.value.length < 2) {
    return;
  }

  if (pendingCnotColumn.value !== columnIndex || pendingCnotControlRow.value === null) {
    pendingCnotColumn.value = columnIndex;
    pendingCnotControlRow.value = rowIndex;
    pendingCnotHoverRow.value = rowIndex;
    return;
  }

  if (pendingCnotControlRow.value === rowIndex) {
    return;
  }

  placeCnot(columnIndex, pendingCnotControlRow.value, rowIndex);
  clearPendingCnot();
};

const handleSlotClick = (event: MouseEvent, columnIndex: number, rowIndex: number): void => {
  if (event.altKey) {
    clearSlot(columnIndex, rowIndex);
    if (pendingCnotColumn.value === columnIndex) {
      clearPendingCnot();
    }
    return;
  }

  const selected = pAdicFaithfulState.selectedGate;
  if (!selected) {
    return;
  }

  if (selected === "CNOT") {
    handleCnotSlotClick(columnIndex, rowIndex);
    return;
  }
  if (!isSingleGate(selected)) {
    return;
  }

  clearPendingCnot();
  placeSingleGate(columnIndex, rowIndex, selected);
};

const isDraggableToken = (gate: PAdicCircuitGate): gate is SingleGate =>
  isSingleGate(gate);

const startPaletteDrag = (gate: PaletteGate, event: DragEvent): void => {
  if (!isPaletteDraggable(gate)) {
    event.preventDefault();
    return;
  }
  dragging.value = { gate };
  if (event.dataTransfer) {
    event.dataTransfer.effectAllowed = "copyMove";
    event.dataTransfer.setData("text/plain", gate);
  }
};

const startCellDrag = (columnIndex: number, rowIndex: number, event: DragEvent): void => {
  const gate = pAdicFaithfulState.columns[columnIndex]?.gates[rowIndex] ?? null;
  if (!isDraggableToken(gate)) {
    event.preventDefault();
    return;
  }

  dragging.value = {
    gate,
    from: { columnIndex, rowIndex },
  };

  if (event.dataTransfer) {
    event.dataTransfer.effectAllowed = "move";
    event.dataTransfer.setData("text/plain", gate);
  }
};

const handleDragOver = (columnIndex: number, rowIndex: number): void => {
  if (!dragging.value) {
    return;
  }
  dropTarget.value = { columnIndex, rowIndex };
};

const handleDragLeave = (columnIndex: number, rowIndex: number): void => {
  if (
    dropTarget.value?.columnIndex === columnIndex &&
    dropTarget.value?.rowIndex === rowIndex
  ) {
    dropTarget.value = null;
  }
};

const handleDrop = (columnIndex: number, rowIndex: number): void => {
  if (!dragging.value) {
    return;
  }

  const { gate, from } = dragging.value;
  clearPendingCnot();
  placeSingleGate(columnIndex, rowIndex, gate);
  if (from && (from.columnIndex !== columnIndex || from.rowIndex !== rowIndex)) {
    clearSlot(from.columnIndex, from.rowIndex);
  }
  setFaithfulSelectedGate(gate);
  dragging.value = null;
  dropTarget.value = null;
};

const handleSlotHover = (columnIndex: number, rowIndex: number): void => {
  if (
    pAdicFaithfulState.selectedGate === "CNOT" &&
    pendingCnotColumn.value === columnIndex &&
    pendingCnotControlRow.value !== null
  ) {
    pendingCnotHoverRow.value = rowIndex;
  }
};

const handleSlotLeave = (columnIndex: number, rowIndex: number): void => {
  if (
    pAdicFaithfulState.selectedGate === "CNOT" &&
    pendingCnotColumn.value === columnIndex &&
    pendingCnotHoverRow.value === rowIndex
  ) {
    pendingCnotHoverRow.value = null;
  }
};

const endDrag = (): void => {
  dragging.value = null;
  dropTarget.value = null;
};

const isDropTarget = (columnIndex: number, rowIndex: number): boolean =>
  dropTarget.value?.columnIndex === columnIndex && dropTarget.value?.rowIndex === rowIndex;

const isDragSource = (columnIndex: number, rowIndex: number): boolean =>
  dragging.value?.from?.columnIndex === columnIndex && dragging.value?.from?.rowIndex === rowIndex;

const isPendingCnotControl = (columnIndex: number, rowIndex: number): boolean =>
  pAdicFaithfulState.selectedGate === "CNOT" &&
  pendingCnotColumn.value === columnIndex &&
  pendingCnotControlRow.value === rowIndex;

const isPendingCnotTarget = (columnIndex: number, rowIndex: number): boolean =>
  pAdicFaithfulState.selectedGate === "CNOT" &&
  pendingCnotColumn.value === columnIndex &&
  pendingCnotControlRow.value !== null &&
  pendingCnotHoverRow.value !== null &&
  pendingCnotHoverRow.value !== pendingCnotControlRow.value &&
  pendingCnotHoverRow.value === rowIndex;

const connectorSegments = (columnIndex: number): ReadonlyArray<PAdicCnotConnector> => {
  const column = pAdicFaithfulState.columns[columnIndex];
  if (!column) {
    return [];
  }

  const controlRow = column.gates.findIndex((gate) => gate === "CNOT_CONTROL");
  const targetRow = column.gates.findIndex((gate) => gate === "CNOT_TARGET");
  const committed: PAdicCnotConnector[] =
    controlRow >= 0 && targetRow >= 0
      ? [{
        id: `cnot-${columnIndex}-${controlRow}-${targetRow}`,
        fromRow: controlRow,
        toRow: targetRow,
        preview: false,
      }]
      : [];

  if (
    pAdicFaithfulState.selectedGate !== "CNOT" ||
    pendingCnotColumn.value !== columnIndex ||
    pendingCnotControlRow.value === null
  ) {
    return committed;
  }

  const hoverRow = pendingCnotHoverRow.value ?? pendingCnotControlRow.value;
  return [
    ...committed,
    {
      id: `pending-cnot-${columnIndex}`,
      fromRow: pendingCnotControlRow.value,
      toRow: hoverRow,
      preview: true,
    },
  ];
};

const rowCenterPercent = (row: number): number =>
  ((row + 0.5) / rows.value.length) * 100;

const connectorStyle = (segment: PAdicCnotConnector): Record<string, string> => {
  const start = rowCenterPercent(Math.min(segment.fromRow, segment.toRow));
  const end = rowCenterPercent(Math.max(segment.fromRow, segment.toRow));

  return {
    top: `${start}%`,
    height: `${Math.max(0, end - start)}%`,
  };
};

const tokenClasses = (
  gate: PAdicCircuitGate,
  columnIndex: number,
  rowIndex: number,
): Record<string, boolean> => ({
  empty: gate === null && !isPendingCnotControl(columnIndex, rowIndex) && !isPendingCnotTarget(columnIndex, rowIndex),
  draggable: isDraggableToken(gate),
  "is-drag-source": isDragSource(columnIndex, rowIndex),
  "is-cnot-control": gate === "CNOT_CONTROL" || isPendingCnotControl(columnIndex, rowIndex),
  "is-cnot-target": gate === "CNOT_TARGET" || isPendingCnotTarget(columnIndex, rowIndex),
  "is-measurement": gate === "M",
});

const tokenLabel = (gate: PAdicCircuitGate, columnIndex: number, rowIndex: number): string => {
  if (isPendingCnotControl(columnIndex, rowIndex) || isPendingCnotTarget(columnIndex, rowIndex)) {
    return "";
  }
  if (gate === null) {
    return "·";
  }
  if (gate === "CNOT_CONTROL" || gate === "CNOT_TARGET") {
    return "";
  }
  return gate;
};

const activeToolLabel = computed(() => {
  const selected = pAdicFaithfulState.selectedGate;
  if (selected === null) {
    return "none";
  }
  if (selected === "I") {
    return "I (identity)";
  }
  if (selected === "CNOT") {
    return "CNOT (control -> target)";
  }
  if (selected === "H") {
    return "H (p-adic variant)";
  }
  return selected;
});
</script>
