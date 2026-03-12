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
      <div class="circuit-grid-wrap" :class="{ 'has-classical-layout': hasClassicalLayout }">
        <div class="circuit-header-row" :style="{ gridTemplateColumns: panelGridTemplateColumns }">
          <p
            v-for="(visibleColumn, colIndex) in props.visibleColumns"
            :key="`${visibleColumn.id}-header`"
            class="circuit-header-cell algorithm-column-label"
            :class="{
              'is-matrix-column': visibleColumn.width === 'matrix-3',
              'is-parity-family-column': visibleColumn.kind === 'parity-family',
              'is-parity-z-basis': visibleColumn.kind === 'parity-family' && visibleColumn.basis === 'Z',
              'is-parity-x-basis': visibleColumn.kind === 'parity-family' && visibleColumn.basis === 'X',
            }"
          >
            {{ props.columnLabels[colIndex] }}
          </p>
        </div>

        <div class="circuit-body" :style="circuitBodyStyle">
          <svg
            v-if="hasClassicalLayout"
            class="classical-route-overlay"
            :viewBox="`0 0 ${panelBodyWidth} ${panelBodyHeight}`"
            preserveAspectRatio="none"
            aria-hidden="true"
          >
            <line
              v-for="lane in props.classicalLayout.lanes"
              :key="`${lane.id}-guide`"
              class="classical-band-lane"
              x1="0"
              :x2="panelBodyWidth"
              :y1="laneGuideY(lane.id)"
              :y2="laneGuideY(lane.id)"
            ></line>
            <template v-for="route in props.classicalLayout.routes" :key="route.id">
              <path
                class="classical-route-rail"
                :class="route.kind"
                :d="classicalRouteRailPath(route, -classicalRailOffset)"
              ></path>
              <path
                class="classical-route-rail"
                :class="route.kind"
                :d="classicalRouteRailPath(route, classicalRailOffset)"
              ></path>
            </template>
          </svg>

          <div class="circuit-columns" :style="{ gridTemplateColumns: panelGridTemplateColumns }">
            <div
              v-for="(visibleColumn, colIndex) in props.visibleColumns"
              :key="visibleColumn.id"
              class="circuit-column"
              :class="{
                'is-regular-column': visibleColumn.width === 'regular',
                'is-matrix-column': visibleColumn.width === 'matrix-3',
                'is-parity-family-column': visibleColumn.kind === 'parity-family',
                'is-parity-z-basis': visibleColumn.kind === 'parity-family' && visibleColumn.basis === 'Z',
                'is-parity-x-basis': visibleColumn.kind === 'parity-family' && visibleColumn.basis === 'X',
              }"
              :style="{ gridTemplateRows: quantumGridTemplateRows }"
            >
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
                  v-for="connector in props.connectorSegments(renderColumnAt(colIndex), colIndex)"
                  :key="connector.id"
                  class="column-connector"
                  :class="[connector.kind, { preview: connector.preview }]"
                  :style="props.connectorStyle(connector)"
                ></div>
              </div>

              <div v-if="visibleColumn.kind === 'parity-family'" class="parity-family-rails" aria-hidden="true">
                <div
                  v-for="lane in visibleColumn.lanes"
                  :key="`${visibleColumn.id}-rail-${lane.laneIndex}`"
                  class="parity-family-rail"
                  :style="parityRailStyle(lane)"
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
                  'is-data-row': rowRole(row) === 'data',
                  'is-syndrome-row': rowRole(row) === 'syndrome',
                  'is-helper-row': rowRole(row) === 'helper',
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
                <div v-if="visibleColumn.kind === 'parity-family'" class="parity-slot-grid" aria-hidden="true">
                  <div
                    v-for="laneIndex in parityLaneIndexes"
                    :key="`${visibleColumn.id}-row-${row}-lane-${laneIndex}`"
                    class="parity-slot-lane"
                    :style="parityLaneStyle(laneIndex)"
                  >
                    <span
                      v-if="parityNodeKind(visibleColumn, laneIndex, row)"
                      class="parity-node"
                      :class="`is-${parityNodeKind(visibleColumn, laneIndex, row)}-node`"
                    ></span>
                  </div>
                </div>
                <div
                  v-else
                  class="gate-token"
                  :class="{
                    empty: props.slotInstance(renderColumnAt(colIndex), row) === null,
                    draggable: props.isDraggableToken(renderColumnAt(colIndex), row, colIndex),
                    'is-drag-source': props.isDragSource(colIndex, row),
                    'is-cnot-control':
                      props.isCnotControl(renderColumnAt(colIndex), row) || props.isPendingCnotControl(colIndex, row),
                    'is-cnot-target':
                      props.isCnotTarget(renderColumnAt(colIndex), row) || props.isPendingCnotTarget(colIndex, row),
                    'is-toffoli-control':
                      props.isToffoliControl(renderColumnAt(colIndex), row) || props.isPendingToffoliControl(colIndex, row),
                    'is-toffoli-target':
                      props.isToffoliTarget(renderColumnAt(colIndex), row) || props.isPendingToffoliTarget(colIndex, row),
                    'is-multi-custom-wire':
                      props.isCustomMultiWire(renderColumnAt(colIndex), row) || props.isPendingMultiWire(colIndex, row),
                    'is-multi-custom-hover': props.isPendingMultiHover(colIndex, row),
                    'is-measurement': props.isMeasurementToken(renderColumnAt(colIndex), row),
                    'is-row-locked-token': props.isRowLockedAt(colIndex, row),
                    'is-core-locked-token': props.isCellLockedAt(colIndex, row),
                  }"
                  :draggable="props.isDraggableToken(renderColumnAt(colIndex), row, colIndex)"
                  @dragstart="props.startCellDrag(colIndex, row, $event)"
                  @dragend="props.endDrag"
                >
                  {{ props.tokenFor(renderColumnAt(colIndex), row) }}
                </div>
              </div>
            </div>
          </div>

          <div
            v-if="hasClassicalLayout"
            class="classical-band-spacer"
            :style="{ height: `${classicalBandHeightPx}px` }"
          ></div>

          <div
            v-for="register in props.classicalLayout.registers"
            :key="register.id"
            class="classical-register-chip"
            :class="register.kind ?? 'bit'"
            :style="classicalRegisterStyle(register)"
          >
            <span class="classical-register-label">{{ register.label }}</span>
            <span class="classical-register-value">{{ register.valueText }}</span>
          </div>

          <div
            v-for="badge in props.classicalLayout.conditionBadges"
            :key="badge.id"
            class="classical-condition-badge"
            :class="badge.kind ?? 'bit'"
            :style="classicalConditionBadgeStyle(badge)"
          >
            {{ badge.text }}
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
      :show-distribution-details="props.showDistributionDetails"
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
      :show-zero-probability-rows="props.showZeroProbabilityRows"
    />
  </section>
</template>

<script setup lang="ts">
import { computed } from "vue";
import type {
  CircuitColumn,
  ClassicalConditionBadge,
  ClassicalRegisterOverlay,
  ClassicalRouteOverlay,
  EntanglementLink,
  FixedPanelClassicalLayout,
  GateId,
  GateInstance,
  QubitRow,
  StageSnapshot,
} from "../../types";
import {
  CIRCUIT_SLOT_HEIGHT_PX,
  CLASSICAL_CONDITION_TOP_OFFSET_PX,
  CLASSICAL_REGISTER_HEIGHT_PX,
  CLASSICAL_ROUTE_RAIL_OFFSET_PX,
  COLUMN_GAP_PX,
  EMPTY_FIXED_PANEL_CLASSICAL_LAYOUT,
  MATRIX_COLUMN_WIDTH_PX,
  REGULAR_COLUMN_WIDTH_PX,
  classicalBandHeight,
  fixedGridTemplateColumns,
  fixedPanelBodyHeight,
  fixedPanelBodyWidth,
  laneCenterY,
  routeRailPath,
  rowCenterY,
} from "./fixed-panel-classical-layout";
import type { LessonRowSpec, ParityLaneView, VisibleLessonColumn } from "../error-codes/shared/lesson-spec";
import StageInspector from "../StageInspector.vue";
import CircuitGatePalette from "./CircuitGatePalette.vue";
import CircuitStageSnapshots from "./CircuitStageSnapshots.vue";
import type { PaletteEntry, PaletteGroup } from "./palette-types";
import type { ConnectorSegment, MultipartiteBand } from "./useCircuitGridInteractions";

const EMPTY_COLUMN: CircuitColumn = { gates: [] };
const parityLaneIndexes = [0, 1, 2] as const;

const props = withDefaults(
  defineProps<{
    title: string;
    subtitle: string;
    columns: readonly CircuitColumn[];
    visibleColumns: readonly VisibleLessonColumn[];
    rowSpecs: readonly LessonRowSpec[];
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
    classicalLayout?: FixedPanelClassicalLayout;
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
    showDistributionDetails?: boolean;
    showZeroProbabilityRows?: boolean;
  }>(),
  {
    placementHint: "",
    classicalLayout: () => EMPTY_FIXED_PANEL_CLASSICAL_LAYOUT,
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
    showDistributionDetails: true,
    showZeroProbabilityRows: true,
  },
);

const renderColumnAt = (columnIndex: number): CircuitColumn => props.columns[columnIndex] ?? EMPTY_COLUMN;
const rowRoleMap = computed(() => new Map(props.rowSpecs.map((entry) => [entry.row, entry.role])));
const rowRole = (row: QubitRow) => rowRoleMap.value.get(row) ?? "data";

const parityLaneLeftPercent = (laneIndex: number): number => 20 + laneIndex * 30;

const columnWidthPx = (column: VisibleLessonColumn): number =>
  column.width === "matrix-3" ? MATRIX_COLUMN_WIDTH_PX : REGULAR_COLUMN_WIDTH_PX;

const columnWidths = computed(() => props.visibleColumns.map((column) => columnWidthPx(column)));
const quantumGridTemplateRows = computed(() => `repeat(${props.rows.length}, ${CIRCUIT_SLOT_HEIGHT_PX}px)`);
const panelGridTemplateColumns = computed(() => fixedGridTemplateColumns(columnWidths.value));
const panelBodyWidth = computed(() => fixedPanelBodyWidth(columnWidths.value));
const laneIndexById = computed(() => new Map(props.classicalLayout.lanes.map((lane, index) => [lane.id, index])));
const hasClassicalLayout = computed(() => props.classicalLayout.lanes.length > 0);
const classicalBandHeightPx = computed(() => classicalBandHeight(props.classicalLayout.lanes.length));
const panelBodyHeight = computed(() => fixedPanelBodyHeight(props.rows.length, props.classicalLayout.lanes.length));
const classicalRailOffset = CLASSICAL_ROUTE_RAIL_OFFSET_PX;

const circuitBodyStyle = computed<Record<string, string>>(() => ({
  width: `${panelBodyWidth.value}px`,
  height: `${panelBodyHeight.value}px`,
}));

const columnStartX = (columnId: string): number => {
  const targetIndex = props.visibleColumns.findIndex((column) => column.id === columnId);
  return columnWidths.value
    .slice(0, Math.max(0, targetIndex))
    .reduce((sum, width) => sum + width, 0) + Math.max(0, targetIndex) * COLUMN_GAP_PX;
};

const columnCenterX = (columnId: string): number => {
  const targetIndex = props.visibleColumns.findIndex((column) => column.id === columnId);
  const width = columnWidths.value[targetIndex] ?? REGULAR_COLUMN_WIDTH_PX;
  return columnStartX(columnId) + (width * 0.5);
};

const laneForIndex = (column: Extract<VisibleLessonColumn, { kind: "parity-family" }>, laneIndex: number): ParityLaneView | null =>
  column.lanes.find((lane) => lane.laneIndex === laneIndex) ?? null;

const parityNodeKind = (
  column: Extract<VisibleLessonColumn, { kind: "parity-family" }>,
  laneIndex: number,
  row: QubitRow,
): "support" | "collector" | null => {
  const lane = laneForIndex(column, laneIndex);
  if (!lane) {
    return null;
  }
  if (lane.syndromeRow === row) {
    return "collector";
  }
  return lane.supportRows.includes(row) ? "support" : null;
};

const parityLaneStyle = (laneIndex: number): Record<string, string> => ({
  left: `${parityLaneLeftPercent(laneIndex)}%`,
});

const parityRailStyle = (lane: ParityLaneView): Record<string, string> => {
  const topRow = Math.min(lane.syndromeRow, ...lane.supportRows);
  const bottomRow = Math.max(lane.syndromeRow, ...lane.supportRows);
  const top = rowCenterY(topRow);
  const bottom = rowCenterY(bottomRow);

  return {
    left: `${parityLaneLeftPercent(lane.laneIndex)}%`,
    top: `${top}px`,
    height: `${Math.max(0, bottom - top)}px`,
  };
};

const laneGuideY = (laneId: string): number =>
  laneCenterY(props.rows.length, laneIndexById.value.get(laneId) ?? 0);

const classicalRouteRailPath = (route: ClassicalRouteOverlay, railOffset: number): string =>
  routeRailPath(
    columnCenterX(route.from.columnId),
    rowCenterY(route.from.row),
    columnCenterX(route.to.columnId),
    rowCenterY(route.to.row),
    laneGuideY(route.lane),
    railOffset,
  );

const classicalRegisterStyle = (register: ClassicalRegisterOverlay): Record<string, string> => ({
  left: `${columnCenterX(register.anchorColumnId)}px`,
  top: `${laneGuideY(register.lane) - (CLASSICAL_REGISTER_HEIGHT_PX * 0.5)}px`,
});

const classicalConditionBadgeStyle = (badge: ClassicalConditionBadge): Record<string, string> => ({
  left: `${columnCenterX(badge.columnId)}px`,
  top: `${Math.max(6, rowCenterY(badge.row) - CLASSICAL_CONDITION_TOP_OFFSET_PX)}px`,
});
</script>
