import type { BlochVector } from "../types";

export type CartesianPoint = {
  x: number;
  y: number;
  z: number;
};

export type ProjectedPoint = {
  x: number;
  y: number;
  depth: number;
  scale: number;
};

export type VisibilitySplitPath = {
  front: string;
  back: string;
};

const CAMERA_YAW = Math.PI / 7;
const CAMERA_PITCH = -Math.PI / 8;
const PERSPECTIVE_DISTANCE = 3.2;
const PERSPECTIVE_STRENGTH = 0.55;

const rotateAroundY = (point: CartesianPoint, angle: number): CartesianPoint => {
  const cos = Math.cos(angle);
  const sin = Math.sin(angle);
  return {
    x: (point.x * cos) + (point.z * sin),
    y: point.y,
    z: (-point.x * sin) + (point.z * cos),
  };
};

const rotateAroundX = (point: CartesianPoint, angle: number): CartesianPoint => {
  const cos = Math.cos(angle);
  const sin = Math.sin(angle);
  return {
    x: point.x,
    y: (point.y * cos) - (point.z * sin),
    z: (point.y * sin) + (point.z * cos),
  };
};

const interpolatePoint = (from: ProjectedPoint, to: ProjectedPoint, ratio: number): ProjectedPoint => ({
  x: from.x + ((to.x - from.x) * ratio),
  y: from.y + ((to.y - from.y) * ratio),
  depth: from.depth + ((to.depth - from.depth) * ratio),
  scale: from.scale + ((to.scale - from.scale) * ratio),
});

const pathForSegments = (segments: ReadonlyArray<ReadonlyArray<ProjectedPoint>>): string =>
  segments
    .filter((segment) => segment.length > 1)
    .map((segment) =>
      segment
        .map((point, index) => `${index === 0 ? "M" : "L"} ${point.x.toFixed(2)} ${point.y.toFixed(2)}`)
        .join(" "),
    )
    .join(" ");

export const blochToCartesian = (vector: Pick<BlochVector, "x" | "y" | "z">): CartesianPoint => ({
  x: vector.x,
  y: vector.z,
  z: vector.y,
});

export const blochAnglesToVector = (theta: number, phi: number): CartesianPoint => ({
  x: Math.sin(theta) * Math.cos(phi),
  y: Math.sin(theta) * Math.sin(phi),
  z: Math.cos(theta),
});

export const rotateForCamera = (point: CartesianPoint): CartesianPoint =>
  rotateAroundX(rotateAroundY(point, CAMERA_YAW), CAMERA_PITCH);

export const projectCartesianPoint = (point: CartesianPoint, radius = 1): ProjectedPoint => {
  const rotated = rotateForCamera(point);
  const scale = PERSPECTIVE_DISTANCE / (PERSPECTIVE_DISTANCE - (rotated.z * PERSPECTIVE_STRENGTH));

  return {
    x: rotated.x * radius * scale,
    y: -rotated.y * radius * scale,
    depth: rotated.z,
    scale,
  };
};

export const projectBlochVector = (vector: Pick<BlochVector, "x" | "y" | "z">, radius = 1): ProjectedPoint =>
  projectCartesianPoint(blochToCartesian(vector), radius);

export const sampleProjectedCurve = (
  pointAt: (angle: number) => CartesianPoint,
  start: number,
  end: number,
  radius: number,
  samples: number,
): VisibilitySplitPath => {
  const resolvedSamples = Math.max(2, samples);
  const points = Array.from({ length: resolvedSamples + 1 }, (_, index) => {
    const ratio = index / resolvedSamples;
    const angle = start + ((end - start) * ratio);
    return projectCartesianPoint(pointAt(angle), radius);
  });

  const frontSegments: ProjectedPoint[][] = [];
  const backSegments: ProjectedPoint[][] = [];
  const firstVisibility = points[0]!.depth >= 0 ? "front" : "back";
  let currentVisibility: "front" | "back" = firstVisibility;
  let currentSegment: ProjectedPoint[] = [points[0]!];
  (currentVisibility === "front" ? frontSegments : backSegments).push(currentSegment);

  for (let index = 1; index < points.length; index += 1) {
    const previous = points[index - 1]!;
    const next = points[index]!;
    const nextVisibility: "front" | "back" = next.depth >= 0 ? "front" : "back";

    if (nextVisibility === currentVisibility) {
      currentSegment.push(next);
      continue;
    }

    const ratio = (0 - previous.depth) / (next.depth - previous.depth);
    const crossing = interpolatePoint(previous, next, Number.isFinite(ratio) ? ratio : 0.5);
    currentSegment.push(crossing);

    currentVisibility = nextVisibility;
    currentSegment = [crossing, next];
    (currentVisibility === "front" ? frontSegments : backSegments).push(currentSegment);
  }

  return {
    front: pathForSegments(frontSegments),
    back: pathForSegments(backSegments),
  };
};
