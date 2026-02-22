import type { PAdicScalar } from "./engine/scalar";

export type PAdicPrime = 2 | 3 | 5 | 7;

export type PAdicViewMode = "valuation_ring" | "digit_vector";

export type Matrix2 = [[PAdicScalar, PAdicScalar], [PAdicScalar, PAdicScalar]];

export type RawMatrix2 = [[string, string], [string, string]];

export type PAdicStatisticalOperator = {
  entries: Matrix2;
  traceScalar: PAdicScalar;
  trace: number;
};

export type PAdicSovmEffect = {
  id: string;
  label: string;
  operator: Matrix2;
};

export type PAdicSovm = {
  effects: ReadonlyArray<PAdicSovmEffect>;
};

export type PAdicDigitExpansion = {
  sign: 1 | -1;
  digits: ReadonlyArray<number>;
  truncated: boolean;
  text: string;
};

export type PAdicOutcomeRow = {
  id: string;
  label: string;
  basis: string;
  w_raw: number;
  v_p: number;
  abs_p: number;
  unitResidue: number | null;
  digits: PAdicDigitExpansion;
  w_norm: number;
};

export type PAdicOutcomeShell = {
  key: string;
  valuation: number;
  rows: ReadonlyArray<PAdicOutcomeRow>;
};

export type PAdicStageCard = {
  id: string;
  title: string;
  subtitle: string;
  primary: string;
  secondary: string;
};

export type PAdicDerivedNode = {
  id: string;
  label: string;
  x: number;
  y: number;
  abs_p: number;
  w_norm: number;
  v_p: number;
  residue: number | null;
};

export type PAdicRawEffect = {
  id: string;
  label: string;
  rows: RawMatrix2;
};

export type PAdicFaithfulState = {
  prime: PAdicPrime;
  viewMode: PAdicViewMode;
  rhoRows: RawMatrix2;
  effects: PAdicRawEffect[];
  selectedOutcomeId: string | null;
};
