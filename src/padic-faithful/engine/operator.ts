import type { Matrix2, PAdicStatisticalOperator, RawMatrix2 } from "../types";
import { parsePAdicRaw } from "./parse";

const EPSILON = 1e-9;

export type OperatorBuildResult = {
  operator: PAdicStatisticalOperator | null;
  error: string | null;
};

export const parseRawMatrix2 = (rows: RawMatrix2, prime: number): Matrix2 => [
  [parsePAdicRaw(rows[0][0], prime), parsePAdicRaw(rows[0][1], prime)],
  [parsePAdicRaw(rows[1][0], prime), parsePAdicRaw(rows[1][1], prime)],
];

export const trace2x2 = (rows: Matrix2): number => rows[0][0] + rows[1][1];

export const isSelfAdjoint2x2 = (rows: Matrix2): boolean => Math.abs(rows[0][1] - rows[1][0]) <= EPSILON;

export const statisticalOperatorFromRaw = (rows: RawMatrix2, prime: number): OperatorBuildResult => {
  const parsed = parseRawMatrix2(rows, prime);
  if (!isSelfAdjoint2x2(parsed)) {
    return {
      operator: null,
      error: "rho must be selfadjoint (symmetric in this real-valued implementation).",
    };
  }

  const trace = trace2x2(parsed);
  if (Math.abs(trace - 1) > EPSILON) {
    return {
      operator: null,
      error: "rho must have trace one.",
    };
  }

  return {
    operator: {
      entries: parsed,
      trace,
    },
    error: null,
  };
};
