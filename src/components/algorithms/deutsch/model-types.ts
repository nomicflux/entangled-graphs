import type { CircuitColumn, Qubit } from "../../../types";

export type DeutschOracleId = "const-0" | "const-1" | "balanced-id" | "balanced-not";
export type DeutschOracleClass = "constant" | "balanced";
export type DeutschDecisionClass = DeutschOracleClass;

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
