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
        <span>{{ formatPercent(entry.probability) }}</span>
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
  }>(),
  {
    metricLabel: "P",
    metricHint: "",
  },
);

defineEmits<{
  (e: "select-stage", index: number): void;
}>();

const formatPercent = (value: number): string => `${(value * 100).toFixed(1)}%`;
</script>
