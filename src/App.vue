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
        :class="{ active: selectedWorkspace === 'p-adic' }"
        type="button"
        @click="selectedWorkspace = 'p-adic'"
      >
        p-adic
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
    <PAdicWorkbench v-show="selectedWorkspace === 'p-adic'" />
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
import PAdicWorkbench from "./components/PAdicWorkbench.vue";
import AlgorithmsWorkbench from "./components/algorithms/AlgorithmsWorkbench.vue";
import {
  readPAdicGeometryModeFromStorage,
  readPAdicMeasurementModelFromStorage,
  readPAdicPrimeFromStorage,
  readPAdicQubitCountFromStorage,
  readPAdicSelectedBasisFromStorage,
  readAlgorithmFromStorage,
  readWorkspaceFromStorage,
  writePAdicGeometryModeToStorage,
  writePAdicMeasurementModelToStorage,
  writePAdicPrimeToStorage,
  writePAdicQubitCountToStorage,
  writePAdicSelectedBasisToStorage,
  writeAlgorithmToStorage,
  writeWorkspaceToStorage,
} from "./app/persistence";
import { resetPAdicWorkspaceState, state } from "./state";

const selectedWorkspace = ref(readWorkspaceFromStorage(window.localStorage));
const selectedAlgorithm = ref(readAlgorithmFromStorage(window.localStorage));
resetPAdicWorkspaceState(
  readPAdicPrimeFromStorage(window.localStorage),
  readPAdicMeasurementModelFromStorage(window.localStorage),
  readPAdicGeometryModeFromStorage(window.localStorage),
  readPAdicQubitCountFromStorage(window.localStorage),
  readPAdicSelectedBasisFromStorage(window.localStorage),
);

watch(selectedWorkspace, (value) => {
  writeWorkspaceToStorage(window.localStorage, value);
});

watch(selectedAlgorithm, (value) => {
  writeAlgorithmToStorage(window.localStorage, value);
});

watch(
  () => state.pAdic.prime,
  (value) => {
    writePAdicPrimeToStorage(window.localStorage, value);
  },
);

watch(
  () => state.pAdic.measurementModel,
  (value) => {
    writePAdicMeasurementModelToStorage(window.localStorage, value);
  },
);

watch(
  () => state.pAdic.qubitCount,
  (value) => {
    writePAdicQubitCountToStorage(window.localStorage, value);
  },
);

watch(
  () => state.pAdic.geometryMode,
  (value) => {
    writePAdicGeometryModeToStorage(window.localStorage, value);
  },
);

watch(
  () => state.pAdic.selectedBasis,
  (value) => {
    writePAdicSelectedBasisToStorage(window.localStorage, value);
  },
);
</script>
