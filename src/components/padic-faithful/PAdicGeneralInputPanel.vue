<template>
  <section class="panel padic-general-input-panel">
    <div class="panel-header">
      <h2>General Qubit Input</h2>
      <p>Set the wire count and per-wire Bloch-style controls for the p-adic workspace flow.</p>
    </div>

    <div class="qubit-controls">
      <span class="qubit-controls-label">Qubit Controls</span>
      <button type="button" class="qubit-count-btn" @click="setFaithfulQubitCount(pAdicFaithfulState.qubitCount - 1)" :disabled="pAdicFaithfulState.qubitCount <= 1">
        - Qubit
      </button>
      <label class="qubit-count-field">
        Qubit Count
        <input :value="pAdicFaithfulState.qubitCount" type="number" min="1" max="8" @change="handleCountInput" />
      </label>
      <button type="button" class="qubit-count-btn" @click="setFaithfulQubitCount(pAdicFaithfulState.qubitCount + 1)" :disabled="pAdicFaithfulState.qubitCount >= 8">
        + Qubit
      </button>
    </div>

    <div class="qubit-grid">
      <article v-for="(entry, index) in pAdicFaithfulState.preparedBloch" :key="`padic-input-${index}`" class="qubit-card">
        <div class="qubit-top">
          <div>
            <h3>Q{{ index }}</h3>
            <p class="muted">Input controls</p>
          </div>
          <div class="bloch-preview">
            <div class="bloch-circle"></div>
            <div class="bloch-dot" :style="dotStyle(entry)"></div>
          </div>
        </div>

        <div class="amp-row">
          <span class="amp-label">theta</span>
          <label>
            0..pi
            <input :value="entry.theta" type="range" :min="0" :max="Math.PI" :step="0.01" @input="setTheta(index, $event)" />
          </label>
          <output>{{ entry.theta.toFixed(2) }}</output>
        </div>

        <div class="amp-row">
          <span class="amp-label">phi</span>
          <label>
            0..2pi
            <input :value="entry.phi" type="range" :min="0" :max="2 * Math.PI" :step="0.01" @input="setPhi(index, $event)" />
          </label>
          <output>{{ entry.phi.toFixed(2) }}</output>
        </div>

        <div class="preset-row">
          <button type="button" class="preset-btn" @click="applyPreset(index, 'zero')">|0></button>
          <button type="button" class="preset-btn" @click="applyPreset(index, 'one')">|1></button>
          <button type="button" class="preset-btn" @click="applyPreset(index, 'half')">50/50</button>
        </div>
      </article>
    </div>

    <p class="muted padic-input-note">Canonical p-adic state entry remains in the rho panel; this panel restores the multi-wire input workflow.</p>
  </section>
</template>

<script setup lang="ts">
import { pAdicFaithfulState, setFaithfulBlochPhi, setFaithfulBlochTheta, setFaithfulQubitCount } from "../../padic-faithful";

type Preset = "zero" | "one" | "half";

const previewRadius = 26;

const dotStyle = (entry: { theta: number; phi: number }) => {
  const x = Math.sin(entry.theta) * Math.cos(entry.phi) * previewRadius;
  const y = Math.sin(entry.theta) * Math.sin(entry.phi) * previewRadius;
  return {
    transform: `translate(${x}px, ${-y}px)`,
  };
};

const handleCountInput = (event: Event) => {
  const target = event.target as HTMLInputElement;
  setFaithfulQubitCount(Number.parseInt(target.value, 10));
};

const setTheta = (index: number, event: Event) => {
  const target = event.target as HTMLInputElement;
  setFaithfulBlochTheta(index, Number.parseFloat(target.value));
};

const setPhi = (index: number, event: Event) => {
  const target = event.target as HTMLInputElement;
  setFaithfulBlochPhi(index, Number.parseFloat(target.value));
};

const applyPreset = (index: number, preset: Preset) => {
  if (preset === "zero") {
    setFaithfulBlochTheta(index, 0);
    setFaithfulBlochPhi(index, 0);
    return;
  }
  if (preset === "one") {
    setFaithfulBlochTheta(index, Math.PI);
    setFaithfulBlochPhi(index, 0);
    return;
  }

  setFaithfulBlochTheta(index, Math.PI / 2);
  setFaithfulBlochPhi(index, 0);
};
</script>
