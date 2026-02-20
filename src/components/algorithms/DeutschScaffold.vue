<template>
  <main class="deutsch-panels">
    <DeutschSourcePanel
      :oracle-id="oracleId"
      :mode="mode"
      :oracles="oracles"
      :oracle-class="oracleClass"
      :truth-rows="truthRows"
      :q0-bloch="q0Bloch"
      :q1-bloch="q1Bloch"
      @set-oracle="oracleId = $event"
      @set-mode="mode = $event"
      @set-bloch="setBloch"
      @preset="setPreset"
    />

    <FixedCircuitPanel
      title="Deutsch Algorithm"
      subtitle="Fixed circuit backbone with selected oracle U_f."
      slot-title="Fixed Deutsch backbone."
      :columns="labeledColumns"
      :rows="[0, 1]"
      :stage-views="stageViews"
      :stage-entanglement-models="stageEntanglementModels"
      :selected-stage-index="selectedStageIndex"
      :selected-stage="selectedStage"
      :entanglement-links-for-column="entanglementLinksForColumn"
      :entanglement-arc-path="entanglementArcPath"
      :entanglement-arc-style="entanglementArcStyle"
      :pairwise-tooltip="pairwiseTooltip"
      @select-stage="selectedStageIndex = $event"
    />

    <DeutschResultsPanel
      :mode="mode"
      :oracle-class="oracleClass"
      :expected-decision="expectedDecision"
      :q0-decision-probability="q0DecisionProbability"
      :final-distribution="expected.finalDistribution"
      :sampled="sampled"
      @run-sample="runSample"
    />
  </main>
</template>

<script setup lang="ts">
import type { BlochParams } from "../../types";
import DeutschResultsPanel from "./deutsch/DeutschResultsPanel.vue";
import DeutschSourcePanel from "./deutsch/DeutschSourcePanel.vue";
import { DEUTSCH_ORACLES } from "./deutsch/engine";
import { useDeutschModel } from "./deutsch/useDeutschModel";
import FixedCircuitPanel from "./shared/FixedCircuitPanel.vue";

const {
  oracleId,
  mode,
  q0Bloch,
  q1Bloch,
  labeledColumns,
  stageViews,
  selectedStageIndex,
  selectedStage,
  expected,
  expectedDecision,
  truthRows,
  oracleClass,
  q0DecisionProbability,
  sampled,
  runSample,
  setPreset,
  stageEntanglementModels,
  entanglementLinksForColumn,
  entanglementArcPath,
  entanglementArcStyle,
  pairwiseTooltip,
} = useDeutschModel();

const oracles = DEUTSCH_ORACLES;

const setBloch = (wire: 0 | 1, next: BlochParams) => {
  if (wire === 0) {
    q0Bloch.value = next;
    return;
  }
  q1Bloch.value = next;
};
</script>
