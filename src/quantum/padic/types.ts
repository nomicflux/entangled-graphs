import type { BasisProbability } from "../../types";

export type RandomSource = () => number;

export type PAdicRawPreparedLocalState = {
  value: number;
  amplitude: { raw: string };
};

export type PAdicRawPreparedQubit = {
  localStates: ReadonlyArray<PAdicRawPreparedLocalState>;
};

export type PAdicState = Map<string, number>;

export type PAdicWeightedStateBranch = {
  weight: number;
  state: PAdicState;
};

export type PAdicStateEnsemble = PAdicWeightedStateBranch[];

export type PAdicCircuitMeasurementOutcome = {
  column: number;
  gateId: string;
  wire: number;
  value: number;
  probability: number;
};

export type PAdicSamplingReplayOptions = {
  priorOutcomes?: ReadonlyArray<Pick<PAdicCircuitMeasurementOutcome, "gateId" | "value">>;
  resampleFromGateId?: string;
};

export type PAdicSampledCircuitRun = {
  finalState: PAdicState;
  finalSample: {
    basis: BasisProbability["basis"];
    probability: number;
  };
  outcomes: ReadonlyArray<PAdicCircuitMeasurementOutcome>;
};
