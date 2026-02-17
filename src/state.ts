import { computed, reactive } from "vue";
import type {
  BlochParams,
  BuiltinSingleGateId,
  CircuitColumn,
  CustomOperator,
  GateCell,
  GateId,
  Operator,
  Qubit,
  QubitRow,
  SingleGateRef,
  StageView,
  TwoQubitState,
} from "./types";
import * as complex from "./complex";
import { H, I, S, X } from "./operator";
import { bloch_pair_from_state, measurement_distribution, simulate_columns, tensor_product_qubits } from "./quantum";

const CUSTOM_OPERATOR_STORAGE_KEY = "entangled.custom-operators.v1";

const builtinOperatorMap: Record<BuiltinSingleGateId, Operator> = {
  I,
  X,
  H,
  S,
};

export type CircuitState = {
  preparedBloch: [BlochParams, BlochParams];
  columns: CircuitColumn[];
  customOperators: CustomOperator[];
  selectedGate: GateId | null;
  selectedStageIndex: number;
};

export const emptyColumn = (): CircuitColumn => ({ kind: "single", q0: null, q1: null });

const isBuiltinSingleGate = (gate: string): gate is BuiltinSingleGateId => gate === "I" || gate === "X" || gate === "H" || gate === "S";
const isSingleGate = (gate: GateCell): gate is SingleGateRef => gate !== null && gate !== "CNOT";

const normalizeOperator = (operator: Operator): Operator => {
  const values = [operator.o00, operator.o01, operator.o10, operator.o11];
  const norm = Math.sqrt(values.reduce((acc, value) => acc + complex.magnitude_squared(value), 0));
  if (norm === 0) {
    return operator;
  }
  const scale = 1 / norm;
  return {
    o00: complex.scale(operator.o00, scale),
    o01: complex.scale(operator.o01, scale),
    o10: complex.scale(operator.o10, scale),
    o11: complex.scale(operator.o11, scale),
  };
};

const loadCustomOperators = (): CustomOperator[] => {
  if (typeof window === "undefined") {
    return [];
  }

  try {
    const raw = window.localStorage.getItem(CUSTOM_OPERATOR_STORAGE_KEY);
    if (!raw) {
      return [];
    }
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) {
      return [];
    }

    return parsed.filter((candidate): candidate is CustomOperator => {
      if (typeof candidate !== "object" || candidate === null) {
        return false;
      }
      return typeof candidate.id === "string" && typeof candidate.label === "string" && typeof candidate.operator === "object";
    });
  } catch {
    return [];
  }
};

const persistCustomOperators = (customOperators: CustomOperator[]) => {
  if (typeof window === "undefined") {
    return;
  }
  window.localStorage.setItem(CUSTOM_OPERATOR_STORAGE_KEY, JSON.stringify(customOperators));
};

export const state = reactive<CircuitState>({
  preparedBloch: [
    { theta: 0, phi: 0 },
    { theta: 0, phi: 0 },
  ],
  columns: [
    { kind: "single", q0: "H", q1: null },
    { kind: "single", q0: null, q1: "X" },
    { kind: "single", q0: "S", q1: "H" },
    { kind: "single", q0: null, q1: null },
  ],
  customOperators: loadCustomOperators(),
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

export function gateAt(column: CircuitColumn, row: QubitRow): GateCell {
  if (column.kind === "single") {
    return row === 0 ? column.q0 : column.q1;
  }
  return "CNOT";
}

export function gateLabel(gate: GateCell): string {
  if (gate === null) {
    return "";
  }
  if (gate === "CNOT") {
    return "";
  }
  if (isBuiltinSingleGate(gate)) {
    return gate;
  }
  const custom = state.customOperators.find((entry) => entry.id === gate);
  return custom ? custom.label : "U";
}

const resolveSingleGate = (gate: SingleGateRef): Operator | null => {
  if (isBuiltinSingleGate(gate)) {
    return builtinOperatorMap[gate];
  }
  const custom = state.customOperators.find((entry) => entry.id === gate);
  return custom ? custom.operator : null;
};

export const preparedQubits = computed<[Qubit, Qubit]>(() => [
  qubitFromBloch(state.preparedBloch[0]),
  qubitFromBloch(state.preparedBloch[1]),
]);

export const preparedTwoQubitState = computed<TwoQubitState>(() =>
  tensor_product_qubits(preparedQubits.value[0], preparedQubits.value[1]),
);

export const stateSnapshots = computed<TwoQubitState[]>(() =>
  simulate_columns(preparedTwoQubitState.value, state.columns, resolveSingleGate),
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

export function createCustomOperator(label: string, operator: Operator): string {
  const created: CustomOperator = {
    id: `custom-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    label: label.trim() === "" ? `U${state.customOperators.length + 1}` : label.trim(),
    operator: normalizeOperator(operator),
  };

  state.customOperators.push(created);
  persistCustomOperators(state.customOperators);
  return created.id;
}

export function deleteCustomOperator(id: string): void {
  state.customOperators = state.customOperators.filter((entry) => entry.id !== id);

  for (const column of state.columns) {
    if (column.kind !== "single") {
      continue;
    }
    if (column.q0 === id) {
      column.q0 = null;
    }
    if (column.q1 === id) {
      column.q1 = null;
    }
  }

  if (state.selectedGate === id) {
    state.selectedGate = null;
  }

  persistCustomOperators(state.customOperators);
}

export function setGateAt(columnIndex: number, row: QubitRow, gate: GateCell): void {
  const column = state.columns[columnIndex];
  if (!column) {
    return;
  }

  if (gate === null) {
    clearGateAt(columnIndex, row);
    return;
  }

  if (gate === "CNOT") {
    state.columns[columnIndex] = { kind: "cnot", control: row, target: row === 0 ? 1 : 0 };
    return;
  }

  if (!isSingleGate(gate)) {
    return;
  }

  if (column.kind === "cnot") {
    state.columns[columnIndex] = emptyColumn();
  }

  const next = state.columns[columnIndex];
  if (next.kind !== "single") {
    return;
  }

  if (row === 0) {
    next.q0 = gate;
  } else {
    next.q1 = gate;
  }
}

export function clearGateAt(columnIndex: number, row: QubitRow): void {
  const column = state.columns[columnIndex];
  if (!column) {
    return;
  }

  if (column.kind === "cnot") {
    state.columns[columnIndex] = emptyColumn();
    return;
  }

  if (row === 0) {
    column.q0 = null;
  } else {
    column.q1 = null;
  }
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
