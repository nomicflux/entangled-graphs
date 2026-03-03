<template>
  <div class="density-stage-view" :class="[sizeClass, { compact: props.compact, animated: props.animated }]">
    <div class="density-stage-surface">
      <svg
        v-if="props.model.qubits.length > 1"
        class="density-correlation-map"
        viewBox="0 0 100 36"
        preserveAspectRatio="none"
        aria-hidden="true"
      >
        <rect
          v-for="(group, index) in groupBands"
          :key="`group-${index}`"
          class="density-correlation-band"
          :x="group.x"
          :y="group.y"
          :width="group.width"
          :height="group.height"
          :rx="group.rx"
        />
        <path
          v-for="overlay in visibleCorrelations"
          :key="`${overlay.fromRow}-${overlay.toRow}`"
          class="density-correlation-arc"
          :d="correlationArcPath(overlay)"
          :style="correlationArcStyle(overlay)"
        />
      </svg>

      <div class="density-cloud-row">
        <div v-for="(vector, index) in props.model.qubits" :key="index" class="density-cloud-card">
          <div class="density-cloud-orb">
            <div class="density-cloud-shell" :style="radiusStyle(vector)"></div>
            <div class="density-cloud-haze" :style="hazeStyle(vector)"></div>
            <div class="density-cloud-pole north" :style="poleStyle(vector.p0)"></div>
            <div class="density-cloud-pole south" :style="poleStyle(vector.p1)"></div>
            <div v-if="vector.coherencePhase !== null" class="density-phase-ray" :style="phaseRayStyle(vector)"></div>
            <div class="density-cloud-core" :style="centroidStyle(vector)"></div>
          </div>
          <span class="density-cloud-label">q{{ index }}</span>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from "vue";
import type { DensityCloudVector, DensityStageVisualModel, PairCorrelationOverlay } from "../../types";

const props = withDefaults(
  defineProps<{
    model: DensityStageVisualModel;
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
const orbDiameter = computed(() => (props.size === "sm" ? 54 : 74));

const xForRow = (row: number): number => {
  const total = props.model.qubits.length;
  return ((row + 0.5) / total) * 100;
};

const yForRow = (row: number): number => 18;

const visibleCorrelations = computed(() => props.model.pairCorrelations.filter((overlay) => overlay.strength > 0.02));

const groupBands = computed(() =>
  props.model.correlationGroups.map((group) => {
    const min = Math.min(...group);
    const max = Math.max(...group);
    const start = xForRow(min) - 8;
    const end = xForRow(max) + 8;

    return {
      x: Math.max(0, start),
      y: 8,
      width: Math.min(100, end) - Math.max(0, start),
      height: 20,
      rx: 10,
    };
  }),
);

const centroidStyle = (vector: DensityCloudVector) => {
  const distance = orbDiameter.value * 0.22;
  return {
    transform: `translate(-50%, -50%) translate(${vector.x * distance}px, ${-vector.z * distance}px)`,
    opacity: `${0.3 + vector.radius * 0.7}`,
  };
};

const radiusStyle = (vector: DensityCloudVector) => {
  const scale = 0.44 + vector.radius * 0.52;
  return {
    transform: `translate(-50%, -50%) scale(${scale})`,
    opacity: `${0.18 + vector.radius * 0.72}`,
  };
};

const hazeStyle = (vector: DensityCloudVector) => {
  const mixedness = Math.max(0, 1 - vector.purity);
  const scale = 0.82 + mixedness * 0.5;
  return {
    opacity: `${0.08 + mixedness * 0.34}`,
    transform: `translate(-50%, -50%) scale(${scale})`,
  };
};

const poleStyle = (probability: number) => ({
  opacity: `${0.12 + probability * 0.88}`,
});

const phaseRayStyle = (vector: DensityCloudVector) => {
  const length = (orbDiameter.value * 0.12) + (vector.coherenceMagnitude * orbDiameter.value * 0.22);
  return {
    width: `${length}px`,
    opacity: `${0.15 + vector.coherenceMagnitude * 0.85}`,
    transform: `translate(-50%, -50%) rotate(${((vector.coherencePhase ?? 0) * 180) / Math.PI}deg)`,
  };
};

const correlationArcPath = (overlay: PairCorrelationOverlay): string => {
  const x1 = xForRow(overlay.fromRow);
  const x2 = xForRow(overlay.toRow);
  const y = yForRow(overlay.fromRow);
  const distance = Math.abs(x2 - x1);
  const controlY = Math.max(1.5, y - (9 + distance * 0.18));
  return `M ${x1} ${y} C ${x1} ${controlY}, ${x2} ${controlY}, ${x2} ${y}`;
};

const correlationColor = (overlay: PairCorrelationOverlay): string => {
  if (overlay.dominantChannel === "same-parity") {
    return "rgba(102, 245, 214, 0.9)";
  }
  if (overlay.dominantChannel === "opposite-parity") {
    return "rgba(252, 165, 255, 0.9)";
  }
  return "rgba(255, 196, 122, 0.9)";
};

const correlationArcStyle = (overlay: PairCorrelationOverlay) => ({
  stroke: correlationColor(overlay),
  strokeWidth: `${0.8 + overlay.strength * 2.6}`,
  opacity: `${0.18 + overlay.strength * 0.82}`,
});
</script>
