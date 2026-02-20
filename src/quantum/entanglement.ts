import type { BellStateId, EntanglementLink, StateEnsemble } from "../types";
import * as complex from "../complex";
import { qubitCountFromState } from "./core";
import { reduced_density_for_subset_ensemble, type ComplexMatrix } from "./reduced-density";

const bellOrder: readonly BellStateId[] = ["phi+", "phi-", "psi+", "psi-"];

const bellVectors: Record<BellStateId, readonly number[]> = {
  "phi+": [Math.SQRT1_2, 0, 0, Math.SQRT1_2],
  "phi-": [Math.SQRT1_2, 0, 0, -Math.SQRT1_2],
  "psi+": [0, Math.SQRT1_2, Math.SQRT1_2, 0],
  "psi-": [0, Math.SQRT1_2, -Math.SQRT1_2, 0],
};

const pairKey = (from: number, to: number): string => `${from}-${to}`;

const bellProbability = (rho: ComplexMatrix, bell: BellStateId): number => {
  const vector = bellVectors[bell];
  let value = complex.from_real(0);

  for (let row = 0; row < 4; row += 1) {
    for (let column = 0; column < 4; column += 1) {
      const scaled = complex.scale(rho[row]![column]!, vector[row]! * vector[column]!);
      value = complex.add(value, scaled);
    }
  }

  return value.real;
};

const bellProfileForPair = (
  ensemble: StateEnsemble,
  left: number,
  right: number,
  qubitCount: number,
): Omit<EntanglementLink, "fromRow" | "toRow"> => {
  const rho = reduced_density_for_subset_ensemble(ensemble, [left, right], qubitCount);
  const probabilities = bellOrder.map((bell) => ({ bell, probability: bellProbability(rho, bell) }));
  const dominant = probabilities.reduce((best, current) => (current.probability > best.probability ? current : best), probabilities[0]!);
  const strength = Math.max(0, (2 * dominant.probability) - 1);

  return {
    dominantBell: dominant.bell,
    dominantProbability: dominant.probability,
    strength,
  };
};

export const entanglement_links_from_ensemble = (ensemble: StateEnsemble): EntanglementLink[] => {
  if (ensemble.length === 0) {
    return [];
  }

  const qubitCount = qubitCountFromState(ensemble[0]!.state);
  if (qubitCount < 2) {
    return [];
  }

  const links: EntanglementLink[] = [];

  for (let left = 0; left < qubitCount - 1; left += 1) {
    for (let right = left + 1; right < qubitCount; right += 1) {
      const profile = bellProfileForPair(ensemble, left, right, qubitCount);
      links.push({
        fromRow: left,
        toRow: right,
        ...profile,
      });
    }
  }

  return links;
};

export const entanglement_delta_links = (
  previous: ReadonlyArray<EntanglementLink>,
  current: ReadonlyArray<EntanglementLink>,
): EntanglementLink[] => {
  const previousStrengthByPair = new Map(previous.map((link) => [pairKey(link.fromRow, link.toRow), link.strength]));

  return current.filter((link) => {
    const previousStrength = previousStrengthByPair.get(pairKey(link.fromRow, link.toRow)) ?? 0;
    return link.strength > previousStrength;
  });
};
