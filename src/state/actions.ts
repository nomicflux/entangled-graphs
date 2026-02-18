import type { GateId, GateInstance } from "../types";
import { MAX_QUBITS, MIN_QUBITS } from "./constants";
import { normalizeOperator, persistCustomOperators } from "./custom-operator-storage";
import { enforceDisjoint, gateTouchesRow, gateWires, mapGateAfterQubitRemoval, removeOverlaps } from "./gate-instance-utils";
import type { CellRef, CnotPlacement, SingleGatePlacement, ToffoliPlacement } from "./placements";
import { emptyColumn, nextGateInstanceId, state } from "./store";
import { zeroBloch } from "./qubit-helpers";
import { makeSingleQubitOperator, type SingleQubitMatrixEntries } from "../operator";

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
    column.gates = column.gates.filter((gate) => !(gate.kind === "single" && gate.gate === id));
  }

  if (state.selectedGate === id) {
    state.selectedGate = null;
  }

  persistCustomOperators(state.customOperators);
};

export const placeCnot = (placement: CnotPlacement): void => {
  const column = state.columns[placement.column]!;

  removeOverlaps(column, [placement.control, placement.target]);
  column.gates.push({
    id: nextGateInstanceId(),
    kind: "cnot",
    control: placement.control,
    target: placement.target,
  });
  enforceDisjoint(column);
};

export const placeToffoli = (placement: ToffoliPlacement): void => {
  const column = state.columns[placement.column]!;

  removeOverlaps(column, [placement.controlA, placement.controlB, placement.target]);
  column.gates.push({
    id: nextGateInstanceId(),
    kind: "toffoli",
    controlA: placement.controlA,
    controlB: placement.controlB,
    target: placement.target,
  });
  enforceDisjoint(column);
};

export const setGateAt = (placement: SingleGatePlacement): void => {
  const column = state.columns[placement.cell.column]!;

  removeOverlaps(column, [placement.cell.wire]);
  column.gates.push({
    id: nextGateInstanceId(),
    kind: "single",
    gate: placement.gate,
    target: placement.cell.wire,
  });
  enforceDisjoint(column);
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
