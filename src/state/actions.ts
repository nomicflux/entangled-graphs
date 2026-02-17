import type { GateId, GateInstance, Operator, QubitRow, SingleGateRef } from "../types";
import { MAX_QUBITS, MIN_QUBITS } from "./constants";
import { normalizeOperator, persistCustomOperators } from "./custom-operator-storage";
import { enforceDisjoint, gateTouchesRow, gateWires, mapGateAfterQubitRemoval, removeOverlaps } from "./gate-instance-utils";
import { qubitCount } from "./selectors";
import { emptyColumn, nextGateInstanceId, state } from "./store";
import { zeroBloch } from "./qubit-helpers";

const sanitizeColumnsForQubitCount = (count: number): void => {
  for (const column of state.columns) {
    column.gates = column.gates.filter((gate) => {
      const wires = gateWires(gate);
      if (wires.some((wire) => wire < 0 || wire >= count)) {
        return false;
      }
      if (gate.kind === "cnot" && count < 2) {
        return false;
      }
      if (gate.kind === "toffoli" && count < 3) {
        return false;
      }
      return true;
    });

    enforceDisjoint(column);
  }

  if (state.selectedGate === "CNOT" && count < 2) {
    state.selectedGate = null;
  }
  if (state.selectedGate === "TOFFOLI" && count < 3) {
    state.selectedGate = null;
  }
};

export const setSelectedGate = (gate: GateId | null): void => {
  state.selectedGate = gate;
};

export const addQubit = (): void => {
  if (state.preparedBloch.length >= MAX_QUBITS) {
    return;
  }

  state.preparedBloch.push({ ...zeroBloch });
  sanitizeColumnsForQubitCount(state.preparedBloch.length);
};

export const removeQubit = (index: number = state.preparedBloch.length - 1): void => {
  if (state.preparedBloch.length <= MIN_QUBITS) {
    return;
  }

  const target = Math.max(0, Math.min(index, state.preparedBloch.length - 1));
  state.preparedBloch.splice(target, 1);

  for (const column of state.columns) {
    column.gates = column.gates
      .map((gate) => mapGateAfterQubitRemoval(gate, target))
      .filter((gate): gate is GateInstance => gate !== null);
    enforceDisjoint(column);
  }

  sanitizeColumnsForQubitCount(state.preparedBloch.length);
};

export const setQubitCount = (nextCount: number): void => {
  const parsed = Number.isFinite(nextCount) ? Math.trunc(nextCount) : state.preparedBloch.length;
  const bounded = Math.max(MIN_QUBITS, Math.min(MAX_QUBITS, parsed));

  while (state.preparedBloch.length < bounded) {
    addQubit();
  }

  while (state.preparedBloch.length > bounded) {
    removeQubit(state.preparedBloch.length - 1);
  }
};

export const createCustomOperator = (label: string, operator: Operator): string => {
  const created = {
    id: `custom-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    label: label.trim() === "" ? `U${state.customOperators.length + 1}` : label.trim(),
    operator: normalizeOperator(operator),
  };

  state.customOperators.push(created);
  persistCustomOperators(state.customOperators);
  return created.id;
};

export const deleteCustomOperator = (id: string): void => {
  state.customOperators = state.customOperators.filter((entry) => entry.id !== id);

  for (const column of state.columns) {
    column.gates = column.gates.filter((gate) => !(gate.kind === "single" && gate.gate === id));
  }

  if (state.selectedGate === id) {
    state.selectedGate = null;
  }

  persistCustomOperators(state.customOperators);
};

export const placeCnot = (columnIndex: number, control: QubitRow, target: QubitRow): void => {
  const column = state.columns[columnIndex];
  if (!column || qubitCount.value < 2) {
    return;
  }
  if (control === target) {
    return;
  }
  if (control < 0 || control >= qubitCount.value || target < 0 || target >= qubitCount.value) {
    return;
  }

  removeOverlaps(column, [control, target]);
  column.gates.push({ id: nextGateInstanceId(), kind: "cnot", control, target });
  enforceDisjoint(column);
};

export const placeToffoli = (columnIndex: number, controlA: QubitRow, controlB: QubitRow, target: QubitRow): void => {
  const column = state.columns[columnIndex];
  if (!column || qubitCount.value < 3) {
    return;
  }

  const unique = new Set([controlA, controlB, target]);
  if (unique.size !== 3) {
    return;
  }

  if (
    controlA < 0 ||
    controlA >= qubitCount.value ||
    controlB < 0 ||
    controlB >= qubitCount.value ||
    target < 0 ||
    target >= qubitCount.value
  ) {
    return;
  }

  removeOverlaps(column, [controlA, controlB, target]);
  column.gates.push({ id: nextGateInstanceId(), kind: "toffoli", controlA, controlB, target });
  enforceDisjoint(column);
};

export const setGateAt = (columnIndex: number, row: QubitRow, gate: SingleGateRef | null): void => {
  const column = state.columns[columnIndex];
  if (!column || row < 0 || row >= qubitCount.value) {
    return;
  }

  if (gate === null) {
    clearGateAt(columnIndex, row);
    return;
  }

  removeOverlaps(column, [row]);
  column.gates.push({ id: nextGateInstanceId(), kind: "single", gate, target: row });
  enforceDisjoint(column);
};

export const clearGateAt = (columnIndex: number, row: QubitRow): void => {
  const column = state.columns[columnIndex];
  if (!column) {
    return;
  }

  column.gates = column.gates.filter((gate) => !gateTouchesRow(gate, row));
};

export const appendColumn = (): void => {
  state.columns.push(emptyColumn());
};

export const removeLastColumn = (): void => {
  if (state.columns.length === 0) {
    return;
  }

  state.columns.pop();
  if (state.selectedStageIndex > state.columns.length) {
    state.selectedStageIndex = state.columns.length;
  }
};

export const setSelectedStage = (index: number): void => {
  if (index < 0 || index > state.columns.length) {
    return;
  }

  state.selectedStageIndex = index;
};
