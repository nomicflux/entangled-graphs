<template>
  <main class="teleportation-panels">
    <TeleportationSourcePanel
      :source-bloch="sourceBloch"
      :source-amplitudes="sourceAmplitudes"
      :tau-stage-label="tauStageLabel"
      :tau-branches="tauBranches"
      @update-source-bloch="setSourceBloch"
      @apply-preset="applyPreset"
    />

    <TeleportationCircuitPanel
      :columns="circuitColumns"
      :rows="rows"
      :stage-views="stageViews"
      :selected-stage-index="selectedStageIndex"
      :selected-stage="selectedStage"
      :entanglement-links-for-column="entanglementLinksForColumn"
      :entanglement-arc-path="entanglementArcPath"
      :entanglement-arc-style="entanglementArcStyle"
      @select-stage="setSelectedStage"
    />
  </main>
</template>

<script setup lang="ts">
import type { BlochParams } from "../../types";
import TeleportationCircuitPanel from "./teleportation/TeleportationCircuitPanel.vue";
import TeleportationSourcePanel from "./teleportation/TeleportationSourcePanel.vue";
import { useTeleportationModel } from "./teleportation/useTeleportationModel";

const {
  sourceBloch,
  sourceAmplitudes,
  tauStageLabel,
  tauBranches,
  circuitColumns,
  rows,
  stageViews,
  selectedStageIndex,
  selectedStage,
  applyPreset,
  entanglementLinksForColumn,
  entanglementArcPath,
  entanglementArcStyle,
} = useTeleportationModel();

const setSourceBloch = (next: BlochParams) => {
  sourceBloch.value = next;
};

const setSelectedStage = (index: number) => {
  selectedStageIndex.value = index;
};
</script>
