<template>
  <section class="panel">
    <div class="panel-header">
      <h2>{{ title }}</h2>
      <p>{{ subtitle }}</p>
    </div>

    <div class="error-code-preset-row">
      <button
        v-for="preset in presets"
        :key="preset.id"
        class="error-code-preset-btn"
        :class="{ active: selectedPreset === preset.id }"
        type="button"
        @click="$emit('select-preset', preset.id)"
      >
        {{ preset.label }}
      </button>
    </div>
  </section>
</template>

<script setup lang="ts">
import type { LogicalPresetId } from "./logical-presets";
import { LOGICAL_PRESETS } from "./logical-presets";

const props = withDefaults(
  defineProps<{
    title?: string;
    subtitle?: string;
    selectedPreset: LogicalPresetId;
  }>(),
  {
    title: "Input",
    subtitle: "Choose the logical input state.",
  },
);

defineEmits<{
  (e: "select-preset", preset: LogicalPresetId): void;
}>();

const presets = LOGICAL_PRESETS;
</script>
