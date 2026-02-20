import type {
  CutEntanglementScore,
  EntanglementComponent,
  EntanglementComponentKind,
  QubitRow,
  StageEntanglementModel,
  StateEnsemble,
} from "../../types";
import { qubitCountFromState } from "../core";
import { cut_entanglement_scores_from_ensemble } from "./cuts";

const sortRows = (rows: ReadonlyArray<QubitRow>): QubitRow[] => [...rows].sort((left, right) => left - right);

const splitByCut = (
  components: ReadonlyArray<ReadonlyArray<QubitRow>>,
  subset: ReadonlySet<QubitRow>,
): QubitRow[][] => {
  const next: QubitRow[][] = [];

  for (const component of components) {
    const left = component.filter((row) => subset.has(row));
    const right = component.filter((row) => !subset.has(row));
    if (left.length > 0 && right.length > 0) {
      next.push(sortRows(left), sortRows(right));
      continue;
    }
    next.push(sortRows(component));
  }

  return next;
};

const componentKind = (size: number): EntanglementComponentKind => {
  if (size <= 1) {
    return "single";
  }
  if (size === 2) {
    return "pairwise";
  }
  return "multipartite";
};

const separatesRows = (cut: CutEntanglementScore, rows: ReadonlyArray<QubitRow>): boolean => {
  const subsetSet = new Set(cut.subset);
  let inSubset = false;
  let inComplement = false;

  for (const row of rows) {
    if (subsetSet.has(row)) {
      inSubset = true;
    } else {
      inComplement = true;
    }
    if (inSubset && inComplement) {
      return true;
    }
  }

  return false;
};

const componentStrength = (
  componentRows: ReadonlyArray<QubitRow>,
  cuts: ReadonlyArray<CutEntanglementScore>,
): number => {
  if (componentRows.length < 2) {
    return 0;
  }
  const splittingCuts = cuts.filter((cut) => separatesRows(cut, componentRows));
  if (splittingCuts.length === 0) {
    return 0;
  }
  return splittingCuts.reduce((minEntropy, cut) => Math.min(minEntropy, cut.entropy), splittingCuts[0]!.entropy);
};

const allRows = (qubitCount: number): QubitRow[] => Array.from({ length: qubitCount }, (_, row) => row);

const sortedComponents = (components: ReadonlyArray<ReadonlyArray<QubitRow>>): QubitRow[][] =>
  components
    .map((component) => sortRows(component))
    .sort((left, right) => left[0]! - right[0]!);

export const entanglement_components_from_cut_scores = (
  cuts: ReadonlyArray<CutEntanglementScore>,
  qubitCount: number,
  entropyZeroEpsilon: number = 1e-8,
): EntanglementComponent[] => {
  if (qubitCount === 0) {
    return [];
  }

  const zeroCuts = cuts.filter((cut) => cut.entropy <= entropyZeroEpsilon);
  let components: QubitRow[][] = [allRows(qubitCount)];

  for (const cut of zeroCuts) {
    components = splitByCut(components, new Set(cut.subset));
  }

  return sortedComponents(components).map((rows) => ({
    rows,
    kind: componentKind(rows.length),
    strength: componentStrength(rows, cuts),
  }));
};

export const entanglement_model_from_ensemble = (
  ensemble: StateEnsemble,
  entropyZeroEpsilon: number = 1e-8,
): StageEntanglementModel => {
  if (ensemble.length === 0) {
    return { cuts: [], components: [] };
  }

  const qubitCount = qubitCountFromState(ensemble[0]!.state);
  const cuts = cut_entanglement_scores_from_ensemble(ensemble);
  const components = entanglement_components_from_cut_scores(cuts, qubitCount, entropyZeroEpsilon);
  return { cuts, components };
};

export const stage_entanglement_models_from_snapshots = (
  snapshots: ReadonlyArray<StateEnsemble>,
  entropyZeroEpsilon: number = 1e-8,
): StageEntanglementModel[] => snapshots.map((snapshot) => entanglement_model_from_ensemble(snapshot, entropyZeroEpsilon));

