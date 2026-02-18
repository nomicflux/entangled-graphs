import { reactive } from "vue";
import type { BlochParams, CircuitColumn, CustomOperator, GateId } from "../types";
import { loadCustomOperators } from "./custom-operator-storage";
import { zeroBloch } from "./qubit-helpers";

export type CircuitState = {
  preparedBloch: BlochParams[];
  columns: CircuitColumn[];
  customOperators: CustomOperator[];
  selectedGate: GateId | null;
  selectedStageIndex: number;
};

let gateInstanceCounter = 0;

export const nextGateInstanceId = (): string => {
  gateInstanceCounter += 1;
  return `g${gateInstanceCounter}`;
};

export const emptyColumn = (): CircuitColumn => ({ gates: [] });

export const state = reactive<CircuitState>({
  preparedBloch: [{ ...zeroBloch }, { ...zeroBloch }],
  columns: [
    {
      gates: [
        { id: nextGateInstanceId(), gate: "H", wires: [0] },
        { id: nextGateInstanceId(), gate: "X", wires: [1] },
      ],
    },
    {
      gates: [
        { id: nextGateInstanceId(), gate: "S", wires: [0] },
        { id: nextGateInstanceId(), gate: "H", wires: [1] },
      ],
    },
    emptyColumn(),
    emptyColumn(),
  ],
  customOperators: loadCustomOperators(),
  selectedGate: "H",
  selectedStageIndex: 4,
});
