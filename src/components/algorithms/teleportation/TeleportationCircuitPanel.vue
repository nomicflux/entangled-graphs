<template>
  <FixedCircuitPanel
    title="Quantum Teleportation"
    subtitle="Backbone is fixed. Correction behavior is controlled in the output panel."
    slot-title="Fixed teleportation backbone."
    :columns="props.columns"
    :classical-layout="props.classicalLayout"
    :rows="props.rows"
    :stage-snapshots="props.stageSnapshots"
    :stage-entanglement-models="props.stageEntanglementModels"
    :selected-stage-index="props.selectedStageIndex"
    :selected-stage-snapshot="props.selectedStageSnapshot"
    :entanglement-links-for-column="props.entanglementLinksForColumn"
    :entanglement-arc-path="props.entanglementArcPath"
    :entanglement-arc-style="props.entanglementArcStyle"
    :pairwise-tooltip="props.pairwiseTooltip"
    @select-stage="$emit('select-stage', $event)"
  />
</template>

<script setup lang="ts">
import type { EntanglementLink, FixedPanelClassicalLayout, QubitRow, StageEntanglementModel, StageSnapshot } from "../../../types";
import type { TeleportationColumn } from "./model-types";
import FixedCircuitPanel from "../shared/FixedCircuitPanel.vue";

const props = defineProps<{
  columns: TeleportationColumn[];
  classicalLayout: FixedPanelClassicalLayout;
  rows: readonly QubitRow[];
  stageSnapshots: StageSnapshot[];
  stageEntanglementModels: StageEntanglementModel[];
  selectedStageIndex: number;
  selectedStageSnapshot: StageSnapshot;
  entanglementLinksForColumn: (columnIndex: number) => EntanglementLink[];
  entanglementArcPath: (link: EntanglementLink) => string;
  entanglementArcStyle: (link: EntanglementLink) => Record<string, string>;
  pairwiseTooltip: (link: EntanglementLink) => string;
}>();

defineEmits<{
  (e: "select-stage", index: number): void;
}>();
</script>
