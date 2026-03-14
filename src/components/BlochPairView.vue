<template>
  <div class="bloch-pair" :class="[sizeClass, { animated: props.animated, compact: props.compact }]">
    <div class="bloch-pair-grid">
      <div v-for="(vector, index) in props.pair" :key="`sphere-${index}`" class="bloch-sphere-card">
        <BlochSphereGlyph
          :vector="vector"
          :label="`q${index}`"
          :animated="props.animated"
          :compact="props.compact"
          :size="props.size"
        />
        <div class="bloch-sphere-meta">
          <span class="bloch-sphere-label">q{{ index }}</span>
          <span v-if="!props.compact" class="bloch-sphere-certainty">{{ certaintyLabel(vector.certainty) }}</span>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from "vue";
import type { BlochPair } from "../types";
import BlochSphereGlyph from "./BlochSphereGlyph.vue";

const props = withDefaults(
  defineProps<{
    pair: BlochPair;
    animated?: boolean;
    compact?: boolean;
    size?: "sm" | "md";
  }>(),
  {
    animated: true,
    compact: false,
    size: "md",
  },
);

const sizeClass = computed(() => `size-${props.size}`);
const certaintyLabel = (certainty: number): string => `${Math.round(certainty * 100)}% pure`;
</script>
