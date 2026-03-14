<template>
  <div
    class="bloch-sphere"
    :class="[sizeClass, { animated: props.animated, compact: props.compact, 'with-guides': hasGuides }]"
    data-bloch-sphere
  >
    <svg class="bloch-sphere-svg" :viewBox="`0 0 ${viewBoxSize} ${viewBoxSize}`" role="img" :aria-label="ariaLabel">
      <defs>
        <clipPath :id="clipPathId">
          <circle cx="0" cy="0" :r="sphereRadius" />
        </clipPath>
        <radialGradient :id="shellGradientId" cx="35%" cy="26%" r="78%">
          <stop offset="0%" stop-color="rgba(204, 224, 255, 0.2)" />
          <stop offset="54%" stop-color="rgba(47, 69, 104, 0.14)" />
          <stop offset="100%" stop-color="rgba(8, 16, 33, 0.34)" />
        </radialGradient>
        <radialGradient :id="coreGlowId" cx="48%" cy="42%" r="72%">
          <stop offset="0%" stop-color="rgba(135, 169, 228, 0.12)" />
          <stop offset="100%" stop-color="rgba(10, 16, 29, 0)" />
        </radialGradient>
        <radialGradient :id="zeroLobeGradientId" cx="38%" cy="32%" r="76%">
          <stop offset="0%" :stop-color="zeroLobeHighlightColor" />
          <stop offset="58%" :stop-color="zeroLobeColor" />
          <stop offset="100%" stop-color="rgba(12, 22, 30, 0.18)" />
        </radialGradient>
        <radialGradient :id="oneLobeGradientId" cx="62%" cy="32%" r="76%">
          <stop offset="0%" :stop-color="oneLobeHighlightColor" />
          <stop offset="58%" :stop-color="oneLobeColor" />
          <stop offset="100%" stop-color="rgba(28, 18, 34, 0.18)" />
        </radialGradient>
      </defs>

      <g :transform="`translate(${center} ${center})`">
        <ellipse class="bloch-sphere-shadow" cx="0" :cy="shadowYOffset" :rx="shadowRadiusX" :ry="shadowRadiusY" />
        <circle class="bloch-sphere-shell" cx="0" cy="0" :r="sphereRadius" :fill="`url(#${shellGradientId})`" />

        <path v-for="(path, index) in backGridPaths" :key="`back-${index}`" class="bloch-grid bloch-grid-back" :d="path" />
        <path class="bloch-grid bloch-grid-back" :d="equatorPaths.back" />
        <path class="bloch-grid bloch-grid-back" :d="meridianPaths.back" />

        <g :clip-path="`url(#${clipPathId})`">
          <circle class="bloch-sphere-core-glow" cx="0" cy="0" :r="sphereRadius * 0.92" :fill="`url(#${coreGlowId})`" />
          <ellipse
            class="bloch-probability-ambient"
            cx="0"
            :cy="sphereRadius * 0.06"
            :rx="sphereRadius * 0.9"
            :ry="sphereRadius * 0.76"
            :fill="probabilityBlendColor"
            :opacity="ambientOpacity"
          />
          <ellipse
            class="bloch-probability-lobe is-zero"
            :cx="zeroLobe.cx"
            :cy="zeroLobe.cy"
            :rx="zeroLobe.rx"
            :ry="zeroLobe.ry"
            :fill="`url(#${zeroLobeGradientId})`"
            :opacity="zeroLobe.opacity"
          />
          <ellipse
            class="bloch-probability-lobe is-one"
            :cx="oneLobe.cx"
            :cy="oneLobe.cy"
            :rx="oneLobe.rx"
            :ry="oneLobe.ry"
            :fill="`url(#${oneLobeGradientId})`"
            :opacity="oneLobe.opacity"
          />
        </g>

        <g class="bloch-basis-anchors" :class="{ 'is-compact': props.compact }">
          <path
            class="bloch-basis-anchor-line"
            :d="`M ${probabilityAnchors.leftX} ${probabilityAnchors.y} L ${probabilityAnchors.leftX + anchorLineLength} ${probabilityAnchors.y}`"
          />
          <path
            class="bloch-basis-anchor-line"
            :d="`M ${probabilityAnchors.rightX} ${probabilityAnchors.y} L ${probabilityAnchors.rightX - anchorLineLength} ${probabilityAnchors.y}`"
          />
          <circle class="bloch-basis-anchor-dot" :cx="probabilityAnchors.leftX" :cy="probabilityAnchors.y" :r="anchorDotRadius" />
          <circle class="bloch-basis-anchor-dot" :cx="probabilityAnchors.rightX" :cy="probabilityAnchors.y" :r="anchorDotRadius" />
          <text
            class="bloch-basis-anchor-text"
            :x="probabilityAnchors.leftX + anchorTextOffset"
            :y="probabilityAnchors.y - anchorTextYOffset"
            text-anchor="middle"
          >
            0
          </text>
          <text
            class="bloch-basis-anchor-text"
            :x="probabilityAnchors.rightX - anchorTextOffset"
            :y="probabilityAnchors.y - anchorTextYOffset"
            text-anchor="middle"
          >
            1
          </text>
        </g>

        <path v-if="phiGuidePath" class="bloch-guide bloch-guide-phi" :d="phiGuidePath" />
        <path v-if="thetaGuidePath" class="bloch-guide bloch-guide-theta" :d="thetaGuidePath" />

        <path class="bloch-grid bloch-grid-front" :d="equatorPaths.front" />
        <path class="bloch-grid bloch-grid-front" :d="meridianPaths.front" />
        <circle class="bloch-sphere-rim" cx="0" cy="0" :r="sphereRadius" />
        <ellipse class="bloch-shell-reflection" cx="0" :cy="reflectionYOffset" :rx="reflectionRadiusX" :ry="reflectionRadiusY" />
        <path class="bloch-shell-sheen" :d="shellSheenPath" />

        <path class="bloch-vector-line" :class="{ 'is-hidden-side': endpoint.depth < 0 }" :d="vectorPath" />
        <circle class="bloch-endpoint" :class="{ 'is-hidden-side': endpoint.depth < 0 }" :cx="endpoint.x" :cy="endpoint.y" :r="endpointRadius" />
      </g>
    </svg>
  </div>
</template>

<script setup lang="ts">
import { computed, getCurrentInstance } from "vue";
import type { BlochVector } from "../types";
import { deriveProbabilityLobeLayout } from "./bloch-probability-lobes";
import { blochAnglesToVector, blochToCartesian, projectBlochVector, sampleProjectedCurve } from "./bloch-geometry";

type BlochGuides = {
  theta: number;
  phi: number;
};

const mixChannel = (from: number, to: number, ratio: number): number => Math.round(from + ((to - from) * ratio));
const mixRgb = (from: readonly [number, number, number], to: readonly [number, number, number], ratio: number): string =>
  `rgb(${mixChannel(from[0], to[0], ratio)} ${mixChannel(from[1], to[1], ratio)} ${mixChannel(from[2], to[2], ratio)})`;

const zeroLobeRgb = [102, 245, 214] as const;
const oneLobeRgb = [252, 165, 255] as const;

const props = withDefaults(
  defineProps<{
    vector: BlochVector;
    label?: string;
    animated?: boolean;
    compact?: boolean;
    size?: "sm" | "md";
    guides?: BlochGuides | null;
  }>(),
  {
    label: "",
    animated: true,
    compact: false,
    size: "md",
    guides: null,
  },
);

const instanceId = getCurrentInstance()?.uid ?? 0;
const sizeClass = computed(() => `size-${props.size}`);
const sphereRadius = computed(() => (props.size === "sm" ? 26 : 34));
const viewBoxSize = computed(() => sphereRadius.value * 2 + (props.size === "sm" ? 26 : 34));
const center = computed(() => viewBoxSize.value / 2);
const shadowRadiusX = computed(() => sphereRadius.value * 0.8);
const shadowRadiusY = computed(() => sphereRadius.value * 0.24);
const shadowYOffset = computed(() => sphereRadius.value * 0.96);
const endpoint = computed(() => projectBlochVector(props.vector, sphereRadius.value));
const endpointRadius = computed(() => (props.size === "sm" ? 2 : 2.4) + (props.vector.certainty * (props.size === "sm" ? 0.6 : 0.85)));
const shellGradientId = `bloch-shell-${instanceId}`;
const coreGlowId = `bloch-core-${instanceId}`;
const clipPathId = `bloch-clip-${instanceId}`;
const zeroLobeGradientId = `bloch-lobe-zero-${instanceId}`;
const oneLobeGradientId = `bloch-lobe-one-${instanceId}`;
const hasGuides = computed(() => props.guides !== null);
const probabilityLayout = computed(() =>
  deriveProbabilityLobeLayout(props.vector.p0, props.vector.p1, sphereRadius.value, props.size, hasGuides.value),
);
const zeroProbability = computed(() => probabilityLayout.value.probabilities.p0);
const oneProbability = computed(() => probabilityLayout.value.probabilities.p1);
const ariaLabel = computed(() => {
  const prefix = props.label ? `${props.label}. ` : "";
  return `${prefix}${Math.round(zeroProbability.value * 100)}% |0>, ${Math.round(oneProbability.value * 100)}% |1>`;
});
const probabilityBlendColor = computed(() => mixRgb(zeroLobeRgb, oneLobeRgb, oneProbability.value));
const ambientOpacity = computed(() => probabilityLayout.value.ambientOpacity);
const zeroLobe = computed(() => probabilityLayout.value.zero);
const oneLobe = computed(() => probabilityLayout.value.one);
const probabilityAnchors = computed(() => probabilityLayout.value.anchors);
const zeroLobeColor = computed(() => mixRgb([28, 82, 88], zeroLobeRgb, 0.58 + (0.28 * zeroProbability.value)));
const oneLobeColor = computed(() => mixRgb([92, 50, 104], oneLobeRgb, 0.58 + (0.28 * oneProbability.value)));
const zeroLobeHighlightColor = computed(() => mixRgb(zeroLobeRgb, [242, 255, 250], 0.42));
const oneLobeHighlightColor = computed(() => mixRgb(oneLobeRgb, [255, 244, 253], 0.4));
const anchorLineLength = computed(() => sphereRadius.value * 0.12);
const anchorDotRadius = computed(() => (props.size === "sm" ? 1.15 : 1.45));
const anchorTextOffset = computed(() => sphereRadius.value * 0.06);
const anchorTextYOffset = computed(() => sphereRadius.value * 0.05);
const reflectionRadiusX = computed(() => sphereRadius.value * 0.62);
const reflectionRadiusY = computed(() => sphereRadius.value * 0.18);
const reflectionYOffset = computed(() => -sphereRadius.value * 0.47);
const shellSheenPath = computed(() => {
  const inset = sphereRadius.value * 0.28;
  const top = -sphereRadius.value * 0.76;
  const mid = -sphereRadius.value * 0.2;
  return `M ${(-sphereRadius.value + inset).toFixed(2)} ${top.toFixed(2)} C ${(-sphereRadius.value * 0.38).toFixed(2)} ${(-sphereRadius.value * 0.94).toFixed(2)} ${(-sphereRadius.value * 0.08).toFixed(2)} ${(-sphereRadius.value * 0.68).toFixed(2)} ${(sphereRadius.value * 0.08).toFixed(2)} ${mid.toFixed(2)}`;
});

const samplesForSpan = (span: number) => Math.max(18, Math.ceil(Math.abs(span) / (Math.PI / 18)));
const guideArc = (start: number, end: number, pointAt: (angle: number) => { x: number; y: number; z: number }) =>
  sampleProjectedCurve(pointAt, start, end, sphereRadius.value, samplesForSpan(end - start)).front;
const scenePointFromBlochAngles = (theta: number, phi: number) => blochToCartesian(blochAnglesToVector(theta, phi));

const backGridPaths = computed(() => {
  if (props.compact) {
    return [] as string[];
  }

  return [-0.55, 0.55].map((latitude) =>
    sampleProjectedCurve(
      (angle) => {
        const ringRadius = Math.sqrt(Math.max(0, 1 - (latitude * latitude)));
        return blochToCartesian({
          x: Math.cos(angle) * ringRadius,
          y: Math.sin(angle) * ringRadius,
          z: latitude,
        });
      },
      0,
      2 * Math.PI,
      sphereRadius.value,
      56,
    ).back,
  );
});

const equatorPaths = computed(() =>
  sampleProjectedCurve(
    (angle) =>
      blochToCartesian({
        x: Math.cos(angle),
        y: Math.sin(angle),
        z: 0,
      }),
    0,
    2 * Math.PI,
    sphereRadius.value,
    72,
  ),
);

const meridianPaths = computed(() =>
  sampleProjectedCurve(
    (angle) =>
      blochToCartesian({
        x: Math.sin(angle),
        y: 0,
        z: Math.cos(angle),
      }),
    0,
    2 * Math.PI,
    sphereRadius.value,
    72,
  ),
);

const thetaGuidePath = computed(() => {
  if (!props.guides || props.guides.theta <= 0.001) {
    return "";
  }

  return guideArc(0, props.guides.theta, (angle) => scenePointFromBlochAngles(angle, props.guides!.phi));
});

const phiGuidePath = computed(() => {
  if (!props.guides || props.guides.phi <= 0.001) {
    return "";
  }

  return guideArc(0, props.guides.phi, (angle) =>
    blochToCartesian({
      x: Math.cos(angle),
      y: Math.sin(angle),
      z: 0,
    }),
  );
});

const vectorPath = computed(() => `M 0 0 L ${endpoint.value.x.toFixed(2)} ${endpoint.value.y.toFixed(2)}`);
</script>
