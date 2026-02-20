<template>
  <section class="panel">
    <div class="panel-header">
      <h2>Deutsch Inputs</h2>
      <p>Select an oracle, optionally switch mode, and edit input qubits.</p>
    </div>

    <div class="deutsch-controls">
      <label class="deutsch-field">
        Oracle
        <select :value="oracleId" @change="emitOracleChange">
          <option v-for="oracle in oracles" :key="oracle.id" :value="oracle.id">
            {{ oracle.label }} ({{ oracle.functionLabel }})
          </option>
        </select>
      </label>

      <div class="deutsch-mode-toggle">
        <button type="button" class="deutsch-toggle-btn" :class="{ active: mode === 'select' }" @click="$emit('set-mode', 'select')">
          Select
        </button>
        <button type="button" class="deutsch-toggle-btn" :class="{ active: mode === 'guess' }" @click="$emit('set-mode', 'guess')">
          Guess
        </button>
      </div>
    </div>

    <div class="deutsch-oracle-summary">
      <p><strong>Oracle class:</strong> {{ oracleClass }}</p>
      <p><strong>Truth table:</strong></p>
      <p v-for="row in truthRows" :key="row.x">x={{ row.x }} -> f(x)={{ row.fx }}</p>
    </div>

    <div class="deutsch-input-grid">
      <article class="deutsch-input-card">
        <h3>q0 input</h3>
        <div class="amp-row">
          <span class="amp-label">theta</span>
          <label>0..pi <input :value="q0Bloch.theta" type="range" :min="0" :max="Math.PI" :step="0.01" @input="emitBloch(0, 'theta', $event)" /></label>
          <output>{{ q0Bloch.theta.toFixed(2) }}</output>
        </div>
        <div class="amp-row">
          <span class="amp-label">phi</span>
          <label>0..2pi <input :value="q0Bloch.phi" type="range" :min="0" :max="2 * Math.PI" :step="0.01" @input="emitBloch(0, 'phi', $event)" /></label>
          <output>{{ q0Bloch.phi.toFixed(2) }}</output>
        </div>
        <div class="preset-row">
          <button type="button" class="preset-btn" @click="$emit('preset', 0, 'zero')">100% |0></button>
          <button type="button" class="preset-btn" @click="$emit('preset', 0, 'one')">100% |1></button>
          <button type="button" class="preset-btn" @click="$emit('preset', 0, 'half')">50/50</button>
        </div>
      </article>

      <article class="deutsch-input-card">
        <h3>q1 input</h3>
        <p class="deutsch-note">Circuit applies an explicit initial X on this wire.</p>
        <div class="amp-row">
          <span class="amp-label">theta</span>
          <label>0..pi <input :value="q1Bloch.theta" type="range" :min="0" :max="Math.PI" :step="0.01" @input="emitBloch(1, 'theta', $event)" /></label>
          <output>{{ q1Bloch.theta.toFixed(2) }}</output>
        </div>
        <div class="amp-row">
          <span class="amp-label">phi</span>
          <label>0..2pi <input :value="q1Bloch.phi" type="range" :min="0" :max="2 * Math.PI" :step="0.01" @input="emitBloch(1, 'phi', $event)" /></label>
          <output>{{ q1Bloch.phi.toFixed(2) }}</output>
        </div>
        <div class="preset-row">
          <button type="button" class="preset-btn" @click="$emit('preset', 1, 'zero')">100% |0></button>
          <button type="button" class="preset-btn" @click="$emit('preset', 1, 'one')">100% |1></button>
          <button type="button" class="preset-btn" @click="$emit('preset', 1, 'half')">50/50</button>
        </div>
      </article>
    </div>
  </section>
</template>

<script setup lang="ts">
import type { BlochParams } from "../../../types";
import type { DeutschOracleDescriptor, DeutschOracleId, DeutschTruthRow } from "./model-types";

const props = defineProps<{
  oracleId: DeutschOracleId;
  mode: "select" | "guess";
  oracles: readonly DeutschOracleDescriptor[];
  oracleClass: "constant" | "balanced";
  truthRows: readonly DeutschTruthRow[];
  q0Bloch: BlochParams;
  q1Bloch: BlochParams;
}>();

const emit = defineEmits<{
  (e: "set-oracle", oracleId: DeutschOracleId): void;
  (e: "set-mode", mode: "select" | "guess"): void;
  (e: "set-bloch", wire: 0 | 1, next: BlochParams): void;
  (e: "preset", wire: 0 | 1, preset: "zero" | "one" | "half"): void;
}>();

const emitOracleChange = (event: Event) => {
  const value = (event.target as HTMLSelectElement).value as DeutschOracleId;
  emit("set-oracle", value);
};

const emitBloch = (wire: 0 | 1, axis: "theta" | "phi", event: Event) => {
  const value = Number((event.target as HTMLInputElement).value);
  const current = wire === 0 ? props.q0Bloch : props.q1Bloch;
  emit("set-bloch", wire, { ...current, [axis]: value });
};
</script>
