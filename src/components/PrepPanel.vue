<template>
  <section class="panel">
    <div class="panel-header">
      <h2>Prepared State</h2>
      <p>Edit Bloch angles for each qubit. Amplitudes are derived from those angles.</p>
    </div>

    <div class="qubit-controls" data-testid="prep-qubit-controls">
      <span class="qubit-controls-label">Qubit Controls</span>
      <button type="button" class="qubit-count-btn" @click="removeQubit()" :disabled="qubitCount <= 1">- Qubit</button>
      <label class="qubit-count-field">
        Qubit Count
        <input :value="qubitCount" type="number" min="1" max="8" @change="handleCountInput" />
      </label>
      <button type="button" class="qubit-count-btn" @click="addQubit()" :disabled="qubitCount >= 8">+ Qubit</button>
    </div>

    <div class="qubit-grid">
      <div v-for="(q, index) in state.preparedBloch" :key="index" class="qubit-card">
        <div class="qubit-top">
          <div>
            <h3>Q{{ index }}</h3>
            <p class="muted">Bloch parameters</p>
          </div>
          <div class="bloch-preview">
            <div class="bloch-circle"></div>
            <div class="bloch-dot" :style="dotStyle(q)"></div>
          </div>
        </div>

        <div class="amp-row">
          <span class="amp-label">theta</span>
          <label>
            0..pi
            <input v-model.number="q.theta" type="range" :min="0" :max="Math.PI" :step="0.01" />
          </label>
          <output>{{ q.theta.toFixed(2) }}</output>
        </div>

        <div class="amp-row">
          <span class="amp-label">phi</span>
          <label>
            0..2pi
            <input v-model.number="q.phi" type="range" :min="0" :max="2 * Math.PI" :step="0.01" />
          </label>
          <output>{{ q.phi.toFixed(2) }}</output>
        </div>

        <div class="preset-row">
          <button type="button" class="preset-btn" @click="applyPreset(index, 'zero')">100% |0></button>
          <button type="button" class="preset-btn" @click="applyPreset(index, 'one')">100% |1></button>
          <button type="button" class="preset-btn" @click="applyPreset(index, 'half')">50/50</button>
        </div>

        <div class="amp-derived">
          <p class="amp-label">|0⟩ a = {{ formatComplex(amplitudes[index].a.real, amplitudes[index].a.imag) }}</p>
          <p class="amp-label">|1⟩ b = {{ formatComplex(amplitudes[index].b.real, amplitudes[index].b.imag) }}</p>
        </div>
      </div>
    </div>

    <div class="prepared-distribution">
      <h3>Prepared {{ qubitCount }}-Qubit Distribution</h3>
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
import type { BlochParams } from "../types";
import { addQubit, preparedDistribution, preparedQubits, qubitCount, removeQubit, setQubitCount, state } from "../state";

const amplitudes = preparedQubits;
const previewRadius = 26;

const dotStyle = (q: BlochParams) => {
  const x = Math.sin(q.theta) * Math.cos(q.phi) * previewRadius;
  const y = Math.sin(q.theta) * Math.sin(q.phi) * previewRadius;
  return {
    transform: `translate(${x}px, ${-y}px)`,
  };
};

const formatComplex = (real: number, imag: number): string => {
  const sign = imag < 0 ? "-" : "+";
  return `${real.toFixed(3)} ${sign} ${Math.abs(imag).toFixed(3)}i`;
};

type Preset = "zero" | "one" | "half";

const applyPreset = (index: number, preset: Preset) => {
  const entry = state.preparedBloch[index];
  if (!entry) {
    return;
  }

  if (preset === "zero") {
    entry.theta = 0;
    entry.phi = 0;
    return;
  }

  if (preset === "one") {
    entry.theta = Math.PI;
    entry.phi = 0;
    return;
  }

  entry.theta = Math.PI / 2;
  entry.phi = 0;
};

const handleCountInput = (event: Event) => {
  const target = event.target as HTMLInputElement;
  setQubitCount(Number.parseInt(target.value, 10));
};

const formatPercent = (value: number): string => `${(value * 100).toFixed(1)}%`;
</script>
