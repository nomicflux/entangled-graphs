<template>
  <section class="panel">
    <div class="panel-header">
      <h2>Prepared p-adic State</h2>
      <p>Set per-qubit local states directly over S<sub>p</sub>. Prime selection changes the visible local state set and valuation semantics.</p>
    </div>

    <div class="qubit-controls" data-testid="padic-prep-qubit-controls">
      <span class="qubit-controls-label">Qubit Controls</span>
      <button type="button" class="qubit-count-btn" @click="removePAdicQubit()" :disabled="qubitCount <= 1">- Qubit</button>
      <label class="qubit-count-field">
        Qubit Count
        <input :value="qubitCount" type="number" min="1" max="8" @change="handleCountInput" />
      </label>
      <button type="button" class="qubit-count-btn" @click="addPAdicQubit()" :disabled="qubitCount >= 8">+ Qubit</button>
    </div>

    <div class="qubit-controls" data-testid="padic-prime-controls">
      <span class="qubit-controls-label">Prime</span>
      <button
        v-for="prime in primes"
        :key="prime"
        type="button"
        class="qubit-count-btn"
        :class="{ active: state.pAdic.prime === prime }"
        @click="setPAdicPrime(prime)"
      >
        p = {{ prime }}
      </button>
    </div>

    <div class="qubit-grid">
      <div v-for="(q, index) in state.pAdic.preparedQubits" :key="index" class="qubit-card">
        <div class="qubit-top">
          <div>
            <h3>Q{{ index }}</h3>
            <p class="muted">Local states over S<sub>p</sub>={{ localStateSetLabel }}</p>
          </div>
        </div>

        <div class="local-state-list">
          <div v-for="local in q.localStates" :key="`${index}-${local.value}`" class="local-state-card">
            <div class="amp-row">
              <span class="amp-label">|{{ local.value }}&gt;</span>
              <label>
                raw
                <input :value="local.amplitude.raw" type="text" @input="setLocalAmplitude(index, local.value, $event)" />
              </label>
              <output>{{ local.amplitude.raw }}</output>
            </div>
            <div class="amp-meta-row">
              <span>v_p={{ valuationLabel(local.amplitude.raw) }}</span>
              <span>|.|_p={{ normLabel(local.amplitude.raw) }}</span>
              <span>parsed={{ parsedLabel(local.amplitude.raw) }}</span>
            </div>
            <div class="valuation-preset-row">
              <span class="amp-label">valuation</span>
              <button
                v-for="value in valuationPresets"
                :key="`q${index}-local-${local.value}-${value}`"
                type="button"
                class="preset-btn"
                @click="setValuation(index, local.value, value)"
              >
                p^{{ value }}
              </button>
              <button type="button" class="preset-btn" @click="setLocalAmplitudeRaw(index, local.value, '0')">0</button>
            </div>
          </div>
        </div>

        <div class="local-weights">
          <h4>Local weighting (w_raw / w_p)</h4>
          <div v-for="weight in localWeightRows(q.localStates)" :key="`w-${index}-${weight.value}`" class="local-weight-row">
            <span>|{{ weight.value }}></span>
            <span>w_raw={{ formatWeight(weight.rawWeight) }}</span>
            <span>w_p={{ formatPercent(weight.weight) }}</span>
          </div>
        </div>

        <div class="preset-row">
          <button type="button" class="preset-btn" @click="applyPAdicPreset(index, 'zero')">|0&gt;</button>
          <button type="button" class="preset-btn" @click="applyPAdicPreset(index, 'one')">|1&gt;</button>
          <button type="button" class="preset-btn" @click="applyPAdicPreset(index, 'balanced')">balanced</button>
        </div>
        <p class="preset-note">
          <code>balanced</code> sets every local state in S<sub>p</sub> to equal raw weight, so w<sub>p</sub> is uniform across the full local set.
        </p>
      </div>
    </div>
  </section>
</template>

<script setup lang="ts">
import { computed } from "vue";
import { PADIC_PRIMES } from "../../padic-config";
import { p_adic_norm_from_real, p_adic_valuation_from_real, parse_p_adic_raw } from "../../quantum";
import {
  addPAdicQubit,
  applyPAdicPreset,
  removePAdicQubit,
  setPAdicLocalAmplitude,
  setPAdicLocalAmplitudeByValuation,
  setPAdicPrime,
  setPAdicQubitCount,
  state,
} from "../../state";

const primes = PADIC_PRIMES;

const qubitCount = computed(() => state.pAdic.qubitCount);
const valuationPresets = [-2, -1, 0, 1, 2];
const localStateSetLabel = computed(() => `{${Array.from({ length: state.pAdic.prime }, (_, value) => value).join(", ")}}`);

const handleCountInput = (event: Event) => {
  const target = event.target as HTMLInputElement;
  setPAdicQubitCount(Number.parseInt(target.value, 10));
};

const setLocalAmplitude = (qubitIndex: number, localValue: number, event: Event) => {
  const target = event.target as HTMLInputElement;
  setLocalAmplitudeRaw(qubitIndex, localValue, target.value);
};

const setLocalAmplitudeRaw = (qubitIndex: number, localValue: number, value: string) => {
  setPAdicLocalAmplitude(qubitIndex, localValue, value);
};

const setValuation = (qubitIndex: number, localValue: number, valuation: number) => {
  setPAdicLocalAmplitudeByValuation(qubitIndex, localValue, valuation, 1);
};

const valuationLabel = (raw: string): string => {
  const value = parse_p_adic_raw(raw, state.pAdic.prime);
  const valuation = p_adic_valuation_from_real(value, state.pAdic.prime);
  return Number.isFinite(valuation) ? String(valuation) : "+∞";
};

const normLabel = (raw: string): string => {
  const value = parse_p_adic_raw(raw, state.pAdic.prime);
  const norm = p_adic_norm_from_real(value, state.pAdic.prime);
  if (norm === 0) {
    return "0";
  }
  if (Math.abs(norm) < 1e-6 || Math.abs(norm) > 1e4) {
    return norm.toExponential(2);
  }
  return norm.toFixed(5);
};

const parsedLabel = (raw: string): string => {
  const value = parse_p_adic_raw(raw, state.pAdic.prime);
  if (value === 0) {
    return "0";
  }
  if (Math.abs(value) < 1e-6 || Math.abs(value) > 1e5) {
    return value.toExponential(2);
  }
  return value.toFixed(5);
};

const localWeightRows = (localStates: ReadonlyArray<{ value: number; amplitude: { raw: string } }>) => {
  const rows = localStates.map((local) => {
    const parsed = parse_p_adic_raw(local.amplitude.raw, state.pAdic.prime);
    const rawWeight = p_adic_norm_from_real(parsed, state.pAdic.prime);
    return {
      value: local.value,
      rawWeight,
    };
  });
  const normalization = rows.reduce((acc, entry) => acc + entry.rawWeight, 0);
  return rows.map((entry) => ({
    ...entry,
    weight: normalization <= 0 ? 0 : entry.rawWeight / normalization,
  }));
};

const formatPercent = (value: number): string => `${(value * 100).toFixed(1)}%`;
const formatWeight = (value: number): string => {
  if (!Number.isFinite(value)) {
    return value > 0 ? "+∞" : "-∞";
  }
  if (value === 0) {
    return "0";
  }
  if (Math.abs(value) < 1e-6 || Math.abs(value) > 1e4) {
    return value.toExponential(2);
  }
  return value.toFixed(4);
};
</script>
