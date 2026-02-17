<template>
  <div class="bloch-pair" :class="[sizeClass, { animated: props.animated, compact: props.compact }]">
    <div class="bloch-card">
      <div class="bloch-composite">
        <div class="bloch-orb bloch-orb-composite">
          <div class="bloch-orb-axis"></div>
          <div class="bloch-sector-fills" :style="sectorFillStyle(props.pair.length)"></div>

          <div
            v-for="(divider, index) in sectorDividers(props.pair.length)"
            :key="`divider-${index}`"
            class="bloch-sector-divider"
            :style="dividerStyle(divider)"
          ></div>

          <span
            v-for="(_, index) in props.pair"
            :key="`label-${index}`"
            class="bloch-sector-label"
            :style="labelStyle(index, props.pair.length)"
          >
            q{{ index }}
          </span>

          <template v-for="(vector, index) in props.pair" :key="`clouds-${index}`">
            <div class="bloch-zero-cloud" :style="cloudStyle(vector.p0, -1, index, props.pair.length)"></div>
            <div class="bloch-one-cloud" :style="cloudStyle(vector.p1, 1, index, props.pair.length)"></div>
            <div class="bloch-uncertainty-cloud" :style="uncertaintyStyle(vector, index, props.pair.length)"></div>
          </template>
        </div>
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
const orbDiameter = computed(() => (props.size === "sm" ? 58 : 72));

const sectorAngle = (index: number, totalSectors: number): number => {
  const step = (2 * Math.PI) / totalSectors;
  return (-Math.PI / 2) + (index * step) + (step / 2);
};

const sectorDividers = (totalSectors: number): number[] => {
  const step = 360 / totalSectors;
  return Array.from({ length: totalSectors }, (_, index) => (-90 + (index * step)));
};

const dividerStyle = (angleDeg: number) => ({
  transform: `translateX(-50%) rotate(${angleDeg + 90}deg)`,
});

const sectorFillStyle = (totalSectors: number) => {
  const step = 360 / totalSectors;
  const stops = Array.from({ length: totalSectors }, (_, index) => {
    const start = index * step;
    const end = (index + 1) * step;
    const tint = index % 2 === 0 ? "rgba(255, 255, 255, 0.045)" : "rgba(255, 255, 255, 0.018)";
    return `${tint} ${start}deg ${end}deg`;
  });

  return {
    background: `conic-gradient(from -90deg, ${stops.join(", ")})`,
  };
};

const cloudStyle = (probability: number, poleDirection: -1 | 1, index: number, totalSectors: number) => {
  const centerAngle = sectorAngle(index, totalSectors);
  const spread = Math.PI / totalSectors;
  const cloudAngle = centerAngle + (poleDirection * spread * 0.2);
  const radius = (orbDiameter.value * 0.12) + (probability * orbDiameter.value * 0.24);
  const x = Math.cos(cloudAngle) * radius;
  const y = Math.sin(cloudAngle) * radius;
  const sizeScale = orbDiameter.value / totalSectors;
  const diameter = (sizeScale * 0.28) + (probability * sizeScale * 0.36);
  const blur = 3 + ((1 - probability) * 8);

  return {
    width: `${diameter}px`,
    height: `${diameter}px`,
    transform: `translate(-50%, -50%) translate(${x}px, ${y}px)`,
    opacity: `${0.18 + (probability * 0.82)}`,
    filter: `blur(${blur}px)`,
  };
};

const uncertaintyStyle = (vector: BlochVector, index: number, totalSectors: number) => {
  const angle = sectorAngle(index, totalSectors);
  const radius = orbDiameter.value * 0.21;
  const x = Math.cos(angle) * radius;
  const y = Math.sin(angle) * radius;
  const sizeScale = orbDiameter.value / totalSectors;
  const diameter = (sizeScale * 0.34) + (vector.uncertainty * sizeScale * 0.32);
  const scale = 0.72 + (vector.uncertainty * 0.52);

  return {
    width: `${diameter}px`,
    height: `${diameter}px`,
    opacity: `${0.08 + (vector.uncertainty * 0.3)}`,
    transform: `translate(-50%, -50%) translate(${x}px, ${y}px) scale(${scale})`,
  };
};

const labelStyle = (index: number, totalSectors: number) => {
  const angle = sectorAngle(index, totalSectors);
  const radius = (orbDiameter.value / 2) + (props.size === "sm" ? 8 : 11);
  const x = Math.cos(angle) * radius;
  const y = Math.sin(angle) * radius;

  return {
    transform: `translate(-50%, -50%) translate(${x}px, ${y}px)`,
  };
};
</script>
