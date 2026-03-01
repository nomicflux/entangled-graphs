<template>
  <section class="panel">
    <div class="panel-header">
      <h2>{{ title }}</h2>
      <p>{{ subtitle }}</p>
    </div>

    <div class="error-code-source-grid">
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

      <div class="error-code-note">
        <p><strong>State:</strong> {{ activePreset.label }}</p>
        <p>{{ activePreset.description }}</p>
        <p v-if="note">{{ note }}</p>
      </div>
    </div>
  </section>
</template>

<script setup lang="ts">
import { computed } from "vue";
import type { LogicalPresetId } from "./logical-presets";
import { LOGICAL_PRESETS, logicalPresetById } from "./logical-presets";

const props = withDefaults(
  defineProps<{
    title?: string;
    subtitle?: string;
    selectedPreset: LogicalPresetId;
    note?: string;
  }>(),
  {
    title: "Input",
    subtitle: "Choose the logical input state.",
    note: "",
  },
);

defineEmits<{
  (e: "select-preset", preset: LogicalPresetId): void;
}>();

const presets = LOGICAL_PRESETS;
const activePreset = computed(() => logicalPresetById(props.selectedPreset));
</script>
