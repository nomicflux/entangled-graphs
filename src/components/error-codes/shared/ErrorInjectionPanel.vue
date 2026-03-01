<template>
  <section class="panel">
    <div class="panel-header">
      <h2>{{ title }}</h2>
      <p>{{ subtitle }}</p>
    </div>

    <div class="error-code-note">
      <p v-for="line in instructions" :key="line">{{ line }}</p>
    </div>

    <div class="error-code-side-grid">
      <article class="error-code-status">
        <div class="error-code-section-head">
          <h3>Injected Errors</h3>
          <button class="column-btn" type="button" @click="$emit('clear-error')">{{ clearLabel }}</button>
        </div>

        <div class="error-code-preset-row">
          <span v-for="gate in allowedGates" :key="gate" class="error-code-pill error-code-gate-pill">{{ gate }}</span>
        </div>

        <p><strong>Gates:</strong> {{ allowedGates.join(", ") }}</p>
        <p><strong>Current:</strong> {{ currentErrorLabel }}</p>
        <p>{{ statusSummary }}</p>
      </article>
    </div>
  </section>
</template>

<script setup lang="ts">
import type { GateId } from "../../../types";

withDefaults(
  defineProps<{
    title?: string;
    subtitle?: string;
    instructions: readonly string[];
    currentErrorLabel: string;
    statusSummary: string;
    allowedGates: readonly GateId[];
    clearLabel?: string;
  }>(),
  {
    title: "Error Injection",
    subtitle: "Place errors in the Inject errors column.",
    clearLabel: "Clear",
  },
);

defineEmits<{
  (e: "clear-error"): void;
}>();
</script>
