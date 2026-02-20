<template>
  <section class="panel">
    <div class="panel-header">
      <h2>Source State</h2>
      <p>Set the source qubit |q0⟩ directly. Tau is derived by the algorithm.</p>
    </div>

    <div class="teleport-role-grid">
      <p><strong>q0</strong> source qubit</p>
      <p><strong>q1</strong> Alice entangled qubit</p>
      <p><strong>q2</strong> Bob destination qubit</p>
    </div>

    <div class="qubit-card teleport-source-card">
      <div class="qubit-top">
        <div>
          <h3>Source (q0)</h3>
          <p class="muted">Direct state input</p>
        </div>
      </div>

      <div class="amp-row">
        <span class="amp-label">theta</span>
        <label>
          0..pi
          <input :value="sourceBloch.theta" type="range" :min="0" :max="Math.PI" :step="0.01" @input="updateTheta" />
        </label>
        <output>{{ sourceBloch.theta.toFixed(2) }}</output>
      </div>

      <div class="amp-row">
        <span class="amp-label">phi</span>
        <label>
          0..2pi
          <input :value="sourceBloch.phi" type="range" :min="0" :max="2 * Math.PI" :step="0.01" @input="updatePhi" />
        </label>
        <output>{{ sourceBloch.phi.toFixed(2) }}</output>
      </div>

      <div class="preset-row">
        <button type="button" class="preset-btn" @click="$emit('apply-preset', 'zero')">100% |0></button>
        <button type="button" class="preset-btn" @click="$emit('apply-preset', 'one')">100% |1></button>
        <button type="button" class="preset-btn" @click="$emit('apply-preset', 'half')">50/50</button>
      </div>

      <div class="amp-derived">
        <p class="amp-label">|0⟩ a = {{ formatComplex(sourceAmplitudes.a.real, sourceAmplitudes.a.imag) }}</p>
        <p class="amp-label">|1⟩ b = {{ formatComplex(sourceAmplitudes.b.real, sourceAmplitudes.b.imag) }}</p>
      </div>
    </div>

    <div class="teleport-tau-panel">
      <h3>Derived Tau (Read-only)</h3>
      <p class="muted">Shown at stage: {{ tauStageLabel }}</p>
      <p class="teleport-tau-formula">
        tau = 1/2(|00>|q0> + |01>X|q0> + |10>Z|q0> + |11>XZ|q0>)
      </p>

      <div class="tau-branch-list">
        <p v-for="entry in tauBranches" :key="entry.basis">
          <span>|{{ entry.basis }}⟩ → {{ entry.operation }}|q0⟩</span>
          <span class="tau-branch-amp">
            (a={{ formatComplex(entry.state.a.real, entry.state.a.imag) }}, b={{ formatComplex(entry.state.b.real, entry.state.b.imag) }})
          </span>
        </p>
      </div>
    </div>
  </section>
</template>

<script setup lang="ts">
import type { BlochParams, Qubit } from "../../../types";
import type { PrepPreset, TauBranch } from "./model-types";

const props = defineProps<{
  sourceBloch: BlochParams;
  sourceAmplitudes: Qubit;
  tauStageLabel: string;
  tauBranches: TauBranch[];
}>();

const emit = defineEmits<{
  (e: "update-source-bloch", next: BlochParams): void;
  (e: "apply-preset", preset: PrepPreset): void;
}>();

const updateTheta = (event: Event) => {
  const target = event.target as HTMLInputElement;
  emit("update-source-bloch", { ...props.sourceBloch, theta: Number.parseFloat(target.value) });
};

const updatePhi = (event: Event) => {
  const target = event.target as HTMLInputElement;
  emit("update-source-bloch", { ...props.sourceBloch, phi: Number.parseFloat(target.value) });
};

const formatComplex = (real: number, imag: number): string => {
  const sign = imag < 0 ? "-" : "+";
  return `${real.toFixed(3)} ${sign} ${Math.abs(imag).toFixed(3)}i`;
};
</script>
