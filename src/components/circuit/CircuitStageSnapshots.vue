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
      <p v-if="props.metricHint" class="snapshot-hint">{{ props.metricHint }}</p>
      <div class="snapshot-visual">
        <StageStateView :stage="stage" size="sm" :animated="false" compact />
      </div>
      <div v-if="props.showDistributionDetails" class="snapshot-distribution">
        <p v-for="entry in displayDistribution(stage)" :key="entry.basis" class="snapshot-row">
          <span>{{ props.metricLabel }}(|{{ entry.basis }}>)</span>
          <span>{{ formatValue(entry.probability) }}</span>
        </p>
        <p v-if="hiddenDistributionCount(stage) > 0" class="snapshot-row">
          <span>More rows</span>
          <span>+{{ hiddenDistributionCount(stage) }}</span>
        </p>
      </div>
    </button>
  </div>
</template>

<script setup lang="ts">
import type { StageSnapshot } from "../../types";
import { distributionForStageSnapshot } from "./stage-visual-model";
import StageStateView from "../StageStateView.vue";

const props = withDefaults(
  defineProps<{
    stages: StageSnapshot[];
    selectedStageIndex: number;
    metricLabel?: string;
    metricHint?: string;
    valueFormat?: "percent" | "scalar";
    maxDistributionRows?: number;
    showDistributionDetails?: boolean;
  }>(),
  {
    metricLabel: "P",
    metricHint: "",
    valueFormat: "percent",
    maxDistributionRows: 2,
    showDistributionDetails: true,
  },
);

defineEmits<{
  (e: "select-stage", index: number): void;
}>();

const formatPercent = (value: number): string => `${(value * 100).toFixed(1)}%`;
const formatScalar = (value: number): string => {
  if (value === 0) {
    return "0";
  }
  if (Math.abs(value) < 1e-6 || Math.abs(value) > 1e4) {
    return value.toExponential(3);
  }
  return value.toFixed(6);
};

const formatValue = (value: number): string => (props.valueFormat === "percent" ? formatPercent(value) : formatScalar(value));

const displayDistribution = (stage: StageSnapshot) =>
  [...distributionForStageSnapshot(stage)]
    .sort((left, right) => right.probability - left.probability)
    .slice(0, props.maxDistributionRows);

const hiddenDistributionCount = (stage: StageSnapshot): number =>
  Math.max(0, distributionForStageSnapshot(stage).length - displayDistribution(stage).length);
</script>
