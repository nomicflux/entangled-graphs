import type { GateInstance, Qubit, QubitRow } from "../../../types";

export type PrepPreset = "zero" | "one" | "half";
export type TauOperation = "I" | "X" | "Z" | "XZ";

export type TeleportationColumn = {
  id: string;
  label: string;
  gates: GateInstance[];
};

export type TauBranch = {
  basis: "00" | "01" | "10" | "11";
  operation: TauOperation;
  state: Qubit;
};

export const TELEPORT_ROWS: readonly QubitRow[] = [0, 1, 2];
