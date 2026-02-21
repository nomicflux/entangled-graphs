import { computed } from "vue";
import type {
  BlochPair,
  BlochVector,
  CircuitColumn,
  EntanglementLink,
  GateCell,
  GateId,
  GateInstance,
  PAdicStageVisualization,
  PAdicVisualizationNode,
  QubitState,
  Qubit,
  StageEntanglementModel,
  StageView,
  StateEnsemble,
} from "../types";
import {
  bloch_pair_from_ensemble,
  entanglement_links_from_ensemble,
  measurement_distribution_for_padic_ensemble,
  measurement_distribution_for_ensemble,
  p_adic_prepared_state_from_raw_qubits,
  p_adic_stage_visualizations_from_snapshots,
  simulate_padic_columns_ensemble,
  simulate_columns_ensemble,
  stage_entanglement_models_from_snapshots,
  tensor_product_qubits,
} from "../quantum";
import type { PAdicStateEnsemble } from "../quantum";
import { gateTouchesRow } from "./gate-instance-utils";
import { isBuiltinGate, resolveOperator } from "./operators";
import { preparedDistributionForQubits, qubitFromBloch } from "./qubit-helpers";
import { state } from "./store";

const eps = 1e-12;

const digitsFromBasis = (basis: string, qubitCount: number): number[] =>
  Array.from({ length: qubitCount }, (_, index) => {
    const parsed = Number.parseInt(basis[index] ?? "0", 10);
    return Number.isFinite(parsed) ? parsed : 0;
  });

const neutralBlochVector = (p0: number): BlochVector => {
  const boundedP0 = Math.max(0, Math.min(1, p0));
  const p1 = 1 - boundedP0;
  const certainty = Math.max(boundedP0, p1);
  const uncertainty = 1 - certainty;
  return {
    x: 0,
    y: 0,
    z: boundedP0 - p1,
    p0: boundedP0,
    p1,
    certainty,
    uncertainty,
  };
};

const pAdicBlochPairFromDistribution = (distribution: ReadonlyArray<{ basis: string; probability: number }>, qubitCount: number): BlochPair =>
  Array.from({ length: qubitCount }, (_, wire) => {
    const p0 = distribution.reduce((acc, entry) => {
      const digit = digitsFromBasis(entry.basis, qubitCount)[wire] ?? 0;
      return acc + (digit === 0 ? entry.probability : 0);
    }, 0);
    return neutralBlochVector(p0);
  });

const pAdicEntanglementLinksFromDistribution = (
  distribution: ReadonlyArray<{ basis: string; probability: number }>,
  qubitCount: number,
  prime: number,
): EntanglementLink[] => {
  const links: EntanglementLink[] = [];
  const normalizer = Math.log(Math.max(2, prime));

  for (let left = 0; left < qubitCount; left += 1) {
    for (let right = left + 1; right < qubitCount; right += 1) {
      const pi = Array.from({ length: prime }, () => 0);
      const pj = Array.from({ length: prime }, () => 0);
      const pij = Array.from({ length: prime }, () => Array.from({ length: prime }, () => 0));
      let sameMass = 0;

      for (const entry of distribution) {
        const digits = digitsFromBasis(entry.basis, qubitCount);
        const leftDigit = digits[left] ?? 0;
        const rightDigit = digits[right] ?? 0;
        const probability = entry.probability;
        pi[leftDigit]! += probability;
        pj[rightDigit]! += probability;
        pij[leftDigit]![rightDigit]! += probability;
        if (leftDigit === rightDigit) {
          sameMass += probability;
        }
      }

      let mutualInformation = 0;
      for (let leftDigit = 0; leftDigit < prime; leftDigit += 1) {
        for (let rightDigit = 0; rightDigit < prime; rightDigit += 1) {
          const joint = pij[leftDigit]![rightDigit]!;
          const leftMass = pi[leftDigit]!;
          const rightMass = pj[rightDigit]!;
          if (joint <= eps || leftMass <= eps || rightMass <= eps) {
            continue;
          }
          mutualInformation += joint * Math.log(joint / (leftMass * rightMass));
        }
      }

      const normalizedStrength =
        normalizer <= eps ? 0 : Math.max(0, Math.min(1, mutualInformation / normalizer));
      if (normalizedStrength <= eps) {
        continue;
      }

      const diffMass = Math.max(0, 1 - sameMass);
      links.push({
        fromRow: left,
        toRow: right,
        dominantBell: sameMass >= diffMass ? "phi+" : "psi+",
        dominantProbability: Math.max(sameMass, diffMass),
        strength: normalizedStrength,
      });
    }
  }

  return links;
};

const pAdicEntanglementModelFromLinks = (links: ReadonlyArray<EntanglementLink>, qubitCount: number): StageEntanglementModel => {
  const pairwise = links
    .filter((link) => link.strength > 0.08)
    .map((link) => ({
      rows: [link.fromRow, link.toRow],
      kind: "pairwise" as const,
      strength: link.strength,
    }));

  const strongEdges = links.filter((link) => link.strength > 0.2);
  const adjacency = new Map<number, Set<number>>();
  for (let row = 0; row < qubitCount; row += 1) {
    adjacency.set(row, new Set());
  }
  for (const edge of strongEdges) {
    adjacency.get(edge.fromRow)?.add(edge.toRow);
    adjacency.get(edge.toRow)?.add(edge.fromRow);
  }

  const visited = new Set<number>();
  const multipartite: Array<{ rows: number[]; strength: number }> = [];

  for (let row = 0; row < qubitCount; row += 1) {
    if (visited.has(row)) {
      continue;
    }
    const stack = [row];
    const component: number[] = [];
    visited.add(row);
    while (stack.length > 0) {
      const current = stack.pop()!;
      component.push(current);
      for (const neighbor of adjacency.get(current) ?? []) {
        if (visited.has(neighbor)) {
          continue;
        }
        visited.add(neighbor);
        stack.push(neighbor);
      }
    }

    if (component.length < 3) {
      continue;
    }

    const strengths = strongEdges
      .filter((edge) => component.includes(edge.fromRow) && component.includes(edge.toRow))
      .map((edge) => edge.strength);
    multipartite.push({
      rows: component.sort((left, right) => left - right),
      strength: strengths.length === 0 ? 0 : Math.min(...strengths),
    });
  }

  return {
    cuts: [],
    components: [
      ...Array.from({ length: qubitCount }, (_, row) => ({
        rows: [row],
        kind: "single" as const,
        strength: 0,
      })),
      ...pairwise,
      ...multipartite.map((entry) => ({
        rows: entry.rows,
        kind: "multipartite" as const,
        strength: entry.strength,
      })),
    ],
  };
};

export const qubitCount = computed(() => state.preparedBloch.length);

export const preparedQubits = computed<Qubit[]>(() => state.preparedBloch.map(qubitFromBloch));

export const preparedState = computed<QubitState>(() => tensor_product_qubits(preparedQubits.value));

export const preparedDistribution = computed(() => preparedDistributionForQubits(preparedQubits.value));

const resolveGate = (gate: GateId) => resolveOperator(gate, state.customOperators);
const resolvePAdicGate = (gate: GateId) => resolveOperator(gate, []);

export const pAdicQubitCount = computed(() => state.pAdic.qubitCount);

export const pAdicPreparedQubits = computed(() => state.pAdic.preparedQubits);

export const pAdicPreparedState = computed(() =>
  p_adic_prepared_state_from_raw_qubits(state.pAdic.preparedQubits, state.pAdic.prime),
);

export const pAdicPreparedDistribution = computed(() =>
  measurement_distribution_for_padic_ensemble(
    [{ weight: 1, state: pAdicPreparedState.value }],
    state.pAdic.prime,
    state.pAdic.measurementModel,
  ),
);

export const ensembleSnapshots = computed<StateEnsemble[]>(() =>
  simulate_columns_ensemble(preparedState.value, state.columns, resolveGate, qubitCount.value),
);

export const finalEnsemble = computed<StateEnsemble>(() => ensembleSnapshots.value[ensembleSnapshots.value.length - 1]!);

export const finalDistribution = computed(() => measurement_distribution_for_ensemble(finalEnsemble.value));

export const pAdicEnsembleSnapshots = computed<PAdicStateEnsemble[]>(() =>
  simulate_padic_columns_ensemble(
    pAdicPreparedState.value,
    state.pAdic.columns,
    resolvePAdicGate,
    pAdicQubitCount.value,
    state.pAdic.prime,
    state.pAdic.measurementModel,
  ),
);

export const pAdicFinalEnsemble = computed<PAdicStateEnsemble>(() => pAdicEnsembleSnapshots.value[pAdicEnsembleSnapshots.value.length - 1]!);

export const pAdicFinalDistribution = computed(() =>
  measurement_distribution_for_padic_ensemble(pAdicFinalEnsemble.value, state.pAdic.prime, state.pAdic.measurementModel),
);

export const pAdicStageViews = computed<StageView[]>(() => {
  const lastIndex = pAdicEnsembleSnapshots.value.length - 1;

  return pAdicEnsembleSnapshots.value.map((snapshot, index) => {
    const distribution = measurement_distribution_for_padic_ensemble(snapshot, state.pAdic.prime, state.pAdic.measurementModel);
    return {
      id: index === 0 ? "prepared" : index === lastIndex ? "final" : `t${index}`,
      index,
      label: index === 0 ? "Prepared" : index === lastIndex ? "Final" : `After t${index}`,
      distribution,
      blochPair: pAdicBlochPairFromDistribution(distribution, state.pAdic.qubitCount),
      isFinal: index === lastIndex,
    };
  });
});

export const pAdicSelectedStage = computed<StageView>(() => pAdicStageViews.value[state.pAdic.selectedStageIndex]!);

export const pAdicStageEntanglementLinks = computed(() =>
  pAdicEnsembleSnapshots.value.map((snapshot) =>
    pAdicEntanglementLinksFromDistribution(
      measurement_distribution_for_padic_ensemble(snapshot, state.pAdic.prime, state.pAdic.measurementModel),
      state.pAdic.qubitCount,
      state.pAdic.prime,
    ),
  ),
);

export const pAdicStageEntanglementModels = computed(() =>
  pAdicStageEntanglementLinks.value.map((links) => pAdicEntanglementModelFromLinks(links, state.pAdic.qubitCount)),
);

export const pAdicStageVisualizations = computed<ReadonlyArray<PAdicStageVisualization>>(() =>
  p_adic_stage_visualizations_from_snapshots(
    pAdicEnsembleSnapshots.value,
    state.pAdic.prime,
    state.pAdic.measurementModel,
    state.pAdic.geometryMode,
  ),
);

export const pAdicSelectedStageVisualization = computed<PAdicStageVisualization | null>(() =>
  pAdicStageVisualizations.value[state.pAdic.selectedStageIndex] ?? null,
);

export const pAdicSelectedBasisNode = computed<PAdicVisualizationNode | null>(() => {
  const basis = state.pAdic.selectedBasis;
  if (basis === null) {
    return null;
  }

  return pAdicSelectedStageVisualization.value?.nodes.find((node) => node.basis === basis) ?? null;
});

export const stageViews = computed<StageView[]>(() => {
  const lastIndex = ensembleSnapshots.value.length - 1;

  return ensembleSnapshots.value.map((snapshot, index) => ({
    id: index === 0 ? "prepared" : index === lastIndex ? "final" : `t${index}`,
    index,
    label: index === 0 ? "Prepared" : index === lastIndex ? "Final" : `After t${index}`,
    distribution: measurement_distribution_for_ensemble(snapshot),
    blochPair: bloch_pair_from_ensemble(snapshot),
    isFinal: index === lastIndex,
  }));
});

export const stageEntanglementLinks = computed(() =>
  ensembleSnapshots.value.map((snapshot) => entanglement_links_from_ensemble(snapshot)),
);

export const stageEntanglementModels = computed(() =>
  stage_entanglement_models_from_snapshots(ensembleSnapshots.value),
);

export const selectedStage = computed<StageView>(() => stageViews.value[state.selectedStageIndex]!);

export const gateInstanceAt = (column: CircuitColumn, row: number): GateInstance | null =>
  column.gates.find((entry) => gateTouchesRow(entry, row)) ?? null;

export const gateAt = (column: CircuitColumn, row: number): GateCell => {
  const gate = gateInstanceAt(column, row);

  if (!gate) {
    return null;
  }
  return gate.gate;
};

export const gateLabel = (gate: GateCell): string => {
  if (gate === null) {
    return "";
  }
  if (gate === "CNOT" || gate === "TOFFOLI") {
    return "";
  }
  if (isBuiltinGate(gate)) {
    return gate;
  }

  const custom = state.customOperators.find((entry) => entry.id === gate);
  return custom ? custom.label : "U";
};
