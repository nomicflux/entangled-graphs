import { computed } from "vue";
import type {
  CircuitColumn,
  GateCell,
  GateInstance,
  Operator,
  QubitState,
  Qubit,
  SingleGateRef,
  StageView,
} from "../types";
import { bloch_pair_from_state, measurement_distribution, simulate_columns, tensor_product_qubits } from "../quantum";
import { gateTouchesRow } from "./gate-instance-utils";
import { isBuiltinSingleGate, builtinOperatorMap } from "./operators";
import { preparedDistributionForQubits, qubitFromBloch } from "./qubit-helpers";
import { state } from "./store";

export const qubitCount = computed(() => state.preparedBloch.length);

export const preparedQubits = computed<Qubit[]>(() => state.preparedBloch.map(qubitFromBloch));

export const preparedState = computed<QubitState>(() => tensor_product_qubits(preparedQubits.value));

export const preparedDistribution = computed(() => preparedDistributionForQubits(preparedQubits.value));

const resolveSingleGate = (gate: SingleGateRef): Operator | null => {
  if (isBuiltinSingleGate(gate)) {
    return builtinOperatorMap[gate];
  }

  const custom = state.customOperators.find((entry) => entry.id === gate);
  return custom ? custom.operator : null;
};

export const stateSnapshots = computed<QubitState[]>(() =>
  simulate_columns(preparedState.value, state.columns, resolveSingleGate, qubitCount.value),
);

export const finalState = computed<QubitState>(() => stateSnapshots.value[stateSnapshots.value.length - 1]!);

export const finalDistribution = computed(() => measurement_distribution(finalState.value));

export const stageViews = computed<StageView[]>(() => {
  const lastIndex = stateSnapshots.value.length - 1;

  return stateSnapshots.value.map((snapshot, index) => ({
    id: index === 0 ? "prepared" : index === lastIndex ? "final" : `t${index}`,
    index,
    label: index === 0 ? "Prepared" : index === lastIndex ? "Final" : `After t${index}`,
    distribution: measurement_distribution(snapshot),
    blochPair: bloch_pair_from_state(snapshot),
    isFinal: index === lastIndex,
  }));
});

export const selectedStage = computed<StageView>(() => stageViews.value[state.selectedStageIndex]!);

export const gateInstanceAt = (column: CircuitColumn, row: number): GateInstance | null =>
  column.gates.find((entry) => gateTouchesRow(entry, row)) ?? null;

export const gateAt = (column: CircuitColumn, row: number): GateCell => {
  const gate = gateInstanceAt(column, row);

  if (!gate) {
    return null;
  }
  if (gate.kind === "single") {
    return gate.gate;
  }
  return gate.kind === "cnot" ? "CNOT" : "TOFFOLI";
};

export const gateLabel = (gate: GateCell): string => {
  if (gate === null) {
    return "";
  }
  if (gate === "CNOT" || gate === "TOFFOLI") {
    return "";
  }
  if (isBuiltinSingleGate(gate)) {
    return gate;
  }

  const custom = state.customOperators.find((entry) => entry.id === gate);
  return custom ? custom.label : "U";
};
