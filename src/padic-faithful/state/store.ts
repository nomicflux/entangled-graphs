import { reactive } from "vue";
import {
  PADIC_FAITHFUL_DEFAULT_PRIME,
  PADIC_FAITHFUL_DEFAULT_QUBIT_COUNT,
  PADIC_FAITHFUL_DEFAULT_VIEW_MODE,
  PADIC_FAITHFUL_STORAGE_KEY,
  clampPAdicFaithfulQubitCount,
  isPAdicFaithfulPrime,
  isPAdicFaithfulViewMode,
} from "../config";
import type { PAdicCircuitGate, PAdicFaithfulState, PAdicInputPreset } from "../types";

const defaultPreparedInputs = (count: number): Array<{ preset: PAdicInputPreset }> =>
  Array.from({ length: count }, () => ({ preset: "basis_0" }));

const clonePreparedInputs = (entries: ReadonlyArray<{ preset: PAdicInputPreset }>): Array<{ preset: PAdicInputPreset }> =>
  entries.map((entry) => ({ preset: entry.preset }));

const cloneColumn = (column: { gates: PAdicCircuitGate[] }): { gates: PAdicCircuitGate[] } => ({
  gates: [...column.gates],
});

const defaultColumns = (rows: number): Array<{ gates: PAdicCircuitGate[] }> =>
  Array.from({ length: 4 }, () => ({ gates: Array.from({ length: rows }, () => null) }));

const defaultState = (): PAdicFaithfulState => ({
  prime: PADIC_FAITHFUL_DEFAULT_PRIME,
  viewMode: PADIC_FAITHFUL_DEFAULT_VIEW_MODE,
  qubitCount: PADIC_FAITHFUL_DEFAULT_QUBIT_COUNT,
  preparedInputs: defaultPreparedInputs(PADIC_FAITHFUL_DEFAULT_QUBIT_COUNT),
  columns: defaultColumns(PADIC_FAITHFUL_DEFAULT_QUBIT_COUNT),
  selectedGate: "X",
  selectedOutcomeId: null,
});

const isInputPreset = (value: unknown): value is PAdicInputPreset =>
  value === "basis_0" ||
  value === "basis_1" ||
  value === "diag_balanced" ||
  value === "offdiag_pos" ||
  value === "offdiag_neg" ||
  value === "shell_weighted";

const isPreparedInput = (value: unknown): value is { preset: PAdicInputPreset } => {
  if (!value || typeof value !== "object") {
    return false;
  }
  const cast = value as { preset?: unknown };
  return isInputPreset(cast.preset);
};

const isCircuitGate = (value: unknown): value is Exclude<PAdicCircuitGate, null> =>
  value === "I" || value === "X" || value === "Z" || value === "M";

const isCircuitColumn = (value: unknown): value is { gates: PAdicCircuitGate[] } => {
  if (!value || typeof value !== "object") {
    return false;
  }
  const cast = value as { gates?: unknown };
  return Array.isArray(cast.gates) && cast.gates.every((entry) => entry === null || isCircuitGate(entry));
};

const readFromStorage = (): PAdicFaithfulState => {
  const defaults = defaultState();
  if (typeof window === "undefined") {
    return defaults;
  }

  const raw = window.localStorage.getItem(PADIC_FAITHFUL_STORAGE_KEY);
  if (raw === null) {
    return defaults;
  }

  const parsed = JSON.parse(raw) as Partial<PAdicFaithfulState>;

  if (typeof parsed.prime === "number" && isPAdicFaithfulPrime(parsed.prime)) {
    defaults.prime = parsed.prime;
  }

  if (typeof parsed.viewMode === "string" && isPAdicFaithfulViewMode(parsed.viewMode)) {
    defaults.viewMode = parsed.viewMode;
  }

  if (typeof parsed.qubitCount === "number") {
    defaults.qubitCount = clampPAdicFaithfulQubitCount(parsed.qubitCount);
    defaults.preparedInputs = defaultPreparedInputs(defaults.qubitCount);
    defaults.columns = defaultColumns(defaults.qubitCount);
  }

  if (Array.isArray(parsed.preparedInputs) && parsed.preparedInputs.length > 0 && parsed.preparedInputs.every((entry) => isPreparedInput(entry))) {
    defaults.preparedInputs = clonePreparedInputs(parsed.preparedInputs).slice(0, defaults.qubitCount);
    while (defaults.preparedInputs.length < defaults.qubitCount) {
      defaults.preparedInputs.push({ preset: "basis_0" });
    }
  }

  if (Array.isArray(parsed.columns) && parsed.columns.length > 0 && parsed.columns.every((entry) => isCircuitColumn(entry))) {
    defaults.columns = parsed.columns.map(cloneColumn).map((column) => ({
      gates: Array.from({ length: defaults.qubitCount }, (_, index) => column.gates[index] ?? null),
    }));
  }

  if (parsed.selectedGate === null || isCircuitGate(parsed.selectedGate)) {
    defaults.selectedGate = parsed.selectedGate;
  }

  if (typeof parsed.selectedOutcomeId === "string" || parsed.selectedOutcomeId === null) {
    defaults.selectedOutcomeId = parsed.selectedOutcomeId;
  }

  return defaults;
};

export const pAdicFaithfulState = reactive<PAdicFaithfulState>(readFromStorage());

export const persistPAdicFaithfulState = (): void => {
  if (typeof window === "undefined") {
    return;
  }

  const snapshot: PAdicFaithfulState = {
    prime: pAdicFaithfulState.prime,
    viewMode: pAdicFaithfulState.viewMode,
    qubitCount: pAdicFaithfulState.qubitCount,
    preparedInputs: clonePreparedInputs(pAdicFaithfulState.preparedInputs),
    columns: pAdicFaithfulState.columns.map(cloneColumn),
    selectedGate: pAdicFaithfulState.selectedGate,
    selectedOutcomeId: pAdicFaithfulState.selectedOutcomeId,
  };

  window.localStorage.setItem(PADIC_FAITHFUL_STORAGE_KEY, JSON.stringify(snapshot));
};
