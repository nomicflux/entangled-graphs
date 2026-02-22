import { reactive } from "vue";
import {
  DEFAULT_RHO_ROWS,
  DEFAULT_SOVM_EFFECTS,
  PADIC_FAITHFUL_DEFAULT_PRIME,
  PADIC_FAITHFUL_DEFAULT_QUBIT_COUNT,
  PADIC_FAITHFUL_DEFAULT_VIEW_MODE,
  PADIC_FAITHFUL_STORAGE_KEY,
  clampPAdicFaithfulQubitCount,
  isPAdicFaithfulPrime,
  isPAdicFaithfulViewMode,
} from "../config";
import type { PAdicCircuitGate, PAdicFaithfulState, PAdicRawEffect, RawMatrix2 } from "../types";

const cloneMatrix2Raw = (rows: RawMatrix2): RawMatrix2 => [
  [rows[0][0], rows[0][1]],
  [rows[1][0], rows[1][1]],
];

const cloneEffect = (effect: PAdicRawEffect): PAdicRawEffect => ({
  id: effect.id,
  label: effect.label,
  rows: cloneMatrix2Raw(effect.rows),
});

const defaultBloch = (count: number): Array<{ theta: number; phi: number }> =>
  Array.from({ length: count }, () => ({ theta: Math.PI / 2, phi: 0 }));

const cloneBloch = (entries: ReadonlyArray<{ theta: number; phi: number }>): Array<{ theta: number; phi: number }> =>
  entries.map((entry) => ({ theta: entry.theta, phi: entry.phi }));

const cloneColumn = (column: { gates: PAdicCircuitGate[] }): { gates: PAdicCircuitGate[] } => ({
  gates: [...column.gates],
});

const defaultColumns = (rows: number): Array<{ gates: PAdicCircuitGate[] }> =>
  Array.from({ length: 4 }, () => ({ gates: Array.from({ length: rows }, () => null) }));

const defaultState = (): PAdicFaithfulState => ({
  prime: PADIC_FAITHFUL_DEFAULT_PRIME,
  viewMode: PADIC_FAITHFUL_DEFAULT_VIEW_MODE,
  qubitCount: PADIC_FAITHFUL_DEFAULT_QUBIT_COUNT,
  preparedBloch: defaultBloch(PADIC_FAITHFUL_DEFAULT_QUBIT_COUNT),
  columns: defaultColumns(PADIC_FAITHFUL_DEFAULT_QUBIT_COUNT),
  selectedGate: "X",
  rhoRows: cloneMatrix2Raw(DEFAULT_RHO_ROWS),
  effects: DEFAULT_SOVM_EFFECTS.map(cloneEffect),
  selectedOutcomeId: null,
});

const isRawMatrix2 = (value: unknown): value is RawMatrix2 => {
  if (!Array.isArray(value) || value.length !== 2) {
    return false;
  }

  return value.every((row) =>
    Array.isArray(row) &&
    row.length === 2 &&
    row.every((entry) => typeof entry === "string"),
  );
};

const isRawEffect = (value: unknown): value is PAdicRawEffect => {
  if (!value || typeof value !== "object") {
    return false;
  }

  const cast = value as Partial<PAdicRawEffect>;
  return typeof cast.id === "string" && typeof cast.label === "string" && isRawMatrix2(cast.rows);
};

const isBlochEntry = (value: unknown): value is { theta: number; phi: number } => {
  if (!value || typeof value !== "object") {
    return false;
  }
  const cast = value as { theta?: number; phi?: number };
  return typeof cast.theta === "number" && Number.isFinite(cast.theta) && typeof cast.phi === "number" && Number.isFinite(cast.phi);
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
    defaults.preparedBloch = defaultBloch(defaults.qubitCount);
    defaults.columns = defaultColumns(defaults.qubitCount);
  }

  if (Array.isArray(parsed.preparedBloch) && parsed.preparedBloch.length > 0 && parsed.preparedBloch.every((entry) => isBlochEntry(entry))) {
    defaults.preparedBloch = cloneBloch(parsed.preparedBloch).slice(0, defaults.qubitCount);
    while (defaults.preparedBloch.length < defaults.qubitCount) {
      defaults.preparedBloch.push({ theta: Math.PI / 2, phi: 0 });
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

  if (isRawMatrix2(parsed.rhoRows)) {
    defaults.rhoRows = cloneMatrix2Raw(parsed.rhoRows);
  }

  if (Array.isArray(parsed.effects) && parsed.effects.length > 0 && parsed.effects.every((entry) => isRawEffect(entry))) {
    defaults.effects = parsed.effects.map(cloneEffect);
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
    preparedBloch: cloneBloch(pAdicFaithfulState.preparedBloch),
    columns: pAdicFaithfulState.columns.map(cloneColumn),
    selectedGate: pAdicFaithfulState.selectedGate,
    rhoRows: cloneMatrix2Raw(pAdicFaithfulState.rhoRows),
    effects: pAdicFaithfulState.effects.map(cloneEffect),
    selectedOutcomeId: pAdicFaithfulState.selectedOutcomeId,
  };

  window.localStorage.setItem(PADIC_FAITHFUL_STORAGE_KEY, JSON.stringify(snapshot));
};
