<template>
  <section class="panel panel-center">
    <div class="panel-header">
      <h2>Quantum Circuit</h2>
      <p>Drag gates into time-step columns (interaction lands in Phase 3).</p>
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
  </section>
</template>

<script setup lang="ts">
import { state } from "../state";

const gates = ["I", "X", "H", "S"];
</script>
