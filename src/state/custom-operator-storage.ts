import * as complex from "../complex";
import { makeSingleQubitOperator, matrixForQubitArity } from "../operator";
import type { Complex, CustomOperator, Operator, QubitArity } from "../types";
import { CUSTOM_OPERATOR_STORAGE_KEY } from "./constants";

type LegacyOperator = {
  o00: Complex;
  o01: Complex;
  o10: Complex;
  o11: Complex;
};

type LegacyCustomOperator = {
  id: string;
  label: string;
  operator: LegacyOperator;
};

const normalizeMatrix = (matrix: ReadonlyArray<ReadonlyArray<Complex>>): ReadonlyArray<ReadonlyArray<Complex>> => {
  const norm = Math.sqrt(
    matrix.reduce((acc, row) => acc + row.reduce((rowAcc, value) => rowAcc + complex.magnitude_squared(value), 0), 0),
  );

  if (norm === 0) {
    return matrix;
  }

  const factor = 1 / norm;
  return matrix.map((row) => row.map((value) => complex.scale(value, factor)));
};

export const normalizeOperator = <Arity extends QubitArity>(operator: Operator<Arity>): Operator<Arity> => ({
  ...operator,
  matrix: normalizeMatrix(operator.matrix),
});

const parseLegacy = (candidate: LegacyCustomOperator): CustomOperator => {
  const entries = [
    [candidate.operator.o00, candidate.operator.o01],
    [candidate.operator.o10, candidate.operator.o11],
  ] as const;
  return normalizeOperator(makeSingleQubitOperator(candidate.id, candidate.label, entries));
};

const parseCurrent = (candidate: CustomOperator): CustomOperator =>
  normalizeOperator({
    ...candidate,
    matrix: matrixForQubitArity(candidate.qubitArity, candidate.matrix),
  });

export const loadCustomOperators = (): CustomOperator[] => {
  if (typeof window === "undefined") {
    return [];
  }

  try {
    const raw = window.localStorage.getItem(CUSTOM_OPERATOR_STORAGE_KEY);
    if (!raw) {
      return [];
    }

    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) {
      return [];
    }

    const customOperators: CustomOperator[] = [];

    for (const candidate of parsed) {
      if (typeof candidate !== "object" || candidate === null) {
        continue;
      }

      if ("operator" in candidate) {
        customOperators.push(parseLegacy(candidate as LegacyCustomOperator));
        continue;
      }

      customOperators.push(parseCurrent(candidate as CustomOperator));
    }

    return customOperators;
  } catch {
    return [];
  }
};

export const persistCustomOperators = (customOperators: CustomOperator[]): void => {
  if (typeof window === "undefined") {
    return;
  }

  window.localStorage.setItem(CUSTOM_OPERATOR_STORAGE_KEY, JSON.stringify(customOperators));
};
