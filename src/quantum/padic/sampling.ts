import type { CircuitColumn } from "../../types";
import type { PAdicMeasurementModel } from "../../padic-config";
import { isMeasurementGate } from "./constants";
import { apply_padic_gate_to_state } from "./gates";
import {
  measurement_distribution_for_padic_ensemble,
  sample_measurement_on_wire_for_model,
  select_measurement_on_wire_for_model,
} from "./measurement-model";
import type {
  PAdicGateResolver,
  PAdicSampledCircuitRun,
  PAdicSamplingReplayOptions,
  PAdicState,
  PAdicCircuitMeasurementOutcome,
  RandomSource,
} from "./types";

const sampleDistribution = (distribution: ReadonlyArray<{ basis: string; probability: number }>, randomValue: number) => {
  if (distribution.length === 0) {
    return {
      basis: "",
      probability: 0,
    };
  }

  const threshold = randomValue;
  let running = 0;
  for (const entry of distribution) {
    running += entry.probability;
    if (running >= threshold) {
      return {
        basis: entry.basis,
        probability: entry.probability,
      };
    }
  }

  const last = distribution[distribution.length - 1]!;
  return {
    basis: last.basis,
    probability: last.probability,
  };
};

export const sample_padic_circuit_run = (
  prepared: PAdicState,
  columns: CircuitColumn[],
  resolveGate: PAdicGateResolver,
  qubitCount: number,
  p: number,
  model: PAdicMeasurementModel,
  random: RandomSource = Math.random,
  replay: PAdicSamplingReplayOptions = {},
): PAdicSampledCircuitRun => {
  const replayByGateId = new Map((replay.priorOutcomes ?? []).map((entry) => [entry.gateId, entry.value]));
  let replayLocked = replay.resampleFromGateId !== undefined;
  let current = new Map(prepared);
  const outcomes: PAdicCircuitMeasurementOutcome[] = [];

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

      if (resolveGate(gate.gate) === null) {
        continue;
      }

      current = apply_padic_gate_to_state(current, gate.gate, gate.wires, p);
    }
  }

  const finalDistribution = measurement_distribution_for_padic_ensemble([{ weight: 1, state: current }], p, model);
  const finalSample = sampleDistribution(finalDistribution, random());
  return {
    finalState: current,
    finalSample,
    outcomes,
  };
};
