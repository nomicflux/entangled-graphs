import type { BasisProbability } from "../../types";
import type { PAdicMeasurementModel } from "../../padic-config";
import { branchEpsilon, ROOT_SCALE } from "./constants";
import type { PAdicState, PAdicStateEnsemble } from "./types";

const vpInteger = (value: number, p: number): number => {
  if (value === 0) {
    return Number.POSITIVE_INFINITY;
  }

  let remaining = Math.abs(Math.trunc(value));
  let valuation = 0;
  while (remaining !== 0 && remaining % p === 0) {
    remaining /= p;
    valuation += 1;
  }
  return valuation;
};

const valuationFromMagnitude = (magnitude: number, p: number): number => {
  const scaled = Math.round(Math.abs(magnitude) * ROOT_SCALE);
  if (scaled === 0) {
    return Number.POSITIVE_INFINITY;
  }

  return vpInteger(scaled, p) - vpInteger(ROOT_SCALE, p);
};

export const p_adic_valuation_from_real = (value: number, p: number): number => valuationFromMagnitude(Math.abs(value), p);

export const p_adic_norm_from_real = (value: number, p: number): number => {
  if (value === 0) {
    return 0;
  }

  const valuation = p_adic_valuation_from_real(value, p);
  if (!Number.isFinite(valuation)) {
    return 0;
  }
  return Math.pow(p, -valuation);
};

const weightFromRawAmplitude = (amplitude: number, p: number, model: PAdicMeasurementModel): number => {
  const magnitude = Math.abs(amplitude);
  if (magnitude <= branchEpsilon) {
    return 0;
  }

  if (model === "operator_ensemble") {
    return magnitude * magnitude;
  }

  if (model === "valuation_weight") {
    const valuation = valuationFromMagnitude(magnitude, p);
    if (!Number.isFinite(valuation)) {
      return 0;
    }

    const rawWeight = Math.pow(p, -2 * valuation);
    return Number.isFinite(rawWeight) && rawWeight > 0 ? rawWeight : 0;
  }

  const residue = ((Math.round(magnitude * ROOT_SCALE) % p) + p) % p;
  const theta = (2 * Math.PI * residue) / p;
  return 0.25 + (0.75 * Math.abs(Math.cos(theta)));
};

const sortedBasisEntries = (weightByBasis: Map<string, number>): Array<[string, number]> =>
  [...weightByBasis.entries()].sort((left, right) => left[0].localeCompare(right[0]));

export const p_adic_raw_weight_totals_for_ensemble = (
  ensemble: PAdicStateEnsemble,
  p: number,
  model: PAdicMeasurementModel,
): Map<string, number> => {
  const totals = new Map<string, number>();

  for (const branch of ensemble) {
    for (const [basis, amplitude] of branch.state.entries()) {
      const prior = totals.get(basis) ?? 0;
      totals.set(basis, prior + (branch.weight * weightFromRawAmplitude(amplitude, p, model)));
    }
  }

  return totals;
};

export const probability_mass_for_model = (state: PAdicState, p: number, model: PAdicMeasurementModel): number => {
  let total = 0;
  for (const amplitude of state.values()) {
    total += weightFromRawAmplitude(amplitude, p, model);
  }
  return total;
};

export const normalize_state_for_model = (state: PAdicState, p: number, model: PAdicMeasurementModel): PAdicState => {
  const mass = probability_mass_for_model(state, p, model);
  if (mass <= branchEpsilon) {
    return new Map();
  }

  const factor = 1 / Math.sqrt(mass);
  return new Map([...state.entries()].map(([basis, amplitude]) => [basis, amplitude * factor]));
};

const digitForWire = (basis: string, wire: number, qubitCount: number): number => {
  const index = Math.max(0, Math.min(qubitCount - 1, wire));
  const parsed = Number.parseInt(basis[index] ?? "0", 10);
  return Number.isFinite(parsed) ? parsed : 0;
};

const projectStateOnWireValue = (
  state: PAdicState,
  wire: number,
  qubitCount: number,
  value: number,
): PAdicState => {
  const next: PAdicState = new Map();
  for (const [basis, amplitude] of state.entries()) {
    if (digitForWire(basis, wire, qubitCount) !== value) {
      continue;
    }
    next.set(basis, amplitude);
  }
  return next;
};

export const measure_state_on_wire_for_model = (
  state: PAdicState,
  wire: number,
  qubitCount: number,
  p: number,
  model: PAdicMeasurementModel,
): Array<{ weight: number; value: number; state: PAdicState }> => {
  const branches: Array<{ weight: number; value: number; state: PAdicState }> = [];

  for (let value = 0; value < p; value += 1) {
    const projected = projectStateOnWireValue(state, wire, qubitCount, value);
    const mass = probability_mass_for_model(projected, p, model);
    if (mass <= branchEpsilon) {
      continue;
    }

    branches.push({
      value,
      weight: mass,
      state: normalize_state_for_model(projected, p, model),
    });
  }

  return branches;
};

export const sample_measurement_on_wire_for_model = (
  state: PAdicState,
  wire: number,
  qubitCount: number,
  p: number,
  model: PAdicMeasurementModel,
  randomValue: number,
): {
  value: number;
  probability: number;
  state: PAdicState;
} => {
  const outcomes = measure_state_on_wire_for_model(state, wire, qubitCount, p, model);
  const total = outcomes.reduce((acc, outcome) => acc + outcome.weight, 0);

  if (total <= branchEpsilon || outcomes.length === 0) {
    return {
      value: 0,
      probability: 0,
      state: new Map(state),
    };
  }

  const threshold = randomValue * total;
  let running = 0;
  for (const outcome of outcomes) {
    running += outcome.weight;
    if (running >= threshold) {
      return {
        value: outcome.value,
        probability: outcome.weight / total,
        state: outcome.state,
      };
    }
  }

  const fallback = outcomes[outcomes.length - 1]!;
  return {
    value: fallback.value,
    probability: fallback.weight / total,
    state: fallback.state,
  };
};

export const select_measurement_on_wire_for_model = (
  state: PAdicState,
  wire: number,
  qubitCount: number,
  p: number,
  model: PAdicMeasurementModel,
  selectedValue: number,
): {
  value: number;
  probability: number;
  state: PAdicState;
} | null => {
  const outcomes = measure_state_on_wire_for_model(state, wire, qubitCount, p, model);
  const selected = outcomes.find((outcome) => outcome.value === selectedValue);
  if (!selected) {
    return null;
  }

  const total = outcomes.reduce((acc, outcome) => acc + outcome.weight, 0);
  return {
    value: selected.value,
    probability: total > branchEpsilon ? selected.weight / total : 0,
    state: selected.state,
  };
};

export const measurement_distribution_for_padic_ensemble = (
  ensemble: PAdicStateEnsemble,
  p: number,
  model: PAdicMeasurementModel,
): BasisProbability[] => {
  const totals = p_adic_raw_weight_totals_for_ensemble(ensemble, p, model);
  const normalization = [...totals.values()].reduce((acc, value) => acc + value, 0);

  return sortedBasisEntries(totals).map(([basis, rawWeight]) => ({
    basis,
    probability: normalization > branchEpsilon ? rawWeight / normalization : 0,
  }));
};
