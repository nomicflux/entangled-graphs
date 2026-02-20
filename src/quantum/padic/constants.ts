import type { GateId } from "../../types";

export const branchEpsilon = 1e-12;
export const ROOT_SCALE = 1_000_000;

export const isMeasurementGate = (gate: GateId): boolean => gate === "M";
