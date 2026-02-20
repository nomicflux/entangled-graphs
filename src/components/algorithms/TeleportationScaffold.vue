<template>
  <main class="teleportation-panels">
    <TeleportationSourcePanel
      :source-bloch="sourceBloch"
      :source-amplitudes="sourceAmplitudes"
      :branch-stage-label="branchStageLabel"
      :branch-previews="branchPreviews"
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

    <TeleportationResultsPanel
      :source="sourceAmplitudes"
      :branches="teleportationBranches"
      :output="teleportationOutput"
    />
  </main>
</template>

<script setup lang="ts">
import type { BlochParams } from "../../types";
import TeleportationCircuitPanel from "./teleportation/TeleportationCircuitPanel.vue";
import TeleportationResultsPanel from "./teleportation/TeleportationResultsPanel.vue";
import TeleportationSourcePanel from "./teleportation/TeleportationSourcePanel.vue";
import { useTeleportationModel } from "./teleportation/useTeleportationModel";

const {
  sourceBloch,
  sourceAmplitudes,
  branchStageLabel,
  branchPreviews,
  teleportationBranches,
  teleportationOutput,
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
