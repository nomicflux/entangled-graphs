import type { BasisProbability, BlochVector, CircuitColumn, Qubit } from "../../../types";
import type { PreparationTarget, PreparationTargetId, TargetVector } from "./model-types";
import * as complex from "../../../complex";
import { bloch_pair_from_ensemble, measurement_distribution_for_ensemble, simulate_columns_ensemble, tensor_product_qubits } from "../../../quantum";
import { resolveOperator } from "../../../state/operators";

const ketZero: Qubit = {
  a: complex.from_real(1),
  b: complex.from_real(0),
};

const resolveGate = (gate: string) => resolveOperator(gate, []);

export const PREPARATION_TARGETS: readonly PreparationTarget[] = [
  { id: "one", label: "|1>", hint: "Try X on this row." },
  { id: "plus", label: "|+>", hint: "Try H on this row." },
  { id: "minus", label: "|->", hint: "Try X then H on this row." },
];

const targetVectors: Record<PreparationTargetId, TargetVector> = {
  one: { x: 0, y: 0, z: -1 },
  plus: { x: 1, y: 0, z: 0 },
  minus: { x: -1, y: 0, z: 0 },
};

export const targetVectorFor = (target: PreparationTargetId): TargetVector => targetVectors[target];

export const preparationFidelity = (bloch: BlochVector, target: PreparationTargetId): number => {
  const vector = targetVectorFor(target);
  const dot = bloch.x * vector.x + bloch.y * vector.y + bloch.z * vector.z;
  return Math.max(0, Math.min(1, 0.5 * (1 + dot)));
};

const singleQubitColumns = (gates: ReadonlyArray<"I" | "X" | "H">): CircuitColumn[] =>
  gates.map((gate, index) => ({
    gates: [{ id: `prep-${index}`, gate, wires: [0] }],
  }));

export const preparingSingleQubitSnapshots = (gates: ReadonlyArray<"I" | "X" | "H">) =>
  simulate_columns_ensemble(tensor_product_qubits([ketZero]), singleQubitColumns(gates), resolveGate, 1);

export const preparingSingleQubitFinalDistribution = (gates: ReadonlyArray<"I" | "X" | "H">): BasisProbability[] => {
  const snapshots = preparingSingleQubitSnapshots(gates);
  return measurement_distribution_for_ensemble(snapshots[snapshots.length - 1]!);
};

export const preparingSingleQubitFinalBloch = (gates: ReadonlyArray<"I" | "X" | "H">): BlochVector => {
  const snapshots = preparingSingleQubitSnapshots(gates);
  return bloch_pair_from_ensemble(snapshots[snapshots.length - 1]!)[0]!;
};
