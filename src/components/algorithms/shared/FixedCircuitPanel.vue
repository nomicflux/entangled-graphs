<template>
  <section class="panel panel-center">
    <div class="panel-header">
      <h2>{{ title }}</h2>
      <p>{{ subtitle }}</p>
    </div>

    <div class="circuit-shell algorithm-circuit-shell">
      <div class="circuit-columns algorithm-circuit-columns">
        <div
          v-for="(column, colIndex) in columns"
          :key="column.id"
          class="circuit-column algorithm-circuit-column"
          :style="{ gridTemplateRows: `repeat(${rows.length}, minmax(56px, 1fr))` }"
        >
          <p class="algorithm-column-label">{{ column.label }}</p>

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
      :selected-stage-index="selectedStageIndex"
      @select-stage="$emit('select-stage', $event)"
    />

    <StageInspector :stage="selectedStage" :animated="false" />
  </section>
</template>

<script setup lang="ts">
import type { EntanglementLink, GateId, GateInstance, QubitRow, StageEntanglementModel, StageView } from "../../../types";
import { multipartiteBandStyle, multipartiteTooltip } from "../../circuit/entanglement-display";
import { multipartiteBandsForStageColumn } from "../../circuit/entanglement-overlays";
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
    rows: readonly QubitRow[];
    stageViews: StageView[];
    stageEntanglementModels: StageEntanglementModel[];
    selectedStageIndex: number;
    selectedStage: StageView;
    entanglementLinksForColumn: (columnIndex: number) => EntanglementLink[];
    entanglementArcPath: (link: EntanglementLink) => string;
    entanglementArcStyle: (link: EntanglementLink) => Record<string, string>;
    pairwiseTooltip: (link: EntanglementLink) => string;
    placeholderToken?: (columnId: string, row: QubitRow) => string;
  }>(),
  {
    slotTitle: "Fixed algorithm backbone.",
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

const rowCenterPercent = (row: number): number => ((row + 0.5) / props.rows.length) * 100;

const connectorStyle = (segment: ConnectorSegment): Record<string, string> => ({
  top: `${rowCenterPercent(Math.min(segment.fromRow, segment.toRow))}%`,
  height: `${Math.max(0, rowCenterPercent(Math.max(segment.fromRow, segment.toRow)) - rowCenterPercent(Math.min(segment.fromRow, segment.toRow)))}%`,
});

const multipartiteBandsForColumn = (columnIndex: number): MultipartiteBand[] =>
  multipartiteBandsForStageColumn(props.stageEntanglementModels, columnIndex, props.rows.length);
</script>
