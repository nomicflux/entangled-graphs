import { PADIC_FAITHFUL_PRIMES, PADIC_FAITHFUL_VIEW_MODES, clampPAdicFaithfulQubitCount } from "../config";
import type { PAdicCircuitGate, PAdicRawEffect, PAdicViewMode } from "../types";
import { pAdicFaithfulState, persistPAdicFaithfulState } from "./store";

const cloneEffectTemplate = (id: string): PAdicRawEffect => ({
  id,
  label: id,
  rows: [
    ["0", "0"],
    ["0", "0"],
  ],
});

const nextEffectId = (): string => {
  const used = new Set(pAdicFaithfulState.effects.map((effect) => effect.id));
  let index = pAdicFaithfulState.effects.length;

  while (used.has(`omega_${index}`)) {
    index += 1;
  }

  return `omega_${index}`;
};

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

export const setFaithfulRhoEntry = (row: 0 | 1, column: 0 | 1, raw: string): void => {
  pAdicFaithfulState.rhoRows[row][column] = raw;
  persistPAdicFaithfulState();
};

export const setFaithfulEffectId = (index: number, id: string): void => {
  const target = pAdicFaithfulState.effects[index];
  if (!target) {
    return;
  }

  target.id = id.trim();
  persistPAdicFaithfulState();
};

export const setFaithfulEffectLabel = (index: number, label: string): void => {
  const target = pAdicFaithfulState.effects[index];
  if (!target) {
    return;
  }

  target.label = label.trim();
  persistPAdicFaithfulState();
};

export const setFaithfulEffectEntry = (effectIndex: number, row: 0 | 1, column: 0 | 1, raw: string): void => {
  const target = pAdicFaithfulState.effects[effectIndex];
  if (!target) {
    return;
  }

  target.rows[row][column] = raw;
  persistPAdicFaithfulState();
};

export const addFaithfulEffect = (): void => {
  pAdicFaithfulState.effects.push(cloneEffectTemplate(nextEffectId()));
  persistPAdicFaithfulState();
};

export const removeFaithfulEffect = (index: number): void => {
  if (pAdicFaithfulState.effects.length <= 1) {
    return;
  }

  const removed = pAdicFaithfulState.effects[index];
  if (!removed) {
    return;
  }

  pAdicFaithfulState.effects.splice(index, 1);
  if (pAdicFaithfulState.selectedOutcomeId === removed.id) {
    pAdicFaithfulState.selectedOutcomeId = null;
  }
  persistPAdicFaithfulState();
};

export const setFaithfulSelectedOutcome = (id: string | null): void => {
  pAdicFaithfulState.selectedOutcomeId = id;
  persistPAdicFaithfulState();
};

const rebalancePreparedBloch = (count: number): void => {
  while (pAdicFaithfulState.preparedBloch.length < count) {
    pAdicFaithfulState.preparedBloch.push({ theta: Math.PI / 2, phi: 0 });
  }
  if (pAdicFaithfulState.preparedBloch.length > count) {
    pAdicFaithfulState.preparedBloch.splice(count);
  }
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

export const setFaithfulQubitCount = (count: number): void => {
  const nextCount = clampPAdicFaithfulQubitCount(count);
  pAdicFaithfulState.qubitCount = nextCount;
  rebalancePreparedBloch(nextCount);
  rebalanceColumns(nextCount);
  persistPAdicFaithfulState();
};

export const setFaithfulBlochTheta = (index: number, theta: number): void => {
  const target = pAdicFaithfulState.preparedBloch[index];
  if (!target || !Number.isFinite(theta)) {
    return;
  }
  target.theta = Math.min(Math.PI, Math.max(0, theta));
  persistPAdicFaithfulState();
};

export const setFaithfulBlochPhi = (index: number, phi: number): void => {
  const target = pAdicFaithfulState.preparedBloch[index];
  if (!target || !Number.isFinite(phi)) {
    return;
  }
  const loop = 2 * Math.PI;
  const normalized = ((phi % loop) + loop) % loop;
  target.phi = normalized;
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
