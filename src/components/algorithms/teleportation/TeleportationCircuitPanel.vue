<template>
  <section class="panel panel-center">
    <div class="panel-header">
      <h2>Quantum Teleportation</h2>
      <p>Core algorithm steps are fixed in this phase.</p>
    </div>

    <div class="circuit-shell teleport-circuit-shell">
      <div class="circuit-columns teleport-circuit-columns">
        <div
          v-for="(column, colIndex) in columns"
          :key="column.id"
          class="circuit-column teleport-circuit-column"
          :style="{ gridTemplateRows: `repeat(${rows.length}, minmax(56px, 1fr))` }"
        >
          <p class="teleport-column-label">{{ column.label }}</p>

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
              v-for="connector in connectorSegments(column)"
              :key="connector.id"
              class="column-connector cnot"
              :style="connectorStyle(connector)"
            ></div>
          </div>

          <div
            v-for="row in rows"
            :key="row"
            class="gate-slot is-teleport-locked"
            :title="slotTitle"
          >
            <span class="gate-slot-label">q{{ row }}</span>
            <div
              class="gate-token"
              :class="{
                empty: slotInstance(column, row) === null && placeholderToken(column.id, row) === '',
                'is-cnot-control': isCnotControl(column, row),
                'is-cnot-target': isCnotTarget(column, row),
                'is-measurement': isMeasurementToken(column, row),
                'is-teleport-classical': placeholderToken(column.id, row) !== '',
              }"
            >
              {{ tokenFor(column, row) || placeholderToken(column.id, row) }}
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
      :selected-stage-index="selectedStageIndex"
      @select-stage="$emit('select-stage', $event)"
    />

    <StageInspector :stage="selectedStage" :animated="false" />
  </section>
</template>

<script setup lang="ts">
import type { EntanglementLink, GateInstance, QubitRow, StageView } from "../../../types";
import type { TeleportationColumn } from "./model-types";
import StageInspector from "../../StageInspector.vue";
import CircuitStageSnapshots from "../../circuit/CircuitStageSnapshots.vue";

type ConnectorSegment = {
  id: string;
  fromRow: number;
  toRow: number;
};

const props = defineProps<{
  columns: TeleportationColumn[];
  rows: readonly QubitRow[];
  stageViews: StageView[];
  selectedStageIndex: number;
  selectedStage: StageView;
  entanglementLinksForColumn: (columnIndex: number) => EntanglementLink[];
  entanglementArcPath: (link: EntanglementLink) => string;
  entanglementArcStyle: (link: EntanglementLink) => Record<string, string>;
}>();

defineEmits<{
  (e: "select-stage", index: number): void;
}>();

const slotTitle = "Fixed teleportation backbone (editable controls arrive in later phases).";

const slotInstance = (column: TeleportationColumn, row: QubitRow): GateInstance | null =>
  column.gates.find((entry) => entry.wires.includes(row)) ?? null;

const tokenFor = (column: TeleportationColumn, row: QubitRow): string => {
  const instance = slotInstance(column, row);
  if (!instance) {
    return "";
  }
  if (instance.gate === "CNOT") {
    return "";
  }
  return instance.gate;
};

const placeholderToken = (columnId: string, row: QubitRow): string => {
  if (row !== 2) {
    return "";
  }
  if (columnId === "corr-z") {
    return "Z";
  }
  if (columnId === "corr-x") {
    return "X";
  }
  return "";
};

const isCnotControl = (column: TeleportationColumn, row: QubitRow): boolean => {
  const gate = slotInstance(column, row);
  return gate?.gate === "CNOT" && gate.wires[0] === row;
};

const isCnotTarget = (column: TeleportationColumn, row: QubitRow): boolean => {
  const gate = slotInstance(column, row);
  return gate?.gate === "CNOT" && gate.wires[1] === row;
};

const isMeasurementToken = (column: TeleportationColumn, row: QubitRow): boolean => {
  const gate = slotInstance(column, row);
  return gate?.gate === "M";
};

const connectorSegments = (column: TeleportationColumn): ConnectorSegment[] =>
  column.gates.flatMap((gate) => {
    if (gate.gate !== "CNOT") {
      return [];
    }

    return [{ id: gate.id, fromRow: gate.wires[0]!, toRow: gate.wires[1]! }];
  });

const rowCenterPercent = (row: number): number => ((row + 0.5) / props.rows.length) * 100;

const connectorStyle = (segment: ConnectorSegment): Record<string, string> => {
  const start = rowCenterPercent(Math.min(segment.fromRow, segment.toRow));
  const end = rowCenterPercent(Math.max(segment.fromRow, segment.toRow));
  return {
    top: `${start}%`,
    height: `${Math.max(0, end - start)}%`,
  };
};
</script>
