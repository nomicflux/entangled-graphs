<template>
  <section class="panel">
    <div class="panel-header">
      <h2>Measurement</h2>
    </div>

    <div class="measurement-card">
      <button class="measure-btn" type="button" @click="takeMeasurement">Measure</button>
      <p class="measurement-context">Last measured from stage: final</p>
      <p class="measurement-outcome">{{ latestBasis ? `|${latestBasis}>` : "Awaiting sample" }}</p>
      <div class="measurement-readout">
        <div class="readout-row">
          <span class="label">Probability</span>
          <span class="value">{{ latestProbability === null ? "--" : formatPercent(latestProbability) }}</span>
        </div>
      </div>
      <div class="measurement-visual mixed-measurement-visual">
        <DensityStateView :model="measurementVisualModel" :animated="false" size="md" />
      </div>
    </div>

    <div class="probability-list">
      <div class="distribution-head">
        <h3>Output Distribution</h3>
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

      <div v-for="entry in displayedDistribution" :key="entry.basis" class="prob-row" :class="{ 'is-highlighted': highlightBasis === entry.basis }">
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
          <button class="resample-btn" type="button" @click="resampleFrom(entry.gateId)">Resample from this point</button>
        </li>
      </ul>
    </div>

    <div class="history">
      <h3>Recent Samples ({{ maxHistory }})</h3>
      <ul v-if="history.length > 0" class="history-list">
        <li v-for="(entry, index) in history" :key="index">
          <span>|{{ entry.basis }}></span>
          <span>{{ formatPercent(entry.probability) }}</span>
          <p v-if="entry.path.length > 0" class="history-path">{{ entry.path }}</p>
        </li>
      </ul>
    </div>
  </section>
</template>

<script setup lang="ts">
import { computed, onUnmounted, ref, watch } from "vue";
import {
  measurementDistributionForDensityMatrixInBasis,
  preferredMeasurementBasisForDensityMatrix,
  sampleMixedCircuitRun,
} from "../../quantum";
import type { MeasurementBasis } from "../../types";
import type { MixedCircuitMeasurementOutcome } from "../../quantum";
import {
  mixedFinalStageSnapshot,
  mixedPreparedDensityMatrix,
  mixedQubitCount,
  mixedState,
} from "../../mixed-state";
import { resolveOperator } from "../../state/operators";
import DensityStateView from "./DensityStateView.vue";
import { deriveDensityStageVisualModel } from "./density-stage-visual-model";

const latestBasis = ref<string | null>(null);
const latestProbability = ref<number | null>(null);
const latestRunOutcomes = ref<MixedCircuitMeasurementOutcome[]>([]);
const sampledFinalRho = ref(mixedFinalStageSnapshot.value.rho);
const sampledFinalProbability = ref<number | null>(null);
const history = ref<Array<{ basis: string; probability: number; path: string }>>([]);
const highlightBasis = ref<string | null>(null);
const maxHistory = 6;
let highlightTimer: ReturnType<typeof setTimeout> | undefined;

const basisOptions = [
  { id: "auto", label: "Auto" },
  { id: "z", label: "Z" },
  { id: "x", label: "X" },
  { id: "y", label: "Y" },
] as const;

const selectedBasis = ref<"auto" | MeasurementBasis>("auto");

const finalRho = computed(() => mixedFinalStageSnapshot.value.rho);
const displayRho = computed(() => sampledFinalRho.value ?? finalRho.value);
const resolvedBasis = computed<MeasurementBasis>(() =>
  selectedBasis.value === "auto" ? preferredMeasurementBasisForDensityMatrix(displayRho.value) : selectedBasis.value,
);
const displayedDistribution = computed(() =>
  measurementDistributionForDensityMatrixInBasis(displayRho.value, resolvedBasis.value),
);
const measurementVisualModel = computed(() => deriveDensityStageVisualModel(displayRho.value, resolvedBasis.value));

const resolveGate = (gate: string) => resolveOperator(gate, []);

const formatPercent = (value: number): string => `${(value * 100).toFixed(1)}%`;
const formatPath = (outcomes: ReadonlyArray<{ wire: number; value: 0 | 1 }>): string =>
  outcomes.map((outcome) => `M(q${outcome.wire})=${outcome.value}`).join("  ");
const formatMeasurementPoint = (entry: MixedCircuitMeasurementOutcome): string =>
  `t${entry.column + 1} • M(q${entry.wire})=${entry.value}`;

const clearHighlight = () => {
  if (highlightTimer) {
    clearTimeout(highlightTimer);
  }
  highlightTimer = undefined;
};

const resetMeasurementState = () => {
  latestBasis.value = null;
  latestProbability.value = null;
  sampledFinalRho.value = finalRho.value;
  sampledFinalProbability.value = null;
  latestRunOutcomes.value = [];
  history.value = [];
  highlightBasis.value = null;
  clearHighlight();
};

const applySampledRun = (sampled: ReturnType<typeof sampleMixedCircuitRun>) => {
  latestRunOutcomes.value = [...sampled.outcomes];
  latestBasis.value = sampled.finalSample.basis;
  latestProbability.value = sampled.finalSample.probability;
  sampledFinalProbability.value = sampled.finalSample.probability;
  sampledFinalRho.value = sampled.finalRho;
  history.value = [
    {
      basis: sampled.finalSample.basis,
      probability: sampled.finalSample.probability,
      path: formatPath(sampled.outcomes),
    },
    ...history.value,
  ].slice(0, maxHistory);
  highlightBasis.value = sampled.finalSample.basis;
  clearHighlight();
  highlightTimer = setTimeout(() => {
    highlightBasis.value = null;
  }, 850);
};

const takeMeasurement = () => {
  const sampled = sampleMixedCircuitRun(
    mixedPreparedDensityMatrix.value,
    mixedState.columns,
    resolveGate,
    mixedQubitCount.value,
  );
  applySampledRun(sampled);
};

const resampleFrom = (gateId: string) => {
  const sampled = sampleMixedCircuitRun(
    mixedPreparedDensityMatrix.value,
    mixedState.columns,
    resolveGate,
    mixedQubitCount.value,
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
  finalRho,
  () => {
    resetMeasurementState();
  },
  { deep: true },
);

onUnmounted(() => {
  clearHighlight();
});
</script>
