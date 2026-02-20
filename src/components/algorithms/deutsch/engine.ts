import type { BasisProbability, CircuitColumn, Complex, GateId, Operator, Qubit, QubitState } from "../../../types";
import * as complex from "../../../complex";
import { makeOperator } from "../../../operator";
import { measurement_distribution_for_ensemble, sample_circuit_run, simulate_columns_ensemble, tensor_product_qubits } from "../../../quantum";
import { resolveOperator } from "../../../state/operators";
import type {
  DeutschDecisionClass,
  DeutschExpectedResult,
  DeutschInputs,
  DeutschOracleClass,
  DeutschOracleDescriptor,
  DeutschOracleId,
  DeutschSampleResult,
  DeutschTruthRow,
} from "./model-types";

export const DEUTSCH_ORACLE_GATE_ID = "DEUTSCH_ORACLE";

const ketZero: Qubit = { a: complex.from_real(1), b: complex.from_real(0) };
export const DEFAULT_DEUTSCH_INPUTS: DeutschInputs = [ketZero, ketZero];

export const DEUTSCH_ORACLES: readonly DeutschOracleDescriptor[] = [
  { id: "const-0", label: "Constant 0", functionLabel: "f(x)=0", oracleClass: "constant" },
  { id: "const-1", label: "Constant 1", functionLabel: "f(x)=1", oracleClass: "constant" },
  { id: "balanced-id", label: "Balanced Identity", functionLabel: "f(x)=x", oracleClass: "balanced" },
  { id: "balanced-not", label: "Balanced Negation", functionLabel: "f(x)=not x", oracleClass: "balanced" },
];

const oracleDescriptorById: Record<DeutschOracleId, DeutschOracleDescriptor> = {
  "const-0": DEUTSCH_ORACLES[0],
  "const-1": DEUTSCH_ORACLES[1],
  "balanced-id": DEUTSCH_ORACLES[2],
  "balanced-not": DEUTSCH_ORACLES[3],
};

const oracleFunction = (id: DeutschOracleId, x: 0 | 1): 0 | 1 => {
  if (id === "const-0") {
    return 0;
  }
  if (id === "const-1") {
    return 1;
  }
  if (id === "balanced-id") {
    return x;
  }
  return x === 0 ? 1 : 0;
};

const permutationMatrix = (mapping: readonly number[]): ReadonlyArray<ReadonlyArray<Complex>> =>
  Array.from({ length: 4 }, (_, row) =>
    Array.from({ length: 4 }, (_, column) =>
      mapping[column] === row ? complex.from_real(1) : complex.from_real(0),
    ),
  );

const oracleOperator = (id: DeutschOracleId): Operator<2> => {
  const mapping = [0, 1, 2, 3].map((sourceIndex) => {
    const x = ((sourceIndex >> 1) & 1) as 0 | 1;
    const y = (sourceIndex & 1) as 0 | 1;
    const fx = oracleFunction(id, x);
    return (x << 1) | (y ^ fx);
  });
  return makeOperator(`deutsch-${id}`, `U_f (${oracleDescriptorById[id].functionLabel})`, 2, permutationMatrix(mapping));
};

const oracleOperatorById: Record<DeutschOracleId, Operator<2>> = {
  "const-0": oracleOperator("const-0"),
  "const-1": oracleOperator("const-1"),
  "balanced-id": oracleOperator("balanced-id"),
  "balanced-not": oracleOperator("balanced-not"),
};

const deutschResolver = (oracleId: DeutschOracleId) => {
  const oracle = oracleOperatorById[oracleId];
  return (gate: GateId): Operator | null => {
    if (gate === DEUTSCH_ORACLE_GATE_ID) {
      return oracle;
    }
    return resolveOperator(gate, []);
  };
};

export const deutschColumns = (): CircuitColumn[] => [
  { gates: [{ id: "deutsch-init-x-q1", gate: "X", wires: [1] }] },
  {
    gates: [
      { id: "deutsch-h-q0", gate: "H", wires: [0] },
      { id: "deutsch-h-q1", gate: "H", wires: [1] },
    ],
  },
  { gates: [{ id: "deutsch-oracle", gate: DEUTSCH_ORACLE_GATE_ID, wires: [0, 1] }] },
  { gates: [{ id: "deutsch-final-h-q0", gate: "H", wires: [0] }] },
];

const predictedDecisionFromQ0 = (q0BalancedProbability: number): DeutschDecisionClass =>
  q0BalancedProbability > 0.5 ? "balanced" : "constant";

const q0Probabilities = (distribution: ReadonlyArray<BasisProbability>): { constant: number; balanced: number } => {
  let constant = 0;
  let balanced = 0;
  for (const entry of distribution) {
    if (entry.basis.startsWith("0")) {
      constant += entry.probability;
    } else {
      balanced += entry.probability;
    }
  }
  return { constant, balanced };
};

const preparedState = (inputs: DeutschInputs): QubitState => tensor_product_qubits([inputs[0], inputs[1]]);

export const deutschOracleDescriptor = (oracleId: DeutschOracleId): DeutschOracleDescriptor => oracleDescriptorById[oracleId];

export const deutschOracleTruthTable = (oracleId: DeutschOracleId): readonly DeutschTruthRow[] => [
  { x: 0, fx: oracleFunction(oracleId, 0) },
  { x: 1, fx: oracleFunction(oracleId, 1) },
];

export const deutschOracleClass = (oracleId: DeutschOracleId): DeutschOracleClass => oracleDescriptorById[oracleId].oracleClass;

export const deutschExpectedResult = (
  oracleId: DeutschOracleId,
  inputs: DeutschInputs = DEFAULT_DEUTSCH_INPUTS,
): DeutschExpectedResult => {
  const columns = deutschColumns();
  const snapshots = simulate_columns_ensemble(preparedState(inputs), columns, deutschResolver(oracleId), 2);
  const finalEnsemble = snapshots[snapshots.length - 1]!;
  const finalDistribution = measurement_distribution_for_ensemble(finalEnsemble);
  const q0 = q0Probabilities(finalDistribution);

  return {
    oracle: deutschOracleDescriptor(oracleId),
    columns,
    finalDistribution,
    q0ConstantProbability: q0.constant,
    q0BalancedProbability: q0.balanced,
    predictedDecision: predictedDecisionFromQ0(q0.balanced),
  };
};

export const deutschSampleResult = (
  oracleId: DeutschOracleId,
  inputs: DeutschInputs = DEFAULT_DEUTSCH_INPUTS,
  random: () => number = Math.random,
): DeutschSampleResult => {
  const sampled = sample_circuit_run(preparedState(inputs), deutschColumns(), deutschResolver(oracleId), 2, random);
  const q0Value = sampled.finalSample.basis.startsWith("0") ? 0 : 1;
  return {
    basis: sampled.finalSample.basis,
    probability: sampled.finalSample.probability,
    q0Value,
    predictedDecision: q0Value === 0 ? "constant" : "balanced",
  };
};

export const deutschStageLabels: readonly string[] = ["Prepared", "Init X (q1)", "Hadamards", "Oracle U_f", "Final H (q0)"];
