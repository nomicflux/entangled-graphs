<template>
  <section class="panel panel-center">
    <div class="panel-header">
      <h2>{{ title }}</h2>
      <p>{{ subtitle }}</p>
    </div>

    <div class="circuit-shell algorithm-circuit-shell">
      <div class="circuit-grid-wrap" :class="{ 'has-classical-layout': hasClassicalLayout }">
        <div class="circuit-header-row algorithm-circuit-header-row" :style="{ gridTemplateColumns: panelGridTemplateColumns }">
          <p
            v-for="column in columns"
            :key="`${column.id}-header`"
            class="circuit-header-cell algorithm-column-label"
          >
            {{ column.label }}
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

          <div class="circuit-columns algorithm-circuit-columns" :style="{ gridTemplateColumns: panelGridTemplateColumns }">
            <div
              v-for="(column, colIndex) in columns"
              :key="column.id"
              class="circuit-column algorithm-circuit-column"
              :style="{ gridTemplateRows: quantumGridTemplateRows }"
            >
              <svg class="column-entanglement" viewBox="0 0 100 100" preserveAspectRatio="none" aria-hidden="true">
                <rect
                  v-for="band in multipartiteBandsForColumn(colIndex)"
                  :key="`alg-band-${colIndex}-${band.id}`"
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
                  v-for="connector in connectorSegments(column)"
                  :key="connector.id"
                  class="column-connector"
                  :class="connector.kind"
                  :style="connectorStyle(connector)"
                ></div>
              </div>

              <div v-for="row in rows" :key="row" class="gate-slot is-teleport-locked" :title="slotTitle">
                <span class="gate-slot-label">q{{ row }}</span>
                <div
                  class="gate-token"
                  :class="{
                    empty: slotInstance(column, row) === null && tokenText(column, row) === '',
                    'is-cnot-control': isCnotControl(column, row),
                    'is-cnot-target': isCnotTarget(column, row),
                    'is-toffoli-control': isToffoliControl(column, row),
                    'is-toffoli-target': isToffoliTarget(column, row),
                    'is-measurement': isMeasurementToken(column, row),
                    'is-multi-custom-wire': isMultiWire(column, row),
                    'is-teleport-classical': slotInstance(column, row) === null && tokenText(column, row) !== '',
                  }"
                >
                  {{ tokenText(column, row) }}
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
      :stages="stageSnapshots"
      :selected-stage-index="selectedStageIndex"
      @select-stage="$emit('select-stage', $event)"
    />

    <StageInspector :stage="selectedStageSnapshot" :animated="false" />
  </section>
</template>

<script setup lang="ts">
import { computed } from "vue";
import type {
  ClassicalConditionBadge,
  ClassicalRegisterOverlay,
  ClassicalRouteOverlay,
  EntanglementLink,
  FixedPanelClassicalLayout,
  GateId,
  GateInstance,
  QubitRow,
  StageEntanglementModel,
  StageSnapshot,
} from "../../../types";
import { multipartiteBandStyle, multipartiteTooltip } from "../../circuit/entanglement-display";
import { multipartiteBandsForStageColumn } from "../../circuit/entanglement-overlays";
import {
  CIRCUIT_SLOT_HEIGHT_PX,
  CLASSICAL_CONDITION_TOP_OFFSET_PX,
  CLASSICAL_REGISTER_HEIGHT_PX,
  CLASSICAL_ROUTE_RAIL_OFFSET_PX,
  COLUMN_GAP_PX,
  EMPTY_FIXED_PANEL_CLASSICAL_LAYOUT,
  REGULAR_COLUMN_WIDTH_PX,
  classicalBandHeight,
  fixedGridTemplateColumns,
  fixedPanelBodyHeight,
  fixedPanelBodyWidth,
  laneCenterY,
  routeRailPath,
  rowCenterY,
} from "../../circuit/fixed-panel-classical-layout";
import type { MultipartiteBand } from "../../circuit/grid-interaction-types";
import StageInspector from "../../StageInspector.vue";
import CircuitStageSnapshots from "../../circuit/CircuitStageSnapshots.vue";
import type { AlgorithmColumn } from "./model-types";

type ConnectorSegment = {
  id: string;
  kind: "cnot" | "toffoli" | "multi";
  fromRow: number;
  toRow: number;
};

const props = withDefaults(
  defineProps<{
    title: string;
    subtitle: string;
    slotTitle?: string;
    columns: AlgorithmColumn[];
    classicalLayout?: FixedPanelClassicalLayout;
    rows: readonly QubitRow[];
    stageSnapshots: StageSnapshot[];
    stageEntanglementModels: StageEntanglementModel[];
    selectedStageIndex: number;
    selectedStageSnapshot: StageSnapshot;
    entanglementLinksForColumn: (columnIndex: number) => EntanglementLink[];
    entanglementArcPath: (link: EntanglementLink) => string;
    entanglementArcStyle: (link: EntanglementLink) => Record<string, string>;
    pairwiseTooltip: (link: EntanglementLink) => string;
    placeholderToken?: (columnId: string, row: QubitRow) => string;
  }>(),
  {
    slotTitle: "Fixed algorithm backbone.",
    classicalLayout: () => EMPTY_FIXED_PANEL_CLASSICAL_LAYOUT,
    placeholderToken: () => "",
  },
);

defineEmits<{
  (e: "select-stage", index: number): void;
}>();

const slotInstance = (column: AlgorithmColumn, row: QubitRow): GateInstance | null =>
  column.gates.find((entry) => entry.wires.includes(row)) ?? null;

const gateTokenLabel = (gate: GateId): string => (gate === "DEUTSCH_ORACLE" ? "Uf" : gate);

const tokenText = (column: AlgorithmColumn, row: QubitRow): string => {
  const instance = slotInstance(column, row);
  if (!instance) {
    return props.placeholderToken(column.id, row);
  }
  if (instance.gate === "CNOT" || instance.gate === "TOFFOLI") {
    return "";
  }
  if (instance.wires.length > 1) {
    return instance.wires[0] === row ? gateTokenLabel(instance.gate) : "•";
  }
  return gateTokenLabel(instance.gate);
};

const isCnotControl = (column: AlgorithmColumn, row: QubitRow): boolean => {
  const gate = slotInstance(column, row);
  return gate?.gate === "CNOT" && gate.wires[0] === row;
};

const isCnotTarget = (column: AlgorithmColumn, row: QubitRow): boolean => {
  const gate = slotInstance(column, row);
  return gate?.gate === "CNOT" && gate.wires[1] === row;
};

const isToffoliControl = (column: AlgorithmColumn, row: QubitRow): boolean => {
  const gate = slotInstance(column, row);
  return gate?.gate === "TOFFOLI" && (gate.wires[0] === row || gate.wires[1] === row);
};

const isToffoliTarget = (column: AlgorithmColumn, row: QubitRow): boolean => {
  const gate = slotInstance(column, row);
  return gate?.gate === "TOFFOLI" && gate.wires[2] === row;
};

const isMeasurementToken = (column: AlgorithmColumn, row: QubitRow): boolean => slotInstance(column, row)?.gate === "M";

const isMultiWire = (column: AlgorithmColumn, row: QubitRow): boolean => {
  const gate = slotInstance(column, row);
  return !!gate && gate.gate !== "CNOT" && gate.gate !== "TOFFOLI" && gate.wires.length > 1;
};

const connectorSegments = (column: AlgorithmColumn): ConnectorSegment[] =>
  column.gates.flatMap((gate) => {
    if (gate.gate === "CNOT") {
      return [{ id: gate.id, kind: "cnot" as const, fromRow: gate.wires[0]!, toRow: gate.wires[1]! }];
    }
    if (gate.gate === "TOFFOLI") {
      return [{ id: gate.id, kind: "toffoli" as const, fromRow: Math.min(...gate.wires), toRow: Math.max(...gate.wires) }];
    }
    if (gate.wires.length > 1) {
      return [{ id: gate.id, kind: "multi" as const, fromRow: Math.min(...gate.wires), toRow: Math.max(...gate.wires) }];
    }
    return [];
  });

const quantumGridTemplateRows = computed(() => `repeat(${props.rows.length}, ${CIRCUIT_SLOT_HEIGHT_PX}px)`);
const panelGridTemplateColumns = computed(() =>
  fixedGridTemplateColumns(props.columns.map(() => REGULAR_COLUMN_WIDTH_PX)),
);
const panelBodyWidth = computed(() => fixedPanelBodyWidth(props.columns.map(() => REGULAR_COLUMN_WIDTH_PX)));
const laneIndexById = computed(() => new Map(props.classicalLayout.lanes.map((lane, index) => [lane.id, index])));
const hasClassicalLayout = computed(() => props.classicalLayout.lanes.length > 0);
const classicalBandHeightPx = computed(() => classicalBandHeight(props.classicalLayout.lanes.length));
const panelBodyHeight = computed(() => fixedPanelBodyHeight(props.rows.length, props.classicalLayout.lanes.length));
const classicalRailOffset = CLASSICAL_ROUTE_RAIL_OFFSET_PX;

const circuitBodyStyle = computed<Record<string, string>>(() => ({
  width: `${panelBodyWidth.value}px`,
  height: `${panelBodyHeight.value}px`,
}));

const connectorStyle = (segment: ConnectorSegment): Record<string, string> => ({
  top: `${rowCenterY(Math.min(segment.fromRow, segment.toRow))}px`,
  height: `${Math.max(0, rowCenterY(Math.max(segment.fromRow, segment.toRow)) - rowCenterY(Math.min(segment.fromRow, segment.toRow)))}px`,
});

const columnStartX = (columnId: string): number => {
  const index = props.columns.findIndex((column) => column.id === columnId);
  return Math.max(0, index) * (REGULAR_COLUMN_WIDTH_PX + COLUMN_GAP_PX);
};

const columnCenterX = (columnId: string): number => columnStartX(columnId) + (REGULAR_COLUMN_WIDTH_PX * 0.5);

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

const multipartiteBandsForColumn = (columnIndex: number): MultipartiteBand[] =>
  multipartiteBandsForStageColumn(props.stageEntanglementModels, columnIndex, props.rows.length);
</script>
