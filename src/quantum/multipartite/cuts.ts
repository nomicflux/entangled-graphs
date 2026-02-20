import type { CutEntanglementScore, QubitRow, QubitState, StateEnsemble } from "../../types";
import * as complex from "../../complex";
import { qubitCountFromState } from "../core";
import { reduced_density_for_subset_state } from "../reduced-density";
import { entropyFromEigenvalues, hermitianEigenvalues } from "./linalg";

const EPSILON = 1e-12;
const canonicalCutsCache = new Map<number, Array<{ subset: QubitRow[]; complement: QubitRow[] }>>();
const cutScoreCache = new WeakMap<StateEnsemble, CutEntanglementScore[]>();

const complexDivByReal = (value: { real: number; imag: number }, divisor: number) =>
  complex.complex(value.real / divisor, value.imag / divisor);

const wiresFromMask = (mask: number, qubitCount: number): QubitRow[] => {
  const wires: QubitRow[] = [];
  for (let wire = 0; wire < qubitCount; wire += 1) {
    if (((mask >> wire) & 1) === 1) {
      wires.push(wire);
    }
  }
  return wires;
};

const canonicalCuts = (qubitCount: number): Array<{ subset: QubitRow[]; complement: QubitRow[] }> => {
  const cached = canonicalCutsCache.get(qubitCount);
  if (cached) {
    return cached;
  }

  const maxMask = 1 << qubitCount;
  const cuts: Array<{ subset: QubitRow[]; complement: QubitRow[] }> = [];

  for (let mask = 1; mask < maxMask - 1; mask += 1) {
    const subset = wiresFromMask(mask, qubitCount);
    const subsetSize = subset.length;
    const complementSize = qubitCount - subsetSize;
    if (subsetSize > complementSize) {
      continue;
    }
    if (subsetSize === complementSize && !subset.includes(0)) {
      continue;
    }
    const complement = Array.from({ length: qubitCount }, (_, wire) => wire).filter((wire) => !subset.includes(wire));
    cuts.push({ subset, complement });
  }

  canonicalCutsCache.set(qubitCount, cuts);
  return cuts;
};

const normalizeState = (state: QubitState): QubitState => {
  const magnitude = Math.sqrt(state.reduce((acc, amp) => acc + complex.magnitude_squared(amp), 0));
  return state.map((amp) => complexDivByReal(amp, magnitude));
};

const pureCutEntropy = (state: QubitState, subset: ReadonlyArray<number>): number => {
  const qubitCount = qubitCountFromState(state);
  const rho = reduced_density_for_subset_state(normalizeState(state), subset, qubitCount);
  return entropyFromEigenvalues(hermitianEigenvalues(rho), EPSILON);
};

export const cut_entanglement_scores_from_ensemble = (ensemble: StateEnsemble): CutEntanglementScore[] => {
  if (ensemble.length === 0) {
    return [];
  }

  const cached = cutScoreCache.get(ensemble);
  if (cached) {
    return cached;
  }

  const qubitCount = qubitCountFromState(ensemble[0]!.state);
  const cuts = canonicalCuts(qubitCount);

  const scores = cuts.map((cut) => {
    let entropy = 0;
    for (const branch of ensemble) {
      entropy += branch.weight * pureCutEntropy(branch.state, cut.subset);
    }
    return {
      subset: cut.subset,
      complement: cut.complement,
      entropy,
    };
  });

  cutScoreCache.set(ensemble, scores);
  return scores;
};

export const stage_cut_entanglement_scores = (snapshots: ReadonlyArray<StateEnsemble>): CutEntanglementScore[][] =>
  snapshots.map((snapshot) => cut_entanglement_scores_from_ensemble(snapshot));
