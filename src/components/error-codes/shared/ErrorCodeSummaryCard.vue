<template>
  <article class="error-code-summary-card" :class="toneClass">
    <p class="error-code-summary-label">{{ label }}</p>
    <p class="error-code-summary-value" :class="{ 'is-mono': mono }">{{ value }}</p>
    <p v-if="detail" class="error-code-summary-detail">{{ detail }}</p>
  </article>
</template>

<script setup lang="ts">
import { computed } from "vue";

const props = withDefaults(
  defineProps<{
    label: string;
    value: string;
    detail?: string;
    tone?: "default" | "good" | "warn";
    mono?: boolean;
  }>(),
  {
    detail: "",
    tone: "default",
    mono: false,
  },
);

const toneClass = computed(() => `tone-${props.tone}`);
</script>
