<template>
  <section class="padic-state-map">
    <div class="padic-state-map-head">
      <div>
        <h3>p-adic State Map</h3>
        <p>{{ stageLabel }} • {{ geometryModeLabel }} • p={{ prime }} • nodes={{ nodes.length }}</p>
      </div>
      <button class="column-btn padic-replay-btn" type="button" :disabled="!canReplay" @click="replayTransition">
        Replay transition
      </button>
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
        v-for="edge in animatedTransitions"
        :key="`edge-${edge.basis}`"
        class="padic-map-edge"
        :x1="xFor(edge.from.x)"
        :y1="yFor(edge.from.y)"
        :x2="xFor(edge.to.x)"
        :y2="yFor(edge.to.y)"
        :style="edgeStyle(edge.weight, edge.delta)"
      >
        <title>
          {{ edge.basis }}: Δw_norm={{ edge.delta.toFixed(6) }}
        </title>
      </line>

      <g v-for="node in animatedNodes" :key="`node-${node.basis}`" class="padic-map-node" @click="emitSelect(node.basis)">
        <circle
          :cx="xFor(node.point.x)"
          :cy="yFor(node.point.y)"
          :r="nodeRadius(node.norm)"
          :class="{ selected: selectedBasis === node.basis }"
          :style="nodeStyle(node.weight, node.norm)"
        >
          <title>
            |{{ node.basis }}>: ω_i={{ formatScalar(node.rawWeight) }}, w_norm={{ formatScalar(node.weight) }},
            v_p={{ formatValuation(node.valuation) }}, |.|_p={{ formatScalar(node.norm) }},
            residue={{ node.residue }}, digits={{ node.digits.join(" ") }}
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
        <strong>Valuation-Ring:</strong> radius encodes |ω_i|_p shell and angle encodes residue class mod p.
      </p>
      <p class="muted">
        Shells shown for the current stage: {{ valuationSummary }}
      </p>
    </div>
  </section>
</template>

<script setup lang="ts">
import { computed, onUnmounted, ref, watch } from "vue";
import type { PAdicGeometryMode } from "../../padic-config";
import type {
  PAdicStageVisualization,
  PAdicVisualizationNode,
  PAdicVisualizationTransition,
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

const nodes = computed<ReadonlyArray<PAdicVisualizationNode>>(() => props.stage?.nodes ?? []);
const transitions = computed<ReadonlyArray<PAdicVisualizationTransition>>(() => props.stage?.transitions ?? []);
const geometryMode = computed<PAdicGeometryMode>(() => props.stage?.geometryMode ?? "padic_vector");
const geometryModeLabel = computed(() => (geometryMode.value === "padic_vector" ? "Digit-Vector (Derived)" : "Valuation-Ring"));
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
const animationProgress = ref(1);
const fromNodes = ref<ReadonlyArray<PAdicVisualizationNode>>([]);
let animationFrame: ReturnType<typeof requestAnimationFrame> | null = null;
let animationStartMs = 0;
const animationDurationMs = 460;

const cancelAnimation = () => {
  if (animationFrame !== null) {
    cancelAnimationFrame(animationFrame);
    animationFrame = null;
  }
};

const runAnimation = () => {
  cancelAnimation();
  animationProgress.value = 0;
  animationStartMs = 0;

  const step = (timestamp: number) => {
    if (animationStartMs === 0) {
      animationStartMs = timestamp;
    }

    const elapsed = timestamp - animationStartMs;
    animationProgress.value = Math.min(1, elapsed / animationDurationMs);
    if (animationProgress.value >= 1) {
      animationFrame = null;
      return;
    }

    animationFrame = requestAnimationFrame(step);
  };

  animationFrame = requestAnimationFrame(step);
};

watch(
  () => props.stage,
  (next, previous) => {
    if (!next) {
      fromNodes.value = [];
      animationProgress.value = 1;
      cancelAnimation();
      return;
    }

    const previousNodes = previous?.nodes ?? [];
    fromNodes.value = previousNodes.length > 0 ? previousNodes : next.nodes;

    const shouldAnimate =
      previous !== undefined &&
      previous !== null &&
      (previous.stageIndex !== next.stageIndex || previous.geometryMode !== next.geometryMode);

    if (shouldAnimate) {
      runAnimation();
      return;
    }

    animationProgress.value = 1;
    cancelAnimation();
  },
  { immediate: true },
);

onUnmounted(() => {
  cancelAnimation();
});

const lerp = (from: number, to: number, t: number): number => from + ((to - from) * t);

const animatedNodes = computed<ReadonlyArray<PAdicVisualizationNode>>(() => {
  if (animationProgress.value >= 1) {
    return nodes.value;
  }

  const byBasis = new Map(fromNodes.value.map((node) => [node.basis, node]));
  const t = animationProgress.value;
  return nodes.value.map((node) => {
    const prior = byBasis.get(node.basis) ?? node;
    return {
      ...node,
      rawWeight: lerp(prior.rawWeight, node.rawWeight, t),
      weight: lerp(prior.weight, node.weight, t),
      norm: lerp(prior.norm, node.norm, t),
      point: {
        x: lerp(prior.point.x, node.point.x, t),
        y: lerp(prior.point.y, node.point.y, t),
      },
    };
  });
});

const animatedTransitions = computed<ReadonlyArray<PAdicVisualizationTransition>>(() => {
  if (animationProgress.value >= 1) {
    return transitions.value;
  }

  const t = animationProgress.value;
  return transitions.value.map((edge) => ({
    ...edge,
    to: {
      x: lerp(edge.from.x, edge.to.x, t),
      y: lerp(edge.from.y, edge.to.y, t),
    },
  }));
});

const canReplay = computed(() => nodes.value.length > 0 && fromNodes.value.length > 0);

const xFor = (x: number): number => 50 + (x * 42);
const yFor = (y: number): number => 50 - (y * 42);

const nodeRadius = (norm: number): number => 1.7 + (normScale(norm) * 5.8);

const nodeStyle = (weight: number, norm: number): Record<string, string> => ({
  fill: `rgba(102, 245, 214, ${0.15 + (normScale(norm) * 0.65)})`,
  stroke: `rgba(252, 165, 255, ${0.22 + (Math.min(1, weight) * 0.55)})`,
  strokeWidth: `${0.18 + (normScale(norm) * 0.6)}`,
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
const normScale = (norm: number): number => {
  if (!Number.isFinite(norm) || norm <= 0) {
    return 0;
  }
  return Math.min(1, norm / (1 + norm));
};

const emitSelect = (basis: string) => {
  emit("select-basis", props.selectedBasis === basis ? null : basis);
};

const replayTransition = () => {
  if (!canReplay.value) {
    return;
  }
  runAnimation();
};
</script>
