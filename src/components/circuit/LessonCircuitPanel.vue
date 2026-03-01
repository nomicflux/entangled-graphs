<template>
  <section class="panel panel-center">
    <div class="panel-header">
      <h2>{{ props.title }}</h2>
      <p>{{ props.subtitle }}</p>
    </div>

    <div class="circuit-tools">
      <CircuitGatePalette
        :groups="props.paletteGroups"
        :measurement-entries="props.measurementEntries"
        :selected-gate="props.selectedGate"
        :is-palette-draggable="props.isPaletteDraggable"
        :show-custom-actions="props.showCustomActions"
        @chip-click="props.handlePaletteChipClick"
        @palette-dragstart="props.startPaletteDrag"
        @drag-end="props.endDrag"
      />

      <div v-if="$slots.controls" class="column-controls">
        <slot name="controls"></slot>
      </div>
    </div>

    <p v-if="props.placementHint" class="placement-hint">{{ props.placementHint }}</p>

    <div class="circuit-shell">
      <div class="circuit-columns">
        <div
          v-for="(column, colIndex) in props.columns"
          :key="colIndex"
          class="circuit-column"
          :style="{ gridTemplateRows: `repeat(${props.rows.length}, minmax(56px, 1fr))` }"
        >
          <p class="algorithm-column-label">{{ props.columnLabels[colIndex] }}</p>

          <svg
            v-if="props.showEntanglement"
            class="column-entanglement"
            viewBox="0 0 100 100"
            preserveAspectRatio="none"
            aria-hidden="true"
          >
            <rect
              v-for="band in props.multipartiteBandsForColumn(colIndex)"
              :key="`${props.entanglementKeyPrefix}-band-${colIndex}-${band.id}`"
              class="entanglement-multipartite-band"
              :x="band.x"
              :y="band.y"
              :width="band.width"
              :height="band.height"
              :rx="band.rx"
              :style="props.multipartiteBandStyle(band.strength)"
            >
              <title>{{ props.multipartiteTooltip(band.rows, band.strength) }}</title>
            </rect>
            <path
              v-for="(link, linkIndex) in props.entanglementLinksForColumn(colIndex)"
              :key="`${props.entanglementKeyPrefix}-${colIndex}-${link.fromRow}-${link.toRow}-${linkIndex}`"
              class="entanglement-arc"
              :d="props.entanglementArcPath(link)"
              :style="props.entanglementArcStyle(link)"
            >
              <title>{{ props.pairwiseTooltip(link) }}</title>
            </path>
          </svg>

          <div class="column-connectors">
            <div
              v-for="connector in props.connectorSegments(column, colIndex)"
              :key="connector.id"
              class="column-connector"
              :class="[connector.kind, { preview: connector.preview }]"
              :style="props.connectorStyle(connector)"
            ></div>
          </div>

          <div
            v-for="row in props.rows"
            :key="row"
            class="gate-slot"
            :class="{
              'is-drop-target': props.isDropTarget(colIndex, row),
              'is-row-locked': props.isRowLockedAt(colIndex, row),
              'is-core-locked': props.isCellLockedAt(colIndex, row),
            }"
            :title="props.slotTitle(colIndex, row)"
            @dragover.prevent="props.handleDragOver(colIndex, row)"
            @dragleave="props.handleDragLeave(colIndex, row)"
            @drop.prevent="props.handleDrop(colIndex, row)"
            @mouseenter="props.handleSlotHover(colIndex, row)"
            @mousemove="props.handleSlotHover(colIndex, row)"
            @mouseleave="props.handleSlotLeave(colIndex, row)"
            @click="props.handleSlotClick(colIndex, row, $event)"
          >
            <span class="gate-slot-label">q{{ row }}</span>
            <div
              class="gate-token"
              :class="{
                empty: props.slotInstance(column, row) === null,
                draggable: props.isDraggableToken(column, row, colIndex),
                'is-drag-source': props.isDragSource(colIndex, row),
                'is-cnot-control': props.isCnotControl(column, row) || props.isPendingCnotControl(colIndex, row),
                'is-cnot-target': props.isCnotTarget(column, row) || props.isPendingCnotTarget(colIndex, row),
                'is-toffoli-control':
                  props.isToffoliControl(column, row) || props.isPendingToffoliControl(colIndex, row),
                'is-toffoli-target': props.isToffoliTarget(column, row) || props.isPendingToffoliTarget(colIndex, row),
                'is-multi-custom-wire': props.isCustomMultiWire(column, row) || props.isPendingMultiWire(colIndex, row),
                'is-multi-custom-hover': props.isPendingMultiHover(colIndex, row),
                'is-measurement': props.isMeasurementToken(column, row),
                'is-row-locked-token': props.isRowLockedAt(colIndex, row),
                'is-core-locked-token': props.isCellLockedAt(colIndex, row),
              }"
              :draggable="props.isDraggableToken(column, row, colIndex)"
              @dragstart="props.startCellDrag(colIndex, row, $event)"
              @dragend="props.endDrag"
            >
              {{ props.tokenFor(column, row) }}
            </div>
          </div>
        </div>
      </div>

      <div v-if="props.showEntanglement" class="circuit-legend">
        <span class="circuit-legend-time">Time -></span>
        <span class="circuit-legend-item">
          <span class="circuit-legend-swatch pairwise"></span>
          <span>Pairwise</span>
        </span>
        <span class="circuit-legend-item">
          <span class="circuit-legend-swatch multipartite"></span>
          <span>Multipartite</span>
        </span>
      </div>
    </div>

    <CircuitStageSnapshots
      :stages="props.stageSnapshots"
      :selected-stage-index="props.selectedStageIndex"
      :metric-label="props.metricLabel"
      :metric-hint="props.metricHint"
      :value-format="props.valueFormat"
      :max-distribution-rows="props.maxStageDistributionRows"
      @select-stage="props.selectStage"
    />

    <StageInspector
      :stage="props.selectedStageSnapshot"
      :animated="false"
      :metric-label="props.metricLabel"
      :distribution-heading="props.distributionHeading"
      :distribution-hint="props.distributionHint"
      :value-format="props.valueFormat"
      :max-distribution-rows="props.maxStageDistributionRows"
    />
  </section>
</template>

<script setup lang="ts">
import type { CircuitColumn, EntanglementLink, GateId, GateInstance, QubitRow, StageSnapshot } from "../../types";
import StageInspector from "../StageInspector.vue";
import CircuitGatePalette from "./CircuitGatePalette.vue";
import CircuitStageSnapshots from "./CircuitStageSnapshots.vue";
import type { PaletteEntry, PaletteGroup } from "./palette-types";
import type { ConnectorSegment, MultipartiteBand } from "./useCircuitGridInteractions";

const props = withDefaults(
  defineProps<{
    title: string;
    subtitle: string;
    columns: readonly CircuitColumn[];
    rows: readonly QubitRow[];
    columnLabels: readonly string[];
    paletteGroups: PaletteGroup[];
    measurementEntries: PaletteEntry[];
    selectedGate: GateId | null;
    stageSnapshots: StageSnapshot[];
    selectedStageIndex: number;
    selectedStageSnapshot: StageSnapshot;
    isPaletteDraggable: (gate: GateId) => boolean;
    handlePaletteChipClick: (entry: PaletteEntry, event: MouseEvent) => void;
    startPaletteDrag: (gate: GateId, event: DragEvent) => void;
    endDrag: () => void;
    placementHint?: string;
    slotInstance: (column: CircuitColumn, row: QubitRow) => GateInstance | null;
    tokenFor: (column: CircuitColumn, row: QubitRow) => string;
    isDraggableToken: (column: CircuitColumn, row: QubitRow, columnIndex: number) => boolean;
    isDragSource: (columnIndex: number, row: QubitRow) => boolean;
    isCnotControl: (column: CircuitColumn, row: QubitRow) => boolean;
    isCnotTarget: (column: CircuitColumn, row: QubitRow) => boolean;
    isToffoliControl: (column: CircuitColumn, row: QubitRow) => boolean;
    isToffoliTarget: (column: CircuitColumn, row: QubitRow) => boolean;
    isCustomMultiWire: (column: CircuitColumn, row: QubitRow) => boolean;
    isMeasurementToken: (column: CircuitColumn, row: QubitRow) => boolean;
    isPendingCnotControl: (columnIndex: number, row: QubitRow) => boolean;
    isPendingCnotTarget: (columnIndex: number, row: QubitRow) => boolean;
    isPendingToffoliControl: (columnIndex: number, row: QubitRow) => boolean;
    isPendingToffoliTarget: (columnIndex: number, row: QubitRow) => boolean;
    isPendingMultiWire: (columnIndex: number, row: QubitRow) => boolean;
    isPendingMultiHover: (columnIndex: number, row: QubitRow) => boolean;
    connectorSegments: (column: CircuitColumn, columnIndex: number) => ConnectorSegment[];
    connectorStyle: (segment: ConnectorSegment) => Record<string, string>;
    handleDragOver: (columnIndex: number, row: QubitRow) => void;
    handleDragLeave: (columnIndex: number, row: QubitRow) => void;
    handleDrop: (columnIndex: number, row: QubitRow) => void;
    handleSlotHover: (columnIndex: number, row: QubitRow) => void;
    handleSlotLeave: (columnIndex: number, row: QubitRow) => void;
    handleSlotClick: (columnIndex: number, row: QubitRow, event: MouseEvent) => void;
    startCellDrag: (columnIndex: number, row: QubitRow, event: DragEvent) => void;
    isDropTarget: (columnIndex: number, row: QubitRow) => boolean;
    isCellLockedAt: (columnIndex: number, row: QubitRow) => boolean;
    isRowLockedAt: (columnIndex: number, row: QubitRow) => boolean;
    slotTitle: (columnIndex: number, row: QubitRow) => string;
    selectStage: (index: number) => void;
    showCustomActions?: boolean;
    showEntanglement?: boolean;
    entanglementKeyPrefix?: string;
    entanglementLinksForColumn?: (columnIndex: number) => EntanglementLink[];
    multipartiteBandsForColumn?: (columnIndex: number) => MultipartiteBand[];
    entanglementArcPath?: (link: EntanglementLink) => string;
    entanglementArcStyle?: (link: EntanglementLink) => Record<string, string>;
    multipartiteBandStyle?: (strength: number) => Record<string, string>;
    pairwiseTooltip?: (link: EntanglementLink) => string;
    multipartiteTooltip?: (rows: ReadonlyArray<QubitRow>, strength: number) => string;
    metricLabel?: string;
    metricHint?: string;
    distributionHeading?: string;
    distributionHint?: string;
    valueFormat?: "percent" | "scalar";
    maxStageDistributionRows?: number;
  }>(),
  {
    placementHint: "",
    showCustomActions: false,
    showEntanglement: true,
    entanglementKeyPrefix: "lesson",
    entanglementLinksForColumn: () => [],
    multipartiteBandsForColumn: () => [],
    entanglementArcPath: () => "",
    entanglementArcStyle: () => ({}),
    multipartiteBandStyle: () => ({}),
    pairwiseTooltip: () => "",
    multipartiteTooltip: () => "",
    metricLabel: "P",
    metricHint: "",
    distributionHeading: "Distribution",
    distributionHint: "",
    valueFormat: "percent",
    maxStageDistributionRows: Number.POSITIVE_INFINITY,
  },
);
</script>
