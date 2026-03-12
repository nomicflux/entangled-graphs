<template>
  <section class="stage-inspector">
    <div class="stage-inspector-head">
      <h3>Stage Inspector</h3>
      <p>{{ props.stage.label }}</p>
    </div>
    <p v-if="props.distributionHint" class="stage-inspector-context">{{ props.distributionHint }}</p>

    <StageStateView :stage="props.stage" :animated="props.animated" size="md" />

    <div class="stage-probability">
      <p class="stage-probability-heading">{{ props.distributionHeading }}</p>
      <div v-for="entry in displayDistribution" :key="entry.basis" class="prob-row" :class="{ 'prob-row-scalar': isScalarFormat }">
        <span>{{ props.metricLabel }}(|{{ entry.basis }}>)</span>
        <div v-if="!isScalarFormat" class="prob-bar-wrap">
          <div class="prob-bar" :style="{ width: `${entry.probability * 100}%` }"></div>
        </div>
        <span>{{ formatValue(entry.probability) }}</span>
      </div>
      <p v-if="hiddenDistributionCount > 0" class="stage-inspector-context">+{{ hiddenDistributionCount }} more rows hidden</p>
    </div>
  </section>
</template>

<script setup lang="ts">
import { computed } from "vue";
import type { StageSnapshot } from "../types";
import { distributionForStageSnapshot } from "./circuit/stage-visual-model";
import StageStateView from "./StageStateView.vue";

const props = withDefaults(
  defineProps<{
    stage: StageSnapshot;
    animated?: boolean;
    metricLabel?: string;
    distributionHeading?: string;
    distributionHint?: string;
    valueFormat?: "percent" | "scalar";
    maxDistributionRows?: number;
    showZeroProbabilityRows?: boolean;
  }>(),
  {
    animated: true,
    metricLabel: "P",
    distributionHeading: "Distribution",
    distributionHint: "",
    valueFormat: "percent",
    maxDistributionRows: Number.POSITIVE_INFINITY,
    showZeroProbabilityRows: true,
  },
);

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

const isScalarFormat = computed(() => props.valueFormat === "scalar");

const formatValue = (value: number): string => (props.valueFormat === "percent" ? formatPercent(value) : formatScalar(value));

const filteredDistribution = computed(() =>
  [...distributionForStageSnapshot(props.stage)]
    .sort((left, right) => right.probability - left.probability)
    .filter((entry) => props.showZeroProbabilityRows || entry.probability > 0),
);

const displayDistribution = computed(() => filteredDistribution.value.slice(0, props.maxDistributionRows));

const hiddenDistributionCount = computed(() =>
  Math.max(0, filteredDistribution.value.length - displayDistribution.value.length),
);
</script>
