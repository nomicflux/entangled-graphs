import type { BasisProbability, QubitState, StateEnsemble, WeightedStateBranch } from "../../types";
import type { PAdicMeasurementModel } from "../../padic-config";
import * as complex from "../../complex";
import { measurement_distribution } from "../measurement";
import { branchEpsilon, ROOT_SCALE } from "./constants";

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

const weightFromAmplitude = (amplitude: { real: number; imag: number }, p: number, model: PAdicMeasurementModel): number => {
  const magnitudeSquared = complex.magnitude_squared(amplitude);
  if (magnitudeSquared <= branchEpsilon) {
    return 0;
  }

  if (model === "operator_ensemble") {
    return magnitudeSquared;
  }

  const magnitude = Math.sqrt(magnitudeSquared);

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

export const p_adic_raw_weight_totals_for_ensemble = (
  ensemble: StateEnsemble,
  p: number,
  model: PAdicMeasurementModel,
): number[] => {
  if (ensemble.length === 0) {
    return [];
  }

  const basisCount = ensemble[0]!.state.length;
  const totals = Array.from({ length: basisCount }, () => 0);
  for (const branch of ensemble) {
    for (let index = 0; index < branch.state.length; index += 1) {
      totals[index]! += branch.weight * weightFromAmplitude(branch.state[index]!, p, model);
    }
  }

  return totals;
};

export const probability_mass_for_model = (state: QubitState, p: number, model: PAdicMeasurementModel): number =>
  state.reduce((acc, amplitude) => acc + weightFromAmplitude(amplitude, p, model), 0);

export const normalize_state_for_model = (state: QubitState, p: number, model: PAdicMeasurementModel): QubitState => {
  const mass = probability_mass_for_model(state, p, model);
  if (mass <= branchEpsilon) {
    return state.map(() => complex.from_real(0));
  }

  const factor = 1 / Math.sqrt(mass);
  return state.map((amplitude) => complex.scale(amplitude, factor));
};

const projectStateOnWire = (
  state: QubitState,
  wire: number,
  measuredValue: 0 | 1,
  qubitCount: number,
): QubitState => {
  const wireMask = 1 << (qubitCount - 1 - wire);
  return state.map((amplitude, index) => {
    const bit = (index & wireMask) === 0 ? 0 : 1;
    return bit === measuredValue ? amplitude : complex.from_real(0);
  });
};

export const measure_state_on_wire_for_model = (
  state: QubitState,
  wire: number,
  qubitCount: number,
  p: number,
  model: PAdicMeasurementModel,
): Array<WeightedStateBranch & { value: 0 | 1 }> => {
  const projectedZero = projectStateOnWire(state, wire, 0, qubitCount);
  const projectedOne = projectStateOnWire(state, wire, 1, qubitCount);
  const zeroMass = probability_mass_for_model(projectedZero, p, model);
  const oneMass = probability_mass_for_model(projectedOne, p, model);
  const branches: Array<WeightedStateBranch & { value: 0 | 1 }> = [];

  if (zeroMass > branchEpsilon) {
    branches.push({ weight: zeroMass, value: 0, state: normalize_state_for_model(projectedZero, p, model) });
  }
  if (oneMass > branchEpsilon) {
    branches.push({ weight: oneMass, value: 1, state: normalize_state_for_model(projectedOne, p, model) });
  }

  return branches;
};

export const sample_measurement_on_wire_for_model = (
  state: QubitState,
  wire: number,
  qubitCount: number,
  p: number,
  model: PAdicMeasurementModel,
  randomValue: number,
): {
  value: 0 | 1;
  probability: number;
  state: QubitState;
} => {
  const projectedZero = projectStateOnWire(state, wire, 0, qubitCount);
  const projectedOne = projectStateOnWire(state, wire, 1, qubitCount);
  const zeroMass = probability_mass_for_model(projectedZero, p, model);
  const oneMass = probability_mass_for_model(projectedOne, p, model);
  const total = zeroMass + oneMass;

  if (total <= branchEpsilon) {
    return {
      value: 0,
      probability: 0,
      state: state.map((amplitude) => ({ ...amplitude })),
    };
  }

  const threshold = randomValue * total;
  if (threshold <= zeroMass || oneMass <= branchEpsilon) {
    return {
      value: 0,
      probability: zeroMass / total,
      state: normalize_state_for_model(projectedZero, p, model),
    };
  }

  return {
    value: 1,
    probability: oneMass / total,
    state: normalize_state_for_model(projectedOne, p, model),
  };
};

export const select_measurement_on_wire_for_model = (
  state: QubitState,
  wire: number,
  qubitCount: number,
  p: number,
  model: PAdicMeasurementModel,
  selectedValue: 0 | 1,
): {
  value: 0 | 1;
  probability: number;
  state: QubitState;
} | null => {
  const outcomes = measure_state_on_wire_for_model(state, wire, qubitCount, p, model);
  const selected = outcomes.find((outcome) => outcome.value === selectedValue);
  if (!selected) {
    return null;
  }

  return {
    value: selected.value,
    probability: selected.weight,
    state: selected.state,
  };
};

export const measurement_distribution_for_padic_ensemble = (
  ensemble: StateEnsemble,
  p: number,
  model: PAdicMeasurementModel,
): BasisProbability[] => {
  if (ensemble.length === 0) {
    return [];
  }

  const labels = measurement_distribution(ensemble[0]!.state).map((entry) => entry.basis);
  const totals = p_adic_raw_weight_totals_for_ensemble(ensemble, p, model);

  const normalization = totals.reduce((acc, value) => acc + value, 0);
  const normalized = normalization > 0 ? totals.map((value) => value / normalization) : totals;

  return labels.map((basis, index) => ({
    basis,
    probability: normalized[index]!,
  }));
};
