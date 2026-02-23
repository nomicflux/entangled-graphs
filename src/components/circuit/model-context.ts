import { computed, type ComputedRef } from "vue";
import type {
  CircuitColumn,
  EntanglementLink,
  GateId,
  GateInstance,
  QubitRow,
  StageEntanglementModel,
} from "../../types";
import {
  clearGateAt,
  gateInstanceAt,
  gateLabel,
  placeCnot,
  placeMultiGate,
  placeToffoli,
  qubitCount,
  setGateAt,
  setSelectedGate,
  stageEntanglementLinks,
  stageEntanglementModels,
  state,
  toCellRef,
  toCnotPlacement,
  toMultiGatePlacement,
  toSingleGatePlacement,
  toToffoliPlacement,
} from "../../state";
import { operatorArityForGate, resolveOperator } from "../../state/operators";

export type CircuitGridModelContext = {
  columns: ComputedRef<readonly CircuitColumn[]>;
  qubitCount: ComputedRef<number>;
  selectedGate: ComputedRef<GateId | null>;
  gateArity: (gate: GateId) => number;
  gateName: (gate: GateId) => string;
  gateLabel: (gate: GateId) => string;
  gateInstanceAt: (column: CircuitColumn, row: QubitRow) => GateInstance | null;
  setSelectedGate: (gate: GateId | null) => void;
  clearGateAt: (column: number, row: QubitRow) => boolean;
  setSingleGateAt: (column: number, row: QubitRow, gate: GateId) => boolean;
  placeCnotAt: (column: number, control: QubitRow, target: QubitRow) => boolean;
  placeToffoliAt: (column: number, controlA: QubitRow, controlB: QubitRow, target: QubitRow) => boolean;
  placeMultiGateAt: (column: number, wires: ReadonlyArray<QubitRow>, gate: GateId) => boolean;
  stageEntanglementLinks: ComputedRef<ReadonlyArray<ReadonlyArray<EntanglementLink>>>;
  stageEntanglementModels: ComputedRef<ReadonlyArray<StageEntanglementModel>>;
};

export const createFreeFormGridModelContext = (): CircuitGridModelContext => ({
  columns: computed(() => state.columns),
  qubitCount: computed(() => qubitCount.value),
  selectedGate: computed(() => state.selectedGate),
  gateArity: (gate: GateId) => operatorArityForGate(gate, state.customOperators) ?? 0,
  gateName: (gate: GateId) => resolveOperator(gate, state.customOperators)?.label ?? gate,
  gateLabel: (gate: GateId) => gateLabel(gate),
  gateInstanceAt: (column: CircuitColumn, row: QubitRow) => gateInstanceAt(column, row),
  setSelectedGate,
  clearGateAt: (column: number, row: QubitRow): boolean => {
    const cell = toCellRef(column, row);
    if (!cell) {
      return false;
    }
    clearGateAt(cell);
    return true;
  },
  setSingleGateAt: (column: number, row: QubitRow, gate: GateId): boolean => {
    const placement = toSingleGatePlacement(column, row, gate);
    if (!placement) {
      return false;
    }
    setGateAt(placement);
    return true;
  },
  placeCnotAt: (column: number, control: QubitRow, target: QubitRow): boolean => {
    const placement = toCnotPlacement(column, control, target);
    if (!placement) {
      return false;
    }
    placeCnot(placement);
    return true;
  },
  placeToffoliAt: (column: number, controlA: QubitRow, controlB: QubitRow, target: QubitRow): boolean => {
    const placement = toToffoliPlacement(column, controlA, controlB, target);
    if (!placement) {
      return false;
    }
    placeToffoli(placement);
    return true;
  },
  placeMultiGateAt: (column: number, wires: ReadonlyArray<QubitRow>, gate: GateId): boolean => {
    const placement = toMultiGatePlacement(column, wires, gate);
    if (!placement) {
      return false;
    }
    placeMultiGate(placement);
    return true;
  },
  stageEntanglementLinks: computed(() => stageEntanglementLinks.value),
  stageEntanglementModels: computed(() => stageEntanglementModels.value),
});
