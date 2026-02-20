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
      :stage-entanglement-models="stageEntanglementModels"
      :selected-stage-index="selectedStageIndex"
      :selected-stage="selectedStage"
      :entanglement-links-for-column="entanglementLinksForColumn"
      :entanglement-arc-path="entanglementArcPath"
      :entanglement-arc-style="entanglementArcStyle"
      @select-stage="setSelectedStage"
    />

    <TeleportationResultsPanel
      :source="sourceAmplitudes"
      :correction-mode="correctionMode"
      :manual-apply-z="manualApplyZ"
      :manual-apply-x="manualApplyX"
      :active-expected="activeExpected"
      :sampled-result="sampledResult"
      :branches="teleportationBranches"
      :output="teleportationOutput"
      @update-correction-mode="setCorrectionMode"
      @update-manual-z="setManualApplyZ"
      @update-manual-x="setManualApplyX"
      @run-sample="runSample"
      @resample-from="resampleFrom"
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
  activeExpected,
  correctionMode,
  manualApplyZ,
  manualApplyX,
  sampledResult,
  circuitColumns,
  rows,
  stageViews,
  stageEntanglementModels,
  selectedStageIndex,
  selectedStage,
  applyPreset,
  runSample,
  resampleFrom,
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

const setCorrectionMode = (mode: "auto" | "manual") => {
  correctionMode.value = mode;
};

const setManualApplyZ = (enabled: boolean) => {
  manualApplyZ.value = enabled;
};

const setManualApplyX = (enabled: boolean) => {
  manualApplyX.value = enabled;
};
</script>
