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
            <div class="bloch-phase-indicator" :style="phaseIndicatorStyle(vector, index, props.pair.length)"></div>
            <div class="bloch-zero-cloud" :style="cloudStyle(vector, vector.p0, -1, index, props.pair.length, 'zero')"></div>
            <div class="bloch-one-cloud" :style="cloudStyle(vector, vector.p1, 1, index, props.pair.length, 'one')"></div>
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

const phaseAngle = (vector: BlochVector): number => Math.atan2(vector.y, vector.x);

type PhasePaletteRole = "zero" | "one" | "indicator";

const phasePalette = (phase: number, role: PhasePaletteRole): { core: string; mid: string; outer: string; glow: string } => {
  const isNegative = phase < 0;
  if (isNegative) {
    if (role === "zero") {
      return {
        core: "rgba(255, 179, 92, 1)",
        mid: "rgba(255, 179, 92, 0.76)",
        outer: "rgba(255, 179, 92, 0.34)",
        glow: "rgba(255, 179, 92, 0.48)",
      };
    }
    if (role === "one") {
      return {
        core: "rgba(124, 186, 255, 1)",
        mid: "rgba(124, 186, 255, 0.76)",
        outer: "rgba(124, 186, 255, 0.34)",
        glow: "rgba(124, 186, 255, 0.48)",
      };
    }
    return {
      core: "rgba(255, 200, 130, 0.96)",
      mid: "rgba(255, 200, 130, 0.66)",
      outer: "rgba(255, 200, 130, 0.3)",
      glow: "rgba(255, 200, 130, 0.5)",
    };
  }

  if (role === "zero") {
    return {
      core: "rgba(102, 245, 214, 1)",
      mid: "rgba(102, 245, 214, 0.76)",
      outer: "rgba(102, 245, 214, 0.34)",
      glow: "rgba(102, 245, 214, 0.48)",
    };
  }
  if (role === "one") {
    return {
      core: "rgba(252, 165, 255, 1)",
      mid: "rgba(252, 165, 255, 0.76)",
      outer: "rgba(252, 165, 255, 0.34)",
      glow: "rgba(252, 165, 255, 0.48)",
    };
  }
  return {
    core: "rgba(166, 216, 255, 0.96)",
    mid: "rgba(166, 216, 255, 0.66)",
    outer: "rgba(166, 216, 255, 0.3)",
    glow: "rgba(166, 216, 255, 0.5)",
  };
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

const cloudStyle = (
  vector: BlochVector,
  probability: number,
  poleDirection: -1 | 1,
  index: number,
  totalSectors: number,
  role: "zero" | "one",
) => {
  const centerAngle = sectorAngle(index, totalSectors);
  const phase = phaseAngle(vector);
  const sectorSpan = (2 * Math.PI) / totalSectors;
  const phaseOffset = (phase / Math.PI) * (sectorSpan * 0.36);
  const emphasis = Math.pow(probability, 0.65);
  const contrast = Math.pow(probability, 1.35);
  const radius = (orbDiameter.value * 0.12) + (emphasis * orbDiameter.value * 0.27);
  const tangentOffset = poleDirection * ((orbDiameter.value * 0.11) / Math.sqrt(totalSectors));
  const cloudAngle = centerAngle + phaseOffset;
  const radialX = Math.cos(cloudAngle) * radius;
  const radialY = Math.sin(cloudAngle) * radius;
  const tangentX = -Math.sin(cloudAngle) * tangentOffset;
  const tangentY = Math.cos(cloudAngle) * tangentOffset;
  const x = radialX + tangentX;
  const y = radialY + tangentY;
  const sizeScale = orbDiameter.value / totalSectors;
  const minDiameter = Math.max(3.5, sizeScale * 0.42);
  const maxDiameterBoost = Math.min(16, Math.max(7, (orbDiameter.value * 0.52) / Math.sqrt(totalSectors)));
  const diameter = minDiameter + (contrast * maxDiameterBoost);
  const blur = 0.8 + ((1 - emphasis) * 3.2);
  const palette = phasePalette(phase, role);

  return {
    width: `${diameter}px`,
    height: `${diameter}px`,
    transform: `translate(-50%, -50%) translate(${x}px, ${y}px)`,
    opacity: `${0.16 + (emphasis * 0.84)}`,
    filter: `blur(${blur}px)`,
    "--cloud-core": palette.core,
    "--cloud-mid": palette.mid,
    "--cloud-outer": palette.outer,
    "--cloud-glow": palette.glow,
  };
};

const phaseIndicatorStyle = (vector: BlochVector, index: number, totalSectors: number) => {
  const centerAngle = sectorAngle(index, totalSectors);
  const phase = phaseAngle(vector);
  const coherence = Math.hypot(vector.x, vector.y);
  const sectorSpan = (2 * Math.PI) / totalSectors;
  const phaseOffset = (phase / Math.PI) * (sectorSpan * 0.36);
  const cloudAngle = centerAngle + phaseOffset;
  const anchorRadius = (orbDiameter.value * 0.14) + (coherence * orbDiameter.value * 0.1);
  const length = (orbDiameter.value * 0.07) + (coherence * orbDiameter.value * 0.12);
  const x = Math.cos(cloudAngle) * anchorRadius;
  const y = Math.sin(cloudAngle) * anchorRadius;
  const palette = phasePalette(phase, "indicator");

  return {
    width: `${length}px`,
    transform: `translate(-50%, -50%) translate(${x}px, ${y}px) rotate(${(cloudAngle * 180) / Math.PI}deg)`,
    opacity: `${0.3 + (coherence * 0.65)}`,
    background: `linear-gradient(90deg, ${palette.mid}, ${palette.core})`,
    boxShadow: `0 0 8px ${palette.glow}`,
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
    opacity: `${0.05 + (vector.uncertainty * 0.16)}`,
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
