import type { Matrix2, PAdicStatisticalOperator, RawMatrix2 } from "../types";
import { parsePAdicScalarRaw } from "./parse";
import { addPAdicScalars, equalPAdicScalars, pAdicScalarFromFraction, pAdicScalarToNumber, type PAdicScalar } from "./scalar";

export type OperatorBuildResult = {
  operator: PAdicStatisticalOperator | null;
  error: string | null;
};

export const parseRawMatrix2 = (rows: RawMatrix2, prime: number): Matrix2 => [
  [parsePAdicScalarRaw(rows[0][0], prime), parsePAdicScalarRaw(rows[0][1], prime)],
  [parsePAdicScalarRaw(rows[1][0], prime), parsePAdicScalarRaw(rows[1][1], prime)],
];

export const trace2x2 = (rows: Matrix2): PAdicScalar => addPAdicScalars(rows[0][0], rows[1][1]);

export const isSelfAdjoint2x2 = (rows: Matrix2): boolean => equalPAdicScalars(rows[0][1], rows[1][0]);

export const statisticalOperatorFromRaw = (rows: RawMatrix2, prime: number): OperatorBuildResult => {
  const parsed = parseRawMatrix2(rows, prime);
  if (!isSelfAdjoint2x2(parsed)) {
    return {
      operator: null,
      error: "rho must be selfadjoint.",
    };
  }

  const traceScalar = trace2x2(parsed);
  if (!equalPAdicScalars(traceScalar, pAdicScalarFromFraction(1n, 1n))) {
    return {
      operator: null,
      error: "rho must have trace one.",
    };
  }

  return {
    operator: {
      entries: parsed,
      traceScalar,
      trace: pAdicScalarToNumber(traceScalar),
    },
    error: null,
  };
};
