import type { CustomOperator, Operator } from "../types";
import * as complex from "../complex";
import { CUSTOM_OPERATOR_STORAGE_KEY } from "./constants";

export const normalizeOperator = (operator: Operator): Operator => {
  const values = [operator.o00, operator.o01, operator.o10, operator.o11];
  const norm = Math.sqrt(values.reduce((acc, value) => acc + complex.magnitude_squared(value), 0));

  if (norm === 0) {
    return operator;
  }

  const scale = 1 / norm;
  return {
    o00: complex.scale(operator.o00, scale),
    o01: complex.scale(operator.o01, scale),
    o10: complex.scale(operator.o10, scale),
    o11: complex.scale(operator.o11, scale),
  };
};

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

    return parsed.filter((candidate): candidate is CustomOperator => {
      if (typeof candidate !== "object" || candidate === null) {
        return false;
      }
      return typeof candidate.id === "string" && typeof candidate.label === "string" && typeof candidate.operator === "object";
    });
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
