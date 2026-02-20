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

type WorkspaceMode = "free-form" | "algorithms";
type AlgorithmView = "teleportation";

const WORKSPACE_STORAGE_KEY = "entangled.workspace.mode";
const ALGORITHM_STORAGE_KEY = "entangled.algorithms.selected";

const readWorkspace = (): WorkspaceMode => {
  const saved = window.localStorage.getItem(WORKSPACE_STORAGE_KEY);
  return saved === "algorithms" ? "algorithms" : "free-form";
};

const readAlgorithm = (): AlgorithmView => {
  const saved = window.localStorage.getItem(ALGORITHM_STORAGE_KEY);
  return saved === "teleportation" ? "teleportation" : "teleportation";
};

const selectedWorkspace = ref<WorkspaceMode>(readWorkspace());
const selectedAlgorithm = ref<AlgorithmView>(readAlgorithm());

watch(selectedWorkspace, (value) => {
  window.localStorage.setItem(WORKSPACE_STORAGE_KEY, value);
});

watch(selectedAlgorithm, (value) => {
  window.localStorage.setItem(ALGORITHM_STORAGE_KEY, value);
});
</script>
