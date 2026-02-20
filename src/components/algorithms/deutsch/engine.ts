import type { BasisProbability, CircuitColumn, Complex, GateId, Operator, Qubit, QubitState, StateEnsemble } from "../../../types";
import * as complex from "../../../complex";
import { makeOperator } from "../../../operator";
import { measurement_distribution_for_ensemble, sample_circuit_run, simulate_columns_ensemble, tensor_product_qubits } from "../../../quantum";
import { resolveOperator } from "../../../state/operators";
import type {
  DeutschDecisionClass,
  DeutschExpectedResult,
  DeutschInterferenceView,
  DeutschInputs,
  DeutschOracleClass,
  DeutschOracleDescriptor,
  DeutschOracleId,
  DeutschPathContribution,
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
export const deutschPreparedState = (inputs: DeutschInputs = DEFAULT_DEUTSCH_INPUTS): QubitState => preparedState(inputs);

export const deutschEnsembleSnapshots = (
  oracleId: DeutschOracleId,
  inputs: DeutschInputs = DEFAULT_DEUTSCH_INPUTS,
): StateEnsemble[] => simulate_columns_ensemble(preparedState(inputs), deutschColumns(), deutschResolver(oracleId), 2);

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
  const snapshots = deutschEnsembleSnapshots(oracleId, inputs);
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

const sqrtHalf = Math.SQRT1_2;

const minusProjectAmplitude = (a0: Complex, a1: Complex): Complex =>
  complex.scale(complex.add(a0, complex.scale(a1, -1)), sqrtHalf);

const magnitude = (value: Complex): number => Math.sqrt(complex.magnitude_squared(value));

const phaseSign = (value: Complex): -1 | 0 | 1 => {
  if (Math.abs(value.real) < 1e-9 && Math.abs(value.imag) < 1e-9) {
    return 0;
  }
  return value.real < 0 ? -1 : 1;
};

const interferenceChannels = (alpha0: Complex, alpha1: Complex): { constant: number; balanced: number } => {
  const plus = complex.add(alpha0, alpha1);
  const minus = complex.add(alpha0, complex.scale(alpha1, -1));
  return {
    constant: complex.magnitude_squared(plus) * 0.5,
    balanced: complex.magnitude_squared(minus) * 0.5,
  };
};

export const deutschInterferenceForState = (
  state: QubitState,
  stageIndex: number,
  stageLabel: string,
): DeutschInterferenceView => {
  const a00 = state[0] ?? complex.from_real(0);
  const a01 = state[1] ?? complex.from_real(0);
  const a10 = state[2] ?? complex.from_real(0);
  const a11 = state[3] ?? complex.from_real(0);

  const alpha0 = minusProjectAmplitude(a00, a01);
  const alpha1 = minusProjectAmplitude(a10, a11);

  const path0: DeutschPathContribution = {
    x: 0,
    amplitude: alpha0,
    magnitude: magnitude(alpha0),
    probability: complex.magnitude_squared(alpha0),
    phaseSign: phaseSign(alpha0),
  };
  const path1: DeutschPathContribution = {
    x: 1,
    amplitude: alpha1,
    magnitude: magnitude(alpha1),
    probability: complex.magnitude_squared(alpha1),
    phaseSign: phaseSign(alpha1),
  };

  const channels = interferenceChannels(alpha0, alpha1);
  return {
    stageIndex,
    stageLabel,
    supportInMinusSubspace: path0.probability + path1.probability,
    constantChannel: channels.constant,
    balancedChannel: channels.balanced,
    contributions: [path0, path1],
  };
};

export const deutschInterferenceTimeline = (
  oracleId: DeutschOracleId,
  inputs: DeutschInputs = DEFAULT_DEUTSCH_INPUTS,
): ReadonlyArray<DeutschInterferenceView> => {
  const snapshots = deutschEnsembleSnapshots(oracleId, inputs);
  return snapshots.map((ensemble, index) =>
    deutschInterferenceForState(ensemble[0]?.state ?? deutschPreparedState(inputs), index, deutschStageLabels[index] ?? `t${index}`),
  );
};
