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
            draggable="true"
            @click="setFaithfulSelectedGate(pAdicFaithfulState.selectedGate === gate ? null : gate)"
            @dragstart="startPaletteDrag(gate, $event)"
            @dragend="endDrag"
          >
            {{ gate }}
          </button>
        </div>
        <p class="padic-circuit-tool-label">active tool: {{ activeToolLabel }}</p>
        <p class="padic-circuit-tool-note">I is identity. Alt+Click a slot clears that slot.</p>
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
          <div
            v-for="row in rows"
            :key="`padic-slot-${columnIndex}-${row}`"
            class="gate-slot"
            :class="{ 'is-drop-target': isDropTarget(columnIndex, row) }"
            @dragover.prevent="handleDragOver(columnIndex, row)"
            @dragleave="handleDragLeave(columnIndex, row)"
            @drop.prevent="handleDrop(columnIndex, row)"
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
              {{ column.gates[row] ?? "·" }}
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

const gates = ["I", "X", "Z", "M"] as const;

const rows = computed(() =>
  Array.from({ length: pAdicFaithfulState.qubitCount }, (_, index) => index),
);

type PAdicDragSource = {
  columnIndex: number;
  rowIndex: number;
};

type PAdicDragPayload = {
  gate: Exclude<PAdicCircuitGate, null>;
  from?: PAdicDragSource;
};

const dragging = ref<PAdicDragPayload | null>(null);
const dropTarget = ref<PAdicDragSource | null>(null);

const handleSlotClick = (event: MouseEvent, columnIndex: number, rowIndex: number): void => {
  if (event.altKey) {
    setFaithfulColumnGate(columnIndex, rowIndex, null);
    return;
  }

  const selected = pAdicFaithfulState.selectedGate;
  if (!selected) {
    return;
  }
  setFaithfulColumnGate(columnIndex, rowIndex, selected);
};

const isDraggableToken = (gate: PAdicCircuitGate): gate is Exclude<PAdicCircuitGate, null> =>
  gate !== null;

const startPaletteDrag = (gate: (typeof gates)[number], event: DragEvent): void => {
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
  setFaithfulColumnGate(columnIndex, rowIndex, gate);
  if (from && (from.columnIndex !== columnIndex || from.rowIndex !== rowIndex)) {
    setFaithfulColumnGate(from.columnIndex, from.rowIndex, null);
  }
  setFaithfulSelectedGate(gate);
  dragging.value = null;
  dropTarget.value = null;
};

const endDrag = (): void => {
  dragging.value = null;
  dropTarget.value = null;
};

const isDropTarget = (columnIndex: number, rowIndex: number): boolean =>
  dropTarget.value?.columnIndex === columnIndex && dropTarget.value?.rowIndex === rowIndex;

const isDragSource = (columnIndex: number, rowIndex: number): boolean =>
  dragging.value?.from?.columnIndex === columnIndex && dragging.value?.from?.rowIndex === rowIndex;

const tokenClasses = (
  gate: (typeof gates)[number] | null,
  columnIndex: number,
  rowIndex: number,
): Record<string, boolean> => ({
  empty: gate === null,
  draggable: gate !== null,
  "is-drag-source": isDragSource(columnIndex, rowIndex),
  "is-measurement": gate === "M",
});

const activeToolLabel = computed(() => {
  const selected = pAdicFaithfulState.selectedGate;
  if (selected === null) {
    return "none";
  }
  if (selected === "I") {
    return "I (identity)";
  }
  return selected;
});
</script>
