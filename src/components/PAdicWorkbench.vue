<template>
  <main class="panels">
    <PAdicPrepPanel />
    <PAdicCircuitPanel />
    <PAdicMeasurementPanel />
  </main>
</template>

<script setup lang="ts">
import PAdicPrepPanel from "./padic/PAdicPrepPanel.vue";
import PAdicCircuitPanel from "./padic/PAdicCircuitPanel.vue";
import PAdicMeasurementPanel from "./padic/PAdicMeasurementPanel.vue";
</script>
