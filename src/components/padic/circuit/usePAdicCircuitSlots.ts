import { computed } from "vue";
import type { CircuitColumn, GateInstance, QubitRow } from "../../../types";
import { firstMeasurementColumnByRow, operatorArityForGate, state } from "../../../state";

export const usePAdicCircuitSlots = () => {
  const rows = computed<QubitRow[]>(() => Array.from({ length: state.pAdic.qubitCount }, (_, index) => index));

  const measurementLockByRow = computed(() => firstMeasurementColumnByRow(state.pAdic.columns));

  const isRowLocked = (column: number, row: QubitRow): boolean => {
    const measuredAt = measurementLockByRow.value.get(row);
    return measuredAt !== undefined && column > measuredAt;
  };

  const slotTitle = (column: number, row: QubitRow): string => {
    const measuredAt = measurementLockByRow.value.get(row);
    if (measuredAt === undefined || column <= measuredAt) {
      return "";
    }
    return `Locked: q${row} measured at t${measuredAt + 1}`;
  };

  const slotGate = (column: CircuitColumn, row: number): GateInstance | null =>
    column.gates.find((entry) => entry.wires.includes(row)) ?? null;

  const tokenFor = (column: CircuitColumn, row: number): string => {
    const instance = slotGate(column, row);
    if (!instance || instance.gate === "CNOT" || instance.gate === "TOFFOLI") {
      return "";
    }

    if (instance.gate === "SWAP" || instance.gate === "CSWAP") {
      if (instance.gate === "CSWAP" && instance.wires[0] === row) {
        return "";
      }
      return "×";
    }

    return instance.gate;
  };

  const isCnotControl = (column: CircuitColumn, row: number): boolean => {
    const instance = slotGate(column, row);
    return instance?.gate === "CNOT" && instance.wires[0] === row;
  };

  const isCnotTarget = (column: CircuitColumn, row: number): boolean => {
    const instance = slotGate(column, row);
    return instance?.gate === "CNOT" && instance.wires[1] === row;
  };

  const isToffoliControl = (column: CircuitColumn, row: number): boolean => {
    const instance = slotGate(column, row);
    return instance?.gate === "TOFFOLI" && (instance.wires[0] === row || instance.wires[1] === row);
  };

  const isToffoliTarget = (column: CircuitColumn, row: number): boolean => {
    const instance = slotGate(column, row);
    return instance?.gate === "TOFFOLI" && instance.wires[2] === row;
  };

  const isMultiWire = (column: CircuitColumn, row: number): boolean => {
    const instance = slotGate(column, row);
    if (!instance) {
      return false;
    }

    const arity = operatorArityForGate(instance.gate, []) ?? 0;
    if (arity < 2) {
      return false;
    }

    return instance.gate !== "CNOT" && instance.gate !== "TOFFOLI" && instance.gate !== "M";
  };

  const isMeasurementToken = (column: CircuitColumn, row: number): boolean => {
    const instance = slotGate(column, row);
    return instance?.gate === "M" && instance.wires[0] === row;
  };

  return {
    rows,
    isRowLocked,
    slotTitle,
    slotGate,
    tokenFor,
    isCnotControl,
    isCnotTarget,
    isToffoliControl,
    isToffoliTarget,
    isMultiWire,
    isMeasurementToken,
  };
};
