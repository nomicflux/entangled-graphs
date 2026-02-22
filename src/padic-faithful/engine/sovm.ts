import type { Matrix2, PAdicRawEffect, PAdicSovm } from "../types";
import { parseRawMatrix2, isSelfAdjoint2x2 } from "./operator";
import { addPAdicScalars, equalPAdicScalars, pAdicScalarFromFraction } from "./scalar";

export type SovmBuildResult = {
  sovm: PAdicSovm | null;
  error: string | null;
};

const add2x2 = (left: Matrix2, right: Matrix2): Matrix2 => [
  [addPAdicScalars(left[0][0], right[0][0]), addPAdicScalars(left[0][1], right[0][1])],
  [addPAdicScalars(left[1][0], right[1][0]), addPAdicScalars(left[1][1], right[1][1])],
];

const identity2x2 = (): Matrix2 => [
  [pAdicScalarFromFraction(1n), pAdicScalarFromFraction(0n)],
  [pAdicScalarFromFraction(0n), pAdicScalarFromFraction(1n)],
];

const equals2x2 = (left: Matrix2, right: Matrix2): boolean =>
  equalPAdicScalars(left[0][0], right[0][0]) &&
  equalPAdicScalars(left[0][1], right[0][1]) &&
  equalPAdicScalars(left[1][0], right[1][0]) &&
  equalPAdicScalars(left[1][1], right[1][1]);

export const sovmFromRawEffects = (effects: ReadonlyArray<PAdicRawEffect>, prime: number): SovmBuildResult => {
  if (effects.length === 0) {
    return {
      sovm: null,
      error: "SOVM must contain at least one effect.",
    };
  }

  const parsed = effects.map((effect) => ({
    ...effect,
    operator: parseRawMatrix2(effect.rows, prime),
  }));

  if (parsed.some((effect) => !isSelfAdjoint2x2(effect.operator))) {
    return {
      sovm: null,
      error: "Each F_i must be selfadjoint.",
    };
  }

  let sum: Matrix2 = [
    [pAdicScalarFromFraction(0n), pAdicScalarFromFraction(0n)],
    [pAdicScalarFromFraction(0n), pAdicScalarFromFraction(0n)],
  ];
  for (const effect of parsed) {
    sum = add2x2(sum, effect.operator);
  }

  if (!equals2x2(sum, identity2x2())) {
    return {
      sovm: null,
      error: "SOVM effects must sum to identity.",
    };
  }

  return {
    sovm: {
      effects: parsed.map((effect) => ({
        id: effect.id,
        label: effect.label,
        operator: effect.operator,
      })),
    },
    error: null,
  };
};
