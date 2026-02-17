<template>
  <section class="panel panel-center">
    <div class="panel-header">
      <h2>Quantum Circuit</h2>
      <p>Time-stepped gate sequence and intermediate state snapshots.</p>
    </div>

    <div class="gate-palette">
      <span v-for="gate in gates" :key="gate" class="gate-chip">{{ gate }}</span>
    </div>

    <div class="circuit-shell">
      <div class="circuit-columns">
        <div v-for="(column, colIndex) in state.columns" :key="colIndex" class="circuit-column">
          <div v-for="(cell, rowIndex) in column" :key="rowIndex" class="gate-slot">
            <span class="gate-slot-label">q{{ rowIndex }}</span>
            <div class="gate-token" :class="{ empty: !cell }">
              {{ cell ?? "" }}
            </div>
          </div>
        </div>
      </div>
      <div class="circuit-legend">
        <span>Time →</span>
      </div>
    </div>

    <div class="snapshot-grid">
      <div v-for="(snapshot, index) in stateSnapshots" :key="index" class="snapshot-card">
        <p class="snapshot-title">{{ index === 0 ? "Prepared" : `After t${index}` }}</p>
        <p v-for="entry in basisProbabilities(snapshot)" :key="entry.basis" class="snapshot-row">
          <span>|{{ entry.basis }}></span>
          <span>{{ formatPercent(entry.probability) }}</span>
        </p>
      </div>
    </div>
  </section>
</template>

<script setup lang="ts">
import type { BasisProbability, GateId, TwoQubitState } from "../types";
import { state, stateSnapshots } from "../state";
import { measurement_distribution } from "../quantum";

const gates: GateId[] = ["I", "X", "H", "S"];

const basisProbabilities = (snapshot: TwoQubitState): BasisProbability[] => measurement_distribution(snapshot);
const formatPercent = (value: number): string => `${(value * 100).toFixed(1)}%`;
</script>
