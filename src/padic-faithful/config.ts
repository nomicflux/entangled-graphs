import type { PAdicPrime, PAdicViewMode } from "./types";

export const PADIC_FAITHFUL_PRIMES: readonly PAdicPrime[] = [2, 3, 5, 7];

export const PADIC_FAITHFUL_VIEW_MODES: readonly PAdicViewMode[] = ["valuation_ring", "digit_vector"];

export const PADIC_FAITHFUL_DEFAULT_PRIME: PAdicPrime = 3;

export const PADIC_FAITHFUL_DEFAULT_VIEW_MODE: PAdicViewMode = "digit_vector";

export const PADIC_FAITHFUL_DEFAULT_QUBIT_COUNT = 2;

export const PADIC_FAITHFUL_STORAGE_KEY = "entangled.padic-faithful.v1";

export const isPAdicFaithfulPrime = (value: number): value is PAdicPrime =>
  PADIC_FAITHFUL_PRIMES.includes(value as PAdicPrime);

export const isPAdicFaithfulViewMode = (value: string): value is PAdicViewMode =>
  PADIC_FAITHFUL_VIEW_MODES.includes(value as PAdicViewMode);

export const clampPAdicFaithfulQubitCount = (value: number): number => {
  if (!Number.isFinite(value)) {
    return PADIC_FAITHFUL_DEFAULT_QUBIT_COUNT;
  }
  return Math.min(8, Math.max(1, Math.trunc(value)));
};
