<template>
  <main class="panels">
    <PAdicPrepPanel />
    <PAdicCircuitPanel />

    <section class="panel">
      <div class="panel-header">
        <h2>Measurement</h2>
        <p>Select the p-adic measurement model. Simulation wiring lands in Phase 5.</p>
      </div>

      <div class="measurement-card">
        <label class="qubit-count-field">
          Measurement Model
          <select :value="state.pAdic.measurementModel" @change="handleMeasurementModel">
            <option v-for="model in PADIC_MEASUREMENT_MODELS" :key="model" :value="model">
              {{ model }}
            </option>
          </select>
        </label>
      </div>
    </section>
  </main>
</template>

<script setup lang="ts">
import { PADIC_MEASUREMENT_MODELS } from "../padic-config";
import { setPAdicMeasurementModel, state } from "../state";
import PAdicPrepPanel from "./padic/PAdicPrepPanel.vue";
import PAdicCircuitPanel from "./padic/PAdicCircuitPanel.vue";

const handleMeasurementModel = (event: Event) => {
  const target = event.target as HTMLSelectElement;
  setPAdicMeasurementModel(target.value);
};
</script>
