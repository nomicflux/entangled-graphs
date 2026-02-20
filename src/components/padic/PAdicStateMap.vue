<template>
  <section class="padic-state-map">
    <div class="padic-state-map-head">
      <h3>p-adic State Map</h3>
      <p>{{ stageLabel }} • {{ geometryModeLabel }} • p={{ prime }}</p>
    </div>

    <svg class="padic-map-svg" viewBox="0 0 100 100" role="img" aria-label="p-adic state map">
      <defs>
        <radialGradient id="padic-map-bg" cx="50%" cy="50%" r="65%">
          <stop offset="0%" stop-color="rgba(102, 245, 214, 0.1)" />
          <stop offset="100%" stop-color="rgba(7, 12, 26, 0.05)" />
        </radialGradient>
      </defs>
      <rect x="0" y="0" width="100" height="100" fill="url(#padic-map-bg)" />
      <circle cx="50" cy="50" r="43" class="padic-map-ring" />
      <circle cx="50" cy="50" r="30" class="padic-map-ring" />
      <circle cx="50" cy="50" r="16" class="padic-map-ring" />
      <template v-if="geometryMode === 'valuation_ring'">
        <line
          v-for="residue in residueAngles"
          :key="`residue-axis-${residue.residue}`"
          class="padic-map-residue-axis"
          :x1="50"
          :y1="50"
          :x2="xFor(Math.cos(residue.angle) * 0.96)"
          :y2="yFor(Math.sin(residue.angle) * 0.96)"
        />
        <text
          v-for="residue in residueAngles"
          :key="`residue-label-${residue.residue}`"
          class="padic-map-residue-label"
          :x="xFor(Math.cos(residue.angle) * 1.06)"
          :y="yFor(Math.sin(residue.angle) * 1.06)"
        >
          r{{ residue.residue }}
        </text>
      </template>

      <line
        v-for="edge in transitions"
        :key="`edge-${edge.basis}`"
        class="padic-map-edge"
        :x1="xFor(edge.from.x)"
        :y1="yFor(edge.from.y)"
        :x2="xFor(edge.to.x)"
        :y2="yFor(edge.to.y)"
        :style="edgeStyle(edge.weight, edge.delta)"
      >
        <title>
          {{ edge.basis }}: Δw_p={{ edge.delta.toFixed(4) }}
        </title>
      </line>

      <g v-for="node in nodes" :key="`node-${node.basis}`" class="padic-map-node" @click="emitSelect(node.basis)">
        <circle
          :cx="xFor(node.point.x)"
          :cy="yFor(node.point.y)"
          :r="nodeRadius(node.weight)"
          :class="{ selected: selectedBasis === node.basis }"
          :style="nodeStyle(node.weight, node.norm)"
        >
          <title>
            |{{ node.basis }}>: w_p={{ node.weight.toFixed(4) }}, v_p={{ formatValuation(node.valuation) }},
            residue={{ node.residue }}, digits={{ node.digits.join(' ') }}
          </title>
        </circle>
        <text
          :x="xFor(node.point.x)"
          :y="yFor(node.point.y) + 0.55"
          class="padic-map-label"
          :class="{ selected: selectedBasis === node.basis }"
        >
          {{ node.basis }}
        </text>
      </g>
    </svg>

    <div v-if="geometryMode === 'valuation_ring'" class="padic-map-legend">
      <p>
        <strong>Valuation-Ring:</strong> radius encodes valuation-derived norm, angle encodes residue class mod p.
      </p>
      <p class="muted">
        Rings shown for the current stage: {{ valuationSummary }}
      </p>
    </div>
  </section>
</template>

<script setup lang="ts">
import { computed } from "vue";
import type { PAdicGeometryMode } from "../../padic-config";
import type {
  PAdicStageVisualization,
} from "../../types";

const props = withDefaults(
  defineProps<{
    stage: PAdicStageVisualization | null;
    stageLabel: string;
    prime: number;
    selectedBasis: string | null;
  }>(),
  {
    stage: null,
    selectedBasis: null,
  },
);

const emit = defineEmits<{
  (e: "select-basis", basis: string | null): void;
}>();

const nodes = computed(() => props.stage?.nodes ?? []);
const transitions = computed(() => props.stage?.transitions ?? []);
const geometryMode = computed<PAdicGeometryMode>(() => props.stage?.geometryMode ?? "padic_vector");
const geometryModeLabel = computed(() => (geometryMode.value === "padic_vector" ? "Digit-Vector" : "Valuation-Ring"));
const residueAngles = computed(() =>
  Array.from({ length: Math.max(2, props.prime) }, (_, residue) => ({
    residue,
    angle: (2 * Math.PI * residue) / Math.max(2, props.prime),
  })),
);
const valuationSummary = computed(() => {
  const valuations = [...new Set(nodes.value.map((node) => (Number.isFinite(node.valuation) ? node.valuation : Number.POSITIVE_INFINITY)))];
  return valuations
    .slice(0, 6)
    .map((value) => (Number.isFinite(value) ? `v_p=${value}` : "v_p=+∞"))
    .join(" • ");
});

const xFor = (x: number): number => 50 + (x * 42);
const yFor = (y: number): number => 50 - (y * 42);

const nodeRadius = (weight: number): number => 1.7 + (Math.min(1, Math.max(0, weight)) * 5.8);

const nodeStyle = (weight: number, norm: number): Record<string, string> => ({
  fill: `rgba(102, 245, 214, ${0.18 + (Math.min(1, weight) * 0.72)})`,
  stroke: `rgba(252, 165, 255, ${0.25 + (Math.min(1, norm) * 0.45)})`,
  strokeWidth: `${0.18 + (Math.min(1, weight) * 0.6)}`,
});

const edgeStyle = (weight: number, delta: number): Record<string, string> => ({
  stroke: delta >= 0 ? "rgba(102, 245, 214, 0.6)" : "rgba(255, 196, 96, 0.55)",
  strokeWidth: `${0.1 + (Math.min(1, weight) * 0.8)}`,
  opacity: `${0.15 + (Math.min(1, Math.abs(delta)) * 0.65)}`,
});

const formatValuation = (value: number): string => {
  if (!Number.isFinite(value)) {
    return "+∞";
  }
  return Number.isInteger(value) ? String(value) : value.toFixed(3);
};

const emitSelect = (basis: string) => {
  emit("select-basis", props.selectedBasis === basis ? null : basis);
};
</script>
