<template>
  <section class="panel">
    <div class="panel-header">
      <h2>Measurement</h2>
      <p>Click measure repeatedly to sample from the prepared state through the selected gates.</p>
    </div>

    <div class="measurement-card">
      <button class="measure-btn" @click="takeMeasurement">Measure</button>
      <p class="measurement-context">Last measured from stage: final</p>
      <p class="measurement-outcome">{{ latestBasis ? `|${latestBasis}>` : "Awaiting sample" }}</p>
      <div class="measurement-readout">
        <div class="readout-row">
          <span class="label">Probability</span>
          <span class="value">{{ latestProbability === null ? "--" : formatPercent(latestProbability) }}</span>
        </div>
      </div>
      <div class="measurement-visual">
        <BlochPairView :pair="measurementBlochPair" :animated="false" size="md" />
      </div>
    </div>

    <div class="probability-list">
      <h3>Output Distribution</h3>
      <p class="distribution-context">{{ distributionContext }}</p>
      <div
        v-for="entry in displayedDistribution"
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

    <div v-if="latestRunOutcomes.length > 0" class="measurement-points">
      <h3>In-Circuit Measurements</h3>
      <ul class="measurement-point-list">
        <li v-for="entry in latestRunOutcomes" :key="entry.gateId">
          <span>{{ formatMeasurementPoint(entry) }}</span>
          <button class="resample-btn" @click="resampleFrom(entry.gateId)">Resample from this point</button>
        </li>
      </ul>
    </div>

    <div class="history">
      <h3>Recent Samples ({{ maxHistory }})</h3>
      <p v-if="history.length === 0" class="muted">No samples yet.</p>
      <ul v-else class="history-list">
        <li v-for="(entry, index) in history" :key="index">
          <span>|{{ entry.basis }}></span>
          <span>{{ formatPercent(probabilityForBasis(entry.basis)) }}</span>
          <p v-if="entry.path.length > 0" class="history-path">{{ entry.path }}</p>
        </li>
      </ul>
    </div>
  </section>
</template>

<script setup lang="ts">
import { computed, onUnmounted, ref, watch } from "vue";
import { finalDistribution, preparedState, qubitCount, stageViews, state } from "../state";
import { resolveOperator } from "../state/operators";
import { basis_to_bloch_pair, measurement_distribution, sample_circuit_run } from "../quantum";
import type { BasisLabel, BasisProbability, GateId } from "../types";
import type { CircuitMeasurementOutcome } from "../quantum";
import BlochPairView from "./BlochPairView.vue";

const latestBasis = ref<BasisLabel | null>(null);
const history = ref<Array<{ basis: BasisLabel; path: string }>>([]);
const highlightBasis = ref<BasisLabel | null>(null);
const sampledDistribution = ref<BasisProbability[] | null>(null);
const latestRunOutcomes = ref<CircuitMeasurementOutcome[]>([]);
const maxHistory = 6;
let highlightTimer: ReturnType<typeof setTimeout> | undefined;

const finalStage = computed(() => stageViews.value[stageViews.value.length - 1]!);
const displayedDistribution = computed(() => sampledDistribution.value ?? finalDistribution.value);
const distributionContext = computed(() =>
  sampledDistribution.value === null ? "Expected over all branches" : "Sampled branch from latest run",
);
const probabilityByBasis = computed(() => {
  const table = new Map<BasisLabel, number>();
  for (const entry of displayedDistribution.value) {
    table.set(entry.basis, entry.probability);
  }
  return table;
});
const latestProbability = computed(() => {
  if (latestBasis.value === null) {
    return null;
  }
  const value = probabilityByBasis.value.get(latestBasis.value);
  return value ?? null;
});
const measurementBlochPair = computed(() =>
  latestBasis.value ? basis_to_bloch_pair(latestBasis.value) : finalStage.value.blochPair,
);

const formatPercent = (value: number): string => `${(value * 100).toFixed(1)}%`;
const probabilityForBasis = (basis: BasisLabel): number => probabilityByBasis.value.get(basis) ?? 0;
const formatPath = (outcomes: ReadonlyArray<{ wire: number; value: 0 | 1 }>): string =>
  outcomes.map((outcome) => `M(q${outcome.wire})=${outcome.value}`).join("  ");
const formatMeasurementPoint = (entry: CircuitMeasurementOutcome): string =>
  `t${entry.column} • M(q${entry.wire})=${entry.value}`;
const resolveGate = (gate: GateId) => resolveOperator(gate, state.customOperators);

const applySampledRun = (sampled: ReturnType<typeof sample_circuit_run>): void => {
  latestRunOutcomes.value = [...sampled.outcomes];
  latestBasis.value = sampled.finalSample.basis;
  history.value = [{ basis: sampled.finalSample.basis, path: formatPath(sampled.outcomes) }, ...history.value].slice(0, maxHistory);
  sampledDistribution.value = measurement_distribution(sampled.finalState);
  highlightBasis.value = sampled.finalSample.basis;

  if (highlightTimer) {
    clearTimeout(highlightTimer);
  }
  highlightTimer = setTimeout(() => {
    highlightBasis.value = null;
  }, 850);
};

const takeMeasurement = () => {
  const sampled = sample_circuit_run(
    preparedState.value,
    state.columns,
    resolveGate,
    qubitCount.value,
  );
  applySampledRun(sampled);
};

const resampleFrom = (gateId: string) => {
  const sampled = sample_circuit_run(
    preparedState.value,
    state.columns,
    resolveGate,
    qubitCount.value,
    Math.random,
    {
      priorOutcomes: latestRunOutcomes.value.map((entry) => ({
        gateId: entry.gateId,
        value: entry.value,
      })),
      resampleFromGateId: gateId,
    },
  );
  applySampledRun(sampled);
};

watch(
  finalDistribution,
  () => {
    latestBasis.value = null;
    history.value = [];
    sampledDistribution.value = null;
    latestRunOutcomes.value = [];
    highlightBasis.value = null;
  },
  { deep: true },
);

onUnmounted(() => {
  if (highlightTimer) {
    clearTimeout(highlightTimer);
  }
});
</script>
