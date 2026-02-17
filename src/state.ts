import { computed, reactive } from "vue";
import type { BlochParams, CircuitColumn, Qubit, TwoQubitState } from "./types";
import * as complex from "./complex";
import { measurement_distribution, simulate_columns, tensor_product_qubits } from "./quantum";

export type CircuitState = {
  preparedBloch: [BlochParams, BlochParams];
  columns: CircuitColumn[];
};

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
