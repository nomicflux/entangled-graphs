import type { GateId, GateInstance } from "../types";
import { MAX_QUBITS, MIN_QUBITS } from "./constants";
import { normalizeOperator, persistCustomOperators } from "./custom-operator-storage";
import { enforceDisjoint, gateTouchesRow, gateWires, mapGateAfterQubitRemoval, removeOverlaps } from "./gate-instance-utils";
import type { CellRef, CnotPlacement, SingleGatePlacement, ToffoliPlacement } from "./placements";
import { emptyColumn, nextGateInstanceId, state } from "./store";
import { zeroBloch } from "./qubit-helpers";
import { makeSingleQubitOperator, type SingleQubitMatrixEntries } from "../operator";
import { operatorArityForGate } from "./operators";

const sanitizeColumnsForQubitCount = (count: number): void => {
  for (const column of state.columns) {
    column.gates = column.gates.filter((gate) => {
      const wires = gateWires(gate);
      if (wires.some((wire) => wire < 0 || wire >= count)) {
        return false;
      }
      const arity = operatorArityForGate(gate.gate, state.customOperators);
      if (arity === null) {
        return false;
      }
      if (arity !== wires.length) {
        return false;
      }
      if (count < arity) {
        return false;
      }
      return true;
    });

    enforceDisjoint(column);
  }

  if (state.selectedGate !== null) {
    const arity = operatorArityForGate(state.selectedGate, state.customOperators);
    if (arity === null || count < arity) {
      state.selectedGate = null;
    }
  }
};

const pushGate = (columnIndex: number, gate: GateInstance): void => {
  const column = state.columns[columnIndex]!;
  removeOverlaps(column, gate.wires);
  column.gates.push(gate);
  enforceDisjoint(column);
};

export const setSelectedGate = (gate: GateId | null): void => {
  if (gate !== null) {
    const arity = operatorArityForGate(gate, state.customOperators);
    if (arity === null || arity > state.preparedBloch.length) {
      return;
    }
  }
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

export const createCustomOperator = (label: string, entries: SingleQubitMatrixEntries): string => {
  const id = `custom-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
  const operatorLabel = label.trim() === "" ? `U${state.customOperators.length + 1}` : label.trim();
  const created = normalizeOperator(makeSingleQubitOperator(id, operatorLabel, entries));

  state.customOperators.push(created);
  persistCustomOperators(state.customOperators);
  return created.id;
};

export const deleteCustomOperator = (id: string): void => {
  state.customOperators = state.customOperators.filter((entry) => entry.id !== id);

  for (const column of state.columns) {
    column.gates = column.gates.filter((gate) => gate.gate !== id);
  }

  if (state.selectedGate === id) {
    state.selectedGate = null;
  }

  persistCustomOperators(state.customOperators);
};

export const placeCnot = (placement: CnotPlacement): void => {
  pushGate(placement.column, {
    id: nextGateInstanceId(),
    gate: "CNOT",
    wires: [placement.control, placement.target],
  });
};

export const placeToffoli = (placement: ToffoliPlacement): void => {
  pushGate(placement.column, {
    id: nextGateInstanceId(),
    gate: "TOFFOLI",
    wires: [placement.controlA, placement.controlB, placement.target],
  });
};

export const setGateAt = (placement: SingleGatePlacement): void => {
  pushGate(placement.cell.column, {
    id: nextGateInstanceId(),
    gate: placement.gate,
    wires: [placement.cell.wire],
  });
};

export const clearGateAt = (cell: CellRef): void => {
  const column = state.columns[cell.column]!;
  column.gates = column.gates.filter((gate) => !gateTouchesRow(gate, cell.wire));
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
