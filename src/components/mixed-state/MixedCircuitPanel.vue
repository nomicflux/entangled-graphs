<template>
  <section class="panel panel-center">
    <div class="panel-header">
      <h2>Quantum Circuit</h2>
    </div>

    <div class="circuit-tools">
      <div class="mixed-palette-stack">
        <CircuitGatePalette
          :groups="paletteGroups"
          :measurement-entries="measurementEntries"
          :selected-gate="mixedState.selectedGate"
          :is-palette-draggable="isPaletteDraggable"
          :show-custom-actions="false"
          @chip-click="handlePaletteChipClick"
          @palette-dragstart="startPaletteDrag"
          @drag-end="endDrag"
        />

        <section class="gate-group mixed-noise-group">
          <div class="mixed-noise-strength">
            <p class="gate-group-title">Noise</p>
            <span class="mixed-noise-strength-note">New Noise Gate Strength</span>
            <div class="mixed-noise-strength-row">
              <button
                v-for="preset in MIXED_NOISE_STRENGTH_PRESETS"
                :key="preset"
                class="basis-btn"
                :class="{ active: mixedState.noiseStrength === preset }"
                type="button"
                @click="setMixedNoiseStrength(preset)"
              >
                {{ formatNoiseStrength(preset) }}
              </button>
            </div>
          </div>

          <div class="gate-group-chips">
            <button
              v-for="entry in noiseEntries"
              :key="entry.id"
              class="gate-chip"
              :class="{ selected: mixedState.selectedGate === entry.id }"
              type="button"
              draggable="true"
              @click="toggleGate(entry.id)"
              @dragstart="startPaletteDrag(entry.id, $event)"
              @dragend="endDrag"
            >
              {{ entry.label }}
            </button>
          </div>
        </section>
      </div>

      <div class="column-controls">
        <button class="column-btn" type="button" @click="appendMixedColumn">Add column</button>
        <button class="column-btn" type="button" :disabled="mixedState.columns.length === 0" @click="removeLastMixedColumn">
          Remove column
        </button>
      </div>
    </div>

    <p v-if="placementHint" class="placement-hint">{{ placementHint }}</p>

    <div class="circuit-shell">
      <div class="circuit-columns">
        <div
          v-for="(column, colIndex) in gridColumns"
          :key="colIndex"
          class="circuit-column"
        >
          <div class="column-quantum-register" :style="quantumRegisterStyle">
            <svg
              class="column-entanglement"
              :viewBox="`0 0 100 ${quantumRegisterHeightPx}`"
              preserveAspectRatio="none"
              aria-hidden="true"
            >
              <rect
                v-for="(group, groupIndex) in correlationGroupsForColumn(colIndex)"
                :key="`group-${colIndex}-${groupIndex}`"
                class="mixed-correlation-band"
                :x="group.x"
                :y="group.y"
                :width="group.width"
                :height="group.height"
                :rx="group.rx"
              />
              <path
                v-for="overlay in pairCorrelationsForColumn(colIndex)"
                :key="`pair-${colIndex}-${overlay.fromRow}-${overlay.toRow}`"
                class="mixed-correlation-arc"
                :d="correlationArcPath(overlay)"
                :style="correlationArcStyle(overlay)"
              >
                <title>{{ correlationTooltip(overlay) }}</title>
              </path>
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
              :class="{
                'is-drop-target': isDropTarget(colIndex, row),
                'is-row-locked': isRowLockedAt(colIndex, row),
                'is-core-locked': isCellLockedAt(colIndex, row),
              }"
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
                  draggable: isDraggableToken(column, row, colIndex),
                  'is-drag-source': isDragSource(colIndex, row),
                  'is-cnot-control': isCnotControl(column, row) || isPendingCnotControl(colIndex, row),
                  'is-cnot-target': isCnotTarget(column, row) || isPendingCnotTarget(colIndex, row),
                  'is-toffoli-control': isToffoliControl(column, row) || isPendingToffoliControl(colIndex, row),
                  'is-toffoli-target': isToffoliTarget(column, row) || isPendingToffoliTarget(colIndex, row),
                  'is-multi-custom-wire': isCustomMultiWire(column, row) || isPendingMultiWire(colIndex, row),
                  'is-multi-custom-hover': isPendingMultiHover(colIndex, row),
                  'is-measurement': isMeasurementToken(column, row),
                  'is-row-locked-token': isRowLockedAt(colIndex, row),
                  'is-core-locked-token': isCellLockedAt(colIndex, row),
                  'mixed-noise-token': isNoiseToken(column, row),
                }"
                :draggable="isDraggableToken(column, row, colIndex)"
                @dragstart="startCellDrag(colIndex, row, $event)"
                @dragend="endDrag"
              >
                {{ tokenFor(column, row) }}
              </div>
            </div>
          </div>
        </div>
      </div>

      <div class="circuit-legend">
        <span class="circuit-legend-time">Time -></span>
        <span class="circuit-legend-item">
          <span class="circuit-legend-swatch pairwise"></span>
          <span>Correlations</span>
        </span>
        <span class="circuit-legend-item">
          <span class="circuit-legend-swatch multipartite"></span>
          <span>Groups</span>
        </span>
      </div>
    </div>

    <MixedCircuitStageSnapshots
      :stages="mixedStageSnapshots"
      :selected-stage-index="mixedState.selectedStageIndex"
      @select-stage="setMixedSelectedStage"
    />

    <MixedStageInspector :stage="mixedSelectedStageSnapshot" :animated="false" />
  </section>
</template>

<script setup lang="ts">
import { computed } from "vue";
import type {
  CircuitColumn,
  EntanglementLink,
  GateId,
  PairCorrelationOverlay,
  StageEntanglementModel,
} from "../../types";
import {
  MIXED_NOISE_STRENGTH_PRESETS,
  appendMixedColumn,
  clearMixedGateAt,
  formatNoiseStrength,
  mixedQubitCount,
  mixedSelectedStageSnapshot,
  mixedStageSnapshots,
  mixedState,
  mixedToolLabel,
  noiseChannelLabel,
  noiseToolId,
  parseNoiseToolId,
  placeMixedCnot,
  placeMixedMultiGate,
  placeMixedToffoli,
  removeLastMixedColumn,
  setMixedGateAt,
  setMixedNoiseStrength,
  setMixedSelectedGate,
  setMixedSelectedStage,
  toolIdForProcess,
} from "../../mixed-state";
import { availableBuiltinGatesForQubitCount, operatorArityForGate } from "../../state/operators";
import type { CircuitGridModelContext } from "../circuit/model-context";
import type { PaletteEntry, PaletteGroup } from "../circuit/palette-types";
import {
  quantumGridTemplateRows,
  quantumRegisterHeight,
  quantumRegisterStyleVars,
  quantumRowBottomY,
  quantumRowCenterY,
  quantumRowTopY,
} from "../circuit/quantum-register-layout";
import CircuitGatePalette from "../circuit/CircuitGatePalette.vue";
import { useCircuitGridInteractions } from "../circuit/useCircuitGridInteractions";
import MixedCircuitStageSnapshots from "./MixedCircuitStageSnapshots.vue";
import MixedStageInspector from "./MixedStageInspector.vue";
import { deriveDensityStageVisualModel } from "./density-stage-visual-model";

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
  "CZ",
  "CP",
  "SWAP",
  "TOFFOLI",
  "CSWAP",
];

const noiseChannels = [
  "bit-flip",
  "phase-flip",
  "dephasing",
  "depolarizing",
  "amplitude-damping",
] as const;

const gridColumns = computed<CircuitColumn[]>(() =>
  mixedState.columns.map((column) => ({
    gates: column.gates.map((gate) => ({
      id: gate.id,
      gate: toolIdForProcess(gate.process),
      wires: [...gate.wires],
    })),
  })),
);

const paletteGates = computed<GateId[]>(() =>
  availableBuiltinGatesForQubitCount(mixedQubitCount.value).filter((gate) => paletteBuiltinGates.includes(gate)),
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

  return [...byArity.entries()]
    .sort(([left], [right]) => left - right)
    .map(([arity, entries]) => ({
      arity,
      title: `${arity}Q Gates`,
      entries,
    }));
});

const measurementEntries = computed<PaletteEntry[]>(() => (paletteGates.value.includes("M") ? [{ id: "M", label: "M", isCustom: false }] : []));

const noiseEntries = computed(() =>
  noiseChannels.map((channelId) => ({
    id: noiseToolId(channelId, mixedState.noiseStrength),
    label: noiseChannelLabel(channelId),
  })),
);

const firstMeasurementColumnAtRow = (row: number): number | null => {
  for (let columnIndex = 0; columnIndex < mixedState.columns.length; columnIndex += 1) {
    const gate = mixedState.columns[columnIndex]!.gates.find(
      (entry) => entry.process.kind === "measurement" && entry.wires[0] === row,
    );
    if (gate) {
      return columnIndex;
    }
  }
  return null;
};

const isRowLockedAtColumn = (column: number, row: number): boolean => {
  const measuredAt = firstMeasurementColumnAtRow(row);
  return measuredAt !== null && column > measuredAt;
};

const hasColumn = (value: number): boolean => Number.isInteger(value) && value >= 0 && value < mixedState.columns.length;
const hasWire = (value: number): boolean => Number.isInteger(value) && value >= 0 && value < mixedQubitCount.value;

const gateArity = (gate: GateId): number => {
  const noise = parseNoiseToolId(gate);
  if (noise || gate === "M") {
    return 1;
  }
  return operatorArityForGate(gate, []) ?? 0;
};

const gateName = (gate: GateId): string => mixedToolLabel(gate, { includeStrength: parseNoiseToolId(gate) !== null });
const gateLabel = (gate: GateId): string =>
  mixedToolLabel(gate, {
    compact: parseNoiseToolId(gate) !== null,
    includeStrength: parseNoiseToolId(gate) !== null,
  });

const context: CircuitGridModelContext = {
  columns: computed(() => gridColumns.value),
  qubitCount: computed(() => mixedQubitCount.value),
  selectedGate: computed(() => mixedState.selectedGate),
  gateArity,
  gateName,
  gateLabel,
  gateInstanceAt: (column: CircuitColumn, row: number) => column.gates.find((entry) => entry.wires.includes(row)) ?? null,
  setSelectedGate: setMixedSelectedGate,
  clearGateAt: (column: number, row: number): boolean => {
    if (!hasColumn(column) || !hasWire(row)) {
      return false;
    }
    clearMixedGateAt(column, row);
    return true;
  },
  setSingleGateAt: (column: number, row: number, gate: GateId): boolean => {
    if (!hasColumn(column) || !hasWire(row)) {
      return false;
    }
    return setMixedGateAt(column, row, gate);
  },
  placeCnotAt: (column: number, control: number, target: number): boolean => {
    if (!hasColumn(column) || !hasWire(control) || !hasWire(target) || control === target) {
      return false;
    }
    if (isRowLockedAtColumn(column, control) || isRowLockedAtColumn(column, target)) {
      return false;
    }
    placeMixedCnot(column, control, target);
    return true;
  },
  placeToffoliAt: (column: number, controlA: number, controlB: number, target: number): boolean => {
    if (
      !hasColumn(column) ||
      !hasWire(controlA) ||
      !hasWire(controlB) ||
      !hasWire(target) ||
      new Set([controlA, controlB, target]).size !== 3
    ) {
      return false;
    }
    if (isRowLockedAtColumn(column, controlA) || isRowLockedAtColumn(column, controlB) || isRowLockedAtColumn(column, target)) {
      return false;
    }
    placeMixedToffoli(column, controlA, controlB, target);
    return true;
  },
  placeMultiGateAt: (column: number, wires: ReadonlyArray<number>, gate: GateId): boolean => {
    const arity = gateArity(gate);
    if (
      !hasColumn(column) ||
      wires.length !== arity ||
      wires.some((wire) => !hasWire(wire) || isRowLockedAtColumn(column, wire)) ||
      new Set(wires).size !== wires.length
    ) {
      return false;
    }
    placeMixedMultiGate(column, wires, gate);
    return true;
  },
  stageEntanglementLinks: computed<ReadonlyArray<ReadonlyArray<EntanglementLink>>>(() => []),
  stageEntanglementModels: computed<ReadonlyArray<StageEntanglementModel>>(() => []),
};

const stageVisualModels = computed(() =>
  mixedStageSnapshots.value.map((snapshot) => deriveDensityStageVisualModel(snapshot.rho)),
);

const quantumGridTemplate = computed(() => quantumGridTemplateRows(mixedQubitCount.value));
const quantumRegisterHeightPx = computed(() => quantumRegisterHeight(mixedQubitCount.value));
const quantumRegisterStyle = computed<Record<string, string>>(() => ({
  ...quantumRegisterStyleVars(mixedQubitCount.value),
  gridTemplateRows: quantumGridTemplate.value,
}));

const {
  rows,
  placementHint,
  slotInstance,
  tokenFor,
  isDraggableToken,
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
  isDragSource,
  isCellLockedAt,
  isRowLockedAt,
  slotTitle,
  isPaletteDraggable,
} = useCircuitGridInteractions({ context });

const toggleGate = (gate: GateId) => {
  setMixedSelectedGate(mixedState.selectedGate === gate ? null : gate);
};

const handlePaletteChipClick = (entry: PaletteEntry) => {
  toggleGate(entry.id);
};

const pairCorrelationsForColumn = (columnIndex: number): ReadonlyArray<PairCorrelationOverlay> =>
  stageVisualModels.value[columnIndex + 1]?.pairCorrelations ?? [];

const correlationGroupsForColumn = (columnIndex: number) =>
  (stageVisualModels.value[columnIndex + 1]?.correlationGroups ?? []).map((group) => {
    const startRow = Math.min(...group);
    const endRow = Math.max(...group);
    const y = quantumRowTopY(startRow) + 8;
    const bottom = quantumRowBottomY(endRow) - 8;

    return {
      x: 8,
      y,
      width: 84,
      height: Math.max(14, bottom - y),
      rx: 10,
    };
  });

const correlationArcPath = (overlay: PairCorrelationOverlay): string => {
  const y1 = quantumRowCenterY(Math.min(overlay.fromRow, overlay.toRow));
  const y2 = quantumRowCenterY(Math.max(overlay.fromRow, overlay.toRow));
  const controlX = 16 + Math.abs(y2 - y1) * 0.24;
  return `M 20 ${y1} C ${controlX} ${y1}, ${controlX} ${y2}, 20 ${y2}`;
};

const correlationColor = (overlay: PairCorrelationOverlay): string => {
  if (overlay.dominantChannel === "same-parity") {
    return "rgba(102, 245, 214, 0.88)";
  }
  if (overlay.dominantChannel === "opposite-parity") {
    return "rgba(252, 165, 255, 0.88)";
  }
  return "rgba(255, 196, 122, 0.88)";
};

const correlationArcStyle = (overlay: PairCorrelationOverlay) => ({
  stroke: correlationColor(overlay),
  strokeWidth: `${1 + overlay.strength * 3}`,
  opacity: `${0.18 + overlay.strength * 0.82}`,
});

const correlationTooltip = (overlay: PairCorrelationOverlay): string =>
  `q${overlay.fromRow} ↔ q${overlay.toRow} • ${Math.round(overlay.strength * 100)}%`;

const isNoiseToken = (column: CircuitColumn, row: number): boolean => {
  const instance = slotInstance(column, row);
  return instance !== null && parseNoiseToolId(instance.gate) !== null;
};
</script>
