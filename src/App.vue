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
        v-if="isPadicWorkspaceEnabled"
        class="top-tab-btn"
        :class="{ active: selectedWorkspace === 'p-adic' }"
        type="button"
        @click="selectedWorkspace = 'p-adic'"
      >
        p-adic (experimental)
      </button>
      <button
        class="top-tab-btn"
        :class="{ active: selectedWorkspace === 'algorithms' }"
        type="button"
        @click="selectedWorkspace = 'algorithms'"
      >
        Algorithms
      </button>
      <button
        class="top-tab-btn"
        :class="{ active: selectedWorkspace === 'abstractions' }"
        type="button"
        @click="selectedWorkspace = 'abstractions'"
      >
        Abstractions
      </button>
      <button
        class="top-tab-btn"
        :class="{ active: selectedWorkspace === 'error-codes' }"
        type="button"
        @click="selectedWorkspace = 'error-codes'"
      >
        Error Codes
      </button>
    </nav>

    <FreeFormWorkbench v-show="selectedWorkspace === 'free-form'" />
    <PAdicFaithfulWorkbench v-if="isPadicWorkspaceEnabled && selectedWorkspace === 'p-adic'" />
    <AlgorithmsWorkbench
      v-show="selectedWorkspace === 'algorithms'"
      :selected-algorithm="selectedAlgorithm"
      @select-algorithm="selectedAlgorithm = $event"
    />
    <AbstractionsWorkbench
      v-show="selectedWorkspace === 'abstractions'"
      :selected-abstraction="selectedAbstraction"
      @select-abstraction="selectedAbstraction = $event"
    />
    <ErrorCodesWorkbench
      v-show="selectedWorkspace === 'error-codes'"
      :selected-error-code="selectedErrorCode"
      @select-error-code="selectedErrorCode = $event"
    />
  </div>
</template>

<script setup lang="ts">
import { ref, watch } from "vue";
import type { WorkspaceMode } from "./app/persistence";
import FreeFormWorkbench from "./components/FreeFormWorkbench.vue";
import PAdicFaithfulWorkbench from "./components/padic-faithful/PAdicFaithfulWorkbench.vue";
import AlgorithmsWorkbench from "./components/algorithms/AlgorithmsWorkbench.vue";
import AbstractionsWorkbench from "./components/abstractions/AbstractionsWorkbench.vue";
import ErrorCodesWorkbench from "./components/error-codes/ErrorCodesWorkbench.vue";
import {
  readAbstractionFromStorage,
  readAlgorithmFromStorage,
  readErrorCodeFromStorage,
  readWorkspaceFromStorage,
  writeAbstractionToStorage,
  writeAlgorithmToStorage,
  writeErrorCodeToStorage,
  writeWorkspaceToStorage,
} from "./app/persistence";
import { isPadicWorkspaceEnabledFromSearch } from "./app/padic-access";

const isPadicWorkspaceEnabled = isPadicWorkspaceEnabledFromSearch(window.location.search);
const storedWorkspace = readWorkspaceFromStorage(window.localStorage);
const initialWorkspace: WorkspaceMode =
  !isPadicWorkspaceEnabled && storedWorkspace === "p-adic" ? "free-form" : storedWorkspace;

const selectedWorkspace = ref(initialWorkspace);
const selectedAlgorithm = ref(readAlgorithmFromStorage(window.localStorage));
const selectedAbstraction = ref(readAbstractionFromStorage(window.localStorage));
const selectedErrorCode = ref(readErrorCodeFromStorage(window.localStorage));

watch(selectedWorkspace, (value) => {
  writeWorkspaceToStorage(window.localStorage, value);
});

watch(selectedAlgorithm, (value) => {
  writeAlgorithmToStorage(window.localStorage, value);
});

watch(selectedAbstraction, (value) => {
  writeAbstractionToStorage(window.localStorage, value);
});

watch(selectedErrorCode, (value) => {
  writeErrorCodeToStorage(window.localStorage, value);
});
</script>
