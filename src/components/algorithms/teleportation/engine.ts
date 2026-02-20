import type { BasisProbability, Qubit, QubitState } from "../../../types";
import * as complex from "../../../complex";
import { measurement_distribution_for_ensemble } from "../../../quantum";
import type {
  BranchOperation,
  TeleportationBranchResult,
  TeleportationCorrectionPolicy,
  TeleportationModeSummary,
} from "./model-types";

const EPSILON = 1e-12;

const operationForMeasurement = (m0: 0 | 1, m1: 0 | 1): BranchOperation => {
  if (m0 === 0 && m1 === 0) {
    return "I";
  }
  if (m0 === 0 && m1 === 1) {
    return "X";
  }
  if (m0 === 1 && m1 === 0) {
    return "Z";
  }
  return "XZ";
};

const normalizeQubit = (qubit: Qubit): Qubit => {
  const norm = complex.magnitude_squared(qubit.a) + complex.magnitude_squared(qubit.b);
  if (norm <= EPSILON) {
    return { a: complex.from_real(1), b: complex.from_real(0) };
  }
  const factor = 1 / Math.sqrt(norm);
  return {
    a: complex.scale(qubit.a, factor),
    b: complex.scale(qubit.b, factor),
  };
};

const applyCorrectionOperation = (operation: BranchOperation, source: Qubit): Qubit => {
  if (operation === "I") {
    return source;
  }
  if (operation === "X") {
    return { a: source.b, b: source.a };
  }
  if (operation === "Z") {
    return { a: source.a, b: complex.scale(source.b, -1) };
  }
  const zSource = { a: source.a, b: complex.scale(source.b, -1) };
  return { a: zSource.b, b: zSource.a };
};

const overlap = (left: Qubit, right: Qubit) => {
  const termA = complex.mult(complex.conjugate(left.a), right.a);
  const termB = complex.mult(complex.conjugate(left.b), right.b);
  return complex.add(termA, termB);
};

const fidelityToSource = (source: Qubit, candidate: Qubit): number => {
  const sourceNorm = normalizeQubit(source);
  const candidateNorm = normalizeQubit(candidate);
  return complex.magnitude_squared(overlap(sourceNorm, candidateNorm));
};

const branchIndexes = (m0: 0 | 1, m1: 0 | 1) => {
  const base = (m0 << 2) | (m1 << 1);
  return {
    q20: base,
    q21: base | 1,
  };
};

const qubitFromPreMeasurementState = (state: QubitState, m0: 0 | 1, m1: 0 | 1): { qubit: Qubit; probability: number } => {
  const indexes = branchIndexes(m0, m1);
  const a = state[indexes.q20] ?? complex.from_real(0);
  const b = state[indexes.q21] ?? complex.from_real(0);
  const probability = complex.magnitude_squared(a) + complex.magnitude_squared(b);
  return {
    qubit: normalizeQubit({ a, b }),
    probability,
  };
};

const basisFromBits = (m0: 0 | 1, m1: 0 | 1): "00" | "01" | "10" | "11" =>
  `${m0}${m1}` as "00" | "01" | "10" | "11";

const branchState = (m0: 0 | 1, m1: 0 | 1, bob: Qubit): QubitState => {
  const next = Array.from({ length: 8 }, () => complex.from_real(0));
  const indexes = branchIndexes(m0, m1);
  next[indexes.q20] = bob.a;
  next[indexes.q21] = bob.b;
  return next;
};

const policyCorrectedState = (entry: TeleportationBranchResult, policy: TeleportationCorrectionPolicy): Qubit => {
  let next = entry.withoutCorrection;
  if (policy.applyZ && entry.m0 === 1) {
    next = applyCorrectionOperation("Z", next);
  }
  if (policy.applyX && entry.m1 === 1) {
    next = applyCorrectionOperation("X", next);
  }
  return normalizeQubit(next);
};

const buildDistribution = (
  branches: TeleportationBranchResult[],
  pickState: (entry: TeleportationBranchResult) => Qubit,
): BasisProbability[] => {
  const ensemble = branches.map((entry) => ({
    weight: entry.probability,
    state: branchState(entry.m0, entry.m1, pickState(entry)),
  }));
  return measurement_distribution_for_ensemble(ensemble);
};

const modeSummary = (
  branches: TeleportationBranchResult[],
  pickState: (entry: TeleportationBranchResult) => Qubit,
  source: Qubit,
): TeleportationModeSummary => {
  let q2P0 = 0;
  let q2P1 = 0;
  let fidelityToSourceTotal = 0;

  for (const entry of branches) {
    const state = pickState(entry);
    q2P0 += entry.probability * complex.magnitude_squared(state.a);
    q2P1 += entry.probability * complex.magnitude_squared(state.b);
    fidelityToSourceTotal += entry.probability * fidelityToSource(source, state);
  }

  return {
    q2P0,
    q2P1,
    fidelityToSource: fidelityToSourceTotal,
  };
};

export const buildTeleportationBranchResults = (preMeasurementState: QubitState, source: Qubit): TeleportationBranchResult[] => {
  const results: TeleportationBranchResult[] = [];

  for (const m0 of [0, 1] as const) {
    for (const m1 of [0, 1] as const) {
      const operation = operationForMeasurement(m0, m1);
      const branch = qubitFromPreMeasurementState(preMeasurementState, m0, m1);
      const corrected = normalizeQubit(applyCorrectionOperation(operation, branch.qubit));

      results.push({
        basis: basisFromBits(m0, m1),
        m0,
        m1,
        operation,
        probability: branch.probability,
        withoutCorrection: branch.qubit,
        withCorrection: corrected,
        fidelityWithoutCorrection: fidelityToSource(source, branch.qubit),
        fidelityWithCorrection: fidelityToSource(source, corrected),
      });
    }
  }

  return results;
};

export const teleportationSummaries = (branches: TeleportationBranchResult[], source: Qubit) => ({
  withoutCorrection: modeSummary(branches, (entry) => entry.withoutCorrection, source),
  withCorrection: modeSummary(branches, (entry) => entry.withCorrection, source),
  withoutCorrectionDistribution: buildDistribution(branches, (entry) => entry.withoutCorrection),
  withCorrectionDistribution: buildDistribution(branches, (entry) => entry.withCorrection),
});

export const bobQubitFromStateForOutcome = (state: QubitState, m0: 0 | 1, m1: 0 | 1): Qubit =>
  qubitFromPreMeasurementState(state, m0, m1).qubit;

export const teleportationSummaryForPolicy = (
  branches: TeleportationBranchResult[],
  source: Qubit,
  policy: TeleportationCorrectionPolicy,
): {
  summary: TeleportationModeSummary;
  distribution: BasisProbability[];
} => ({
  summary: modeSummary(branches, (entry) => policyCorrectedState(entry, policy), source),
  distribution: buildDistribution(branches, (entry) => policyCorrectedState(entry, policy)),
});
