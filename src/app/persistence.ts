export type WorkspaceMode = "free-form" | "p-adic" | "algorithms" | "abstractions";
export type AlgorithmView = "teleportation" | "deutsch";
export type AbstractionView = "preparing-qubits" | "entanglement" | "phase-kickback";

type ReadStorage = Pick<Storage, "getItem">;
type WriteStorage = Pick<Storage, "setItem">;

export const WORKSPACE_STORAGE_KEY = "entangled.workspace.mode";
export const ALGORITHM_STORAGE_KEY = "entangled.algorithms.selected";
export const ABSTRACTION_STORAGE_KEY = "entangled.abstractions.selected";

export const parseWorkspaceMode = (value: string | null): WorkspaceMode =>
  value === "abstractions" ? "abstractions" : value === "algorithms" ? "algorithms" : value === "p-adic" ? "p-adic" : "free-form";

export const parseAlgorithmView = (value: string | null): AlgorithmView => {
  if (value === "deutsch") {
    return "deutsch";
  }
  if (value === "teleportation") {
    return "teleportation";
  }
  return "teleportation";
};

export const parseAbstractionView = (value: string | null): AbstractionView => {
  if (value === "phase-kickback") {
    return "phase-kickback";
  }
  if (value === "entanglement") {
    return "entanglement";
  }
  if (value === "preparing-qubits") {
    return "preparing-qubits";
  }
  return "preparing-qubits";
};

export const readWorkspaceFromStorage = (storage: ReadStorage): WorkspaceMode =>
  parseWorkspaceMode(storage.getItem(WORKSPACE_STORAGE_KEY));

export const readAlgorithmFromStorage = (storage: ReadStorage): AlgorithmView =>
  parseAlgorithmView(storage.getItem(ALGORITHM_STORAGE_KEY));

export const readAbstractionFromStorage = (storage: ReadStorage): AbstractionView =>
  parseAbstractionView(storage.getItem(ABSTRACTION_STORAGE_KEY));

export const writeWorkspaceToStorage = (storage: WriteStorage, mode: WorkspaceMode): void => {
  storage.setItem(WORKSPACE_STORAGE_KEY, mode);
};

export const writeAlgorithmToStorage = (storage: WriteStorage, algorithm: AlgorithmView): void => {
  storage.setItem(ALGORITHM_STORAGE_KEY, algorithm);
};

export const writeAbstractionToStorage = (storage: WriteStorage, abstraction: AbstractionView): void => {
  storage.setItem(ABSTRACTION_STORAGE_KEY, abstraction);
};
