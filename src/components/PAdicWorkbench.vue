<template>
  <main class="panels">
    <PAdicPrepPanel />

    <section class="panel panel-center">
      <div class="panel-header">
        <h2>Quantum Circuit</h2>
        <p>p-adic circuit builder wiring is scheduled for Phase 4.</p>
      </div>
    </section>

    <section class="panel">
      <div class="panel-header">
        <h2>Measurement</h2>
        <p>p-adic simulation and measurement wiring is scheduled for Phase 5.</p>
      </div>
    </section>
  </main>
</template>

<script setup lang="ts">
import PAdicPrepPanel from "./padic/PAdicPrepPanel.vue";
</script>
