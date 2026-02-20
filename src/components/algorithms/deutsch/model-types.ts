import type { CircuitColumn, Complex, Qubit } from "../../../types";

export type DeutschOracleId = "const-0" | "const-1" | "balanced-id" | "balanced-not";
export type DeutschOracleClass = "constant" | "balanced";
export type DeutschDecisionClass = DeutschOracleClass;
export type DeutschMode = "select" | "guess";

export type DeutschOracleDescriptor = {
  id: DeutschOracleId;
  label: string;
  functionLabel: string;
  oracleClass: DeutschOracleClass;
};

export type DeutschTruthRow = {
  x: 0 | 1;
  fx: 0 | 1;
};

export type DeutschInputs = readonly [Qubit, Qubit];

export type DeutschExpectedResult = {
  oracle: DeutschOracleDescriptor;
  columns: CircuitColumn[];
  finalDistribution: ReadonlyArray<{ basis: string; probability: number }>;
  q0ConstantProbability: number;
  q0BalancedProbability: number;
  predictedDecision: DeutschDecisionClass;
};

export type DeutschSampleResult = {
  basis: string;
  probability: number;
  q0Value: 0 | 1;
  predictedDecision: DeutschDecisionClass;
};

export type DeutschPathContribution = {
  x: 0 | 1;
  amplitude: Complex;
  magnitude: number;
  probability: number;
  phaseSign: -1 | 0 | 1;
};

export type DeutschInterferenceView = {
  stageIndex: number;
  stageLabel: string;
  supportInMinusSubspace: number;
  constantChannel: number;
  balancedChannel: number;
  contributions: readonly [DeutschPathContribution, DeutschPathContribution];
};

export type DeutschGuessState = {
  activeOracle: DeutschOracleId;
  guess: DeutschDecisionClass | null;
  revealed: boolean;
  correct: boolean | null;
};
