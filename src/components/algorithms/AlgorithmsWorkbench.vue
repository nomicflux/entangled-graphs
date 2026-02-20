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
    </nav>

    <TeleportationScaffold v-show="selectedAlgorithm === 'teleportation'" />
  </div>
</template>

<script setup lang="ts">
import TeleportationScaffold from "./TeleportationScaffold.vue";

defineProps<{
  selectedAlgorithm: "teleportation";
}>();

defineEmits<{
  (e: "select-algorithm", algorithm: "teleportation"): void;
}>();
</script>
