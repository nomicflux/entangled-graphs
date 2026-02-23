import type { PAdicScalar } from "./engine/scalar";

export type PAdicPrime = 2 | 3 | 5 | 7;

export type PAdicViewMode = "valuation_ring" | "digit_vector";

export type PAdicCircuitGate =
  | "I"
  | "X"
  | "Z"
  | "H"
  | "M"
  | "CNOT"
  | "CNOT_CONTROL"
  | "CNOT_TARGET"
  | null;

export type Matrix2 = PAdicScalar[][];

export type RawMatrix2 = string[][];

export type PAdicInputPreset =
  | "basis_0"
  | "basis_1"
  | "diag_balanced"
  | "offdiag_pos"
  | "offdiag_neg"
  | "shell_weighted";

export type PAdicStatisticalOperator = {
  entries: Matrix2;
  dimension: number;
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

export type PAdicOperatorEntryRow = {
  id: string;
  label: string;
  row: number;
  column: number;
  basisRow: string;
  basisColumn: string;
  isDiagonal: boolean;
  value_raw: number;
  value_text: string;
  v_p: number;
  abs_p: number;
  unitResidue: number | null;
  digits: PAdicDigitExpansion;
  w_norm: number;
};

export type PAdicOutcomeShell = {
  key: string;
  valuation: number;
  prefixGroups: ReadonlyArray<PAdicOutcomePrefixGroup>;
  rows: ReadonlyArray<PAdicOutcomeRow>;
};

export type PAdicOutcomePrefixGroup = {
  key: string;
  prefix: string;
  residue: number | null;
  rows: ReadonlyArray<PAdicOutcomeRow>;
};

export type PAdicStageCard = {
  id: string;
  title: string;
  subtitle: string;
  primary: string;
  secondary: string;
};

export type PAdicStageView = {
  id: string;
  index: number;
  label: string;
  columnIndex: number | null;
  dimension: number;
  trace: number;
  rows: ReadonlyArray<PAdicOutcomeRow>;
  entries: ReadonlyArray<PAdicOperatorEntryRow>;
  shells: ReadonlyArray<PAdicOutcomeShell>;
  dominantOutcomeLabel: string;
  dominantWeight: number;
  nonZeroEntryCount: number;
  nonZeroOffDiagonalCount: number;
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
  qubitCount: number;
  preparedInputs: Array<{ preset: PAdicInputPreset }>;
  columns: Array<{ gates: PAdicCircuitGate[] }>;
  selectedGate: PAdicCircuitGate;
  selectedOutcomeId: string | null;
};
