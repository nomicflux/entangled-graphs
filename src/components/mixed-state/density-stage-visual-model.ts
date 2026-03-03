import * as complex from "../../complex";
import { densityTensorDifferenceNorm, measurementDistributionForDensityMatrixInBasis, preferredMeasurementBasisForDensityMatrix, tensorProductDensityMatrices } from "../../quantum";
import { reduced_density_for_subset_density } from "../../quantum/reduced-density";
import type {
  DensityCloudVector,
  DensityMatrix,
  DensityStageVisualModel,
  MeasurementBasis,
  PairCorrelationOverlay,
  QubitRow,
} from "../../types";

const densityEpsilon = 1e-9;

const densityMatrixQubitCount = (rho: DensityMatrix): number => Math.log2(rho.length);

const coherenceMagnitude = (value: { real: number; imag: number }): number => Math.hypot(value.real, value.imag);

const coherenceAngle = (value: { real: number; imag: number }): number | null =>
  coherenceMagnitude(value) <= densityEpsilon ? null : Math.atan2(value.imag, value.real);

const clamp01 = (value: number): number => Math.max(0, Math.min(1, value));

const connectedComponents = (
  qubitCount: number,
  edges: ReadonlyArray<PairCorrelationOverlay>,
): ReadonlyArray<ReadonlyArray<QubitRow>> => {
  const adjacency = Array.from({ length: qubitCount }, () => new Set<QubitRow>());

  for (const edge of edges) {
    if (edge.strength < 0.08) {
      continue;
    }
    adjacency[edge.fromRow]!.add(edge.toRow);
    adjacency[edge.toRow]!.add(edge.fromRow);
  }

  const visited = new Set<QubitRow>();
  const groups: QubitRow[][] = [];

  for (let row = 0; row < qubitCount; row += 1) {
    if (visited.has(row)) {
      continue;
    }
    const stack = [row];
    const group: QubitRow[] = [];
    visited.add(row);

    while (stack.length > 0) {
      const next = stack.pop()!;
      group.push(next);
      for (const neighbor of adjacency[next]!) {
        if (visited.has(neighbor)) {
          continue;
        }
        visited.add(neighbor);
        stack.push(neighbor);
      }
    }

    if (group.length > 1) {
      groups.push(group.sort((left, right) => left - right));
    }
  }

  return groups;
};

const densityCloudVectorForSingleQubit = (rho: DensityMatrix): DensityCloudVector => {
  const rho00 = rho[0]![0]!.real;
  const rho11 = rho[1]![1]!.real;
  const rho01 = rho[0]![1]!;
  const x = clamp01((2 * rho01.real + 1) / 2) * 2 - 1;
  const y = clamp01(((-2 * rho01.imag) + 1) / 2) * 2 - 1;
  const z = clamp01(((rho00 - rho11) + 1) / 2) * 2 - 1;
  const radius = clamp01(Math.hypot(x, y, z));
  const purity = clamp01(rho00 * rho00 + rho11 * rho11 + (2 * complex.magnitude_squared(rho01)));

  return {
    x,
    y,
    z,
    radius,
    purity,
    p0: clamp01(rho00),
    p1: clamp01(rho11),
    coherenceMagnitude: clamp01(coherenceMagnitude(rho01) * 2),
    coherencePhase: coherenceAngle(rho01),
  };
};

const pairCorrelationOverlayForRows = (rho: DensityMatrix, fromRow: QubitRow, toRow: QubitRow): PairCorrelationOverlay => {
  const qubitCount = densityMatrixQubitCount(rho);
  const pairDensity = reduced_density_for_subset_density(rho, [fromRow, toRow], qubitCount);
  const fromDensity = reduced_density_for_subset_density(rho, [fromRow], qubitCount);
  const toDensity = reduced_density_for_subset_density(rho, [toRow], qubitCount);
  const productDensity = tensorProductDensityMatrices([fromDensity, toDensity]);
  const rawStrength = densityTensorDifferenceNorm(pairDensity, productDensity);
  const sameParity = pairDensity[0]![3]!;
  const oppositeParity = pairDensity[1]![2]!;
  const sameParityMagnitude = coherenceMagnitude(sameParity);
  const oppositeParityMagnitude = coherenceMagnitude(oppositeParity);
  const classicalMagnitude = Math.max(
    Math.abs(pairDensity[0]![0]!.real - productDensity[0]![0]!.real),
    Math.abs(pairDensity[1]![1]!.real - productDensity[1]![1]!.real),
    Math.abs(pairDensity[2]![2]!.real - productDensity[2]![2]!.real),
    Math.abs(pairDensity[3]![3]!.real - productDensity[3]![3]!.real),
  );

  if (classicalMagnitude >= sameParityMagnitude && classicalMagnitude >= oppositeParityMagnitude) {
    return {
      fromRow,
      toRow,
      strength: clamp01(rawStrength / 0.9),
      dominantChannel: "classical",
      angle: null,
    };
  }

  if (sameParityMagnitude >= oppositeParityMagnitude) {
    return {
      fromRow,
      toRow,
      strength: clamp01(rawStrength / 0.9),
      dominantChannel: "same-parity",
      angle: coherenceAngle(sameParity),
    };
  }

  return {
    fromRow,
    toRow,
    strength: clamp01(rawStrength / 0.9),
    dominantChannel: "opposite-parity",
    angle: coherenceAngle(oppositeParity),
  };
};

export const distributionForDensityMatrix = (
  rho: DensityMatrix,
  basis: MeasurementBasis | "auto" = "auto",
) => measurementDistributionForDensityMatrixInBasis(rho, basis === "auto" ? preferredMeasurementBasisForDensityMatrix(rho) : basis);

export const deriveDensityStageVisualModel = (
  rho: DensityMatrix,
  basis: MeasurementBasis | "auto" = "auto",
): DensityStageVisualModel => {
  const qubitCount = densityMatrixQubitCount(rho);
  const qubits = Array.from({ length: qubitCount }, (_, row) =>
    densityCloudVectorForSingleQubit(reduced_density_for_subset_density(rho, [row], qubitCount)),
  );
  const pairCorrelations =
    qubitCount < 2
      ? []
      : Array.from({ length: qubitCount - 1 }, (_, fromRow) =>
          Array.from({ length: qubitCount - fromRow - 1 }, (_, offset) =>
            pairCorrelationOverlayForRows(rho, fromRow, fromRow + offset + 1),
          ),
        ).flat();

  return {
    distribution: distributionForDensityMatrix(rho, basis),
    qubits,
    pairCorrelations,
    correlationGroups: connectedComponents(qubitCount, pairCorrelations),
  };
};
