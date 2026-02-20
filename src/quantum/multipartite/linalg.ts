import type { Complex } from "../../types";
import * as complex from "../../complex";

export type ComplexMatrix = Complex[][];

const EPSILON = 1e-12;
const QR_ITERATIONS = 192;

const complexSub = (left: Complex, right: Complex): Complex =>
  complex.complex(left.real - right.real, left.imag - right.imag);

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

export const hermitianEigenvalues = (matrix: ComplexMatrix): number[] => {
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

export const entropyFromEigenvalues = (eigenvalues: ReadonlyArray<number>, epsilon: number = EPSILON): number => {
  let entropy = 0;
  for (const raw of eigenvalues) {
    const clipped = raw < epsilon ? 0 : raw;
    if (clipped === 0) {
      continue;
    }
    entropy -= clipped * Math.log2(clipped);
  }
  return entropy;
};

