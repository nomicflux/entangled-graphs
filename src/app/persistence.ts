export type WorkspaceMode = "free-form" | "algorithms";
export type AlgorithmView = "teleportation" | "deutsch";

type ReadStorage = Pick<Storage, "getItem">;
type WriteStorage = Pick<Storage, "setItem">;

export const WORKSPACE_STORAGE_KEY = "entangled.workspace.mode";
export const ALGORITHM_STORAGE_KEY = "entangled.algorithms.selected";

export const parseWorkspaceMode = (value: string | null): WorkspaceMode =>
  value === "algorithms" ? "algorithms" : "free-form";

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
