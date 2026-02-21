import type { CircuitColumn } from "../../types";
import type { PAdicMeasurementModel } from "../../padic-config";
import { branchEpsilon, isMeasurementGate } from "./constants";
import { apply_padic_gate_to_state } from "./gates";
import { measure_state_on_wire_for_model } from "./measurement-model";
import type { PAdicGateResolver, PAdicState, PAdicStateEnsemble, PAdicWeightedStateBranch } from "./types";

const normalizeEnsembleWeights = (ensemble: PAdicStateEnsemble): PAdicStateEnsemble => {
  const total = ensemble.reduce((acc, branch) => acc + branch.weight, 0);
  if (total <= branchEpsilon) {
    return [];
  }

  if (Math.abs(total - 1) <= 1e-9) {
    return ensemble;
  }

  return ensemble.map((branch) => ({ ...branch, weight: branch.weight / total }));
};

const applyGateToEnsemble = (
  ensemble: PAdicStateEnsemble,
  gate: string,
  wires: ReadonlyArray<number>,
  p: number,
): PAdicStateEnsemble =>
  ensemble.map((branch) => ({
    weight: branch.weight,
    state: apply_padic_gate_to_state(branch.state, gate, wires, p),
  }));

const applyMeasurementToEnsembleForModel = (
  ensemble: PAdicStateEnsemble,
  wire: number,
  qubitCount: number,
  p: number,
  model: PAdicMeasurementModel,
): PAdicStateEnsemble => {
  const next: PAdicWeightedStateBranch[] = [];

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
  ensemble: PAdicStateEnsemble,
  column: CircuitColumn,
  resolveGate: PAdicGateResolver,
  qubitCount: number,
  p: number,
  model: PAdicMeasurementModel,
): PAdicStateEnsemble => {
  let next = ensemble;

  for (const gate of column.gates) {
    if (isMeasurementGate(gate.gate)) {
      next = applyMeasurementToEnsembleForModel(next, gate.wires[0]!, qubitCount, p, model);
      continue;
    }

    if (resolveGate(gate.gate) === null) {
      continue;
    }

    next = applyGateToEnsemble(next, gate.gate, gate.wires, p);
  }

  return next;
};

export const simulate_padic_columns_ensemble = (
  prepared: PAdicState,
  columns: CircuitColumn[],
  resolveGate: PAdicGateResolver,
  qubitCount: number,
  p: number,
  model: PAdicMeasurementModel,
): PAdicStateEnsemble[] => {
  const snapshots: PAdicStateEnsemble[] = [[{ weight: 1, state: prepared }]];
  let current: PAdicStateEnsemble = snapshots[0]!;

  for (const column of columns) {
    current = applyColumnToEnsembleForModel(current, column, resolveGate, qubitCount, p, model);
    snapshots.push(current);
  }

  return snapshots;
};
