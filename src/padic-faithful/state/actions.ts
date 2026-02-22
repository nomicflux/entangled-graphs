import { PADIC_FAITHFUL_PRIMES, PADIC_FAITHFUL_VIEW_MODES } from "../config";
import type { PAdicRawEffect, PAdicViewMode } from "../types";
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
