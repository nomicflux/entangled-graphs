<template>
  <div class="free-form-workbench">
    <nav class="subtabs" aria-label="Free-Form Views">
      <button
        class="subtab-btn"
        :class="{ active: selectedSection === 'pure' }"
        type="button"
        @click="selectedSection = 'pure'"
      >
        Pure States
      </button>
      <button
        class="subtab-btn"
        :class="{ active: selectedSection === 'mixed' }"
        type="button"
        @click="selectedSection = 'mixed'"
      >
        Density Matrices
      </button>
    </nav>

    <PureFreeFormWorkbench v-show="selectedSection === 'pure'" />
    <MixedStateWorkbench v-show="selectedSection === 'mixed'" />
  </div>
</template>

<script setup lang="ts">
import { ref, watch } from "vue";
import PureFreeFormWorkbench from "./PureFreeFormWorkbench.vue";
import MixedStateWorkbench from "./mixed-state/MixedStateWorkbench.vue";
import {
  readFreeFormSectionFromStorage,
  writeFreeFormSectionToStorage,
  type FreeFormSection,
} from "../app/persistence";

const selectedSection = ref<FreeFormSection>(readFreeFormSectionFromStorage(window.localStorage));

watch(selectedSection, (value) => {
  writeFreeFormSectionToStorage(window.localStorage, value);
});
</script>
