import type {
  BasisLabel,
  PAdicStageVisualization,
  PAdicVisualizationNode,
  PAdicVisualizationPoint,
  PAdicVisualizationTransition,
  StateEnsemble,
} from "../../types";
import type { PAdicGeometryMode, PAdicMeasurementModel } from "../../padic-config";
import { measurement_distribution } from "../measurement";
import {
  p_adic_norm_from_real,
  p_adic_raw_weight_totals_for_ensemble,
  p_adic_valuation_from_real,
} from "./measurement-model";

const EPSILON = 1e-12;

export type { PAdicStageVisualization, PAdicVisualizationNode, PAdicVisualizationTransition } from "../../types";

const stageVisualizationCache = new WeakMap<ReadonlyArray<StateEnsemble>, Map<string, ReadonlyArray<PAdicStageVisualization>>>();
const stageNodeCache = new WeakMap<StateEnsemble, Map<string, ReadonlyArray<PAdicVisualizationNode>>>();

const basisLabelsForEnsemble = (ensemble: StateEnsemble): BasisLabel[] => {
  if (ensemble.length === 0) {
    return [];
  }

  return measurement_distribution(ensemble[0]!.state).map((entry) => entry.basis);
};

const basePDigits = (index: number, p: number, depth: number): number[] => {
  const digits: number[] = [];
  let value = Math.max(0, Math.trunc(index));

  for (let offset = 0; offset < depth; offset += 1) {
    digits.push(value % p);
    value = Math.floor(value / p);
  }

  return digits;
};

const normalizePoints = (points: ReadonlyArray<PAdicVisualizationPoint>): PAdicVisualizationPoint[] => {
  if (points.length === 0) {
    return [];
  }

  const xs = points.map((point) => point.x);
  const ys = points.map((point) => point.y);
  const minX = Math.min(...xs);
  const maxX = Math.max(...xs);
  const minY = Math.min(...ys);
  const maxY = Math.max(...ys);
  const centerX = (minX + maxX) * 0.5;
  const centerY = (minY + maxY) * 0.5;
  const span = Math.max(maxX - minX, maxY - minY);

  if (span <= EPSILON) {
    return points.map(() => ({ x: 0, y: 0 }));
  }

  const scale = 2 / span;
  return points.map((point) => ({
    x: (point.x - centerX) * scale,
    y: (point.y - centerY) * scale,
  }));
};

const digitDepthForBasisCount = (basisCount: number, p: number): number => {
  if (basisCount <= 1) {
    return 1;
  }

  return Math.max(1, Math.ceil(Math.log(basisCount) / Math.log(p)));
};

const pointsForDigits = (digitRows: ReadonlyArray<ReadonlyArray<number>>, p: number): PAdicVisualizationPoint[] => {
  const rawPoints = digitRows.map((digits) => {
    let x = 0;
    let y = 0;

    for (let offset = 0; offset < digits.length; offset += 1) {
      const digit = digits[offset]!;
      const radius = 1 / Math.pow(p, offset);
      const angle = (2 * Math.PI * digit) / p;
      x += radius * Math.cos(angle);
      y += radius * Math.sin(angle);
    }

    return { x, y };
  });

  return normalizePoints(rawPoints);
};

const pointsForValuationRing = (
  rawWeights: ReadonlyArray<number>,
  basisCount: number,
  p: number,
): PAdicVisualizationPoint[] => {
  const norms = rawWeights.map((weight) => p_adic_norm_from_real(weight, p));
  const maxNorm = norms.reduce((acc, value) => Math.max(acc, value), 0);
  const denominator = maxNorm > EPSILON ? maxNorm : 1;

  const rawPoints = norms.map((norm, index) => {
    const radial = norm / denominator;
    const radius = radial <= EPSILON ? 0 : (0.08 + (0.92 * radial));
    const angle = basisCount <= 0 ? 0 : (2 * Math.PI * index) / Math.max(1, basisCount);
    return {
      x: radius * Math.cos(angle),
      y: radius * Math.sin(angle),
    };
  });

  return normalizePoints(rawPoints);
};

const emptyPoint = (): PAdicVisualizationPoint => ({ x: 0, y: 0 });

const nodeCacheKey = (p: number, model: PAdicMeasurementModel, geometryMode: PAdicGeometryMode): string =>
  `${p}|${model}|${geometryMode}`;

const buildStageNodes = (
  ensemble: StateEnsemble,
  p: number,
  model: PAdicMeasurementModel,
  geometryMode: PAdicGeometryMode,
): ReadonlyArray<PAdicVisualizationNode> => {
  const cacheByKey = stageNodeCache.get(ensemble) ?? new Map<string, ReadonlyArray<PAdicVisualizationNode>>();
  if (!stageNodeCache.has(ensemble)) {
    stageNodeCache.set(ensemble, cacheByKey);
  }

  const key = nodeCacheKey(p, model, geometryMode);
  const cached = cacheByKey.get(key);
  if (cached) {
    return cached;
  }

  const labels = basisLabelsForEnsemble(ensemble);
  const basisCount = labels.length;
  const rawWeights = p_adic_raw_weight_totals_for_ensemble(ensemble, p, model);
  const normalization = rawWeights.reduce((acc, value) => acc + value, 0);
  const digitDepth = digitDepthForBasisCount(Math.max(1, basisCount), p);
  const digitsByIndex = Array.from({ length: basisCount }, (_, index) => basePDigits(index, p, digitDepth));
  const points =
    geometryMode === "padic_vector"
      ? pointsForDigits(digitsByIndex, p)
      : pointsForValuationRing(rawWeights, basisCount, p);

  const nodes = labels.map((basis, index) => {
    const rawWeight = rawWeights[index] ?? 0;
    const point = points[index] ?? emptyPoint();

    return {
      basis,
      index,
      rawWeight,
      weight: normalization > EPSILON ? rawWeight / normalization : 0,
      valuation: p_adic_valuation_from_real(rawWeight, p),
      norm: p_adic_norm_from_real(rawWeight, p),
      residue: ((index % p) + p) % p,
      digits: digitsByIndex[index] ?? [],
      point,
    };
  });

  cacheByKey.set(key, nodes);
  return nodes;
};

const transitionsForStages = (
  previous: ReadonlyArray<PAdicVisualizationNode> | null,
  current: ReadonlyArray<PAdicVisualizationNode>,
): ReadonlyArray<PAdicVisualizationTransition> => {
  if (!previous || previous.length === 0) {
    return [];
  }

  const previousByBasis = new Map(previous.map((node) => [node.basis, node]));
  const transitions: PAdicVisualizationTransition[] = [];

  for (const node of current) {
    const prior = previousByBasis.get(node.basis);
    const from = prior?.point ?? node.point;
    const delta = node.weight - (prior?.weight ?? 0);
    const weight = Math.max(node.weight, prior?.weight ?? 0);

    if (weight <= EPSILON && Math.abs(delta) <= EPSILON) {
      continue;
    }

    transitions.push({
      basis: node.basis,
      from,
      to: node.point,
      weight,
      delta,
    });
  }

  return transitions;
};

export const p_adic_stage_visualizations_from_snapshots = (
  snapshots: ReadonlyArray<StateEnsemble>,
  p: number,
  model: PAdicMeasurementModel,
  geometryMode: PAdicGeometryMode,
): ReadonlyArray<PAdicStageVisualization> => {
  const byKey = stageVisualizationCache.get(snapshots) ?? new Map<string, ReadonlyArray<PAdicStageVisualization>>();
  if (!stageVisualizationCache.has(snapshots)) {
    stageVisualizationCache.set(snapshots, byKey);
  }

  const key = `${p}|${model}|${geometryMode}|${snapshots.length}`;
  const cached = byKey.get(key);
  if (cached) {
    return cached;
  }

  const stageNodes = snapshots.map((ensemble) => buildStageNodes(ensemble, p, model, geometryMode));
  const payload = stageNodes.map((nodes, stageIndex) => ({
    stageIndex,
    geometryMode,
    nodes,
    transitions: transitionsForStages(stageIndex === 0 ? null : stageNodes[stageIndex - 1]!, nodes),
  }));

  byKey.set(key, payload);
  return payload;
};
