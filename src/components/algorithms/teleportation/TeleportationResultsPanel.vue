<template>
  <section class="panel teleport-results-panel">
    <div class="panel-header">
      <h2>Teleportation Outputs</h2>
      <p>Expected branch evolution from pre-measurement state, with and without classical correction.</p>
      <p class="teleport-source-readout">Source |q0⟩ = {{ formatQubit(source) }}</p>
    </div>

    <div class="teleport-output-cards">
      <article class="teleport-output-card">
        <h3>Without Correction</h3>
        <p class="muted">q2 output mixture after Alice measurements.</p>
        <div class="teleport-metrics">
          <p>|0⟩ on q2: {{ formatPercent(output.withoutCorrection.q2P0) }}</p>
          <p>|1⟩ on q2: {{ formatPercent(output.withoutCorrection.q2P1) }}</p>
          <p>Fidelity to source: {{ formatPercent(output.withoutCorrection.fidelityToSource) }}</p>
        </div>
        <div class="teleport-distribution">
          <div v-for="entry in orderedWithoutDistribution" :key="`without-${entry.basis}`" class="teleport-dist-row">
            <span>|{{ entry.basis }}⟩</span>
            <div class="teleport-dist-bar-wrap">
              <div class="teleport-dist-bar" :style="{ width: `${entry.probability * 100}%` }"></div>
            </div>
            <span>{{ formatPercent(entry.probability) }}</span>
          </div>
        </div>
      </article>

      <article class="teleport-output-card">
        <h3>With Correction</h3>
        <p class="muted">q2 output after applying Z(m0), X(m1).</p>
        <div class="teleport-metrics">
          <p>|0⟩ on q2: {{ formatPercent(output.withCorrection.q2P0) }}</p>
          <p>|1⟩ on q2: {{ formatPercent(output.withCorrection.q2P1) }}</p>
          <p>Fidelity to source: {{ formatPercent(output.withCorrection.fidelityToSource) }}</p>
        </div>
        <div class="teleport-distribution">
          <div v-for="entry in orderedWithDistribution" :key="`with-${entry.basis}`" class="teleport-dist-row">
            <span>|{{ entry.basis }}⟩</span>
            <div class="teleport-dist-bar-wrap">
              <div class="teleport-dist-bar is-corrected" :style="{ width: `${entry.probability * 100}%` }"></div>
            </div>
            <span>{{ formatPercent(entry.probability) }}</span>
          </div>
        </div>
      </article>
    </div>

    <div class="teleport-branch-table-wrap">
      <h3>Expected Branch Table</h3>
      <p class="muted">m0,m1 are Alice measurements. Bob branch state is shown as complex amplitudes.</p>
      <table class="teleport-branch-table">
        <thead>
          <tr>
            <th>m0m1</th>
            <th>Prob</th>
            <th>branch op</th>
            <th>Bob (no corr)</th>
            <th>Bob (with corr)</th>
            <th>F no-corr</th>
            <th>F with-corr</th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="branch in branches" :key="branch.basis">
            <td>{{ branch.basis }}</td>
            <td>{{ formatPercent(branch.probability) }}</td>
            <td>{{ branch.operation }}|q0⟩</td>
            <td>{{ formatQubit(branch.withoutCorrection) }}</td>
            <td>{{ formatQubit(branch.withCorrection) }}</td>
            <td>{{ formatPercent(branch.fidelityWithoutCorrection) }}</td>
            <td>{{ formatPercent(branch.fidelityWithCorrection) }}</td>
          </tr>
        </tbody>
      </table>
    </div>
  </section>
</template>

<script setup lang="ts">
import { computed } from "vue";
import type { BasisProbability, Qubit } from "../../../types";
import type { TeleportationBranchResult, TeleportationModeSummary } from "./model-types";

const props = defineProps<{
  source: Qubit;
  branches: TeleportationBranchResult[];
  output: {
    withoutCorrection: TeleportationModeSummary;
    withCorrection: TeleportationModeSummary;
    withoutCorrectionDistribution: BasisProbability[];
    withCorrectionDistribution: BasisProbability[];
  };
}>();

const orderedDistribution = (distribution: BasisProbability[]) =>
  [...distribution].sort((left, right) => Number.parseInt(left.basis, 2) - Number.parseInt(right.basis, 2));

const orderedWithoutDistribution = computed(() => orderedDistribution(props.output.withoutCorrectionDistribution));
const orderedWithDistribution = computed(() => orderedDistribution(props.output.withCorrectionDistribution));

const formatPercent = (value: number): string => `${(value * 100).toFixed(1)}%`;

const formatComplex = (real: number, imag: number): string => {
  const sign = imag < 0 ? "-" : "+";
  return `${real.toFixed(3)} ${sign} ${Math.abs(imag).toFixed(3)}i`;
};

const formatQubit = (state: Qubit): string =>
  `(a=${formatComplex(state.a.real, state.a.imag)}, b=${formatComplex(state.b.real, state.b.imag)})`;
</script>
