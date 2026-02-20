import {
  DEFAULT_PADIC_MEASUREMENT_MODEL,
  DEFAULT_PADIC_PRIME,
  PADIC_DEFAULT_QUBIT_COUNT,
  clampPAdicQubitCount,
  isPAdicMeasurementModel,
  isPAdicPrime,
  type PAdicMeasurementModel,
  type PAdicPrime,
} from "../padic-config";

export type WorkspaceMode = "free-form" | "p-adic" | "algorithms";
export type AlgorithmView = "teleportation" | "deutsch";

type ReadStorage = Pick<Storage, "getItem">;
type WriteStorage = Pick<Storage, "setItem">;

export const WORKSPACE_STORAGE_KEY = "entangled.workspace.mode";
export const ALGORITHM_STORAGE_KEY = "entangled.algorithms.selected";
export const PADIC_PRIME_STORAGE_KEY = "entangled.padic.prime";
export const PADIC_MEASUREMENT_MODEL_STORAGE_KEY = "entangled.padic.measurement-model";
export const PADIC_QUBIT_COUNT_STORAGE_KEY = "entangled.padic.qubit-count";
export const PADIC_PREPARED_STORAGE_KEY = "entangled.padic.prepared.v1";
export const PADIC_SELECTED_STAGE_STORAGE_KEY = "entangled.padic.selected-stage";

// Keep p-adic workspace opt-in until its UI wiring lands.
export const PADIC_WORKSPACE_FEATURE_FLAG = false;

export const parseWorkspaceMode = (value: string | null): WorkspaceMode =>
  value === "algorithms"
    ? "algorithms"
    : value === "p-adic" && PADIC_WORKSPACE_FEATURE_FLAG
      ? "p-adic"
      : "free-form";

export const parseAlgorithmView = (value: string | null): AlgorithmView => {
  if (value === "deutsch") {
    return "deutsch";
  }
  if (value === "teleportation") {
    return "teleportation";
  }
  return "teleportation";
};

export const readWorkspaceFromStorage = (storage: ReadStorage): WorkspaceMode =>
  parseWorkspaceMode(storage.getItem(WORKSPACE_STORAGE_KEY));

export const readAlgorithmFromStorage = (storage: ReadStorage): AlgorithmView =>
  parseAlgorithmView(storage.getItem(ALGORITHM_STORAGE_KEY));

export const writeWorkspaceToStorage = (storage: WriteStorage, mode: WorkspaceMode): void => {
  storage.setItem(WORKSPACE_STORAGE_KEY, mode);
};

export const writeAlgorithmToStorage = (storage: WriteStorage, algorithm: AlgorithmView): void => {
  storage.setItem(ALGORITHM_STORAGE_KEY, algorithm);
};

export const parsePAdicPrime = (value: string | null): PAdicPrime => {
  const parsed = value === null ? NaN : Number.parseInt(value, 10);
  return isPAdicPrime(parsed) ? parsed : DEFAULT_PADIC_PRIME;
};

export const parsePAdicMeasurementModel = (value: string | null): PAdicMeasurementModel => {
  if (value !== null && isPAdicMeasurementModel(value)) {
    return value;
  }
  return DEFAULT_PADIC_MEASUREMENT_MODEL;
};

export const parsePAdicQubitCount = (value: string | null): number => {
  const parsed = value === null ? NaN : Number.parseInt(value, 10);
  if (!Number.isFinite(parsed)) {
    return PADIC_DEFAULT_QUBIT_COUNT;
  }
  return clampPAdicQubitCount(parsed);
};

export const readPAdicPrimeFromStorage = (storage: ReadStorage): PAdicPrime =>
  parsePAdicPrime(storage.getItem(PADIC_PRIME_STORAGE_KEY));

export const readPAdicMeasurementModelFromStorage = (storage: ReadStorage): PAdicMeasurementModel =>
  parsePAdicMeasurementModel(storage.getItem(PADIC_MEASUREMENT_MODEL_STORAGE_KEY));

export const readPAdicQubitCountFromStorage = (storage: ReadStorage): number =>
  parsePAdicQubitCount(storage.getItem(PADIC_QUBIT_COUNT_STORAGE_KEY));

export const writePAdicPrimeToStorage = (storage: WriteStorage, prime: PAdicPrime): void => {
  storage.setItem(PADIC_PRIME_STORAGE_KEY, String(prime));
};

export const writePAdicMeasurementModelToStorage = (storage: WriteStorage, model: PAdicMeasurementModel): void => {
  storage.setItem(PADIC_MEASUREMENT_MODEL_STORAGE_KEY, model);
};

export const writePAdicQubitCountToStorage = (storage: WriteStorage, qubitCount: number): void => {
  storage.setItem(PADIC_QUBIT_COUNT_STORAGE_KEY, String(clampPAdicQubitCount(qubitCount)));
};
