import type { CircuitColumn, Operator, StateEnsemble, WeightedStateBranch } from "../../types";
import type { PAdicMeasurementModel } from "../../padic-config";
import { apply_operator_on_wires, apply_single_qubit_gate, isSingleQubitOperator } from "../core";
import { branchEpsilon, isMeasurementGate } from "./constants";
import { measure_state_on_wire_for_model } from "./measurement-model";
import type { PAdicGateResolver } from "./types";

const normalizeEnsembleWeights = (ensemble: StateEnsemble): StateEnsemble => {
  const total = ensemble.reduce((acc, branch) => acc + branch.weight, 0);
  if (total <= branchEpsilon) {
    return [];
  }

  if (Math.abs(total - 1) <= 1e-9) {
    return ensemble;
  }

  return ensemble.map((branch) => ({ ...branch, weight: branch.weight / total }));
};

const applyUnitaryToEnsemble = (
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

const applyMeasurementToEnsembleForModel = (
  ensemble: StateEnsemble,
  wire: number,
  qubitCount: number,
  p: number,
  model: PAdicMeasurementModel,
): StateEnsemble => {
  const next: WeightedStateBranch[] = [];

  for (const branch of ensemble) {
    const outcomes = measure_state_on_wire_for_model(branch.state, wire, qubitCount, p, model);
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

  return normalizeEnsembleWeights(next);
};

const applyColumnToEnsembleForModel = (
  ensemble: StateEnsemble,
  column: CircuitColumn,
  resolveGate: PAdicGateResolver,
  qubitCount: number,
  p: number,
  model: PAdicMeasurementModel,
): StateEnsemble => {
  let next = ensemble;

  for (const gate of column.gates) {
    if (isMeasurementGate(gate.gate)) {
      next = applyMeasurementToEnsembleForModel(next, gate.wires[0]!, qubitCount, p, model);
      continue;
    }

    const operator = resolveGate(gate.gate);
    if (operator === null) {
      continue;
    }

    next = applyUnitaryToEnsemble(next, operator, gate.wires, qubitCount);
  }

  return next;
};

export const simulate_padic_columns_ensemble = (
  prepared: WeightedStateBranch["state"],
  columns: CircuitColumn[],
  resolveGate: PAdicGateResolver,
  qubitCount: number,
  p: number,
  model: PAdicMeasurementModel,
): StateEnsemble[] => {
  const snapshots: StateEnsemble[] = [[{ weight: 1, state: prepared }]];
  let current: StateEnsemble = snapshots[0]!;

  for (const column of columns) {
    current = applyColumnToEnsembleForModel(current, column, resolveGate, qubitCount, p, model);
    snapshots.push(current);
  }

  return snapshots;
};
