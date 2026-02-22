import type { Matrix2, PAdicStatisticalOperator, RawMatrix2 } from "../types";
import { parsePAdicScalarRaw } from "./parse";
import { equalPAdicScalars, pAdicScalarFromFraction, pAdicScalarToNumber } from "./scalar";
import { matrixSelfAdjoint, matrixTrace } from "./matrix";

export type OperatorBuildResult = {
  operator: PAdicStatisticalOperator | null;
  error: string | null;
};

export const parseRawMatrix2 = (rows: RawMatrix2, prime: number): Matrix2 =>
  rows.map((row) => row.map((entry) => parsePAdicScalarRaw(entry, prime)));

export const statisticalOperatorFromRaw = (rows: RawMatrix2, prime: number): OperatorBuildResult => {
  if (rows.length === 0 || rows.some((row) => row.length !== rows.length)) {
    return {
      operator: null,
      error: "rho must be square.",
    };
  }

  const parsed = parseRawMatrix2(rows, prime);
  if (!matrixSelfAdjoint(parsed)) {
    return {
      operator: null,
      error: "rho must be selfadjoint.",
    };
  }

  const traceScalar = matrixTrace(parsed);
  if (!equalPAdicScalars(traceScalar, pAdicScalarFromFraction(1n, 1n))) {
    return {
      operator: null,
      error: "rho must have trace one.",
    };
  }

  return {
    operator: {
      entries: parsed,
      dimension: parsed.length,
      traceScalar,
      trace: pAdicScalarToNumber(traceScalar),
    },
    error: null,
  };
};
