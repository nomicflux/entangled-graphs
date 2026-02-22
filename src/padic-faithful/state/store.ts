import { reactive } from "vue";
import {
  DEFAULT_RHO_ROWS,
  DEFAULT_SOVM_EFFECTS,
  PADIC_FAITHFUL_DEFAULT_PRIME,
  PADIC_FAITHFUL_DEFAULT_VIEW_MODE,
  PADIC_FAITHFUL_STORAGE_KEY,
  isPAdicFaithfulPrime,
  isPAdicFaithfulViewMode,
} from "../config";
import type { PAdicFaithfulState, PAdicRawEffect, RawMatrix2 } from "../types";

const cloneMatrix2Raw = (rows: RawMatrix2): RawMatrix2 => [
  [rows[0][0], rows[0][1]],
  [rows[1][0], rows[1][1]],
];

const cloneEffect = (effect: PAdicRawEffect): PAdicRawEffect => ({
  id: effect.id,
  label: effect.label,
  rows: cloneMatrix2Raw(effect.rows),
});

const defaultState = (): PAdicFaithfulState => ({
  prime: PADIC_FAITHFUL_DEFAULT_PRIME,
  viewMode: PADIC_FAITHFUL_DEFAULT_VIEW_MODE,
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
    rhoRows: cloneMatrix2Raw(pAdicFaithfulState.rhoRows),
    effects: pAdicFaithfulState.effects.map(cloneEffect),
    selectedOutcomeId: pAdicFaithfulState.selectedOutcomeId,
  };

  window.localStorage.setItem(PADIC_FAITHFUL_STORAGE_KEY, JSON.stringify(snapshot));
};
