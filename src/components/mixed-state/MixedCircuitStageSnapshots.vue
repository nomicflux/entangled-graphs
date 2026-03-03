<template>
  <div class="snapshot-grid">
    <button
      v-for="stage in props.stages"
      :key="stage.id"
      class="snapshot-card"
      :class="{ selected: props.selectedStageIndex === stage.index }"
      type="button"
      @click="$emit('select-stage', stage.index)"
    >
      <p class="snapshot-title">{{ stage.label }}</p>
      <DensityStateView :model="visualModelForStage(stage)" size="sm" :animated="false" compact />
      <p v-for="entry in displayDistribution(stage)" :key="entry.basis" class="snapshot-row">
        <span>P(|{{ entry.basis }}>)</span>
        <span>{{ formatPercent(entry.probability) }}</span>
      </p>
      <p v-if="hiddenDistributionCount(stage) > 0" class="snapshot-row">
        <span>More rows</span>
        <span>+{{ hiddenDistributionCount(stage) }}</span>
      </p>
    </button>
  </div>
</template>

<script setup lang="ts">
import { preferredMeasurementBasisForDensityMatrix } from "../../quantum";
import type { MixedStageSnapshot } from "../../types";
import DensityStateView from "./DensityStateView.vue";
import { deriveDensityStageVisualModel } from "./density-stage-visual-model";

const props = defineProps<{
  stages: MixedStageSnapshot[];
  selectedStageIndex: number;
}>();

defineEmits<{
  (e: "select-stage", index: number): void;
}>();

const visualModelForStage = (stage: MixedStageSnapshot) =>
  deriveDensityStageVisualModel(stage.rho, preferredMeasurementBasisForDensityMatrix(stage.rho));

const displayDistribution = (stage: MixedStageSnapshot) =>
  [...visualModelForStage(stage).distribution]
    .sort((left, right) => right.probability - left.probability)
    .slice(0, 4);

const hiddenDistributionCount = (stage: MixedStageSnapshot): number =>
  Math.max(0, visualModelForStage(stage).distribution.length - displayDistribution(stage).length);

const formatPercent = (value: number): string => `${(value * 100).toFixed(1)}%`;
</script>
