<template>
  <main class="panels padic-faithful-panels">
    <section class="padic-faithful-column padic-faithful-column-left">
      <PAdicGeneralInputPanel />
      <PAdicRhoPanel />
    </section>

    <section class="padic-faithful-column padic-faithful-column-center">
      <PAdicCircuitPanel />
      <PAdicStageCards />
      <PAdicDerivedMap />
    </section>

    <section class="padic-faithful-column padic-faithful-column-right">
      <PAdicOutputsPanel />
      <PAdicOutcomeInspector />
      <PAdicSovmPanel />
    </section>
  </main>
</template>

<script setup lang="ts">
import PAdicDerivedMap from "./PAdicDerivedMap.vue";
import PAdicGeneralInputPanel from "./PAdicGeneralInputPanel.vue";
import PAdicCircuitPanel from "./PAdicCircuitPanel.vue";
import PAdicOutcomeInspector from "./PAdicOutcomeInspector.vue";
import PAdicOutputsPanel from "./PAdicOutputsPanel.vue";
import PAdicRhoPanel from "./PAdicRhoPanel.vue";
import PAdicSovmPanel from "./PAdicSovmPanel.vue";
import PAdicStageCards from "./PAdicStageCards.vue";
</script>
