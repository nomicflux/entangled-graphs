import type { BasisProbability, GateId, Operator, QubitState } from "../../types";
import type { CircuitMeasurementOutcome } from "../simulators";

export type PAdicGateResolver = (gate: GateId) => Operator | null;
export type RandomSource = () => number;

export type PAdicSampledCircuitRun = {
  finalState: QubitState;
  finalSample: {
    basis: BasisProbability["basis"];
    probability: number;
  };
  outcomes: ReadonlyArray<CircuitMeasurementOutcome>;
};
