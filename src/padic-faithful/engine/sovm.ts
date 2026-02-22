import type { Matrix2, PAdicRawEffect, PAdicSovm } from "../types";
import { parseRawMatrix2 } from "./operator";
import { matrixAdd, identityMatrix, matrixEquals, matrixSelfAdjoint, zeroMatrix } from "./matrix";

export type SovmBuildResult = {
  sovm: PAdicSovm | null;
  error: string | null;
};

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

  const dimension = parsed[0]?.operator.length ?? 0;
  if (dimension === 0 || parsed.some((effect) => effect.operator.length !== dimension || effect.operator.some((row) => row.length !== dimension))) {
    return {
      sovm: null,
      error: "All F_i must have the same square dimension.",
    };
  }

  if (parsed.some((effect) => !matrixSelfAdjoint(effect.operator))) {
    return {
      sovm: null,
      error: "Each F_i must be selfadjoint.",
    };
  }

  let sum: Matrix2 = zeroMatrix(dimension);
  for (const effect of parsed) {
    sum = matrixAdd(sum, effect.operator);
  }

  if (!matrixEquals(sum, identityMatrix(dimension))) {
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
