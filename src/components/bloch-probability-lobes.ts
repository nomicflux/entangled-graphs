export type GlyphSize = "sm" | "md";

export type ProbabilityLobeShape = {
  cx: number;
  cy: number;
  rx: number;
  ry: number;
  opacity: number;
};

export type ProbabilityLobeLayout = {
  probabilities: {
    p0: number;
    p1: number;
  };
  zero: ProbabilityLobeShape;
  one: ProbabilityLobeShape;
  anchors: {
    leftX: number;
    rightX: number;
    y: number;
  };
  ambientOpacity: number;
};

const clamp01 = (value: number): number => Math.max(0, Math.min(1, value));

export const normalizeProbabilityPair = (p0: number, p1: number): { p0: number; p1: number } => {
  const total = p0 + p1;
  if (total <= 0) {
    return { p0: 0.5, p1: 0.5 };
  }

  return {
    p0: clamp01(p0 / total),
    p1: clamp01(p1 / total),
  };
};

const lobeScale = (probability: number): number => Math.sqrt(clamp01(probability));

export const deriveProbabilityLobeLayout = (
  p0: number,
  p1: number,
  sphereRadius: number,
  size: GlyphSize,
  subdued = false,
): ProbabilityLobeLayout => {
  const probabilities = normalizeProbabilityPair(p0, p1);
  const compactScale = size === "sm" ? 0.94 : 1;
  const cxOffset = sphereRadius * 0.22 * compactScale;
  const cy = sphereRadius * 0.14;
  const baseRx = sphereRadius * 0.15 * compactScale;
  const rangeRx = sphereRadius * 0.34 * compactScale;
  const baseRy = sphereRadius * 0.12 * compactScale;
  const rangeRy = sphereRadius * 0.28 * compactScale;
  const opacityFactor = subdued ? 0.72 : 1;
  const anchorOffset = sphereRadius * 0.74;
  const anchorY = -sphereRadius * 0.14;
  const zeroScale = lobeScale(probabilities.p0);
  const oneScale = lobeScale(probabilities.p1);

  return {
    probabilities,
    zero: {
      cx: -cxOffset,
      cy,
      rx: baseRx + (rangeRx * zeroScale),
      ry: baseRy + (rangeRy * zeroScale),
      opacity: opacityFactor * (0.22 + (0.46 * probabilities.p0)),
    },
    one: {
      cx: cxOffset,
      cy,
      rx: baseRx + (rangeRx * oneScale),
      ry: baseRy + (rangeRy * oneScale),
      opacity: opacityFactor * (0.22 + (0.46 * probabilities.p1)),
    },
    anchors: {
      leftX: -anchorOffset,
      rightX: anchorOffset,
      y: anchorY,
    },
    ambientOpacity: opacityFactor * (0.05 + (0.05 * Math.max(probabilities.p0, probabilities.p1))),
  };
};
