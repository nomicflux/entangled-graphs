<template>
  <section class="stage-inspector">
    <div class="stage-inspector-head">
      <h3>Stage Inspector</h3>
      <p>{{ props.stage.label }}</p>
    </div>
    <p v-if="props.distributionHint" class="stage-inspector-context">{{ props.distributionHint }}</p>

    <BlochPairView :pair="props.stage.blochPair" :animated="props.animated" size="md" />

    <div class="stage-probability">
      <p class="stage-probability-heading">{{ props.distributionHeading }}</p>
      <div v-for="entry in props.stage.distribution" :key="entry.basis" class="prob-row" :class="{ 'prob-row-scalar': isScalarFormat }">
        <span>{{ props.metricLabel }}(|{{ entry.basis }}>)</span>
        <div v-if="!isScalarFormat" class="prob-bar-wrap">
          <div class="prob-bar" :style="{ width: `${entry.probability * 100}%` }"></div>
        </div>
        <span>{{ formatValue(entry.probability) }}</span>
      </div>
    </div>
  </section>
</template>

<script setup lang="ts">
import { computed } from "vue";
import type { StageView } from "../types";
import BlochPairView from "./BlochPairView.vue";

const props = withDefaults(
  defineProps<{
    stage: StageView;
    animated?: boolean;
    metricLabel?: string;
    distributionHeading?: string;
    distributionHint?: string;
    valueFormat?: "percent" | "scalar";
  }>(),
  {
    animated: true,
    metricLabel: "P",
    distributionHeading: "Distribution",
    distributionHint: "",
    valueFormat: "percent",
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
</script>
