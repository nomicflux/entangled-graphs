<template>
  <section class="panel panel-center">
    <div class="panel-header">
      <h2>Quantum Circuit</h2>
      <p>Drag single-qubit gates into the grid. M performs row measurement and locks later columns on that row.</p>
    </div>

    <div class="circuit-tools">
      <CircuitGatePalette
        :groups="paletteGroups"
        :measurement-entries="measurementEntries"
        :selected-gate="state.selectedGate"
        :is-palette-draggable="isPaletteDraggable"
        @chip-click="handlePaletteChipClick"
        @palette-dragstart="startPaletteDrag"
        @drag-end="endDrag"
        @open-single-custom="openSingleCustomModal"
        @open-block-custom="openBlockCustomModal"
      />

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
          <svg
            class="column-entanglement"
            viewBox="0 0 100 100"
            preserveAspectRatio="none"
            aria-hidden="true"
          >
            <path
              v-for="(link, linkIndex) in entanglementLinksForColumn(colIndex)"
              :key="`${colIndex}-${link.fromRow}-${link.toRow}-${linkIndex}`"
              class="entanglement-arc"
              :d="entanglementArcPath(link)"
              :style="entanglementArcStyle(link)"
            />
          </svg>

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
            :class="{ 'is-drop-target': isDropTarget(colIndex, row), 'is-row-locked': isRowLockedAt(colIndex, row) }"
            :title="slotTitle(colIndex, row)"
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
                'is-multi-custom-wire': isCustomMultiWire(column, row) || isPendingMultiWire(colIndex, row),
                'is-multi-custom-hover': isPendingMultiHover(colIndex, row),
                'is-measurement': isMeasurementToken(column, row),
                'is-row-locked-token': isRowLockedAt(colIndex, row),
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

    <CircuitStageSnapshots
      :stages="stageViews"
      :selected-stage-index="state.selectedStageIndex"
      @select-stage="setSelectedStage"
    />

    <StageInspector :stage="selectedStage" :animated="false" />
  </section>

  <CircuitSingleCustomModal
    :open="isSingleCustomModalOpen"
    @close="closeSingleCustomModal"
    @save="submitSingleCustomOperator"
  />

  <CircuitBlockCustomModal
    :open="isBlockCustomModalOpen"
    :options="blockBuilderOptions"
    :error="blockBuilderError"
    @close="closeBlockCustomModal"
    @save="submitBlockCustomOperator"
  />
</template>

<script setup lang="ts">
import { computed, onMounted, onUnmounted, ref, watch } from "vue";
import type { BellStateId, CircuitColumn, EntanglementLink, GateId, QubitRow } from "../types";
import {
  appendColumn,
  availableBuiltinGatesForQubitCount,
  clearGateAt,
  createCustomBlockOperator,
  createCustomSingleQubitOperator,
  deleteCustomOperator,
  firstMeasurementColumnByRow,
  gateInstanceAt,
  gateLabel,
  isRowLockedAtColumn,
  isUnitaryOperator,
  placeMultiGate,
  placeCnot,
  placeToffoli,
  qubitCount,
  removeLastColumn,
  resolveBlock2x2Selection,
  resolveOperator,
  selectedStage,
  setGateAt,
  setSelectedGate,
  setSelectedStage,
  singleQubitBuilderOptions,
  stageEntanglementLinks,
  stageViews,
  operatorArityForGate,
  state,
  toCellRef,
  toCnotPlacement,
  toMultiGatePlacement,
  toSingleGatePlacement,
  toToffoliPlacement,
} from "../state";
import type { BuilderBlockId, SingleQubitBuilderOption } from "../state/custom-operator-builder";
import { entanglement_delta_links } from "../quantum";
import StageInspector from "./StageInspector.vue";
import CircuitGatePalette from "./circuit/CircuitGatePalette.vue";
import CircuitStageSnapshots from "./circuit/CircuitStageSnapshots.vue";
import CircuitSingleCustomModal from "./circuit/CircuitSingleCustomModal.vue";
import CircuitBlockCustomModal from "./circuit/CircuitBlockCustomModal.vue";
import { blockMatrix2x2, type SingleQubitMatrixEntries } from "../operator";
import type { PaletteEntry, PaletteGroup } from "./circuit/palette-types";

const paletteBuiltinGates: readonly GateId[] = [
  "I",
  "X",
  "Y",
  "Z",
  "H",
  "S",
  "T",
  "M",
  "CNOT",
  "SWAP",
  "TOFFOLI",
  "CSWAP",
];

const paletteGates = computed<GateId[]>(() =>
  availableBuiltinGatesForQubitCount(qubitCount.value).filter((gate) => paletteBuiltinGates.includes(gate)),
);

const visibleCustomOperators = computed(() =>
  state.customOperators.filter((operator) => operator.qubitArity <= qubitCount.value),
);

const paletteGroups = computed<PaletteGroup[]>(() => {
  const byArity = new Map<number, PaletteEntry[]>();

  for (const gate of paletteGates.value) {
    if (gate === "M") {
      continue;
    }
    const arity = gateArity(gate);
    const entries = byArity.get(arity) ?? [];
    entries.push({ id: gate, label: gate, isCustom: false });
    byArity.set(arity, entries);
  }

  for (const custom of visibleCustomOperators.value) {
    const entries = byArity.get(custom.qubitArity) ?? [];
    entries.push({ id: custom.id, label: custom.label, isCustom: true });
    byArity.set(custom.qubitArity, entries);
  }

  return [...byArity.entries()]
    .sort(([left], [right]) => left - right)
    .map(([arity, entries]) => ({
      arity,
      title: `${arity}Q Gates`,
      entries,
    }));
});

const measurementEntries = computed<PaletteEntry[]>(() => {
  if (!paletteGates.value.includes("M")) {
    return [];
  }
  return [{ id: "M", label: "M", isCustom: false }];
});

const rows = computed<QubitRow[]>(() => Array.from({ length: qubitCount.value }, (_, index) => index));

const isSingleCustomModalOpen = ref(false);
const isBlockCustomModalOpen = ref(false);
const blockBuilderError = ref("");

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

type PendingMultiPlacement = {
  kind: "multi";
  column: number;
  gate: GateId;
  arity: number;
  wires: QubitRow[];
  hoverRow: QubitRow | null;
};

type PendingPlacement = PendingCnotPlacement | PendingToffoliPlacement | PendingMultiPlacement;

const dragging = ref<DragPayload | null>(null);
const dropTarget = ref<DragSource | null>(null);
const pendingPlacement = ref<PendingPlacement | null>(null);
const placementError = ref<string | null>(null);

const gateArity = (gate: GateId): number => operatorArityForGate(gate, state.customOperators) ?? 0;

const gateName = (gate: GateId): string => resolveOperator(gate, state.customOperators)?.label ?? gate;
const measurementLockByRow = computed(() => firstMeasurementColumnByRow(state.columns));
const firstMeasurementColumnAtRow = (row: QubitRow): number | null => measurementLockByRow.value.get(row) ?? null;
const isRowLockedAt = (column: number, row: QubitRow): boolean => isRowLockedAtColumn(state.columns, row, column);
const slotTitle = (column: number, row: QubitRow): string => {
  const measuredAt = firstMeasurementColumnAtRow(row);
  if (measuredAt === null || column <= measuredAt) {
    return "";
  }
  return `Locked: q${row} measured at t${measuredAt + 1}`;
};

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
  if (pending?.kind === "multi") {
    const nextStep = Math.min(pending.wires.length + 1, pending.arity);
    return `${gateName(pending.gate)} in t${pending.column + 1}: click wire ${nextStep}/${pending.arity} (Esc to cancel).`;
  }
  if (state.selectedGate === "CNOT") {
    return "CNOT: click a control wire to start placement.";
  }
  if (state.selectedGate === "TOFFOLI") {
    return "Toffoli: click the first control wire to start placement.";
  }
  if (state.selectedGate === "M") {
    return "M: click a wire to measure it. Later columns on that row are locked.";
  }
  if (state.selectedGate !== null && gateArity(state.selectedGate) > 1) {
    return `${gateName(state.selectedGate)}: click wire 1/${gateArity(state.selectedGate)} to start placement.`;
  }
  return null;
});

const clearPendingPlacement = () => {
  pendingPlacement.value = null;
  placementError.value = null;
};

const isPaletteDraggable = (gate: GateId): boolean => gateArity(gate) === 1;

const selectGate = (gate: GateId) => {
  const next = state.selectedGate === gate ? null : gate;
  setSelectedGate(next);
  clearPendingPlacement();
};

const slotInstance = (column: CircuitColumn, row: QubitRow) => gateInstanceAt(column, row);

const tokenFor = (column: CircuitColumn, row: QubitRow): string => {
  const instance = slotInstance(column, row);
  if (!instance) {
    return "";
  }
  if (instance.gate === "CNOT" || instance.gate === "TOFFOLI") {
    return "";
  }
  if (instance.wires.length > 1) {
    return instance.wires[0] === row ? gateLabel(instance.gate) : "•";
  }
  return gateLabel(instance.gate);
};

const isDraggableToken = (column: CircuitColumn, row: QubitRow): boolean => {
  const instance = slotInstance(column, row);
  if (!instance) {
    return false;
  }
  return gateArity(instance.gate) === 1;
};

const isCnotControl = (column: CircuitColumn, row: QubitRow): boolean => {
  const gate = slotInstance(column, row);
  return gate?.gate === "CNOT" && gate.wires[0] === row;
};

const isCnotTarget = (column: CircuitColumn, row: QubitRow): boolean => {
  const gate = slotInstance(column, row);
  return gate?.gate === "CNOT" && gate.wires[1] === row;
};

const isToffoliControl = (column: CircuitColumn, row: QubitRow): boolean => {
  const gate = slotInstance(column, row);
  return gate?.gate === "TOFFOLI" && (gate.wires[0] === row || gate.wires[1] === row);
};

const isToffoliTarget = (column: CircuitColumn, row: QubitRow): boolean => {
  const gate = slotInstance(column, row);
  return gate?.gate === "TOFFOLI" && gate.wires[2] === row;
};

const isCustomMultiWire = (column: CircuitColumn, row: QubitRow): boolean => {
  const gate = slotInstance(column, row);
  if (!gate || gate.gate === "CNOT" || gate.gate === "TOFFOLI") {
    return false;
  }
  return gate.wires.length > 1;
};

const isMeasurementToken = (column: CircuitColumn, row: QubitRow): boolean => {
  const gate = slotInstance(column, row);
  return gate?.gate === "M";
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

const isPendingMultiWire = (columnIndex: number, row: QubitRow): boolean => {
  const pending = pendingPlacement.value;
  if (pending?.kind !== "multi" || pending.column !== columnIndex) {
    return false;
  }
  return pending.wires.includes(row);
};

const isPendingMultiHover = (columnIndex: number, row: QubitRow): boolean => {
  const pending = pendingPlacement.value;
  if (pending?.kind !== "multi" || pending.column !== columnIndex || pending.hoverRow === null) {
    return false;
  }
  if (pending.wires.includes(pending.hoverRow)) {
    return false;
  }
  return pending.hoverRow === row;
};

type ConnectorSegment = {
  id: string;
  kind: "cnot" | "toffoli" | "multi";
  fromRow: number;
  toRow: number;
  preview: boolean;
};

const connectorSegments = (column: CircuitColumn, columnIndex: number): ConnectorSegment[] => {
  const committedSegments = column.gates.flatMap((gate): ConnectorSegment[] => {
    if (gate.gate === "CNOT") {
      return [{ id: gate.id, kind: "cnot", fromRow: gate.wires[0]!, toRow: gate.wires[1]!, preview: false }];
    }

    if (gate.gate === "TOFFOLI") {
      const minRow = Math.min(...gate.wires);
      const maxRow = Math.max(...gate.wires);
      return [{ id: gate.id, kind: "toffoli", fromRow: minRow, toRow: maxRow, preview: false }];
    }

    if (gate.wires.length > 1) {
      const minRow = Math.min(...gate.wires);
      const maxRow = Math.max(...gate.wires);
      return [{ id: gate.id, kind: "multi", fromRow: minRow, toRow: maxRow, preview: false }];
    }

    return [];
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

  if (pending.kind === "multi") {
    const previewRows = pending.hoverRow !== null ? [...pending.wires, pending.hoverRow] : pending.wires;
    return [
      ...committedSegments,
      {
        id: `pending-multi-${columnIndex}`,
        kind: "multi",
        fromRow: Math.min(...previewRows),
        toRow: Math.max(...previewRows),
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
const rowCenterViewBox = (row: number): number => ((row + 0.5) / rows.value.length) * 100;

const connectorStyle = (segment: ConnectorSegment): Record<string, string> => {
  const start = rowCenterPercent(Math.min(segment.fromRow, segment.toRow));
  const end = rowCenterPercent(Math.max(segment.fromRow, segment.toRow));

  return {
    top: `${start}%`,
    height: `${Math.max(0, end - start)}%`,
  };
};

const bellColorByState: Record<BellStateId, string> = {
  "phi+": "rgba(255, 122, 102, 0.95)",
  "phi-": "rgba(255, 196, 96, 0.95)",
  "psi+": "rgba(128, 165, 255, 0.95)",
  "psi-": "rgba(198, 130, 255, 0.95)",
};

const entanglementLinksForColumn = (columnIndex: number): EntanglementLink[] => {
  const previous = stageEntanglementLinks.value[columnIndex] ?? [];
  const current = stageEntanglementLinks.value[columnIndex + 1] ?? [];
  return entanglement_delta_links(previous, current).filter((link) => link.strength > 0.08);
};

const entanglementArcPath = (link: EntanglementLink): string => {
  const startY = rowCenterViewBox(Math.min(link.fromRow, link.toRow));
  const endY = rowCenterViewBox(Math.max(link.fromRow, link.toRow));
  const midY = (startY + endY) * 0.5;
  const startX = 24;
  const controlX = 16 - (link.strength * 6);
  return `M ${startX} ${startY} Q ${controlX} ${midY} ${startX} ${endY}`;
};

const entanglementArcStyle = (link: EntanglementLink): Record<string, string> => ({
  stroke: bellColorByState[link.dominantBell],
  strokeWidth: `${0.6 + (link.strength * 1.8)}`,
  opacity: `${0.22 + (link.strength * 0.55)}`,
});

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
  if (!gate || gateArity(gate.gate) !== 1) {
    return;
  }
  dragging.value = { gate: gate.gate, from: { col, row } };
  event.dataTransfer?.setData("text/plain", gate.gate);
};

const handleDragOver = (col: number, row: QubitRow) => {
  if (dragging.value === null) {
    return;
  }
  if (isRowLockedAt(col, row)) {
    dropTarget.value = null;
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
  const measuredAt = firstMeasurementColumnAtRow(row);
  if (measuredAt !== null && col > measuredAt) {
    placementError.value = `q${row} was measured at t${measuredAt + 1}; later columns are locked.`;
    dragging.value = null;
    dropTarget.value = null;
    return;
  }
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

const beginMultiPlacement = (column: number, gate: GateId, arity: number, firstWire: QubitRow) => {
  pendingPlacement.value = { kind: "multi", column, gate, arity, wires: [firstWire], hoverRow: firstWire };
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

const handleMultiSlotClick = (col: number, row: QubitRow, gate: GateId) => {
  const arity = gateArity(gate);
  if (arity < 2 || qubitCount.value < arity) {
    return;
  }

  const pending = pendingPlacement.value;
  if (!pending || pending.kind !== "multi" || pending.column !== col || pending.gate !== gate) {
    beginMultiPlacement(col, gate, arity, row);
    return;
  }

  if (pending.wires.includes(row)) {
    placementError.value = "Each wire can only be selected once.";
    pending.hoverRow = row;
    return;
  }

  const nextWires = [...pending.wires, row];
  if (nextWires.length < pending.arity) {
    pendingPlacement.value = { ...pending, wires: nextWires, hoverRow: row };
    placementError.value = null;
    return;
  }

  const placement = toMultiGatePlacement(col, nextWires, gate);
  if (!placement) {
    placementError.value = "Gate placement is invalid for the current circuit.";
    return;
  }

  placeMultiGate(placement);
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

  const measuredAt = firstMeasurementColumnAtRow(row);
  if (measuredAt !== null && col > measuredAt) {
    placementError.value = `q${row} was measured at t${measuredAt + 1}; later columns are locked.`;
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

  if (gateArity(state.selectedGate) > 1) {
    handleMultiSlotClick(col, row, state.selectedGate);
    return;
  }

  clearPendingPlacement();
  const placement = toSingleGatePlacement(col, row, state.selectedGate);
  if (!placement) {
    return;
  }
  setGateAt(placement);
};

const handlePaletteChipClick = (entry: PaletteEntry, event: MouseEvent) => {
  if (entry.isCustom && event.altKey) {
    deleteCustomOperator(entry.id);
    return;
  }
  selectGate(entry.id);
};

const blockBuilderOptions = computed<SingleQubitBuilderOption[]>(() => singleQubitBuilderOptions(state.customOperators));

const openSingleCustomModal = () => {
  isSingleCustomModalOpen.value = true;
};

const closeSingleCustomModal = () => {
  isSingleCustomModalOpen.value = false;
};

const openBlockCustomModal = () => {
  blockBuilderError.value = "";
  isBlockCustomModalOpen.value = true;
};

const closeBlockCustomModal = () => {
  blockBuilderError.value = "";
  isBlockCustomModalOpen.value = false;
};

const submitSingleCustomOperator = (payload: { label: string; entries: SingleQubitMatrixEntries }) => {
  const createdId = createCustomSingleQubitOperator(payload.label, payload.entries);
  setSelectedGate(createdId);
  clearPendingPlacement();
  closeSingleCustomModal();
};

const submitBlockCustomOperator = (payload: {
  label: string;
  arity: 2;
  selection: {
    topLeft: BuilderBlockId;
    topRight: BuilderBlockId;
    bottomLeft: BuilderBlockId;
    bottomRight: BuilderBlockId;
  };
}) => {
  if (payload.arity !== 2) {
    return;
  }
  blockBuilderError.value = "";

  const blocks = resolveBlock2x2Selection(
    {
      topLeft: payload.selection.topLeft,
      topRight: payload.selection.topRight,
      bottomLeft: payload.selection.bottomLeft,
      bottomRight: payload.selection.bottomRight,
    },
    state.customOperators,
  );
  if (!blocks) {
    blockBuilderError.value = "Block selection is invalid.";
    return;
  }

  const previewOperator = blockMatrix2x2("preview", "preview", blocks);
  if (!isUnitaryOperator(previewOperator)) {
    blockBuilderError.value = "Final matrix must be unitary. Choose different blocks.";
    return;
  }

  const createdId = createCustomBlockOperator(payload.label, blocks);
  setSelectedGate(createdId);
  clearPendingPlacement();
  closeBlockCustomModal();
};

const isDropTarget = (col: number, row: QubitRow): boolean =>
  dropTarget.value !== null && dropTarget.value.col === col && dropTarget.value.row === row && !isRowLockedAt(col, row);

const isDragSource = (col: number, row: QubitRow): boolean => {
  if (!dragging.value?.from) {
    return false;
  }
  if (dragging.value.from.col !== col) {
    return false;
  }
  return dragging.value.from.row === row;
};

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

  if (pending.kind === "multi") {
    if (
      gateArity(pending.gate) !== pending.arity ||
      qubitCount.value < pending.arity ||
      pending.wires.some((wire) => wire >= qubitCount.value)
    ) {
      clearPendingPlacement();
      return;
    }
    if (pending.hoverRow !== null && pending.hoverRow >= qubitCount.value) {
      pending.hoverRow = null;
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
    if (gate === null) {
      clearPendingPlacement();
      return;
    }

    const pending = pendingPlacement.value;
    if (!pending) {
      placementError.value = null;
      return;
    }

    if (gate === "CNOT" && pending.kind !== "cnot") {
      clearPendingPlacement();
      return;
    }

    if (gate === "TOFFOLI" && pending.kind !== "toffoli") {
      clearPendingPlacement();
      return;
    }

    if (gate !== "CNOT" && gate !== "TOFFOLI" && pending.kind !== "multi") {
      clearPendingPlacement();
      return;
    }

    if (pending.kind === "multi" && pending.gate !== gate) {
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
