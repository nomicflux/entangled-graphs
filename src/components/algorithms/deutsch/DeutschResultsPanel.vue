<template>
  <section class="panel">
    <div class="panel-header">
      <h2>Deutsch Results</h2>
      <p>Expected verdict from q0 plus sampled run output.</p>
    </div>

    <div class="deutsch-result-card">
      <p><strong>Expected verdict:</strong> {{ shouldHideDecision ? "hidden (guess mode)" : expectedDecision }}</p>
      <p><strong>Oracle class:</strong> {{ oracleClass ?? "hidden" }}</p>
      <p><strong>q0 -> constant:</strong> {{ toPercent(q0DecisionProbability.constant) }}</p>
      <p><strong>q0 -> balanced:</strong> {{ toPercent(q0DecisionProbability.balanced) }}</p>
    </div>

    <div class="deutsch-result-card">
      <h3>Interference View</h3>
      <p><strong>Stage:</strong> {{ interferenceView.stageLabel }}</p>
      <p><strong>Support in |- subspace:</strong> {{ toPercent(interferenceView.supportInMinusSubspace) }}</p>

      <div class="deutsch-interference-paths">
        <div v-for="entry in interferenceView.contributions" :key="entry.x" class="deutsch-interference-row">
          <span>x={{ entry.x }}</span>
          <div class="prob-bar-wrap">
            <div
              class="prob-bar deutsch-interference-bar"
              :class="phaseClass(entry.phaseSign)"
              :style="{ width: `${Math.max(3, entry.probability * 100)}%` }"
            ></div>
          </div>
          <span>{{ toPercent(entry.probability) }}</span>
        </div>
      </div>

      <p><strong>Constant channel:</strong> {{ toPercent(interferenceView.constantChannel) }}</p>
      <p><strong>Balanced channel:</strong> {{ toPercent(interferenceView.balancedChannel) }}</p>
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
      <template v-if="mode === 'guess'">
        <div class="deutsch-guess-row">
          <button type="button" class="deutsch-toggle-btn" @click="$emit('submit-guess', 'constant')">Guess Constant</button>
          <button type="button" class="deutsch-toggle-btn" @click="$emit('submit-guess', 'balanced')">Guess Balanced</button>
          <button type="button" class="deutsch-toggle-btn" @click="$emit('new-guess-round')">New Hidden Oracle</button>
        </div>
        <p v-if="guessRevealed && guessSelection !== null">
          <strong>Your guess:</strong> {{ guessSelection }}.
          <strong>Result:</strong> {{ guessCorrect ? "Correct" : "Incorrect" }}.
        </p>
      </template>
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
import type { DeutschDecisionClass, DeutschInterferenceView, DeutschSampleResult } from "./model-types";

defineProps<{
  mode: "select" | "guess";
  oracleClass: "constant" | "balanced" | null;
  expectedDecision: DeutschDecisionClass;
  shouldHideDecision: boolean;
  q0DecisionProbability: { constant: number; balanced: number };
  interferenceView: DeutschInterferenceView;
  finalDistribution: ReadonlyArray<BasisProbability>;
  sampled: DeutschSampleResult | null;
  guessSelection: DeutschDecisionClass | null;
  guessRevealed: boolean;
  guessCorrect: boolean | null;
}>();

defineEmits<{
  (e: "run-sample"): void;
  (e: "submit-guess", guess: DeutschDecisionClass): void;
  (e: "new-guess-round"): void;
}>();

const toPercent = (value: number): string => `${(value * 100).toFixed(1)}%`;
const phaseClass = (phaseSign: -1 | 0 | 1): string => {
  if (phaseSign < 0) {
    return "negative";
  }
  if (phaseSign > 0) {
    return "positive";
  }
  return "neutral";
};
</script>
