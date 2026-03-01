<template>
  <div class="error-codes-workbench">
    <nav class="subtabs" aria-label="Error Code Views">
      <button
        class="subtab-btn"
        :class="{ active: selectedErrorCode === 'bit-flip-repetition' }"
        type="button"
        @click="$emit('select-error-code', 'bit-flip-repetition')"
      >
        3-Qubit Bit-Flip
      </button>
      <button
        class="subtab-btn"
        :class="{ active: selectedErrorCode === 'phase-flip-repetition' }"
        type="button"
        @click="$emit('select-error-code', 'phase-flip-repetition')"
      >
        3-Qubit Phase-Flip
      </button>
      <button
        class="subtab-btn"
        :class="{ active: selectedErrorCode === 'shor-nine-qubit' }"
        type="button"
        @click="$emit('select-error-code', 'shor-nine-qubit')"
      >
        Shor 9-Qubit
      </button>
    </nav>

    <BitFlipRepetitionScaffold v-show="selectedErrorCode === 'bit-flip-repetition'" />
    <PhaseFlipRepetitionScaffold v-show="selectedErrorCode === 'phase-flip-repetition'" />
    <ShorNineQubitScaffold v-show="selectedErrorCode === 'shor-nine-qubit'" />
  </div>
</template>

<script setup lang="ts">
import BitFlipRepetitionScaffold from "./bit-flip/BitFlipRepetitionScaffold.vue";
import PhaseFlipRepetitionScaffold from "./phase-flip/PhaseFlipRepetitionScaffold.vue";
import ShorNineQubitScaffold from "./shor/ShorNineQubitScaffold.vue";

defineProps<{
  selectedErrorCode: "bit-flip-repetition" | "phase-flip-repetition" | "shor-nine-qubit";
}>();

defineEmits<{
  (e: "select-error-code", errorCode: "bit-flip-repetition" | "phase-flip-repetition" | "shor-nine-qubit"): void;
}>();
</script>
