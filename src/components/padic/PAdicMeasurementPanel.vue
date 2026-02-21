<template>
  <section class="panel">
    <div class="panel-header">
      <h2>Measurement</h2>
      <p>Measure with the selected p-adic model and resample from in-circuit measurement points.</p>
    </div>

    <div class="measurement-card">
      <label class="qubit-count-field">
        Measurement Model
        <select :value="state.pAdic.measurementModel" @change="handleMeasurementModel">
          <option v-for="model in PADIC_MEASUREMENT_MODELS" :key="model" :value="model">
            {{ model }}
          </option>
        </select>
      </label>

      <button class="measure-btn" @click="takeMeasurement">Measure</button>
      <p class="measurement-context">Prime p={{ state.pAdic.prime }} • Model {{ state.pAdic.measurementModel }}</p>
      <p class="measurement-outcome">{{ latestBasis ? `|${latestBasis}>` : "Awaiting sample" }}</p>
      <div class="measurement-readout">
        <div class="readout-row">
          <span class="label">Weight w_p</span>
          <span class="value">{{ latestProbability === null ? "--" : formatPercent(latestProbability) }}</span>
        </div>
      </div>
    </div>

    <div class="probability-list">
      <h3>Output Distribution (w_p)</h3>
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

    <PAdicValueInspector
      :stage-label="pAdicSelectedStage.label"
      :prime="state.pAdic.prime"
      :measurement-model="state.pAdic.measurementModel"
      :nodes="pAdicSelectedStageVisualization?.nodes ?? []"
      :selected-basis="state.pAdic.selectedBasis"
      :selected-node="pAdicSelectedBasisNode"
      @select-basis="setPAdicSelectedBasis"
    />

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
          <span>{{ formatPercent(probabilityForBasis(entry.basis)) }} w_p</span>
          <p v-if="entry.path.length > 0" class="history-path">{{ entry.path }}</p>
        </li>
      </ul>
    </div>
  </section>
</template>

<script setup lang="ts">
import { computed, onUnmounted, ref, watch } from "vue";
import { measurement_distribution_for_padic_ensemble, sample_padic_circuit_run } from "../../quantum";
import type { BasisLabel, BasisProbability, GateId } from "../../types";
import type { PAdicCircuitMeasurementOutcome } from "../../quantum";
import { PADIC_MEASUREMENT_MODELS } from "../../padic-config";
import {
  pAdicFinalDistribution,
  pAdicSelectedBasisNode,
  pAdicSelectedStage,
  pAdicSelectedStageVisualization,
  pAdicPreparedState,
  pAdicQubitCount,
  resolveOperator,
  setPAdicSelectedBasis,
  setPAdicMeasurementModel,
  state,
} from "../../state";
import PAdicValueInspector from "./PAdicValueInspector.vue";

const latestBasis = ref<BasisLabel | null>(null);
const history = ref<Array<{ basis: BasisLabel; path: string }>>([]);
const highlightBasis = ref<BasisLabel | null>(null);
const sampledDistribution = ref<BasisProbability[] | null>(null);
const latestRunOutcomes = ref<PAdicCircuitMeasurementOutcome[]>([]);
const maxHistory = 6;
let highlightTimer: ReturnType<typeof setTimeout> | undefined;

const displayedDistribution = computed(() => sampledDistribution.value ?? pAdicFinalDistribution.value);
const distributionContext = computed(() =>
  sampledDistribution.value === null ? "Expected normalized model weight over all branches" : "Sampled branch from latest run",
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
  return probabilityByBasis.value.get(latestBasis.value) ?? null;
});

const formatPercent = (value: number): string => `${(value * 100).toFixed(1)}%`;
const probabilityForBasis = (basis: BasisLabel): number => probabilityByBasis.value.get(basis) ?? 0;
const formatPath = (outcomes: ReadonlyArray<{ wire: number; value: number }>): string =>
  outcomes.map((outcome) => `M(q${outcome.wire})=${outcome.value}`).join("  ");
const formatMeasurementPoint = (entry: PAdicCircuitMeasurementOutcome): string => `t${entry.column} • M(q${entry.wire})=${entry.value}`;
const resolveGate = (gate: GateId) => resolveOperator(gate, []);

const applySampledRun = (sampled: ReturnType<typeof sample_padic_circuit_run>): void => {
  latestRunOutcomes.value = [...sampled.outcomes];
  latestBasis.value = sampled.finalSample.basis;
  history.value = [{ basis: sampled.finalSample.basis, path: formatPath(sampled.outcomes) }, ...history.value].slice(0, maxHistory);
  sampledDistribution.value = measurement_distribution_for_padic_ensemble(
    [{ weight: 1, state: sampled.finalState }],
    state.pAdic.prime,
    state.pAdic.measurementModel,
  );
  highlightBasis.value = sampled.finalSample.basis;

  if (highlightTimer) {
    clearTimeout(highlightTimer);
  }
  highlightTimer = setTimeout(() => {
    highlightBasis.value = null;
  }, 850);
};

const takeMeasurement = () => {
  const sampled = sample_padic_circuit_run(
    pAdicPreparedState.value,
    state.pAdic.columns,
    resolveGate,
    pAdicQubitCount.value,
    state.pAdic.prime,
    state.pAdic.measurementModel,
  );

  applySampledRun(sampled);
};

const resampleFrom = (gateId: string) => {
  const sampled = sample_padic_circuit_run(
    pAdicPreparedState.value,
    state.pAdic.columns,
    resolveGate,
    pAdicQubitCount.value,
    state.pAdic.prime,
    state.pAdic.measurementModel,
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

const handleMeasurementModel = (event: Event) => {
  const target = event.target as HTMLSelectElement;
  setPAdicMeasurementModel(target.value);
};

watch(
  [pAdicFinalDistribution, () => state.pAdic.measurementModel, () => state.pAdic.prime],
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
