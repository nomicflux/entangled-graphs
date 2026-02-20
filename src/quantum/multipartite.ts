import type { Complex, CutEntanglementScore, QubitRow, QubitState, StateEnsemble } from "../types";
import * as complex from "../complex";
import { qubitCountFromState } from "./core";

type ComplexMatrix = Complex[][];

const EPSILON = 1e-12;
const QR_ITERATIONS = 192;

const complexSub = (left: Complex, right: Complex): Complex =>
  complex.complex(left.real - right.real, left.imag - right.imag);

const complexDivByReal = (value: Complex, divisor: number): Complex =>
  complex.complex(value.real / divisor, value.imag / divisor);

const zeros = (rows: number, columns: number): ComplexMatrix =>
  Array.from({ length: rows }, () => Array.from({ length: columns }, () => complex.from_real(0)));

const column = (matrix: ComplexMatrix, index: number): Complex[] =>
  matrix.map((row) => row[index]!);

const conjugateDot = (left: ReadonlyArray<Complex>, right: ReadonlyArray<Complex>): Complex => {
  let sum = complex.from_real(0);
  for (let index = 0; index < left.length; index += 1) {
    sum = complex.add(sum, complex.mult(complex.conjugate(left[index]!), right[index]!));
  }
  return sum;
};

const vectorNorm = (vector: ReadonlyArray<Complex>): number =>
  Math.sqrt(vector.reduce((acc, entry) => acc + complex.magnitude_squared(entry), 0));

const scaleVector = (vector: ReadonlyArray<Complex>, factor: number): Complex[] =>
  vector.map((entry) => complex.scale(entry, factor));

const subtractScaled = (vector: ReadonlyArray<Complex>, basis: ReadonlyArray<Complex>, scalar: Complex): Complex[] =>
  vector.map((entry, index) => complexSub(entry, complex.mult(scalar, basis[index]!)));

const matrixMultiply = (left: ComplexMatrix, right: ComplexMatrix): ComplexMatrix => {
  const rows = left.length;
  const columns = right[0]!.length;
  const shared = right.length;
  const next = zeros(rows, columns);

  for (let row = 0; row < rows; row += 1) {
    for (let columnIndex = 0; columnIndex < columns; columnIndex += 1) {
      let sum = complex.from_real(0);
      for (let pivot = 0; pivot < shared; pivot += 1) {
        sum = complex.add(sum, complex.mult(left[row]![pivot]!, right[pivot]![columnIndex]!));
      }
      next[row]![columnIndex] = sum;
    }
  }

  return next;
};

const conjugateTranspose = (matrix: ComplexMatrix): ComplexMatrix => {
  const rows = matrix.length;
  const columns = matrix[0]!.length;
  const next = zeros(columns, rows);

  for (let row = 0; row < rows; row += 1) {
    for (let columnIndex = 0; columnIndex < columns; columnIndex += 1) {
      next[columnIndex]![row] = complex.conjugate(matrix[row]![columnIndex]!);
    }
  }

  return next;
};

const symmetrizeHermitian = (matrix: ComplexMatrix): ComplexMatrix => {
  const size = matrix.length;
  const next = zeros(size, size);

  for (let row = 0; row < size; row += 1) {
    for (let columnIndex = 0; columnIndex < size; columnIndex += 1) {
      const value = matrix[row]![columnIndex]!;
      const mirrored = complex.conjugate(matrix[columnIndex]![row]!);
      next[row]![columnIndex] = complex.scale(complex.add(value, mirrored), 0.5);
    }
  }

  return next;
};

const offDiagonalMagnitude = (matrix: ComplexMatrix): number => {
  const size = matrix.length;
  let total = 0;

  for (let row = 0; row < size; row += 1) {
    for (let columnIndex = 0; columnIndex < size; columnIndex += 1) {
      if (row === columnIndex) {
        continue;
      }
      total += complex.magnitude_squared(matrix[row]![columnIndex]!);
    }
  }

  return Math.sqrt(total);
};

const qrDecomposition = (matrix: ComplexMatrix): { q: ComplexMatrix; r: ComplexMatrix } => {
  const size = matrix.length;
  const qColumns: Complex[][] = [];
  const r = zeros(size, size);

  for (let col = 0; col < size; col += 1) {
    let v = column(matrix, col);

    for (let basisIndex = 0; basisIndex < qColumns.length; basisIndex += 1) {
      const basis = qColumns[basisIndex]!;
      const projection = conjugateDot(basis, v);
      r[basisIndex]![col] = projection;
      v = subtractScaled(v, basis, projection);
    }

    const norm = vectorNorm(v);
    r[col]![col] = complex.from_real(norm);
    const normalized = norm > EPSILON
      ? scaleVector(v, 1 / norm)
      : Array.from({ length: size }, () => complex.from_real(0));
    qColumns.push(normalized);
  }

  const q = zeros(size, size);
  for (let col = 0; col < size; col += 1) {
    for (let row = 0; row < size; row += 1) {
      q[row]![col] = qColumns[col]![row]!;
    }
  }

  return { q, r };
};

const hermitianEigenvalues = (matrix: ComplexMatrix): number[] => {
  let current = symmetrizeHermitian(matrix);

  for (let iteration = 0; iteration < QR_ITERATIONS; iteration += 1) {
    const { q, r } = qrDecomposition(current);
    current = symmetrizeHermitian(matrixMultiply(r, q));
    if (offDiagonalMagnitude(current) <= 1e-10) {
      break;
    }
  }

  return current.map((row, index) => row[index]!.real).sort((left, right) => right - left);
};

const wiresFromMask = (mask: number, qubitCount: number): QubitRow[] => {
  const wires: QubitRow[] = [];
  for (let wire = 0; wire < qubitCount; wire += 1) {
    if (((mask >> wire) & 1) === 1) {
      wires.push(wire);
    }
  }
  return wires;
};

const gatherIndex = (localBits: number, localWires: ReadonlyArray<number>, qubitCount: number): number => {
  let index = 0;
  for (let offset = 0; offset < localWires.length; offset += 1) {
    const bit = (localBits >> offset) & 1;
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

const reducedDensityForSubset = (state: QubitState, subsetWires: ReadonlyArray<number>, qubitCount: number): ComplexMatrix => {
  const subsetDim = 1 << subsetWires.length;
  const complementWires = Array.from({ length: qubitCount }, (_, wire) => wire).filter((wire) => !subsetWires.includes(wire));
  const complementDim = 1 << complementWires.length;
  const rho = zeros(subsetDim, subsetDim);

  for (let row = 0; row < subsetDim; row += 1) {
    for (let col = 0; col < subsetDim; col += 1) {
      let value = complex.from_real(0);
      for (let rest = 0; rest < complementDim; rest += 1) {
        const leftIndex = mergeBasisIndexes(row, subsetWires, rest, complementWires, qubitCount);
        const rightIndex = mergeBasisIndexes(col, subsetWires, rest, complementWires, qubitCount);
        value = complex.add(value, complex.mult(state[leftIndex]!, complex.conjugate(state[rightIndex]!)));
      }
      rho[row]![col] = value;
    }
  }

  return rho;
};

const entropyFromEigenvalues = (eigenvalues: ReadonlyArray<number>): number => {
  let entropy = 0;
  for (const raw of eigenvalues) {
    const clipped = raw < EPSILON ? 0 : raw;
    if (clipped === 0) {
      continue;
    }
    entropy -= clipped * Math.log2(clipped);
  }
  return entropy;
};

const canonicalCuts = (qubitCount: number): Array<{ subset: QubitRow[]; complement: QubitRow[] }> => {
  const maxMask = 1 << qubitCount;
  const cuts: Array<{ subset: QubitRow[]; complement: QubitRow[] }> = [];

  for (let mask = 1; mask < maxMask - 1; mask += 1) {
    const subset = wiresFromMask(mask, qubitCount);
    const subsetSize = subset.length;
    const complementSize = qubitCount - subsetSize;
    if (subsetSize > complementSize) {
      continue;
    }
    if (subsetSize === complementSize && !subset.includes(0)) {
      continue;
    }
    const complement = Array.from({ length: qubitCount }, (_, wire) => wire).filter((wire) => !subset.includes(wire));
    cuts.push({ subset, complement });
  }

  return cuts;
};

const normalizeState = (state: QubitState): QubitState => {
  const magnitude = Math.sqrt(state.reduce((acc, amp) => acc + complex.magnitude_squared(amp), 0));
  return state.map((amp) => complexDivByReal(amp, magnitude));
};

const pureCutEntropy = (state: QubitState, subset: ReadonlyArray<number>): number => {
  const qubitCount = qubitCountFromState(state);
  const rho = reducedDensityForSubset(normalizeState(state), subset, qubitCount);
  return entropyFromEigenvalues(hermitianEigenvalues(rho));
};

export const cut_entanglement_scores_from_ensemble = (ensemble: StateEnsemble): CutEntanglementScore[] => {
  if (ensemble.length === 0) {
    return [];
  }

  const qubitCount = qubitCountFromState(ensemble[0]!.state);
  const cuts = canonicalCuts(qubitCount);

  return cuts.map((cut) => {
    let entropy = 0;
    for (const branch of ensemble) {
      entropy += branch.weight * pureCutEntropy(branch.state, cut.subset);
    }
    return {
      subset: cut.subset,
      complement: cut.complement,
      entropy,
    };
  });
};

export const stage_cut_entanglement_scores = (snapshots: ReadonlyArray<StateEnsemble>): CutEntanglementScore[][] =>
  snapshots.map((snapshot) => cut_entanglement_scores_from_ensemble(snapshot));
