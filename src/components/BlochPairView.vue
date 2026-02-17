<template>
  <div class="bloch-pair" :class="[sizeClass, { animated: props.animated, compact: props.compact }]">
    <div v-for="(vector, index) in props.pair" :key="index" class="bloch-card">
      <p class="bloch-card-title">q{{ index }}</p>
      <div class="bloch-orb">
        <div class="bloch-orb-axis"></div>
        <div class="bloch-zero-cloud" :style="cloudStyle(vector.p0, -1)"></div>
        <div class="bloch-one-cloud" :style="cloudStyle(vector.p1, 1)"></div>
        <div class="bloch-uncertainty-cloud" :style="uncertaintyStyle(vector)"></div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from "vue";
import type { BlochPair, BlochVector } from "../types";

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
const radius = computed(() => (props.size === "sm" ? 18 : 24));

const cloudStyle = (probability: number, poleDirection: -1 | 1) => {
  const min = props.size === "sm" ? 14 : 18;
  const maxGrow = props.size === "sm" ? 16 : 22;
  const diameter = min + (probability * maxGrow);
  const offset = poleDirection * radius.value * 0.56;
  const blur = 3 + ((1 - probability) * 8);
  return {
    width: `${diameter}px`,
    height: `${diameter}px`,
    transform: `translate(-50%, -50%) translateY(${offset}px)`,
    opacity: `${0.18 + (probability * 0.82)}`,
    filter: `blur(${blur}px)`,
  };
};

const uncertaintyStyle = (vector: BlochVector) => ({
  opacity: `${0.08 + (vector.uncertainty * 0.3)}`,
  transform: `translate(-50%, -50%) scale(${0.7 + (vector.uncertainty * 0.6)})`,
});

</script>
