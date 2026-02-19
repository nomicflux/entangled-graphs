import * as complex from "./complex";
import type { BuiltinGateId, BuiltinSingleGateId, Complex, Operator, QubitArity } from "./types";

export type SingleQubitMatrixEntries = readonly [
  readonly [Complex, Complex],
  readonly [Complex, Complex],
];

type NonMaxQubitArity = Exclude<QubitArity, 8>;
type NextQubitArity<Arity extends NonMaxQubitArity> = Arity extends 1
  ? 2
  : Arity extends 2
    ? 3
    : Arity extends 3
      ? 4
      : Arity extends 4
        ? 5
        : Arity extends 5
          ? 6
          : Arity extends 6
            ? 7
            : 8;

const freezeMatrix = (rows: ReadonlyArray<ReadonlyArray<Complex>>): ReadonlyArray<ReadonlyArray<Complex>> =>
  Object.freeze(rows.map((row) => Object.freeze([...row])));

const matrixOrderForArity = (qubitArity: QubitArity): number => 1 << qubitArity;

export const singleQubitMatrix = (
  a00: Complex,
  a01: Complex,
  a10: Complex,
  a11: Complex,
): SingleQubitMatrixEntries => [[a00, a01], [a10, a11]];

export const matrixForQubitArity = <Arity extends QubitArity>(
  qubitArity: Arity,
  rows: ReadonlyArray<ReadonlyArray<Complex>>,
): ReadonlyArray<ReadonlyArray<Complex>> => {
  const order = matrixOrderForArity(qubitArity);
  if (rows.length !== order) {
    throw new Error(`Expected ${order} rows for qubit arity ${qubitArity}.`);
  }
  if (rows.some((row) => row.length !== order)) {
    throw new Error(`Expected ${order} columns for qubit arity ${qubitArity}.`);
  }
  return freezeMatrix(rows);
};

export const makeOperator = <Arity extends QubitArity>(
  id: string,
  label: string,
  qubitArity: Arity,
  matrix: ReadonlyArray<ReadonlyArray<Complex>>,
): Operator<Arity> => ({
  id,
  label,
  qubitArity,
  matrix: matrixForQubitArity(qubitArity, matrix),
});

export const makeSingleQubitOperator = (
  id: string,
  label: string,
  entries: SingleQubitMatrixEntries,
): Operator<1> => makeOperator(id, label, 1, entries);

const scaleMatrix = (matrix: ReadonlyArray<ReadonlyArray<Complex>>, scalar: number): ReadonlyArray<ReadonlyArray<Complex>> =>
  freezeMatrix(matrix.map((row) => row.map((value) => complex.scale(value, scalar))));

export const scaleOperator = <Arity extends QubitArity>(operator: Operator<Arity>, scalar: number): Operator<Arity> =>
  makeOperator(operator.id, operator.label, operator.qubitArity, scaleMatrix(operator.matrix, scalar));

const zeroMatrix = (qubitArity: QubitArity): ReadonlyArray<ReadonlyArray<Complex>> =>
  matrixForQubitArity(
    qubitArity,
    Array.from({ length: matrixOrderForArity(qubitArity) }, () =>
      Array.from({ length: matrixOrderForArity(qubitArity) }, () => complex.from_real(0)),
    ),
  );

const identityMatrix = (qubitArity: QubitArity): ReadonlyArray<ReadonlyArray<Complex>> =>
  matrixForQubitArity(
    qubitArity,
    Array.from({ length: matrixOrderForArity(qubitArity) }, (_, row) =>
      Array.from({ length: matrixOrderForArity(qubitArity) }, (_, column) =>
        row === column ? complex.from_real(1) : complex.from_real(0),
      ),
    ),
  );

export const zeroOperator = <Arity extends QubitArity>(id: string, label: string, qubitArity: Arity): Operator<Arity> =>
  makeOperator(id, label, qubitArity, zeroMatrix(qubitArity));

export const identityOperator = <Arity extends QubitArity>(id: string, label: string, qubitArity: Arity): Operator<Arity> =>
  makeOperator(id, label, qubitArity, identityMatrix(qubitArity));

export const multiplyOperators = <Arity extends QubitArity>(
  id: string,
  label: string,
  left: Operator<Arity>,
  right: Operator<Arity>,
): Operator<Arity> => {
  const order = matrixOrderForArity(left.qubitArity);

  const product = Array.from({ length: order }, (_, row) =>
    Array.from({ length: order }, (_, column) => {
      let sum = complex.from_real(0);
      for (let pivot = 0; pivot < order; pivot += 1) {
        sum = complex.add(sum, complex.mult(left.matrix[row]![pivot]!, right.matrix[pivot]![column]!));
      }
      return sum;
    }),
  );

  return makeOperator(id, label, left.qubitArity, product);
};

export const tensorProductOperators = (
  id: string,
  label: string,
  left: Operator,
  right: Operator,
): Operator => {
  const qubitArity = left.qubitArity + right.qubitArity;
  if (qubitArity > 8) {
    throw new Error(`Tensor product arity ${qubitArity} exceeds supported max arity 8.`);
  }

  const leftOrder = matrixOrderForArity(left.qubitArity);
  const rightOrder = matrixOrderForArity(right.qubitArity);
  const totalOrder = leftOrder * rightOrder;
  const matrix = Array.from({ length: totalOrder }, (_, row) => {
    const rowLeft = Math.floor(row / rightOrder);
    const rowRight = row % rightOrder;

    return Array.from({ length: totalOrder }, (_, column) => {
      const colLeft = Math.floor(column / rightOrder);
      const colRight = column % rightOrder;
      return complex.mult(left.matrix[rowLeft]![colLeft]!, right.matrix[rowRight]![colRight]!);
    });
  });

  return makeOperator(id, label, qubitArity as QubitArity, matrix);
};

export type Block2x2<Arity extends NonMaxQubitArity> = readonly [
  readonly [Operator<Arity>, Operator<Arity>],
  readonly [Operator<Arity>, Operator<Arity>],
];

export const blockMatrix2x2 = <Arity extends NonMaxQubitArity>(
  id: string,
  label: string,
  blocks: Block2x2<Arity>,
): Operator<NextQubitArity<Arity>> => {
  const [[topLeft, topRight], [bottomLeft, bottomRight]] = blocks;
  const blockOrder = matrixOrderForArity(topLeft.qubitArity);

  const matrix = Array.from({ length: blockOrder * 2 }, (_, row) => {
    if (row < blockOrder) {
      return [...topLeft.matrix[row]!, ...topRight.matrix[row]!];
    }
    const blockRow = row - blockOrder;
    return [...bottomLeft.matrix[blockRow]!, ...bottomRight.matrix[blockRow]!];
  });

  return makeOperator(id, label, (topLeft.qubitArity + 1) as NextQubitArity<Arity>, matrix);
};

export const controlledOperator = <Arity extends NonMaxQubitArity>(
  id: string,
  label: string,
  target: Operator<Arity>,
): Operator<NextQubitArity<Arity>> => {
  const identityBlock = identityOperator(`id-${target.id}`, `I_${target.label}`, target.qubitArity);
  const zeroBlock = zeroOperator(`zero-${target.id}`, `0_${target.label}`, target.qubitArity);
  return blockMatrix2x2(id, label, [[identityBlock, zeroBlock], [zeroBlock, target]]);
};

const identityEntries = singleQubitMatrix(
  complex.from_real(1),
  complex.from_real(0),
  complex.from_real(0),
  complex.from_real(1),
);

const xEntries = singleQubitMatrix(
  complex.from_real(0),
  complex.from_real(1),
  complex.from_real(1),
  complex.from_real(0),
);

const yEntries = singleQubitMatrix(
  complex.from_real(0),
  complex.complex(0, -1),
  complex.complex(0, 1),
  complex.from_real(0),
);

const zEntries = singleQubitMatrix(
  complex.from_real(1),
  complex.from_real(0),
  complex.from_real(0),
  complex.from_real(-1),
);

const hRaw = makeSingleQubitOperator(
  "H",
  "H",
  singleQubitMatrix(
    complex.from_real(1),
    complex.from_real(1),
    complex.from_real(1),
    complex.from_real(-1),
  ),
);

const sEntries = singleQubitMatrix(
  complex.from_real(1),
  complex.from_real(0),
  complex.from_real(0),
  complex.complex(0, 1),
);

const tEntries = singleQubitMatrix(
  complex.from_real(1),
  complex.from_real(0),
  complex.from_real(0),
  complex.complex(Math.SQRT1_2, Math.SQRT1_2),
);

export const I: Operator<1> = makeSingleQubitOperator("I", "I", identityEntries);
export const X: Operator<1> = makeSingleQubitOperator("X", "X", xEntries);
export const Y: Operator<1> = makeSingleQubitOperator("Y", "Y", yEntries);
export const Z: Operator<1> = makeSingleQubitOperator("Z", "Z", zEntries);
export const H: Operator<1> = scaleOperator(hRaw, 1 / Math.sqrt(2));
export const S: Operator<1> = makeSingleQubitOperator("S", "S", sEntries);
export const T: Operator<1> = makeSingleQubitOperator("T", "T", tEntries);
export const M: Operator<1> = makeSingleQubitOperator("M", "M", identityEntries);
export const CNOT: Operator<2> = controlledOperator("CNOT", "CNOT", X);
export const SWAP: Operator<2> = makeOperator("SWAP", "SWAP", 2, [
  [complex.from_real(1), complex.from_real(0), complex.from_real(0), complex.from_real(0)],
  [complex.from_real(0), complex.from_real(0), complex.from_real(1), complex.from_real(0)],
  [complex.from_real(0), complex.from_real(1), complex.from_real(0), complex.from_real(0)],
  [complex.from_real(0), complex.from_real(0), complex.from_real(0), complex.from_real(1)],
]);
export const TOFFOLI: Operator<3> = controlledOperator("TOFFOLI", "TOFFOLI", CNOT);
export const CSWAP: Operator<3> = controlledOperator("CSWAP", "C-SWAP", SWAP);

export const builtinOperatorIds: readonly BuiltinSingleGateId[] = ["I", "X", "Y", "Z", "H", "S", "T", "M"];
export const builtinGateIds: readonly BuiltinGateId[] = [
  "I",
  "X",
  "Y",
  "Z",
  "H",
  "S",
  "T",
  "M",
  "CNOT",
  "SWAP",
  "TOFFOLI",
  "CSWAP",
];
