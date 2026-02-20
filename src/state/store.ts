import { reactive } from "vue";
import type { BlochParams, CircuitColumn, CustomOperator, GateId } from "../types";
import { loadCustomOperators } from "./custom-operator-storage";
import { zeroBloch } from "./qubit-helpers";
import {
  DEFAULT_PADIC_GEOMETRY_MODE,
  DEFAULT_PADIC_MEASUREMENT_MODEL,
  DEFAULT_PADIC_PRIME,
  PADIC_DEFAULT_QUBIT_COUNT,
  type PAdicGeometryMode,
  type PAdicMeasurementModel,
  type PAdicPrime,
} from "../padic-config";

export type PAdicAmplitudeInput = {
  raw: string;
};

export type PAdicPreparedQubit = {
  a: PAdicAmplitudeInput;
  b: PAdicAmplitudeInput;
};

export type PAdicWorkspaceState = {
  prime: PAdicPrime;
  measurementModel: PAdicMeasurementModel;
  geometryMode: PAdicGeometryMode;
  qubitCount: number;
  preparedQubits: PAdicPreparedQubit[];
  columns: CircuitColumn[];
  selectedGate: GateId | null;
  selectedStageIndex: number;
  selectedBasis: string | null;
};

export type CircuitState = {
  preparedBloch: BlochParams[];
  columns: CircuitColumn[];
  customOperators: CustomOperator[];
  selectedGate: GateId | null;
  selectedStageIndex: number;
  pAdic: PAdicWorkspaceState;
};

let gateInstanceCounter = 0;

export const nextGateInstanceId = (): string => {
  gateInstanceCounter += 1;
  return `g${gateInstanceCounter}`;
};

export const emptyColumn = (): CircuitColumn => ({ gates: [] });
const defaultPAdicPreparedQubit = (): PAdicPreparedQubit => ({
  a: { raw: "1" },
  b: { raw: "0" },
});

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
  pAdic: {
    prime: DEFAULT_PADIC_PRIME,
    measurementModel: DEFAULT_PADIC_MEASUREMENT_MODEL,
    geometryMode: DEFAULT_PADIC_GEOMETRY_MODE,
    qubitCount: PADIC_DEFAULT_QUBIT_COUNT,
    preparedQubits: Array.from({ length: PADIC_DEFAULT_QUBIT_COUNT }, () => defaultPAdicPreparedQubit()),
    columns: [emptyColumn(), emptyColumn(), emptyColumn(), emptyColumn()],
    selectedGate: "X",
    selectedStageIndex: 0,
    selectedBasis: null,
  },
});
