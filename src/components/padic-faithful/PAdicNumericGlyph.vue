<template>
  <svg
    class="padic-numeric-glyph-svg"
    :class="{
      'padic-numeric-glyph-svg-compact': !detail,
      'padic-numeric-glyph-svg-detail': detail,
    }"
    viewBox="0 0 100 100"
    role="img"
    :aria-label="ariaLabel"
  >
    <circle
      v-for="ring in rings"
      :key="`ring-${ring.key}`"
      class="padic-stage-shell-ring"
      cx="50"
      cy="50"
      :r="ring.radius"
    >
      <title>{{ ring.label }}</title>
    </circle>

    <line
      v-for="axis in axes"
      :key="`axis-${axis.key}`"
      class="padic-stage-residue-axis"
      x1="50"
      y1="50"
      :x2="axis.x2"
      :y2="axis.y2"
    >
      <title>{{ axis.label }}</title>
    </line>

    <g v-for="node in nodes" :key="node.id" class="padic-stage-node">
      <circle
        :cx="node.x"
        :cy="node.y"
        :r="node.radius"
        :fill="node.fill"
        :fill-opacity="node.alpha"
        :stroke="node.stroke"
        :stroke-width="node.strokeWidth"
      >
        <title>{{ node.tooltip }}</title>
      </circle>
      <text v-if="detail" :x="node.x" :y="node.y + 0.8" class="padic-stage-node-label">{{ node.label }}</text>
    </g>
  </svg>
</template>

<script setup lang="ts">
import { computed } from "vue";
import { derivedNodesFromEntries } from "../../padic-faithful/derived/geometry";
import type { PAdicOperatorEntryRow, PAdicPrime, PAdicViewMode } from "../../padic-faithful/types";

type GlyphRing = {
  key: string;
  radius: number;
  label: string;
};

type GlyphAxis = {
  key: string;
  x2: number;
  y2: number;
  label: string;
};

type GlyphNode = {
  id: string;
  x: number;
  y: number;
  radius: number;
  alpha: number;
  fill: string;
  stroke: string;
  strokeWidth: number;
  label: string;
  tooltip: string;
};

const props = withDefaults(defineProps<{
  entries: ReadonlyArray<PAdicOperatorEntryRow>;
  prime: PAdicPrime;
  mode: PAdicViewMode;
  detail?: boolean;
  ariaLabel?: string;
}>(), {
  detail: false,
  ariaLabel: "p-adic numeric glyph",
});

const GLYPH_CENTER = 50;
const GLYPH_DRAW_RADIUS = 42;

const xFor = (x: number): number => GLYPH_CENTER + (x * GLYPH_DRAW_RADIUS);
const yFor = (y: number): number => GLYPH_CENTER - (y * GLYPH_DRAW_RADIUS);

const formatScalar = (value: number): string => {
  if (!Number.isFinite(value)) {
    return value > 0 ? "+∞" : "-∞";
  }
  if (value === 0) {
    return "0";
  }
  if (Math.abs(value) < 1e-6 || Math.abs(value) > 1e4) {
    return value.toExponential(3);
  }
  return value.toFixed(6);
};

const formatValuation = (value: number): string => {
  if (!Number.isFinite(value)) {
    return "+∞";
  }
  return Number.isInteger(value) ? String(value) : value.toFixed(4);
};

const absScale = (value: number): number => {
  if (!Number.isFinite(value) || value <= 0) {
    return 0;
  }
  return value / (1 + value);
};

const residueColor = (residue: number | null): string => {
  if (residue === null) {
    return "rgba(182, 190, 206, 0.84)";
  }
  const slotCount = Math.max(2, props.prime);
  const normalized = ((residue % slotCount) + slotCount) % slotCount;
  const hue = (normalized / slotCount) * 360;
  return `hsl(${hue.toFixed(1)} 66% 60%)`;
};

const visibleEntries = computed(() =>
  props.entries,
);

const derivedNodes = computed(() =>
  derivedNodesFromEntries(visibleEntries.value, props.prime, props.mode),
);

const entriesById = computed(() =>
  new Map(visibleEntries.value.map((entry) => [entry.id, entry])),
);

const nodes = computed<ReadonlyArray<GlyphNode>>(() =>
  derivedNodes.value.map((node) => {
    const entry = entriesById.value.get(node.id);
    const absP = entry?.abs_p ?? 0;
    const wNorm = entry?.w_norm ?? 0;
    const absScaled = absScale(absP);
    const alpha = 0.02 + (0.96 * absScaled);
    const radius = 0.3 + (5.1 * absScaled);
    const label = `r${entry?.row ?? 0}c${entry?.column ?? 0}`;
    const residueLabel = entry?.unitResidue === null || entry?.unitResidue === undefined
      ? "0"
      : `u ≡ ${entry.unitResidue} (mod ${props.prime})`;
    const diagonalLabel = entry?.isDiagonal ? "diagonal" : "off-diagonal";
    const tooltip = `${entry?.label ?? node.id} (${diagonalLabel}): value=${entry?.value_text ?? "0"}, v_p=${formatValuation(entry?.v_p ?? Number.POSITIVE_INFINITY)}, |.|_p=${formatScalar(absP)}, ${residueLabel}, digits=${entry?.digits.text ?? "0"}, w_norm (Derived)=${formatScalar(wNorm)}`;

    return {
      id: node.id,
      x: xFor(node.x),
      y: yFor(node.y),
      radius,
      alpha,
      fill: residueColor(entry?.unitResidue ?? null),
      stroke: "rgba(255, 255, 255, 0.78)",
      strokeWidth: 0.18 + (0.86 * absScaled),
      label,
      tooltip,
    } satisfies GlyphNode;
  }),
);

const radiusForValuation = (valuation: number): number => {
  if (!Number.isFinite(valuation)) {
    return 0.045;
  }
  if (valuation > 40) {
    return 0.12;
  }
  if (valuation < -40) {
    return 0.94;
  }
  const norm = Math.pow(props.prime, -valuation);
  return 0.12 + (0.82 * absScale(norm));
};

const rings = computed<ReadonlyArray<GlyphRing>>(() => {
  if (props.mode === "valuation_ring") {
    const valuations = [...new Set(visibleEntries.value.map((entry) => (
      Number.isFinite(entry.v_p) ? entry.v_p : Number.POSITIVE_INFINITY
    )))].sort((left, right) => left - right);

    return valuations.map((valuation) => ({
      key: Number.isFinite(valuation) ? String(valuation) : "inf",
      radius: radiusForValuation(valuation) * GLYPH_DRAW_RADIUS,
      label: Number.isFinite(valuation) ? `v_p=${formatValuation(valuation)}` : "v_p=+∞",
    }));
  }

  return [];
});

const axes = computed<ReadonlyArray<GlyphAxis>>(() => {
  if (props.mode !== "valuation_ring") {
    return [];
  }

  const slotCount = Math.max(2, props.prime);
  return Array.from({ length: slotCount }, (_, residue) => {
    const angle = ((2 * Math.PI * residue) / slotCount) - (Math.PI / 2);
    return {
      key: String(residue),
      x2: xFor(Math.cos(angle) * 0.98),
      y2: yFor(Math.sin(angle) * 0.98),
      label: `residue slot ${residue}`,
    } satisfies GlyphAxis;
  });
});
</script>
