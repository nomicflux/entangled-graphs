<template>
  <div class="app">
    <header class="app-header">
      <div>
        <p class="kicker">Entangled Graphs</p>
        <h1>Qubit Workshop</h1>
        <p class="subtitle">Prepare an N-qubit state, build a circuit, then measure.</p>
      </div>
    </header>

    <nav class="top-tabs" aria-label="Workspaces">
      <button
        class="top-tab-btn"
        :class="{ active: selectedWorkspace === 'free-form' }"
        type="button"
        @click="selectedWorkspace = 'free-form'"
      >
        Free-Form
      </button>
      <button
        class="top-tab-btn"
        :class="{ active: selectedWorkspace === 'algorithms' }"
        type="button"
        @click="selectedWorkspace = 'algorithms'"
      >
        Algorithms
      </button>
    </nav>

    <FreeFormWorkbench v-show="selectedWorkspace === 'free-form'" />
    <AlgorithmsWorkbench
      v-show="selectedWorkspace === 'algorithms'"
      :selected-algorithm="selectedAlgorithm"
      @select-algorithm="selectedAlgorithm = $event"
    />
  </div>
</template>

<script setup lang="ts">
import { ref, watch } from "vue";
import FreeFormWorkbench from "./components/FreeFormWorkbench.vue";
import AlgorithmsWorkbench from "./components/algorithms/AlgorithmsWorkbench.vue";
import {
  readAlgorithmFromStorage,
  readWorkspaceFromStorage,
  writeAlgorithmToStorage,
  writeWorkspaceToStorage,
} from "./app/persistence";

const selectedWorkspace = ref(readWorkspaceFromStorage(window.localStorage));
const selectedAlgorithm = ref(readAlgorithmFromStorage(window.localStorage));

watch(selectedWorkspace, (value) => {
  writeWorkspaceToStorage(window.localStorage, value);
});

watch(selectedAlgorithm, (value) => {
  writeAlgorithmToStorage(window.localStorage, value);
});
</script>
