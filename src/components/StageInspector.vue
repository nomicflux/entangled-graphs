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
      <div v-for="entry in props.stage.distribution" :key="entry.basis" class="prob-row">
        <span>{{ props.metricLabel }}(|{{ entry.basis }}>)</span>
        <div class="prob-bar-wrap">
          <div class="prob-bar" :style="{ width: `${entry.probability * 100}%` }"></div>
        </div>
        <span>{{ formatPercent(entry.probability) }}</span>
      </div>
    </div>
  </section>
</template>

<script setup lang="ts">
import type { StageView } from "../types";
import BlochPairView from "./BlochPairView.vue";

const props = withDefaults(
  defineProps<{
    stage: StageView;
    animated?: boolean;
    metricLabel?: string;
    distributionHeading?: string;
    distributionHint?: string;
  }>(),
  {
    animated: true,
    metricLabel: "P",
    distributionHeading: "Distribution",
    distributionHint: "",
  },
);

const formatPercent = (value: number): string => `${(value * 100).toFixed(1)}%`;
</script>
