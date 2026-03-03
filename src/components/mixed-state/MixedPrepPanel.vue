<template>
  <section class="panel">
    <div class="panel-header">
      <h2>Prepared State</h2>
    </div>

    <div class="qubit-controls" data-testid="mixed-prep-qubit-controls">
      <span class="qubit-controls-label">Qubit Controls</span>
      <button type="button" class="qubit-count-btn" @click="removeMixedQubit()" :disabled="mixedQubitCount <= minQubits">
        - Qubit
      </button>
      <label class="qubit-count-field">
        Qubit Count
        <input :value="mixedQubitCount" type="number" :min="minQubits" :max="maxQubits" @change="handleCountInput" />
      </label>
      <button type="button" class="qubit-count-btn" @click="addMixedQubit()" :disabled="mixedQubitCount >= maxQubits">
        + Qubit
      </button>
    </div>

    <div class="qubit-grid">
      <div v-for="(entry, index) in mixedState.preparedInputs" :key="index" class="qubit-card rho-card">
        <div class="qubit-top">
          <div>
            <h3>Q{{ index }}</h3>
          </div>
        </div>

        <div class="preset-row">
          <button
            v-for="preset in RHO_PRESET_OPTIONS"
            :key="preset.id"
            type="button"
            class="preset-btn"
            @click="applyMixedRhoPreset(index, preset.id)"
          >
            {{ preset.label }}
          </button>
        </div>

        <div class="rho-grid">
          <label class="rho-input">
            <span>ρ00</span>
            <input :value="entry.rho00" type="text" inputmode="decimal" @input="setField(index, 'rho00', $event)" />
          </label>
          <label class="rho-input">
            <span>ρ11</span>
            <input :value="entry.rho11" type="text" inputmode="decimal" @input="setField(index, 'rho11', $event)" />
          </label>
          <label class="rho-input rho-input-wide">
            <span>Re(ρ01)</span>
            <input :value="entry.rho01Real" type="text" inputmode="decimal" @input="setField(index, 'rho01Real', $event)" />
          </label>
          <label class="rho-input rho-input-wide">
            <span>Im(ρ01)</span>
            <input :value="entry.rho01Imag" type="text" inputmode="decimal" @input="setField(index, 'rho01Imag', $event)" />
          </label>
        </div>

        <div class="rho-conjugate">ρ10 = conj(ρ01)</div>

        <ul v-if="mixedParsedRhoCards[index]?.errors.length" class="rho-errors">
          <li v-for="error in mixedParsedRhoCards[index]!.errors" :key="error">{{ error }}</li>
        </ul>
      </div>
    </div>

    <div class="prepared-distribution">
      <div class="distribution-head">
        <h3>Prepared Distribution</h3>
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

      <DensityStateView :model="preparedVisualModel" :animated="false" size="md" />

      <div v-for="entry in preparedDistribution" :key="entry.basis" class="prob-row">
        <span>|{{ entry.basis }}></span>
        <div class="prob-bar-wrap">
          <div class="prob-bar" :style="{ width: `${entry.probability * 100}%` }"></div>
        </div>
        <span>{{ formatPercent(entry.probability) }}</span>
      </div>
    </div>
  </section>
</template>

<script setup lang="ts">
import { computed, ref } from "vue";
import { preferredMeasurementBasisForDensityMatrix } from "../../quantum";
import type { MeasurementBasis, RawSingleQubitRhoInput } from "../../types";
import {
  MIXED_MAX_QUBITS,
  MIXED_MIN_QUBITS,
  RHO_PRESET_OPTIONS,
  addMixedQubit,
  applyMixedRhoPreset,
  mixedParsedRhoCards,
  mixedPreparedDensityMatrix,
  mixedQubitCount,
  mixedState,
  removeMixedQubit,
  setMixedQubitCount,
  setMixedRhoInput,
} from "../../mixed-state";
import DensityStateView from "./DensityStateView.vue";
import { deriveDensityStageVisualModel } from "./density-stage-visual-model";

const basisOptions = [
  { id: "auto", label: "Auto" },
  { id: "z", label: "Z" },
  { id: "x", label: "X" },
  { id: "y", label: "Y" },
] as const;

const selectedBasis = ref<"auto" | MeasurementBasis>("auto");
const minQubits = MIXED_MIN_QUBITS;
const maxQubits = MIXED_MAX_QUBITS;

const resolvedBasis = computed<MeasurementBasis>(() =>
  selectedBasis.value === "auto"
    ? preferredMeasurementBasisForDensityMatrix(mixedPreparedDensityMatrix.value)
    : selectedBasis.value,
);

const preparedVisualModel = computed(() => deriveDensityStageVisualModel(mixedPreparedDensityMatrix.value, resolvedBasis.value));
const preparedDistribution = computed(() => preparedVisualModel.value.distribution);

const setField = (index: number, key: keyof RawSingleQubitRhoInput, event: Event) => {
  const target = event.target as HTMLInputElement;
  setMixedRhoInput(index, { [key]: target.value });
};

const handleCountInput = (event: Event) => {
  const target = event.target as HTMLInputElement;
  setMixedQubitCount(Number.parseInt(target.value, 10));
};

const formatPercent = (value: number): string => `${(value * 100).toFixed(1)}%`;
</script>
