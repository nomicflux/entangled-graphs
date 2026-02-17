import { computed, reactive } from "vue";
import type {
  BlochParams,
  CircuitColumn,
  GateCell,
  GateId,
  Qubit,
  QubitRow,
  StageView,
  TwoQubitState,
} from "./types";
import * as complex from "./complex";
import { bloch_pair_from_state, measurement_distribution, simulate_columns, tensor_product_qubits } from "./quantum";

export type CircuitState = {
  preparedBloch: [BlochParams, BlochParams];
  columns: CircuitColumn[];
  selectedGate: GateId | null;
  selectedStageIndex: number;
};

const emptyColumn = (): CircuitColumn => [null, null];

export const state = reactive<CircuitState>({
  preparedBloch: [
    { theta: 0, phi: 0 },
    { theta: 0, phi: 0 },
  ],
  columns: [
    ["H", null],
    [null, "X"],
    ["S", "H"],
    [null, null],
  ],
  selectedGate: "H",
  selectedStageIndex: 4,
});

export function qubitFromBloch(params: BlochParams): Qubit {
  const halfTheta = params.theta / 2;
  const magnitude = Math.sin(halfTheta);
  return {
    a: complex.complex(Math.cos(halfTheta), 0),
    b: complex.complex(Math.cos(params.phi) * magnitude, Math.sin(params.phi) * magnitude),
  };
}

export const preparedQubits = computed<[Qubit, Qubit]>(() => [
  qubitFromBloch(state.preparedBloch[0]),
  qubitFromBloch(state.preparedBloch[1]),
]);

export const preparedTwoQubitState = computed<TwoQubitState>(() =>
  tensor_product_qubits(preparedQubits.value[0], preparedQubits.value[1]),
);

export const stateSnapshots = computed<TwoQubitState[]>(() =>
  simulate_columns(preparedTwoQubitState.value, state.columns),
);

export const finalTwoQubitState = computed<TwoQubitState>(() => stateSnapshots.value[stateSnapshots.value.length - 1]);

export const finalDistribution = computed(() => measurement_distribution(finalTwoQubitState.value));

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

export function setSelectedGate(gate: GateId | null): void {
  state.selectedGate = gate;
}

export function setGateAt(columnIndex: number, row: QubitRow, gate: GateCell): void {
  const column = state.columns[columnIndex];
  if (!column) {
    return;
  }
  column[row] = gate;
}

export function clearGateAt(columnIndex: number, row: QubitRow): void {
  setGateAt(columnIndex, row, null);
}

export function appendColumn(): void {
  state.columns.push(emptyColumn());
}

export function removeLastColumn(): void {
  if (state.columns.length === 0) {
    return;
  }
  state.columns.pop();
  if (state.selectedStageIndex > state.columns.length) {
    state.selectedStageIndex = state.columns.length;
  }
}

export function setSelectedStage(index: number): void {
  if (index < 0 || index > state.columns.length) {
    return;
  }
  state.selectedStageIndex = index;
}
