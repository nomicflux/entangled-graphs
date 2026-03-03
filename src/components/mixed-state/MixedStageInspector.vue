<template>
  <section class="stage-inspector">
    <div class="stage-inspector-head">
      <h3>Stage Inspector</h3>
      <p>{{ props.stage.label }}</p>
    </div>

    <div class="distribution-head">
      <p class="stage-probability-heading">Distribution</p>
      <div class="distribution-basis-row">
        <button
          v-for="basis in basisOptions"
          :key="basis.id"
          class="basis-btn"
          :class="{ active: selectedBasis === basis.id }"
          type="button"
          @click="selectedBasis = basis.id"
        >
          {{ basis.label }}
        </button>
      </div>
    </div>

    <DensityStateView :model="visualModel" :animated="props.animated" size="md" />

    <div class="stage-probability">
      <div v-for="entry in displayDistribution" :key="entry.basis" class="prob-row">
        <span>P(|{{ entry.basis }}>)</span>
        <div class="prob-bar-wrap">
          <div class="prob-bar" :style="{ width: `${entry.probability * 100}%` }"></div>
        </div>
        <span>{{ formatPercent(entry.probability) }}</span>
      </div>
    </div>
  </section>
</template>

<script setup lang="ts">
import { computed, ref, watch } from "vue";
import { preferredMeasurementBasisForDensityMatrix } from "../../quantum";
import type { MeasurementBasis, MixedStageSnapshot } from "../../types";
import DensityStateView from "./DensityStateView.vue";
import { deriveDensityStageVisualModel } from "./density-stage-visual-model";

const props = withDefaults(
  defineProps<{
    stage: MixedStageSnapshot;
    animated?: boolean;
  }>(),
  {
    animated: true,
  },
);

const basisOptions = [
  { id: "auto", label: "Auto" },
  { id: "z", label: "Z" },
  { id: "x", label: "X" },
  { id: "y", label: "Y" },
] as const;

const selectedBasis = ref<"auto" | MeasurementBasis>("auto");

watch(
  () => props.stage.id,
  () => {
    selectedBasis.value = "auto";
  },
);

const resolvedBasis = computed<MeasurementBasis>(() =>
  selectedBasis.value === "auto" ? preferredMeasurementBasisForDensityMatrix(props.stage.rho) : selectedBasis.value,
);

const visualModel = computed(() => deriveDensityStageVisualModel(props.stage.rho, resolvedBasis.value));
const displayDistribution = computed(() =>
  [...visualModel.value.distribution].sort((left, right) => right.probability - left.probability),
);

const formatPercent = (value: number): string => `${(value * 100).toFixed(1)}%`;
</script>
