<template>
  <section class="panel">
    <div class="panel-header">
      <h2>Measurement</h2>
      <p>Evaluate p-adic statistical outputs and inspect valuation shells directly.</p>
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
      <div v-if="latestRow" class="measurement-readout">
        <div class="readout-row">
          <span class="label">ω_i (w_raw)</span>
          <span class="value">{{ formatScalar(latestRow.wRaw) }}</span>
        </div>
        <div class="readout-row">
          <span class="label">v_p / |.|_p</span>
          <span class="value">{{ formatValuation(latestRow.valuation) }} / {{ formatScalar(latestRow.norm) }}</span>
        </div>
        <div class="readout-row">
          <span class="label">unit class</span>
          <span class="value">{{ residueClassLabel(latestRow.unitResidue) }}</span>
        </div>
        <div class="readout-row">
          <span class="label">w_norm (Derived)</span>
          <span class="value">{{ formatScalar(latestRow.wNorm) }}</span>
        </div>
      </div>
    </div>

    <div class="probability-list">
      <h3>Statistical Outputs ω_i</h3>
      <p class="distribution-context">{{ distributionContext }}</p>
      <div class="padic-output-wrap">
        <table class="padic-output-table">
          <thead>
            <tr>
              <th>Basis</th>
              <th>ω_i (w_raw)</th>
              <th>v_p</th>
              <th>|.|_p</th>
              <th>unit class</th>
              <th>digits (base p)</th>
              <th>w_norm (Derived)</th>
            </tr>
          </thead>
          <tbody v-for="shell in groupedRows" :key="shell.key">
            <tr class="padic-shell-heading">
              <th colspan="7">valuation shell {{ shellLabel(shell.valuation) }} • {{ shell.rows.length }} outcomes</th>
            </tr>
            <tr
              v-for="row in shell.rows"
              :key="row.basis"
              class="padic-output-row"
              :class="{
                'is-highlighted': highlightBasis === row.basis,
                selected: state.pAdic.selectedBasis === row.basis,
              }"
              @click="selectOutcomeBasis(row.basis)"
            >
              <td>|{{ row.basis }}></td>
              <td>{{ formatScalar(row.wRaw) }}</td>
              <td>{{ formatValuation(row.valuation) }}</td>
              <td>{{ formatScalar(row.norm) }}</td>
              <td>{{ residueClassLabel(row.unitResidue) }}</td>
              <td>{{ row.digits.join(" ") }}</td>
              <td>{{ formatScalar(row.wNorm) }}</td>
            </tr>
          </tbody>
        </table>
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
          <span>{{ formatScalar(wNormForBasis(entry.basis)) }} w_norm</span>
          <p v-if="entry.path.length > 0" class="history-path">{{ entry.path }}</p>
        </li>
      </ul>
    </div>
  </section>
</template>

<script setup lang="ts">
import { computed, onUnmounted, ref, watch } from "vue";
import {
  measurement_distribution_for_padic_ensemble,
  p_adic_norm_from_real,
  p_adic_raw_weight_totals_for_ensemble,
  p_adic_valuation_from_real,
  sample_padic_circuit_run,
} from "../../quantum";
import type { BasisLabel, BasisProbability } from "../../types";
import type { PAdicCircuitMeasurementOutcome } from "../../quantum";
import { PADIC_MEASUREMENT_MODELS } from "../../padic-config";
import {
  pAdicFinalEnsemble,
  pAdicFinalDistribution,
  pAdicSelectedBasisNode,
  pAdicSelectedStage,
  pAdicSelectedStageVisualization,
  pAdicPreparedState,
  pAdicQubitCount,
  setPAdicSelectedBasis,
  setPAdicMeasurementModel,
  state,
} from "../../state";
import PAdicValueInspector from "./PAdicValueInspector.vue";

type PAdicOutcomeRow = {
  basis: BasisLabel;
  wRaw: number;
  wNorm: number;
  valuation: number;
  norm: number;
  unitResidue: number | null;
  digits: number[];
};

const latestBasis = ref<BasisLabel | null>(null);
const history = ref<Array<{ basis: BasisLabel; path: string }>>([]);
const highlightBasis = ref<BasisLabel | null>(null);
const sampledDistribution = ref<BasisProbability[] | null>(null);
const sampledRawWeights = ref<Map<BasisLabel, number> | null>(null);
const latestRunOutcomes = ref<PAdicCircuitMeasurementOutcome[]>([]);
const maxHistory = 6;
let highlightTimer: ReturnType<typeof setTimeout> | undefined;

const displayedDistribution = computed(() => sampledDistribution.value ?? pAdicFinalDistribution.value);
const distributionContext = computed(() =>
  sampledDistribution.value === null
    ? "Primary columns are p-adic outputs ω_i with valuation shells. w_norm is a derived scalar normalization."
    : "Sampled branch from latest run",
);
const finalRawWeightByBasis = computed(() =>
  p_adic_raw_weight_totals_for_ensemble(pAdicFinalEnsemble.value, state.pAdic.prime, state.pAdic.measurementModel),
);
const displayedRawWeights = computed(() => sampledRawWeights.value ?? finalRawWeightByBasis.value);
const statisticalRows = computed<ReadonlyArray<PAdicOutcomeRow>>(() => {
  const rows = displayedDistribution.value.map((entry) => {
    const wRaw = displayedRawWeights.value.get(entry.basis) ?? 0;
    return {
      basis: entry.basis,
      wRaw,
      wNorm: entry.probability,
      valuation: p_adic_valuation_from_real(wRaw, state.pAdic.prime),
      norm: p_adic_norm_from_real(wRaw, state.pAdic.prime),
      unitResidue: unitResidueFromRaw(wRaw, state.pAdic.prime),
      digits: digitsFromBasis(entry.basis),
    };
  });

  rows.sort((left, right) => {
    const leftValuation = Number.isFinite(left.valuation) ? left.valuation : Number.POSITIVE_INFINITY;
    const rightValuation = Number.isFinite(right.valuation) ? right.valuation : Number.POSITIVE_INFINITY;
    if (leftValuation !== rightValuation) {
      return leftValuation - rightValuation;
    }

    const leftResidue = left.unitResidue ?? Number.POSITIVE_INFINITY;
    const rightResidue = right.unitResidue ?? Number.POSITIVE_INFINITY;
    if (leftResidue !== rightResidue) {
      return leftResidue - rightResidue;
    }

    return left.basis.localeCompare(right.basis);
  });

  return rows;
});
const rowsByBasis = computed(() => {
  const table = new Map<BasisLabel, PAdicOutcomeRow>();
  for (const row of statisticalRows.value) {
    table.set(row.basis, row);
  }
  return table;
});
const groupedRows = computed(() => {
  const grouped = new Map<string, { key: string; valuation: number; rows: PAdicOutcomeRow[] }>();
  for (const row of statisticalRows.value) {
    const valuation = Number.isFinite(row.valuation) ? row.valuation : Number.POSITIVE_INFINITY;
    const key = Number.isFinite(valuation) ? String(valuation) : "inf";
    const shell = grouped.get(key) ?? {
      key,
      valuation,
      rows: [],
    };
    shell.rows.push(row);
    grouped.set(key, shell);
  }

  return [...grouped.values()].sort((left, right) => {
    const leftValue = Number.isFinite(left.valuation) ? left.valuation : Number.POSITIVE_INFINITY;
    const rightValue = Number.isFinite(right.valuation) ? right.valuation : Number.POSITIVE_INFINITY;
    return leftValue - rightValue;
  });
});
const latestRow = computed(() => (latestBasis.value === null ? null : rowsByBasis.value.get(latestBasis.value) ?? null));

const formatScalar = (value: number): string => {
  if (!Number.isFinite(value)) {
    return value > 0 ? "+∞" : "-∞";
  }
  if (value === 0) {
    return "0";
  }
  if (Math.abs(value) < 1e-6 || Math.abs(value) > 1e4) {
    return value.toExponential(3);
  }
  return value.toFixed(6);
};
const formatValuation = (value: number): string => {
  if (!Number.isFinite(value)) {
    return "+∞";
  }
  return Number.isInteger(value) ? String(value) : value.toFixed(4);
};
const shellLabel = (valuation: number): string => (Number.isFinite(valuation) ? `v_p=${formatValuation(valuation)}` : "v_p=+∞");
const wNormForBasis = (basis: BasisLabel): number => rowsByBasis.value.get(basis)?.wNorm ?? 0;
const residueClassLabel = (residue: number | null): string => (residue === null ? "0" : `u ≡ ${residue} (mod ${state.pAdic.prime})`);
const formatPath = (outcomes: ReadonlyArray<{ wire: number; value: number }>): string =>
  outcomes.map((outcome) => `M(q${outcome.wire})=${outcome.value}`).join("  ");
const formatMeasurementPoint = (entry: PAdicCircuitMeasurementOutcome): string => `t${entry.column} • M(q${entry.wire})=${entry.value}`;
const selectOutcomeBasis = (basis: BasisLabel): void => {
  setPAdicSelectedBasis(state.pAdic.selectedBasis === basis ? null : basis);
};

const applySampledRun = (sampled: ReturnType<typeof sample_padic_circuit_run>): void => {
  latestRunOutcomes.value = [...sampled.outcomes];
  latestBasis.value = sampled.finalSample.basis;
  history.value = [{ basis: sampled.finalSample.basis, path: formatPath(sampled.outcomes) }, ...history.value].slice(0, maxHistory);
  const sampledEnsemble = [{ weight: 1, state: sampled.finalState }];
  sampledDistribution.value = measurement_distribution_for_padic_ensemble(sampledEnsemble, state.pAdic.prime, state.pAdic.measurementModel);
  sampledRawWeights.value = p_adic_raw_weight_totals_for_ensemble(sampledEnsemble, state.pAdic.prime, state.pAdic.measurementModel);
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
    sampledRawWeights.value = null;
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

const digitsFromBasis = (basis: string): number[] =>
  [...basis].map((digit) => {
    const parsed = Number.parseInt(digit, 10);
    return Number.isInteger(parsed) ? parsed : 0;
  });

const unitResidueFromRaw = (raw: number, prime: number): number | null => {
  if (!Number.isFinite(raw) || raw === 0) {
    return null;
  }

  const valuation = p_adic_valuation_from_real(raw, prime);
  if (!Number.isFinite(valuation)) {
    return null;
  }

  const unit = raw * Math.pow(prime, valuation);
  if (!Number.isFinite(unit)) {
    return null;
  }

  const quantized = Math.round(unit * 1_000_000);
  return ((quantized % prime) + prime) % prime;
};
</script>
