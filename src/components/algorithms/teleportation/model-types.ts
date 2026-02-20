import type { GateInstance, Qubit, QubitRow } from "../../../types";

export type PrepPreset = "zero" | "one" | "half";
export type BranchOperation = "I" | "X" | "Z" | "XZ";

export type TeleportationColumn = {
  id: string;
  label: string;
  gates: GateInstance[];
};

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

export const TELEPORT_ROWS: readonly QubitRow[] = [0, 1, 2];
