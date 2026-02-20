import type { Complex, QubitState, StateEnsemble } from "../types";
import * as complex from "../complex";

export type ComplexMatrix = Complex[][];

const zeros = (rows: number, columns: number): ComplexMatrix =>
  Array.from({ length: rows }, () => Array.from({ length: columns }, () => complex.from_real(0)));

const gatherIndex = (localBits: number, localWires: ReadonlyArray<number>, qubitCount: number): number => {
  let index = 0;
  for (let offset = 0; offset < localWires.length; offset += 1) {
    const bit = (localBits >> (localWires.length - 1 - offset)) & 1;
    if (bit === 1) {
      index |= 1 << (qubitCount - 1 - localWires[offset]!);
    }
  }
  return index;
};

const mergeBasisIndexes = (
  subsetBits: number,
  subsetWires: ReadonlyArray<number>,
  complementBits: number,
  complementWires: ReadonlyArray<number>,
  qubitCount: number,
): number => gatherIndex(subsetBits, subsetWires, qubitCount) | gatherIndex(complementBits, complementWires, qubitCount);

const complementWires = (subsetWires: ReadonlyArray<number>, qubitCount: number): number[] => {
  const subset = new Set(subsetWires);
  return Array.from({ length: qubitCount }, (_, wire) => wire).filter((wire) => !subset.has(wire));
};

const addScaled = (target: ComplexMatrix, source: ComplexMatrix, scale: number): void => {
  for (let row = 0; row < target.length; row += 1) {
    for (let col = 0; col < target[row]!.length; col += 1) {
      target[row]![col] = complex.add(target[row]![col]!, complex.scale(source[row]![col]!, scale));
    }
  }
};

export const reduced_density_for_subset_state = (
  state: QubitState,
  subsetWires: ReadonlyArray<number>,
  qubitCount: number,
): ComplexMatrix => {
  const subsetDim = 1 << subsetWires.length;
  const restWires = complementWires(subsetWires, qubitCount);
  const restDim = 1 << restWires.length;
  const rho = zeros(subsetDim, subsetDim);

  for (let row = 0; row < subsetDim; row += 1) {
    for (let col = 0; col < subsetDim; col += 1) {
      let value = complex.from_real(0);
      for (let rest = 0; rest < restDim; rest += 1) {
        const leftIndex = mergeBasisIndexes(row, subsetWires, rest, restWires, qubitCount);
        const rightIndex = mergeBasisIndexes(col, subsetWires, rest, restWires, qubitCount);
        value = complex.add(value, complex.mult(state[leftIndex]!, complex.conjugate(state[rightIndex]!)));
      }
      rho[row]![col] = value;
    }
  }

  return rho;
};

export const reduced_density_for_subset_ensemble = (
  ensemble: StateEnsemble,
  subsetWires: ReadonlyArray<number>,
  qubitCount: number,
): ComplexMatrix => {
  const subsetDim = 1 << subsetWires.length;
  const rho = zeros(subsetDim, subsetDim);

  for (const branch of ensemble) {
    addScaled(rho, reduced_density_for_subset_state(branch.state, subsetWires, qubitCount), branch.weight);
  }

  return rho;
};

