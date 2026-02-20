import type {
  BasisProbability,
  CircuitColumn,
  GateId,
  Operator,
  QubitState,
  StateEnsemble,
  WeightedStateBranch,
} from "../types";
import * as complex from "../complex";
import { apply_operator_on_wires, apply_single_qubit_gate, isSingleQubitOperator } from "./core";
import { measurement_distribution, sample_distribution } from "./measurement";

export type GateResolver = (gate: GateId) => Operator | null;
type RandomSource = () => number;

export type CircuitMeasurementOutcome = {
  column: number;
  gateId: string;
  wire: number;
  value: 0 | 1;
  probability: number;
};

export type SamplingReplayOptions = {
  priorOutcomes?: ReadonlyArray<Pick<CircuitMeasurementOutcome, "gateId" | "value">>;
  resampleFromGateId?: string;
};

export type SampledCircuitRun = {
  finalState: QubitState;
  finalSample: {
    basis: BasisProbability["basis"];
    probability: number;
  };
  outcomes: ReadonlyArray<CircuitMeasurementOutcome>;
};

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

const flip_state_on_wire = (
  state: QubitState,
  wire: number,
  qubitCount: number,
): QubitState => {
  const wireMask = 1 << (qubitCount - 1 - wire);
  const next = state.map((amplitude) => ({ ...amplitude }));

  for (let index = 0; index < state.length; index += 1) {
    if ((index & wireMask) !== 0) {
      continue;
    }
    const partner = index | wireMask;
    next[index] = state[partner]!;
    next[partner] = state[index]!;
  }

  return next;
};

const reset_measured_wire_to_zero = (
  state: QubitState,
  wire: number,
  measuredValue: 0 | 1,
  qubitCount: number,
): QubitState => (measuredValue === 0 ? state : flip_state_on_wire(state, wire, qubitCount));

const select_measurement_on_wire = (
  state: QubitState,
  wire: number,
  qubitCount: number,
  selectedValue: 0 | 1,
): {
  value: 0 | 1;
  probability: number;
  state: QubitState;
} | null => {
  const outcomes = measure_state_on_wire(state, wire, qubitCount);
  const selected = outcomes.find((outcome) => outcome.value === selectedValue);
  if (!selected) {
    return null;
  }
  return {
    value: selected.value,
    probability: selected.weight,
    state: selected.state,
  };
};

const sample_measurement_on_wire = (
  state: QubitState,
  wire: number,
  qubitCount: number,
  randomValue: number,
): {
  value: 0 | 1;
  probability: number;
  state: QubitState;
} => {
  const projectedZero = project_state_on_wire(state, wire, 0, qubitCount);
  const projectedOne = project_state_on_wire(state, wire, 1, qubitCount);
  const zeroMass = probability_mass(projectedZero);
  const oneMass = probability_mass(projectedOne);
  const total = zeroMass + oneMass;

  if (total <= branchEpsilon) {
    return {
      value: 0,
      probability: 0,
      state: state.map((amplitude) => ({ ...amplitude })),
    };
  }

  const threshold = randomValue * total;
  if (threshold <= zeroMass || oneMass <= branchEpsilon) {
    return {
      value: 0,
      probability: zeroMass / total,
      state: normalize_state(projectedZero),
    };
  }

  return {
    value: 1,
    probability: oneMass / total,
    state: normalize_state(projectedOne),
  };
};

export const measure_state_on_wire = (
  state: QubitState,
  wire: number,
  qubitCount: number,
): Array<WeightedStateBranch & { value: 0 | 1 }> => {
  const projectedZero = project_state_on_wire(state, wire, 0, qubitCount);
  const projectedOne = project_state_on_wire(state, wire, 1, qubitCount);
  const zeroMass = probability_mass(projectedZero);
  const oneMass = probability_mass(projectedOne);
  const branches: Array<WeightedStateBranch & { value: 0 | 1 }> = [];

  if (zeroMass > branchEpsilon) {
    branches.push({ weight: zeroMass, value: 0, state: normalize_state(projectedZero) });
  }
  if (oneMass > branchEpsilon) {
    branches.push({ weight: oneMass, value: 1, state: normalize_state(projectedOne) });
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
        state: reset_measured_wire_to_zero(outcome.state, wire, outcome.value, qubitCount),
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

export const sample_circuit_run = (
  prepared: QubitState,
  columns: CircuitColumn[],
  resolveGate: GateResolver,
  qubitCount: number,
  random: RandomSource = Math.random,
  replay: SamplingReplayOptions = {},
): SampledCircuitRun => {
  const replayByGateId = new Map((replay.priorOutcomes ?? []).map((entry) => [entry.gateId, entry.value]));
  let replayLocked = replay.resampleFromGateId !== undefined;
  let current = prepared;
  const outcomes: CircuitMeasurementOutcome[] = [];

  for (let columnIndex = 0; columnIndex < columns.length; columnIndex += 1) {
    const column = columns[columnIndex]!;
    for (const gate of column.gates) {
      if (isMeasurementGate(gate.gate)) {
        const shouldReplay = replayLocked && gate.id !== replay.resampleFromGateId;
        const replayedValue = shouldReplay ? replayByGateId.get(gate.id) : undefined;
        const sampled =
          replayedValue === undefined
            ? sample_measurement_on_wire(current, gate.wires[0]!, qubitCount, random())
            : (select_measurement_on_wire(current, gate.wires[0]!, qubitCount, replayedValue) ??
              sample_measurement_on_wire(current, gate.wires[0]!, qubitCount, random()));

        outcomes.push({
          column: columnIndex,
          gateId: gate.id,
          wire: gate.wires[0]!,
          value: sampled.value,
          probability: sampled.probability,
        });
        current = reset_measured_wire_to_zero(sampled.state, gate.wires[0]!, sampled.value, qubitCount);
        if (gate.id === replay.resampleFromGateId) {
          replayLocked = false;
        }
        continue;
      }

      const operator = resolveGate(gate.gate);
      if (operator === null) {
        continue;
      }

      if (isSingleQubitOperator(operator)) {
        current = apply_single_qubit_gate(current, operator, gate.wires[0]!, qubitCount);
        continue;
      }

      current = apply_operator_on_wires(current, operator, gate.wires, qubitCount);
    }
  }

  const finalSample = sample_distribution(measurement_distribution(current), random());
  return { finalState: current, finalSample, outcomes };
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
