<template>
  <section class="panel">
    <div class="panel-header">
      <h2>Prepared State</h2>
      <p>Edit Bloch angles for each qubit. Amplitudes are derived from those angles.</p>
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

        <div class="amp-derived">
          <p class="amp-label">|0⟩ a = {{ formatComplex(amplitudes[index].a.real, amplitudes[index].a.imag) }}</p>
          <p class="amp-label">|1⟩ b = {{ formatComplex(amplitudes[index].b.real, amplitudes[index].b.imag) }}</p>
        </div>
      </div>
    </div>
  </section>
</template>

<script setup lang="ts">
import type { BlochParams } from "../state";
import { preparedQubits, state } from "../state";

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
</script>
