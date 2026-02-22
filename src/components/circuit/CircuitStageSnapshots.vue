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
      <p v-for="entry in stage.distribution" :key="entry.basis" class="snapshot-row">
        <span>{{ props.metricLabel }}(|{{ entry.basis }}>)</span>
        <span>{{ formatValue(entry.probability) }}</span>
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
  }>(),
  {
    metricLabel: "P",
    metricHint: "",
    valueFormat: "percent",
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
</script>
