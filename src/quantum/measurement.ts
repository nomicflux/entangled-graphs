import type { BasisProbability, QubitState, StateEnsemble } from "../types";
import * as complex from "../complex";
import { basisLabels } from "../basis";
import { qubitCountFromState } from "./core";

export type MeasurementSample = {
  basis: BasisProbability["basis"];
  probability: number;
};

export function measurement_distribution(state: QubitState): BasisProbability[] {
  const raw = state.map((amp) => complex.magnitude_squared(amp));
  const total = raw.reduce((acc, value) => acc + value, 0);
  const normalized = total > 0 ? raw.map((value) => value / total) : raw.map(() => 0);
  const labels = basisLabels(qubitCountFromState(state));

  return labels.map((basis, index) => ({
    basis,
    probability: normalized[index]!,
  }));
}

export const measurement_distribution_for_ensemble = (ensemble: StateEnsemble): BasisProbability[] => {
  if (ensemble.length === 0) {
    return [];
  }

  const labels = basisLabels(qubitCountFromState(ensemble[0]!.state));
  const totals = Array.from({ length: labels.length }, () => 0);

  for (const branch of ensemble) {
    for (let index = 0; index < branch.state.length; index += 1) {
      totals[index]! += branch.weight * complex.magnitude_squared(branch.state[index]!);
    }
  }

  const normalization = totals.reduce((acc, value) => acc + value, 0);
  const normalized = normalization > 0 ? totals.map((value) => value / normalization) : totals;

  return labels.map((basis, index) => ({
    basis,
    probability: normalized[index]!,
  }));
};

export function sample_distribution(distribution: BasisProbability[], randomValue: number = Math.random()): MeasurementSample {
  const total = distribution.reduce((acc, entry) => acc + entry.probability, 0);
  if (total <= 0) {
    const fallback = distribution[distribution.length - 1]!;
    return { basis: fallback.basis, probability: 0 };
  }

  const threshold = randomValue * total;
  let running = 0;

  for (const entry of distribution) {
    running += entry.probability;
    if (threshold <= running) {
      return { basis: entry.basis, probability: entry.probability };
    }
  }

  const fallback = distribution[distribution.length - 1]!;
  return { basis: fallback.basis, probability: fallback.probability };
}
