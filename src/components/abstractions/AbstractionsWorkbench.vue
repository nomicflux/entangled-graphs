<template>
  <div class="abstractions-workbench">
    <nav class="subtabs" aria-label="Abstraction Views">
      <button
        class="subtab-btn"
        :class="{ active: selectedAbstraction === 'preparing-qubits' }"
        type="button"
        @click="$emit('select-abstraction', 'preparing-qubits')"
      >
        Preparing Qubits
      </button>
      <button
        class="subtab-btn"
        :class="{ active: selectedAbstraction === 'entanglement' }"
        type="button"
        @click="$emit('select-abstraction', 'entanglement')"
      >
        Entanglement
      </button>
      <button
        class="subtab-btn"
        :class="{ active: selectedAbstraction === 'phase-kickback' }"
        type="button"
        @click="$emit('select-abstraction', 'phase-kickback')"
      >
        Phase Kickback
      </button>
    </nav>

    <PreparingQubitsScaffold v-show="selectedAbstraction === 'preparing-qubits'" />
    <EntanglementScaffold v-show="selectedAbstraction === 'entanglement'" />
    <PhaseKickbackScaffold v-show="selectedAbstraction === 'phase-kickback'" />
  </div>
</template>

<script setup lang="ts">
import EntanglementScaffold from "./EntanglementScaffold.vue";
import PhaseKickbackScaffold from "./PhaseKickbackScaffold.vue";
import PreparingQubitsScaffold from "./PreparingQubitsScaffold.vue";

defineProps<{
  selectedAbstraction: "preparing-qubits" | "entanglement" | "phase-kickback";
}>();

defineEmits<{
  (e: "select-abstraction", abstraction: "preparing-qubits" | "entanglement" | "phase-kickback"): void;
}>();
</script>
