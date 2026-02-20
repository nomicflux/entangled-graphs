import type { BellStateId, EntanglementLink, QubitState, StateEnsemble } from "../types";
import * as complex from "../complex";
import { qubitCountFromState } from "./core";

type FourByFour = ComplexCell[][];
type ComplexCell = { real: number; imag: number };

const bellOrder: readonly BellStateId[] = ["phi+", "phi-", "psi+", "psi-"];

const bellVectors: Record<BellStateId, readonly number[]> = {
  "phi+": [Math.SQRT1_2, 0, 0, Math.SQRT1_2],
  "phi-": [Math.SQRT1_2, 0, 0, -Math.SQRT1_2],
  "psi+": [0, Math.SQRT1_2, Math.SQRT1_2, 0],
  "psi-": [0, Math.SQRT1_2, -Math.SQRT1_2, 0],
};

const pairKey = (from: number, to: number): string => `${from}-${to}`;

const zero4x4 = (): FourByFour =>
  Array.from({ length: 4 }, () => Array.from({ length: 4 }, () => complex.from_real(0)));

const buildBaseIndex = (restBits: number, wires: readonly number[], qubitCount: number): number => {
  let index = 0;
  for (let offset = 0; offset < wires.length; offset += 1) {
    const bit = (restBits >> (wires.length - 1 - offset)) & 1;
    if (bit === 0) {
      continue;
    }
    index |= 1 << (qubitCount - 1 - wires[offset]!);
  }
  return index;
};

const reducedDensityForPair = (
  ensemble: StateEnsemble,
  left: number,
  right: number,
  qubitCount: number,
): FourByFour => {
  const rho = zero4x4();
  const maskLeft = 1 << (qubitCount - 1 - left);
  const maskRight = 1 << (qubitCount - 1 - right);
  const restWires = Array.from({ length: qubitCount }, (_, wire) => wire).filter((wire) => wire !== left && wire !== right);
  const restStateCount = 1 << restWires.length;

  for (const branch of ensemble) {
    for (let restBits = 0; restBits < restStateCount; restBits += 1) {
      const base = buildBaseIndex(restBits, restWires, qubitCount);
      const indexes = [base, base | maskRight, base | maskLeft, base | maskLeft | maskRight];
      const amplitudes = indexes.map((index) => branch.state[index]!);

      for (let row = 0; row < 4; row += 1) {
        for (let column = 0; column < 4; column += 1) {
          const contribution = complex.scale(
            complex.mult(amplitudes[row]!, complex.conjugate(amplitudes[column]!)),
            branch.weight,
          );
          rho[row]![column] = complex.add(rho[row]![column]!, contribution);
        }
      }
    }
  }

  return rho;
};

const bellProbability = (rho: FourByFour, bell: BellStateId): number => {
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
  const rho = reducedDensityForPair(ensemble, left, right, qubitCount);
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
