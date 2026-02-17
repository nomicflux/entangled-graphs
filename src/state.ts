import { computed, reactive } from "vue";
import type { Qubit } from "./types";
import * as complex from "./complex";

export type GateId = "I" | "X" | "H" | "S";
export type GateCell = GateId | null;
export type CircuitColumn = [GateCell, GateCell];
export type BlochParams = {
  theta: number;
  phi: number;
};

export type CircuitState = {
  preparedBloch: [BlochParams, BlochParams];
  columns: CircuitColumn[];
};

const emptyColumn = (): CircuitColumn => [null, null];

export const state = reactive<CircuitState>({
  preparedBloch: [
    { theta: 0, phi: 0 },
    { theta: 0, phi: 0 },
  ],
  columns: [emptyColumn(), emptyColumn(), emptyColumn(), emptyColumn()],
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
