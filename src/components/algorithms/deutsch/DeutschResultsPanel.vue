<template>
  <section class="panel">
    <div class="panel-header">
      <h2>Deutsch Results</h2>
      <p>Expected verdict from q0 plus sampled run output.</p>
    </div>

    <div class="deutsch-result-card">
      <p><strong>Expected verdict:</strong> {{ expectedDecision }}</p>
      <p><strong>Oracle class:</strong> {{ oracleClass }}</p>
      <p><strong>q0 -> constant:</strong> {{ toPercent(q0DecisionProbability.constant) }}</p>
      <p><strong>q0 -> balanced:</strong> {{ toPercent(q0DecisionProbability.balanced) }}</p>
    </div>

    <div class="deutsch-result-card">
      <div class="deutsch-sample-head">
        <h3>Sample</h3>
        <button type="button" class="teleport-run-btn" @click="$emit('run-sample')">Run Sample</button>
      </div>
      <p v-if="sampled === null" class="deutsch-note">No sample yet.</p>
      <template v-else>
        <p><strong>Sample basis:</strong> |{{ sampled.basis }}></p>
        <p><strong>Sample probability:</strong> {{ toPercent(sampled.probability) }}</p>
        <p><strong>Sample q0:</strong> {{ sampled.q0Value }}</p>
        <p><strong>Sample verdict:</strong> {{ sampled.predictedDecision }}</p>
      </template>
      <p v-if="mode === 'guess'" class="deutsch-note">Guess mode reveal and scoring lands in Phase 4.</p>
    </div>

    <div class="stage-probability">
      <div v-for="entry in finalDistribution" :key="entry.basis" class="prob-row">
        <span>|{{ entry.basis }}></span>
        <div class="prob-bar-wrap">
          <div class="prob-bar" :style="{ width: `${entry.probability * 100}%` }"></div>
        </div>
        <span>{{ toPercent(entry.probability) }}</span>
      </div>
    </div>
  </section>
</template>

<script setup lang="ts">
import type { BasisProbability } from "../../../types";
import type { DeutschDecisionClass, DeutschSampleResult } from "./model-types";

defineProps<{
  mode: "select" | "guess";
  oracleClass: "constant" | "balanced";
  expectedDecision: DeutschDecisionClass;
  q0DecisionProbability: { constant: number; balanced: number };
  finalDistribution: ReadonlyArray<BasisProbability>;
  sampled: DeutschSampleResult | null;
}>();

defineEmits<{
  (e: "run-sample"): void;
}>();

const toPercent = (value: number): string => `${(value * 100).toFixed(1)}%`;
</script>
