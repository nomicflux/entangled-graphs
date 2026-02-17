<template>
  <section class="panel">
    <div class="panel-header">
      <h2>Measurement</h2>
      <p>Click measure repeatedly to sample from the prepared state through the selected gates.</p>
    </div>

    <div class="measurement-card">
      <button class="measure-btn" @click="takeMeasurement">Measure</button>
      <div class="measurement-readout">
        <div class="readout-row">
          <span class="label">Outcome</span>
          <span class="value">{{ latestSample ? `|${latestSample.basis}>` : "--" }}</span>
        </div>
        <div class="readout-row">
          <span class="label">Probability</span>
          <span class="value">{{ latestSample ? formatPercent(latestSample.probability) : "--" }}</span>
        </div>
      </div>
    </div>

    <div class="probability-list">
      <h3>Output Distribution</h3>
      <div v-for="entry in finalDistribution" :key="entry.basis" class="prob-row">
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
import { ref } from "vue";
import { finalDistribution } from "../state";
import { sample_distribution, type MeasurementSample } from "../quantum";

const latestSample = ref<MeasurementSample | null>(null);
const history = ref<MeasurementSample[]>([]);
const maxHistory = 10;

const formatPercent = (value: number): string => `${(value * 100).toFixed(1)}%`;

const takeMeasurement = () => {
  const sampled = sample_distribution(finalDistribution.value);
  latestSample.value = sampled;
  history.value = [sampled, ...history.value].slice(0, maxHistory);
};
</script>
