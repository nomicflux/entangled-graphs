import type { CircuitColumn, QubitState } from "../../types";
import type { PAdicMeasurementModel } from "../../padic-config";
import { apply_operator_on_wires, apply_single_qubit_gate, isSingleQubitOperator } from "../core";
import { sample_distribution } from "../measurement";
import type { CircuitMeasurementOutcome, SamplingReplayOptions } from "../simulators";
import { isMeasurementGate } from "./constants";
import {
  measurement_distribution_for_padic_ensemble,
  sample_measurement_on_wire_for_model,
  select_measurement_on_wire_for_model,
} from "./measurement-model";
import type { PAdicGateResolver, PAdicSampledCircuitRun, RandomSource } from "./types";

export const sample_padic_circuit_run = (
  prepared: QubitState,
  columns: CircuitColumn[],
  resolveGate: PAdicGateResolver,
  qubitCount: number,
  p: number,
  model: PAdicMeasurementModel,
  random: RandomSource = Math.random,
  replay: SamplingReplayOptions = {},
): PAdicSampledCircuitRun => {
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
            ? sample_measurement_on_wire_for_model(current, gate.wires[0]!, qubitCount, p, model, random())
            : (select_measurement_on_wire_for_model(current, gate.wires[0]!, qubitCount, p, model, replayedValue) ??
              sample_measurement_on_wire_for_model(current, gate.wires[0]!, qubitCount, p, model, random()));

        outcomes.push({
          column: columnIndex,
          gateId: gate.id,
          wire: gate.wires[0]!,
          value: sampled.value,
          probability: sampled.probability,
        });

        current = sampled.state;
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

  const finalDistribution = measurement_distribution_for_padic_ensemble([{ weight: 1, state: current }], p, model);
  const finalSample = sample_distribution(finalDistribution, random());
  return {
    finalState: current,
    finalSample,
    outcomes,
  };
};
