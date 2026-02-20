import { computed } from "vue";
import type {
  CircuitColumn,
  GateCell,
  GateId,
  GateInstance,
  QubitState,
  Qubit,
  StageView,
  StateEnsemble,
} from "../types";
import {
  bloch_pair_from_ensemble,
  entanglement_links_from_ensemble,
  measurement_distribution_for_ensemble,
  simulate_columns_ensemble,
  stage_entanglement_models_from_snapshots,
  tensor_product_qubits,
} from "../quantum";
import { gateTouchesRow } from "./gate-instance-utils";
import { isBuiltinGate, resolveOperator } from "./operators";
import { preparedDistributionForQubits, qubitFromBloch } from "./qubit-helpers";
import { state } from "./store";

export const qubitCount = computed(() => state.preparedBloch.length);

export const preparedQubits = computed<Qubit[]>(() => state.preparedBloch.map(qubitFromBloch));

export const preparedState = computed<QubitState>(() => tensor_product_qubits(preparedQubits.value));

export const preparedDistribution = computed(() => preparedDistributionForQubits(preparedQubits.value));

const resolveGate = (gate: GateId) => resolveOperator(gate, state.customOperators);

export const ensembleSnapshots = computed<StateEnsemble[]>(() =>
  simulate_columns_ensemble(preparedState.value, state.columns, resolveGate, qubitCount.value),
);

export const finalEnsemble = computed<StateEnsemble>(() => ensembleSnapshots.value[ensembleSnapshots.value.length - 1]!);

export const finalDistribution = computed(() => measurement_distribution_for_ensemble(finalEnsemble.value));

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
