<template>
  <FixedCircuitPanel
    title="Quantum Teleportation"
    subtitle="Backbone is fixed. Correction behavior is controlled in the output panel."
    slot-title="Fixed teleportation backbone."
    :columns="props.columns"
    :rows="props.rows"
    :stage-views="props.stageViews"
    :stage-entanglement-models="props.stageEntanglementModels"
    :selected-stage-index="props.selectedStageIndex"
    :selected-stage="props.selectedStage"
    :entanglement-links-for-column="props.entanglementLinksForColumn"
    :entanglement-arc-path="props.entanglementArcPath"
    :entanglement-arc-style="props.entanglementArcStyle"
    :pairwise-tooltip="props.pairwiseTooltip"
    :placeholder-token="placeholderToken"
    @select-stage="$emit('select-stage', $event)"
  />
</template>

<script setup lang="ts">
import type { EntanglementLink, QubitRow, StageEntanglementModel, StageView } from "../../../types";
import type { TeleportationColumn } from "./model-types";
import FixedCircuitPanel from "../shared/FixedCircuitPanel.vue";

const props = defineProps<{
  columns: TeleportationColumn[];
  rows: readonly QubitRow[];
  stageViews: StageView[];
  stageEntanglementModels: StageEntanglementModel[];
  selectedStageIndex: number;
  selectedStage: StageView;
  entanglementLinksForColumn: (columnIndex: number) => EntanglementLink[];
  entanglementArcPath: (link: EntanglementLink) => string;
  entanglementArcStyle: (link: EntanglementLink) => Record<string, string>;
  pairwiseTooltip: (link: EntanglementLink) => string;
}>();

defineEmits<{
  (e: "select-stage", index: number): void;
}>();

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
</script>
