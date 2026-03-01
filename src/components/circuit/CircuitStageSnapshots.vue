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
      <BlochPairView :pair="stage.blochPair" size="sm" :animated="false" compact />
      <p v-for="entry in displayDistribution(stage)" :key="entry.basis" class="snapshot-row">
        <span>{{ props.metricLabel }}(|{{ entry.basis }}>)</span>
        <span>{{ formatValue(entry.probability) }}</span>
      </p>
      <p v-if="hiddenDistributionCount(stage) > 0" class="snapshot-row">
        <span>More rows</span>
        <span>+{{ hiddenDistributionCount(stage) }}</span>
      </p>
    </button>
  </div>
</template>

<script setup lang="ts">
import type { StageView } from "../../types";
import BlochPairView from "../BlochPairView.vue";

const props = withDefaults(
  defineProps<{
    stages: StageView[];
    selectedStageIndex: number;
    metricLabel?: string;
    metricHint?: string;
    valueFormat?: "percent" | "scalar";
    maxDistributionRows?: number;
  }>(),
  {
    metricLabel: "P",
    metricHint: "",
    valueFormat: "percent",
    maxDistributionRows: Number.POSITIVE_INFINITY,
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

const displayDistribution = (stage: StageView) =>
  [...stage.distribution]
    .sort((left, right) => right.probability - left.probability)
    .slice(0, props.maxDistributionRows);

const hiddenDistributionCount = (stage: StageView): number =>
  Math.max(0, stage.distribution.length - displayDistribution(stage).length);
</script>
