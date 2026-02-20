import type { Qubit, QubitRow } from "../../../types";
import type { BasisProbability } from "../../../types";
import type { CircuitMeasurementOutcome } from "../../../quantum";
import type { AlgorithmColumn } from "../shared/model-types";

export type PrepPreset = "zero" | "one" | "half";
export type BranchOperation = "I" | "X" | "Z" | "XZ";

export type TeleportationColumn = AlgorithmColumn;

export type BranchPreview = {
  basis: "00" | "01" | "10" | "11";
  operation: BranchOperation;
  state: Qubit;
};

export type TeleportationBranchResult = {
  basis: "00" | "01" | "10" | "11";
  m0: 0 | 1;
  m1: 0 | 1;
  operation: BranchOperation;
  probability: number;
  withoutCorrection: Qubit;
  withCorrection: Qubit;
  fidelityWithoutCorrection: number;
  fidelityWithCorrection: number;
};

export type TeleportationModeSummary = {
  q2P0: number;
  q2P1: number;
  fidelityToSource: number;
};

export type TeleportationCorrectionMode = "auto" | "manual";

export type TeleportationCorrectionPolicy = {
  applyZ: boolean;
  applyX: boolean;
};

export type TeleportationSampleResult = {
  basis: string;
  probability: number;
  distribution: BasisProbability[];
  outcomes: ReadonlyArray<CircuitMeasurementOutcome>;
  m0: 0 | 1;
  m1: 0 | 1;
  q2P0: number;
  q2P1: number;
  fidelityToSource: number;
};

export const TELEPORT_ROWS: readonly QubitRow[] = [0, 1, 2];
