<template>
  <section class="panel">
    <div class="panel-header">
      <h2>Measurement</h2>
      <p>Click measure repeatedly to sample from the prepared state through the selected gates.</p>
    </div>

    <div class="measurement-card">
      <button class="measure-btn" @click="takeMeasurement">Measure</button>
      <p class="measurement-context">Last measured from stage: final</p>
      <p class="measurement-outcome">{{ latestSample ? `|${latestSample.basis}>` : "Awaiting sample" }}</p>
      <div class="measurement-readout">
        <div class="readout-row">
          <span class="label">Probability</span>
          <span class="value">{{ latestSample ? formatPercent(latestSample.probability) : "--" }}</span>
        </div>
      </div>
      <div class="measurement-visual">
        <BlochPairView :pair="measurementBlochPair" :animated="false" size="md" />
      </div>
    </div>

    <div class="probability-list">
      <h3>Output Distribution</h3>
      <div
        v-for="entry in finalDistribution"
        :key="entry.basis"
        class="prob-row"
        :class="{ 'is-highlighted': highlightBasis === entry.basis }"
      >
        <span>|{{ entry.basis }}></span>
        <div class="prob-bar-wrap">
          <div class="prob-bar" :style="{ width: `${entry.probability * 100}%` }"></div>
        </div>
        <span>{{ formatPercent(entry.probability) }}</span>
      </div>
    </div>

    <div class="history">
      <h3>Recent Samples</h3>
      <p v-if="history.length === 0" class="muted">No samples yet.</p>
      <ul v-else class="history-list">
        <li v-for="(sample, index) in history" :key="index">
          <span>|{{ sample.basis }}></span>
          <span>{{ formatPercent(sample.probability) }}</span>
        </li>
      </ul>
    </div>
  </section>
</template>

<script setup lang="ts">
import { computed, onUnmounted, ref } from "vue";
import { finalDistribution, stageViews } from "../state";
import { basis_to_bloch_pair, sample_distribution, type MeasurementSample } from "../quantum";
import type { BasisLabel } from "../types";
import BlochPairView from "./BlochPairView.vue";

const latestSample = ref<MeasurementSample | null>(null);
const history = ref<MeasurementSample[]>([]);
const highlightBasis = ref<BasisLabel | null>(null);
const maxHistory = 10;
let highlightTimer: ReturnType<typeof setTimeout> | undefined;

const finalStage = computed(() => stageViews.value[stageViews.value.length - 1]!);
const measurementBlochPair = computed(() =>
  latestSample.value ? basis_to_bloch_pair(latestSample.value.basis) : finalStage.value.blochPair,
);

const formatPercent = (value: number): string => `${(value * 100).toFixed(1)}%`;

const takeMeasurement = () => {
  const sampled = sample_distribution(finalDistribution.value);
  latestSample.value = sampled;
  history.value = [sampled, ...history.value].slice(0, maxHistory);
  highlightBasis.value = sampled.basis;

  if (highlightTimer) {
    clearTimeout(highlightTimer);
  }
  highlightTimer = setTimeout(() => {
    highlightBasis.value = null;
  }, 850);
};

onUnmounted(() => {
  if (highlightTimer) {
    clearTimeout(highlightTimer);
  }
});
</script>
