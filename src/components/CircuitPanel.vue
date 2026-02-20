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
import { computed, ref } from "vue";
import type { GateId } from "../types";
import {
  appendColumn,
  availableBuiltinGatesForQubitCount,
  createCustomBlockOperator,
  createCustomSingleQubitOperator,
  deleteCustomOperator,
  isUnitaryOperator,
  qubitCount,
  removeLastColumn,
  resolveBlock2x2Selection,
  selectedStage,
  setSelectedGate,
  setSelectedStage,
  singleQubitBuilderOptions,
  stageViews,
  state,
} from "../state";
import type { BuilderBlockId, SingleQubitBuilderOption } from "../state/custom-operator-builder";
import StageInspector from "./StageInspector.vue";
import CircuitGatePalette from "./circuit/CircuitGatePalette.vue";
import CircuitStageSnapshots from "./circuit/CircuitStageSnapshots.vue";
import CircuitSingleCustomModal from "./circuit/CircuitSingleCustomModal.vue";
import CircuitBlockCustomModal from "./circuit/CircuitBlockCustomModal.vue";
import { blockMatrix2x2, type SingleQubitMatrixEntries } from "../operator";
import type { PaletteEntry, PaletteGroup } from "./circuit/palette-types";
import { useCircuitGridInteractions } from "./circuit/useCircuitGridInteractions";

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

const isSingleCustomModalOpen = ref(false);
const isBlockCustomModalOpen = ref(false);
const blockBuilderError = ref("");

const {
  rows,
  gateArity,
  placementHint,
  clearPendingPlacement,
  isPaletteDraggable,
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
  entanglementLinksForColumn,
  multipartiteBandsForColumn,
  entanglementArcPath,
  entanglementArcStyle,
  multipartiteBandStyle,
  pairwiseTooltip,
  multipartiteTooltip,
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
  isRowLockedAt,
  slotTitle,
} = useCircuitGridInteractions();

const selectGate = (gate: GateId) => {
  const next = state.selectedGate === gate ? null : gate;
  setSelectedGate(next);
  clearPendingPlacement();
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
</script>
