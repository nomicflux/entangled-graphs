import { PADIC_FAITHFUL_PRIMES, PADIC_FAITHFUL_VIEW_MODES, clampPAdicFaithfulQubitCount } from "../config";
import type { PAdicCircuitGate, PAdicInputPreset, PAdicViewMode } from "../types";
import { pAdicFaithfulState, persistPAdicFaithfulState } from "./store";

export const setFaithfulPrime = (value: number): void => {
  if (!PADIC_FAITHFUL_PRIMES.includes(value as (typeof PADIC_FAITHFUL_PRIMES)[number])) {
    return;
  }

  pAdicFaithfulState.prime = value as (typeof PADIC_FAITHFUL_PRIMES)[number];
  persistPAdicFaithfulState();
};

export const setFaithfulViewMode = (mode: string): void => {
  if (!PADIC_FAITHFUL_VIEW_MODES.includes(mode as PAdicViewMode)) {
    return;
  }

  pAdicFaithfulState.viewMode = mode as PAdicViewMode;
  persistPAdicFaithfulState();
};

export const setFaithfulPreparedPreset = (index: number, preset: PAdicInputPreset): void => {
  const target = pAdicFaithfulState.preparedInputs[index];
  if (!target) {
    return;
  }
  target.preset = preset;
  persistPAdicFaithfulState();
};

export const setFaithfulSelectedOutcome = (id: string | null): void => {
  pAdicFaithfulState.selectedOutcomeId = id;
  persistPAdicFaithfulState();
};

const rebalanceColumns = (count: number): void => {
  for (const column of pAdicFaithfulState.columns) {
    while (column.gates.length < count) {
      column.gates.push(null);
    }
    if (column.gates.length > count) {
      column.gates.splice(count);
    }
  }
};

const rebalancePreparedInputs = (count: number): void => {
  while (pAdicFaithfulState.preparedInputs.length < count) {
    pAdicFaithfulState.preparedInputs.push({ preset: "basis_0" });
  }
  if (pAdicFaithfulState.preparedInputs.length > count) {
    pAdicFaithfulState.preparedInputs.splice(count);
  }
};

export const setFaithfulQubitCount = (count: number): void => {
  const nextCount = clampPAdicFaithfulQubitCount(count);
  pAdicFaithfulState.qubitCount = nextCount;
  rebalancePreparedInputs(nextCount);
  rebalanceColumns(nextCount);
  persistPAdicFaithfulState();
};

export const setFaithfulSelectedGate = (gate: PAdicCircuitGate): void => {
  pAdicFaithfulState.selectedGate = gate;
  persistPAdicFaithfulState();
};

export const addFaithfulColumn = (): void => {
  pAdicFaithfulState.columns.push({
    gates: Array.from({ length: pAdicFaithfulState.qubitCount }, () => null),
  });
  persistPAdicFaithfulState();
};

export const removeFaithfulColumn = (): void => {
  if (pAdicFaithfulState.columns.length === 0) {
    return;
  }
  pAdicFaithfulState.columns.pop();
  persistPAdicFaithfulState();
};

export const setFaithfulColumnGate = (columnIndex: number, rowIndex: number, gate: PAdicCircuitGate): void => {
  const column = pAdicFaithfulState.columns[columnIndex];
  if (!column) {
    return;
  }
  if (rowIndex < 0 || rowIndex >= pAdicFaithfulState.qubitCount) {
    return;
  }
  column.gates[rowIndex] = gate;
  persistPAdicFaithfulState();
};
