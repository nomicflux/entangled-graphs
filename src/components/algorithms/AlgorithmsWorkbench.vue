<template>
  <div class="algorithms-workbench">
    <nav class="subtabs" aria-label="Algorithm Views">
      <button
        class="subtab-btn"
        :class="{ active: selectedAlgorithm === 'teleportation' }"
        type="button"
        @click="$emit('select-algorithm', 'teleportation')"
      >
        Teleportation
      </button>
      <button
        class="subtab-btn"
        :class="{ active: selectedAlgorithm === 'deutsch' }"
        type="button"
        @click="$emit('select-algorithm', 'deutsch')"
      >
        Deutsch
      </button>
    </nav>

    <TeleportationScaffold v-show="selectedAlgorithm === 'teleportation'" />
    <DeutschScaffold v-show="selectedAlgorithm === 'deutsch'" />
  </div>
</template>

<script setup lang="ts">
import TeleportationScaffold from "./TeleportationScaffold.vue";
import DeutschScaffold from "./DeutschScaffold.vue";

defineProps<{
  selectedAlgorithm: "teleportation" | "deutsch";
}>();

defineEmits<{
  (e: "select-algorithm", algorithm: "teleportation" | "deutsch"): void;
}>();
</script>
