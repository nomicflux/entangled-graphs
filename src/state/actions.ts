import type { GateId, GateInstance } from "../types";
import { MAX_QUBITS, MIN_QUBITS } from "./constants";
import { normalizeOperator, persistCustomOperators } from "./custom-operator-storage";
import { enforceDisjoint, gateTouchesRow, gateWires, mapGateAfterQubitRemoval, removeOverlaps } from "./gate-instance-utils";
import type { CellRef, CnotPlacement, MultiGatePlacement, SingleGatePlacement, ToffoliPlacement } from "./placements";
import { emptyColumn, nextGateInstanceId, state } from "./store";
import { zeroBloch } from "./qubit-helpers";
import { blockMatrix2x2, makeSingleQubitOperator, type Block2x2, type SingleQubitMatrixEntries } from "../operator";
import { operatorArityForGate } from "./operators";

const enforceMeasurementLockRules = (): void => {
  const firstMeasurementByRow = new Map<number, number>();

  for (let columnIndex = 0; columnIndex < state.columns.length; columnIndex += 1) {
    const column = state.columns[columnIndex]!;
    column.gates = column.gates.filter((gate) => {
      if (gate.wires.some((wire) => {
        const measuredAt = firstMeasurementByRow.get(wire);
        return measuredAt !== undefined && columnIndex > measuredAt;
      })) {
        return false;
      }

      if (gate.gate === "M") {
        const row = gate.wires[0];
        if (row === undefined || firstMeasurementByRow.has(row)) {
          return false;
        }
        firstMeasurementByRow.set(row, columnIndex);
      }

      return true;
    });

    enforceDisjoint(column);
  }
};

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

  enforceMeasurementLockRules();

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
  enforceMeasurementLockRules();
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

const nextCustomOperatorId = (): string => `custom-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;

const nextCustomOperatorLabel = (label: string): string =>
  label.trim() === "" ? `U${state.customOperators.length + 1}` : label.trim();

export const createCustomSingleQubitOperator = (label: string, entries: SingleQubitMatrixEntries): string => {
  const id = nextCustomOperatorId();
  const operatorLabel = nextCustomOperatorLabel(label);
  const created = normalizeOperator(makeSingleQubitOperator(id, operatorLabel, entries));

  state.customOperators.push(created);
  persistCustomOperators(state.customOperators);
  return created.id;
};

export const createCustomBlockOperator = (label: string, blocks: Block2x2<1>): string => {
  const id = nextCustomOperatorId();
  const operatorLabel = nextCustomOperatorLabel(label);
  const created = blockMatrix2x2(id, operatorLabel, blocks);

  state.customOperators.push(created);
  persistCustomOperators(state.customOperators);
  return created.id;
};

export const createCustomOperator = createCustomSingleQubitOperator;

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

export const placeMultiGate = (placement: MultiGatePlacement): void => {
  pushGate(placement.column, {
    id: nextGateInstanceId(),
    gate: placement.gate,
    wires: placement.wires,
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
