import type { CircuitColumn, GateId, Operator, QubitState, StateEnsemble, WeightedStateBranch } from "../types";
import * as complex from "../complex";
import { apply_operator_on_wires, apply_single_qubit_gate, isSingleQubitOperator } from "./core";

export type GateResolver = (gate: GateId) => Operator | null;

const branchEpsilon = 1e-12;
const isMeasurementGate = (gate: GateId): boolean => gate === "M";

const apply_column = (state: QubitState, column: CircuitColumn, resolveGate: GateResolver, qubitCount: number): QubitState => {
  let next = state;

  for (const gate of column.gates) {
    const operator = resolveGate(gate.gate);
    if (operator === null) {
      continue;
    }

    if (isSingleQubitOperator(operator)) {
      next = apply_single_qubit_gate(next, operator, gate.wires[0]!, qubitCount);
      continue;
    }

    next = apply_operator_on_wires(next, operator, gate.wires, qubitCount);
  }

  return next;
};

const probability_mass = (state: QubitState): number =>
  state.reduce((acc, amplitude) => acc + complex.magnitude_squared(amplitude), 0);

const normalize_state = (state: QubitState): QubitState => {
  const mass = probability_mass(state);
  if (mass <= branchEpsilon) {
    return state.map(() => complex.from_real(0));
  }

  const factor = 1 / Math.sqrt(mass);
  return state.map((amplitude) => complex.scale(amplitude, factor));
};

const project_state_on_wire = (
  state: QubitState,
  wire: number,
  measuredValue: 0 | 1,
  qubitCount: number,
): QubitState => {
  const wireMask = 1 << (qubitCount - 1 - wire);
  return state.map((amplitude, index) => {
    const bit = (index & wireMask) === 0 ? 0 : 1;
    return bit === measuredValue ? amplitude : complex.from_real(0);
  });
};

export const measure_state_on_wire = (
  state: QubitState,
  wire: number,
  qubitCount: number,
): WeightedStateBranch[] => {
  const projectedZero = project_state_on_wire(state, wire, 0, qubitCount);
  const projectedOne = project_state_on_wire(state, wire, 1, qubitCount);
  const zeroMass = probability_mass(projectedZero);
  const oneMass = probability_mass(projectedOne);
  const branches: WeightedStateBranch[] = [];

  if (zeroMass > branchEpsilon) {
    branches.push({ weight: zeroMass, state: normalize_state(projectedZero) });
  }
  if (oneMass > branchEpsilon) {
    branches.push({ weight: oneMass, state: normalize_state(projectedOne) });
  }

  return branches;
};

const normalize_ensemble_weights = (ensemble: StateEnsemble): StateEnsemble => {
  const total = ensemble.reduce((acc, branch) => acc + branch.weight, 0);
  if (total <= branchEpsilon) {
    return [];
  }
  if (Math.abs(total - 1) <= 1e-9) {
    return ensemble;
  }
  return ensemble.map((branch) => ({ ...branch, weight: branch.weight / total }));
};

const apply_unitary_to_ensemble = (
  ensemble: StateEnsemble,
  operator: Operator,
  wires: ReadonlyArray<number>,
  qubitCount: number,
): StateEnsemble => {
  if (isSingleQubitOperator(operator)) {
    return ensemble.map((branch) => ({
      weight: branch.weight,
      state: apply_single_qubit_gate(branch.state, operator, wires[0]!, qubitCount),
    }));
  }

  return ensemble.map((branch) => ({
    weight: branch.weight,
    state: apply_operator_on_wires(branch.state, operator, wires, qubitCount),
  }));
};

const apply_measurement_to_ensemble = (
  ensemble: StateEnsemble,
  wire: number,
  qubitCount: number,
): StateEnsemble => {
  const next: WeightedStateBranch[] = [];

  for (const branch of ensemble) {
    const outcomes = measure_state_on_wire(branch.state, wire, qubitCount);
    for (const outcome of outcomes) {
      const weightedProbability = branch.weight * outcome.weight;
      if (weightedProbability <= branchEpsilon) {
        continue;
      }
      next.push({
        weight: weightedProbability,
        state: outcome.state,
      });
    }
  }

  return normalize_ensemble_weights(next);
};

const apply_column_to_ensemble = (
  ensemble: StateEnsemble,
  column: CircuitColumn,
  resolveGate: GateResolver,
  qubitCount: number,
): StateEnsemble => {
  let next = ensemble;

  for (const gate of column.gates) {
    if (isMeasurementGate(gate.gate)) {
      next = apply_measurement_to_ensemble(next, gate.wires[0]!, qubitCount);
      continue;
    }

    const operator = resolveGate(gate.gate);
    if (operator === null) {
      continue;
    }

    next = apply_unitary_to_ensemble(next, operator, gate.wires, qubitCount);
  }

  return next;
};

export const simulate_columns_ensemble = (
  prepared: QubitState,
  columns: CircuitColumn[],
  resolveGate: GateResolver,
  qubitCount: number,
): StateEnsemble[] => {
  const snapshots: StateEnsemble[] = [[{ weight: 1, state: prepared }]];
  let current: StateEnsemble = snapshots[0]!;

  for (const column of columns) {
    current = apply_column_to_ensemble(current, column, resolveGate, qubitCount);
    snapshots.push(current);
  }

  return snapshots;
};

export function simulate_columns(
  prepared: QubitState,
  columns: CircuitColumn[],
  resolveGate: GateResolver,
  qubitCount: number,
): QubitState[] {
  const snapshots: QubitState[] = [prepared];
  let current = prepared;

  for (const column of columns) {
    current = apply_column(current, column, resolveGate, qubitCount);
    snapshots.push(current);
  }

  return snapshots;
}
