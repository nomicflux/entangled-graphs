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
        { id: nextGateInstanceId(), kind: "single", gate: "H", target: 0 },
        { id: nextGateInstanceId(), kind: "single", gate: "X", target: 1 },
      ],
    },
    {
      gates: [
        { id: nextGateInstanceId(), kind: "single", gate: "S", target: 0 },
        { id: nextGateInstanceId(), kind: "single", gate: "H", target: 1 },
      ],
    },
    emptyColumn(),
    emptyColumn(),
  ],
  customOperators: loadCustomOperators(),
  selectedGate: "H",
  selectedStageIndex: 4,
});
