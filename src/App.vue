<template>
  <div class="app">
    <header class="app-header">
      <div>
        <p class="kicker">Entangled Graphs</p>
        <h1>Qubit Workshop</h1>
        <p class="subtitle">Prepare a two-qubit state, build a circuit, then measure.</p>
      </div>
      <div class="status">
        <span class="status-pill">Phase 5: CNOT</span>
      </div>
    </header>

    <main class="panels">
      <PrepPanel />
      <CircuitPanel />
      <MeasurementPanel />
    </main>
  </div>
</template>

<script setup lang="ts">
import PrepPanel from "./components/PrepPanel.vue";
import CircuitPanel from "./components/CircuitPanel.vue";
import MeasurementPanel from "./components/MeasurementPanel.vue";
</script>
