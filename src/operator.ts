import * as complex from "./complex";
import type { BuiltinGateId, BuiltinSingleGateId, Complex, Operator, QubitArity } from "./types";

export type SingleQubitMatrixEntries = readonly [
  readonly [Complex, Complex],
  readonly [Complex, Complex],
];

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

const r = complex.from_real;
const cnotMatrix = matrixForQubitArity(2, [
  [r(1), r(0), r(0), r(0)],
  [r(0), r(1), r(0), r(0)],
  [r(0), r(0), r(0), r(1)],
  [r(0), r(0), r(1), r(0)],
]);

const toffoliMatrix = matrixForQubitArity(3, [
  [r(1), r(0), r(0), r(0), r(0), r(0), r(0), r(0)],
  [r(0), r(1), r(0), r(0), r(0), r(0), r(0), r(0)],
  [r(0), r(0), r(1), r(0), r(0), r(0), r(0), r(0)],
  [r(0), r(0), r(0), r(1), r(0), r(0), r(0), r(0)],
  [r(0), r(0), r(0), r(0), r(1), r(0), r(0), r(0)],
  [r(0), r(0), r(0), r(0), r(0), r(1), r(0), r(0)],
  [r(0), r(0), r(0), r(0), r(0), r(0), r(0), r(1)],
  [r(0), r(0), r(0), r(0), r(0), r(0), r(1), r(0)],
]);

export const I: Operator<1> = makeSingleQubitOperator("I", "I", identityEntries);
export const X: Operator<1> = makeSingleQubitOperator("X", "X", xEntries);
export const H: Operator<1> = scaleOperator(hRaw, 1 / Math.sqrt(2));
export const S: Operator<1> = makeSingleQubitOperator("S", "S", sEntries);
export const CNOT: Operator<2> = makeOperator("CNOT", "CNOT", 2, cnotMatrix);
export const TOFFOLI: Operator<3> = makeOperator("TOFFOLI", "TOFFOLI", 3, toffoliMatrix);

export const builtinOperatorIds: readonly BuiltinSingleGateId[] = ["I", "X", "H", "S"];
export const builtinGateIds: readonly BuiltinGateId[] = ["I", "X", "H", "S", "CNOT", "TOFFOLI"];
