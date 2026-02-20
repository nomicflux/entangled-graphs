export type PAdicPrime = 2 | 3 | 5 | 7;
export type PAdicMeasurementModel = "valuation_weight" | "character_based" | "operator_ensemble";

export const PADIC_PRIMES: readonly PAdicPrime[] = [2, 3, 5, 7];
export const PADIC_MEASUREMENT_MODELS: readonly PAdicMeasurementModel[] = [
  "valuation_weight",
  "character_based",
  "operator_ensemble",
];

export const DEFAULT_PADIC_PRIME: PAdicPrime = 2;
export const DEFAULT_PADIC_MEASUREMENT_MODEL: PAdicMeasurementModel = "valuation_weight";

export const PADIC_DEFAULT_QUBIT_COUNT = 2;
export const PADIC_MIN_QUBITS = 1;
export const PADIC_MAX_QUBITS = 8;

export const clampPAdicQubitCount = (count: number): number => {
  if (!Number.isFinite(count)) {
    return PADIC_DEFAULT_QUBIT_COUNT;
  }

  const parsed = Math.trunc(count);
  return Math.max(PADIC_MIN_QUBITS, Math.min(PADIC_MAX_QUBITS, parsed));
};

export const isPAdicPrime = (value: number): value is PAdicPrime => PADIC_PRIMES.includes(value as PAdicPrime);

export const isPAdicMeasurementModel = (value: string): value is PAdicMeasurementModel =>
  PADIC_MEASUREMENT_MODELS.includes(value as PAdicMeasurementModel);
