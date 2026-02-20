<template>
  <section class="panel teleport-results-panel">
    <div class="panel-header">
      <h2>Teleportation Outputs</h2>
      <p>Expected branch evolution from pre-measurement state, with and without classical correction.</p>
      <p class="teleport-source-readout">Source |q0⟩ = {{ formatQubit(source) }}</p>
    </div>

    <div class="teleport-correction-controls">
      <p class="muted">Correction mode</p>
      <div class="teleport-toggle-row">
        <button
          type="button"
          class="teleport-toggle-btn"
          :class="{ active: correctionMode === 'auto' }"
          @click="$emit('update-correction-mode', 'auto')"
        >
          Auto
        </button>
        <button
          type="button"
          class="teleport-toggle-btn"
          :class="{ active: correctionMode === 'manual' }"
          @click="$emit('update-correction-mode', 'manual')"
        >
          Manual
        </button>
      </div>

      <div v-if="correctionMode === 'manual'" class="teleport-manual-controls">
        <label>
          <input
            type="checkbox"
            :checked="manualApplyZ"
            @change="onManualZChange"
          />
          apply Z when m0=1
        </label>
        <label>
          <input
            type="checkbox"
            :checked="manualApplyX"
            @change="onManualXChange"
          />
          apply X when m1=1
        </label>
      </div>
    </div>

    <div class="teleport-sample-panel">
      <div class="teleport-sample-header">
        <h3>Interactive Run</h3>
        <button type="button" class="measure-btn teleport-run-btn" @click="$emit('run-sample')">Run Sample</button>
      </div>

      <p class="muted">Expected output for current correction mode.</p>
      <div class="teleport-metrics">
        <p>|0⟩ on q2: {{ formatPercent(activeExpected.summary.q2P0) }}</p>
        <p>|1⟩ on q2: {{ formatPercent(activeExpected.summary.q2P1) }}</p>
        <p>Fidelity to source: {{ formatPercent(activeExpected.summary.fidelityToSource) }}</p>
      </div>

      <div class="teleport-distribution">
        <div v-for="entry in orderedActiveExpectedDistribution" :key="`active-${entry.basis}`" class="teleport-dist-row">
          <span>|{{ entry.basis }}⟩</span>
          <div class="teleport-dist-bar-wrap">
            <div class="teleport-dist-bar is-active" :style="{ width: `${entry.probability * 100}%` }"></div>
          </div>
          <span>{{ formatPercent(entry.probability) }}</span>
        </div>
      </div>

      <div v-if="sampledResult" class="teleport-sampled-block">
        <p class="teleport-sample-outcome">
          Sampled basis: |{{ sampledResult.basis }}⟩ ({{ formatPercent(sampledResult.probability) }})
        </p>
        <div class="teleport-metrics">
          <p>m0,m1: {{ sampledResult.m0 }}{{ sampledResult.m1 }}</p>
          <p>|0⟩ on q2: {{ formatPercent(sampledResult.q2P0) }}</p>
          <p>|1⟩ on q2: {{ formatPercent(sampledResult.q2P1) }}</p>
          <p>Fidelity to source: {{ formatPercent(sampledResult.fidelityToSource) }}</p>
        </div>

        <div class="teleport-distribution">
          <div v-for="entry in orderedSampledDistribution" :key="`sampled-${entry.basis}`" class="teleport-dist-row">
            <span>|{{ entry.basis }}⟩</span>
            <div class="teleport-dist-bar-wrap">
              <div class="teleport-dist-bar is-sampled" :style="{ width: `${entry.probability * 100}%` }"></div>
            </div>
            <span>{{ formatPercent(entry.probability) }}</span>
          </div>
        </div>

        <div v-if="sampledResult.outcomes.length > 0" class="teleport-outcome-list">
          <h4>In-circuit measurements</h4>
          <ul>
            <li v-for="entry in sampledResult.outcomes" :key="entry.gateId">
              <span>t{{ entry.column }} • M(q{{ entry.wire }})={{ entry.value }}</span>
              <button type="button" class="resample-btn" @click="$emit('resample-from', entry.gateId)">
                Resample from this point
              </button>
            </li>
          </ul>
        </div>
      </div>
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
import type {
  TeleportationBranchResult,
  TeleportationCorrectionMode,
  TeleportationModeSummary,
  TeleportationSampleResult,
} from "./model-types";

const props = defineProps<{
  source: Qubit;
  correctionMode: TeleportationCorrectionMode;
  manualApplyZ: boolean;
  manualApplyX: boolean;
  activeExpected: {
    summary: TeleportationModeSummary;
    distribution: BasisProbability[];
  };
  sampledResult: TeleportationSampleResult | null;
  branches: TeleportationBranchResult[];
  output: {
    withoutCorrection: TeleportationModeSummary;
    withCorrection: TeleportationModeSummary;
    withoutCorrectionDistribution: BasisProbability[];
    withCorrectionDistribution: BasisProbability[];
  };
}>();

const emit = defineEmits<{
  (e: "update-correction-mode", mode: TeleportationCorrectionMode): void;
  (e: "update-manual-z", enabled: boolean): void;
  (e: "update-manual-x", enabled: boolean): void;
  (e: "run-sample"): void;
  (e: "resample-from", gateId: string): void;
}>();

const orderedDistribution = (distribution: BasisProbability[]) =>
  [...distribution].sort((left, right) => Number.parseInt(left.basis, 2) - Number.parseInt(right.basis, 2));

const orderedWithoutDistribution = computed(() => orderedDistribution(props.output.withoutCorrectionDistribution));
const orderedWithDistribution = computed(() => orderedDistribution(props.output.withCorrectionDistribution));
const orderedActiveExpectedDistribution = computed(() => orderedDistribution(props.activeExpected.distribution));
const orderedSampledDistribution = computed(() =>
  props.sampledResult ? orderedDistribution(props.sampledResult.distribution) : [],
);

const formatPercent = (value: number): string => `${(value * 100).toFixed(1)}%`;

const formatComplex = (real: number, imag: number): string => {
  const sign = imag < 0 ? "-" : "+";
  return `${real.toFixed(3)} ${sign} ${Math.abs(imag).toFixed(3)}i`;
};

const formatQubit = (state: Qubit): string =>
  `(a=${formatComplex(state.a.real, state.a.imag)}, b=${formatComplex(state.b.real, state.b.imag)})`;

const onManualZChange = (event: Event) => {
  const target = event.target as HTMLInputElement;
  emit("update-manual-z", target.checked);
};

const onManualXChange = (event: Event) => {
  const target = event.target as HTMLInputElement;
  emit("update-manual-x", target.checked);
};
</script>
