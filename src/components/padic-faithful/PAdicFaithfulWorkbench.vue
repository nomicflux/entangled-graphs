<template>
  <main class="panels padic-faithful-panels">
    <PAdicStageCards />
    <PAdicRhoPanel />
    <PAdicSovmPanel />
    <PAdicOutputsPanel />
    <PAdicOutcomeInspector />
    <PAdicDerivedMap />
  </main>
</template>

<script setup lang="ts">
import PAdicDerivedMap from "./PAdicDerivedMap.vue";
import PAdicOutcomeInspector from "./PAdicOutcomeInspector.vue";
import PAdicOutputsPanel from "./PAdicOutputsPanel.vue";
import PAdicRhoPanel from "./PAdicRhoPanel.vue";
import PAdicSovmPanel from "./PAdicSovmPanel.vue";
import PAdicStageCards from "./PAdicStageCards.vue";
</script>
