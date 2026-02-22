import type { Matrix2 } from "../types";
import {
  addPAdicScalars,
  equalPAdicScalars,
  multiplyPAdicScalars,
  pAdicScalarFromFraction,
  type PAdicScalar,
} from "./scalar";

const zeroScalar = (): PAdicScalar => pAdicScalarFromFraction(0);

export const zeroMatrix = (dimension: number): Matrix2 =>
  Array.from({ length: dimension }, () =>
    Array.from({ length: dimension }, () => zeroScalar()),
  );

export const identityMatrix = (dimension: number): Matrix2 =>
  Array.from({ length: dimension }, (_, row) =>
    Array.from({ length: dimension }, (_, column) =>
      row === column ? pAdicScalarFromFraction(1) : pAdicScalarFromFraction(0),
    ),
  );

export const matrixAdd = (left: Matrix2, right: Matrix2): Matrix2 =>
  left.map((row, rowIndex) =>
    row.map((entry, columnIndex) =>
      addPAdicScalars(entry, right[rowIndex][columnIndex]),
    ),
  );

export const matrixMultiply = (left: Matrix2, right: Matrix2): Matrix2 => {
  const dimension = left.length;
  const output = zeroMatrix(dimension);

  for (let row = 0; row < dimension; row += 1) {
    for (let column = 0; column < dimension; column += 1) {
      let sum = pAdicScalarFromFraction(0);
      for (let pivot = 0; pivot < dimension; pivot += 1) {
        sum = addPAdicScalars(
          sum,
          multiplyPAdicScalars(left[row][pivot], right[pivot][column]),
        );
      }
      output[row][column] = sum;
    }
  }

  return output;
};

export const matrixTrace = (matrix: Matrix2): PAdicScalar => {
  let sum = pAdicScalarFromFraction(0);
  for (let index = 0; index < matrix.length; index += 1) {
    sum = addPAdicScalars(sum, matrix[index][index]);
  }
  return sum;
};

export const matrixTranspose = (matrix: Matrix2): Matrix2 =>
  matrix[0].map((_, columnIndex) =>
    matrix.map((row) => row[columnIndex]),
  );

export const matrixSelfAdjoint = (matrix: Matrix2): boolean => {
  for (let row = 0; row < matrix.length; row += 1) {
    for (let column = 0; column < matrix.length; column += 1) {
      if (!equalPAdicScalars(matrix[row][column], matrix[column][row])) {
        return false;
      }
    }
  }
  return true;
};

export const matrixEquals = (left: Matrix2, right: Matrix2): boolean => {
  if (left.length !== right.length) {
    return false;
  }
  for (let row = 0; row < left.length; row += 1) {
    if (left[row].length !== right[row].length) {
      return false;
    }
    for (let column = 0; column < left[row].length; column += 1) {
      if (!equalPAdicScalars(left[row][column], right[row][column])) {
        return false;
      }
    }
  }
  return true;
};

export const matrixScale = (matrix: Matrix2, scalar: PAdicScalar): Matrix2 =>
  matrix.map((row) => row.map((entry) => multiplyPAdicScalars(entry, scalar)));

export const matrixTensorProduct = (left: Matrix2, right: Matrix2): Matrix2 => {
  const leftDim = left.length;
  const rightDim = right.length;
  const dimension = leftDim * rightDim;
  const output = zeroMatrix(dimension);

  for (let leftRow = 0; leftRow < leftDim; leftRow += 1) {
    for (let leftColumn = 0; leftColumn < leftDim; leftColumn += 1) {
      for (let rightRow = 0; rightRow < rightDim; rightRow += 1) {
        for (let rightColumn = 0; rightColumn < rightDim; rightColumn += 1) {
          const row = (leftRow * rightDim) + rightRow;
          const column = (leftColumn * rightDim) + rightColumn;
          output[row][column] = multiplyPAdicScalars(left[leftRow][leftColumn], right[rightRow][rightColumn]);
        }
      }
    }
  }

  return output;
};
