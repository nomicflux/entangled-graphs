<template>
  <section class="panel padic-general-input-panel">
    <div class="panel-header">
      <h2>General Qubit Input</h2>
      <p>Choose an input-state preset and set wire count for the p-adic circuit workspace.</p>
    </div>

    <div class="qubit-controls padic-input-controls">
      <div class="padic-prime-row">
        <div class="padic-prime-banner">
          <span class="qubit-controls-label">Prime Basis</span>
          <p class="padic-prime-value">p = {{ pAdicFaithfulState.prime }}</p>
        </div>
        <label class="qubit-count-field padic-prime-field">
          Prime p
          <select :value="pAdicFaithfulState.prime" @change="handlePrimeChange">
            <option v-for="prime in PADIC_FAITHFUL_PRIMES" :key="prime" :value="prime">{{ prime }}</option>
          </select>
        </label>
      </div>

      <div class="padic-qubit-row">
        <span class="qubit-controls-label">Qubit Controls</span>
        <button type="button" class="qubit-count-btn" @click="setFaithfulQubitCount(pAdicFaithfulState.qubitCount - 1)" :disabled="pAdicFaithfulState.qubitCount <= 1">
          - Qubit
        </button>
        <label class="qubit-count-field padic-qubit-count-field">
          Qubit Count
          <input :value="pAdicFaithfulState.qubitCount" type="number" min="1" max="8" @change="handleCountInput" />
        </label>
        <button type="button" class="qubit-count-btn" @click="setFaithfulQubitCount(pAdicFaithfulState.qubitCount + 1)" :disabled="pAdicFaithfulState.qubitCount >= 8">
          + Qubit
        </button>
      </div>
    </div>

    <p class="muted padic-input-note">
      Configure each qubit separately. The simulator builds a full <code>2^n x 2^n</code> p-adic state operator from these inputs.
    </p>

    <div class="qubit-grid">
      <article v-for="(entry, index) in pAdicFaithfulState.preparedInputs" :key="`padic-input-${index}`" class="qubit-card">
        <div class="qubit-top">
          <div>
            <h3>Q{{ index }}</h3>
            <p class="muted">Local p-adic preparation state</p>
          </div>
        </div>

        <div class="preset-row">
          <button
            v-for="preset in presetOptions"
            :key="preset.id"
            type="button"
            class="preset-btn preset-card-btn"
            :class="{ active: entry.preset === preset.id }"
            @click="applyPreset(index, preset.id)"
          >
            <span class="preset-btn-title">{{ preset.label }}</span>
            <span class="preset-btn-hint">{{ preset.hint }}</span>
          </button>
        </div>

        <p class="preset-note">{{ presetSummary(entry.preset) }}</p>
      </article>
    </div>
  </section>
</template>

<script setup lang="ts">
import {
  PADIC_FAITHFUL_PRIMES,
  pAdicFaithfulState,
  setFaithfulPreparedPreset,
  setFaithfulPrime,
  setFaithfulQubitCount,
} from "../../padic-faithful";
import { presetCards, presetSummaryForInput } from "../../padic-faithful/engine/prep";

type RhoPreset =
  | "basis_0"
  | "basis_1"
  | "diag_balanced"
  | "offdiag_pos"
  | "offdiag_neg"
  | "shell_weighted";

type PresetCard = {
  id: RhoPreset;
  label: string;
  hint: string;
};

const presetOptions: ReadonlyArray<PresetCard> = presetCards();

const presetSummary = (preset: RhoPreset): string => {
  return presetSummaryForInput(preset);
};

const applyPreset = (index: number, preset: RhoPreset) => {
  setFaithfulPreparedPreset(index, preset);
};

const handleCountInput = (event: Event) => {
  const target = event.target as HTMLInputElement;
  setFaithfulQubitCount(Number.parseInt(target.value, 10));
};

const handlePrimeChange = (event: Event) => {
  const target = event.target as HTMLSelectElement;
  setFaithfulPrime(Number.parseInt(target.value, 10));
};
</script>
