<template>
  <section class="panel">
    <div class="panel-header">
      <h2>Prepared p-adic State</h2>
      <p>Set p-adic amplitudes directly. Prime selection controls p-adic interpretation.</p>
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
            <p class="muted">Explicit amplitude input</p>
          </div>
        </div>

        <div class="amp-row">
          <span class="amp-label">a (|0&gt;)</span>
          <label>
            raw
            <input :value="q.a.raw" type="text" @input="setAmplitude(index, 'a', $event)" />
          </label>
          <output>{{ q.a.raw }}</output>
        </div>

        <div class="amp-row">
          <span class="amp-label">b (|1&gt;)</span>
          <label>
            raw
            <input :value="q.b.raw" type="text" @input="setAmplitude(index, 'b', $event)" />
          </label>
          <output>{{ q.b.raw }}</output>
        </div>

        <div class="preset-row">
          <button type="button" class="preset-btn" @click="applyPAdicPreset(index, 'zero')">|0&gt;</button>
          <button type="button" class="preset-btn" @click="applyPAdicPreset(index, 'one')">|1&gt;</button>
          <button type="button" class="preset-btn" @click="applyPAdicPreset(index, 'balanced')">balanced</button>
        </div>
      </div>
    </div>
  </section>
</template>

<script setup lang="ts">
import { computed } from "vue";
import { PADIC_PRIMES } from "../../padic-config";
import {
  addPAdicQubit,
  applyPAdicPreset,
  removePAdicQubit,
  setPAdicAmplitude,
  setPAdicPrime,
  setPAdicQubitCount,
  state,
} from "../../state";

const primes = PADIC_PRIMES;

const qubitCount = computed(() => state.pAdic.qubitCount);

const handleCountInput = (event: Event) => {
  const target = event.target as HTMLInputElement;
  setPAdicQubitCount(Number.parseInt(target.value, 10));
};

const setAmplitude = (index: number, key: "a" | "b", event: Event) => {
  const target = event.target as HTMLInputElement;
  setPAdicAmplitude(index, key, target.value);
};
</script>
