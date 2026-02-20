import type { GateId, GateInstance } from "../types";
import { emptyColumn, nextGateInstanceId, state } from "./store";
import {
  DEFAULT_PADIC_GEOMETRY_MODE,
  PADIC_DEFAULT_QUBIT_COUNT,
  PADIC_MAX_QUBITS,
  PADIC_MIN_QUBITS,
  clampPAdicQubitCount,
  isPAdicGeometryMode,
  isPAdicMeasurementModel,
  isPAdicPrime,
  type PAdicGeometryMode,
  type PAdicMeasurementModel,
  type PAdicPrime,
} from "../padic-config";
import { availablePAdicBuiltinGatesForQubitCount, operatorArityForGate } from "./operators";
import { enforceDisjoint, gateTouchesRow, gateWires, removeOverlaps } from "./gate-instance-utils";
import { enforceMeasurementLockRulesForColumns } from "./action-helpers";

const defaultPAdicPreparedQubit = () => ({
  a: { raw: "1" },
  b: { raw: "0" },
});

const availablePAdicGates = (qubitCount: number): GateId[] => availablePAdicBuiltinGatesForQubitCount(qubitCount);

const enforcePAdicMeasurementLockRules = (): void => {
  enforceMeasurementLockRulesForColumns(state.pAdic.columns);
};

const normalizePAdicSelectedBasis = (): void => {
  const basis = state.pAdic.selectedBasis;
  if (basis === null) {
    return;
  }

  if (!/^[01]+$/.test(basis) || basis.length !== state.pAdic.qubitCount) {
    state.pAdic.selectedBasis = null;
  }
};

const sanitizePAdicColumnsForQubitCount = (count: number): void => {
  const available = new Set(availablePAdicGates(count));

  for (const column of state.pAdic.columns) {
    column.gates = column.gates.filter((gate) => {
      if (!available.has(gate.gate)) {
        return false;
      }

      const wires = gateWires(gate);
      if (wires.some((wire) => wire < 0 || wire >= count)) {
        return false;
      }

      const arity = operatorArityForGate(gate.gate, []);
      if (arity === null || arity !== wires.length || count < arity) {
        return false;
      }

      return true;
    });

    enforceDisjoint(column);
  }

  enforcePAdicMeasurementLockRules();

  if (state.pAdic.selectedGate !== null && !available.has(state.pAdic.selectedGate)) {
    state.pAdic.selectedGate = availablePAdicGates(count)[0] ?? null;
  }
};

const isPAdicRowLockedAtColumn = (row: number, columnIndex: number): boolean => {
  const firstMeasurementByRow = new Map<number, number>();

  for (let index = 0; index < state.pAdic.columns.length; index += 1) {
    const column = state.pAdic.columns[index]!;
    for (const gate of column.gates) {
      if (gate.gate !== "M") {
        continue;
      }
      const wire = gate.wires[0];
      if (wire === undefined || firstMeasurementByRow.has(wire)) {
        continue;
      }
      firstMeasurementByRow.set(wire, index);
    }
  }

  const measuredAt = firstMeasurementByRow.get(row);
  return measuredAt !== undefined && columnIndex > measuredAt;
};

const pushPAdicGate = (columnIndex: number, gate: GateInstance): boolean => {
  const column = state.pAdic.columns[columnIndex];
  if (!column) {
    return false;
  }

  if (gate.wires.some((wire) => isPAdicRowLockedAtColumn(wire, columnIndex))) {
    return false;
  }

  removeOverlaps(column, gate.wires);
  column.gates.push(gate);
  enforceDisjoint(column);
  enforcePAdicMeasurementLockRules();
  return true;
};

export const setPAdicPrime = (prime: number): void => {
  if (!isPAdicPrime(prime)) {
    return;
  }
  state.pAdic.prime = prime;
};

export const setPAdicMeasurementModel = (model: string): void => {
  if (!isPAdicMeasurementModel(model)) {
    return;
  }
  state.pAdic.measurementModel = model;
};

export const setPAdicGeometryMode = (mode: string): void => {
  if (!isPAdicGeometryMode(mode)) {
    return;
  }
  state.pAdic.geometryMode = mode;
};

export const setPAdicQubitCount = (nextCount: number): void => {
  const bounded = clampPAdicQubitCount(nextCount);
  state.pAdic.qubitCount = bounded;

  while (state.pAdic.preparedQubits.length < bounded) {
    state.pAdic.preparedQubits.push(defaultPAdicPreparedQubit());
  }

  while (state.pAdic.preparedQubits.length > bounded) {
    state.pAdic.preparedQubits.pop();
  }

  if (state.pAdic.columns.length === 0) {
    state.pAdic.columns.push(emptyColumn());
  }

  sanitizePAdicColumnsForQubitCount(bounded);

  if (state.pAdic.selectedStageIndex > state.pAdic.columns.length) {
    state.pAdic.selectedStageIndex = state.pAdic.columns.length;
  }

  normalizePAdicSelectedBasis();
};

export const setSelectedPAdicGate = (gate: GateId | null): void => {
  if (gate === null) {
    state.pAdic.selectedGate = null;
    return;
  }

  const available = new Set(availablePAdicGates(state.pAdic.qubitCount));
  if (!available.has(gate)) {
    return;
  }

  state.pAdic.selectedGate = gate;
};

export const addPAdicQubit = (): void => {
  if (state.pAdic.qubitCount >= PADIC_MAX_QUBITS) {
    return;
  }
  setPAdicQubitCount(state.pAdic.qubitCount + 1);
};

export const removePAdicQubit = (): void => {
  if (state.pAdic.qubitCount <= PADIC_MIN_QUBITS) {
    return;
  }
  setPAdicQubitCount(state.pAdic.qubitCount - 1);
};

export const setPAdicAmplitude = (qubitIndex: number, amplitudeKey: "a" | "b", raw: string): void => {
  const target = state.pAdic.preparedQubits[qubitIndex];
  if (!target) {
    return;
  }
  target[amplitudeKey].raw = raw;
};

export const applyPAdicPreset = (qubitIndex: number, preset: "zero" | "one" | "balanced"): void => {
  const target = state.pAdic.preparedQubits[qubitIndex];
  if (!target) {
    return;
  }

  if (preset === "zero") {
    target.a.raw = "1";
    target.b.raw = "0";
    return;
  }

  if (preset === "one") {
    target.a.raw = "0";
    target.b.raw = "1";
    return;
  }

  target.a.raw = "1";
  target.b.raw = "1";
};

export const appendPAdicColumn = (): void => {
  state.pAdic.columns.push(emptyColumn());
};

export const removeLastPAdicColumn = (): void => {
  if (state.pAdic.columns.length === 0) {
    return;
  }

  state.pAdic.columns.pop();
  if (state.pAdic.selectedStageIndex > state.pAdic.columns.length) {
    state.pAdic.selectedStageIndex = state.pAdic.columns.length;
  }
};

export const setPAdicSelectedStage = (index: number): void => {
  if (index < 0 || index > state.pAdic.columns.length) {
    return;
  }

  state.pAdic.selectedStageIndex = index;
};

export const setPAdicSelectedBasis = (basis: string | null): void => {
  if (basis === null) {
    state.pAdic.selectedBasis = null;
    return;
  }

  const trimmed = basis.trim();
  if (!/^[01]+$/.test(trimmed) || trimmed.length !== state.pAdic.qubitCount) {
    return;
  }

  state.pAdic.selectedBasis = trimmed;
};

export const clearPAdicGateAt = (columnIndex: number, wire: number): void => {
  const column = state.pAdic.columns[columnIndex];
  if (!column) {
    return;
  }
  column.gates = column.gates.filter((gate) => !gateTouchesRow(gate, wire));
};

export const setPAdicGateAt = (columnIndex: number, wire: number, gate: GateId): boolean => {
  const arity = operatorArityForGate(gate, []);
  if (arity !== 1) {
    return false;
  }
  return pushPAdicGate(columnIndex, {
    id: nextGateInstanceId(),
    gate,
    wires: [wire],
  });
};

export const placePAdicCnot = (columnIndex: number, control: number, target: number): boolean => {
  if (control === target) {
    return false;
  }

  return pushPAdicGate(columnIndex, {
    id: nextGateInstanceId(),
    gate: "CNOT",
    wires: [control, target],
  });
};

export const placePAdicToffoli = (columnIndex: number, controlA: number, controlB: number, target: number): boolean => {
  if (new Set([controlA, controlB, target]).size !== 3) {
    return false;
  }

  return pushPAdicGate(columnIndex, {
    id: nextGateInstanceId(),
    gate: "TOFFOLI",
    wires: [controlA, controlB, target],
  });
};

export const placePAdicMultiGate = (columnIndex: number, gate: GateId, wires: number[]): boolean => {
  const arity = operatorArityForGate(gate, []);
  if (arity === null || arity < 2 || arity !== wires.length) {
    return false;
  }

  if (new Set(wires).size !== wires.length) {
    return false;
  }

  return pushPAdicGate(columnIndex, {
    id: nextGateInstanceId(),
    gate,
    wires,
  });
};

export const resetPAdicWorkspaceState = (
  prime: PAdicPrime,
  measurementModel: PAdicMeasurementModel,
  geometryMode: PAdicGeometryMode = DEFAULT_PADIC_GEOMETRY_MODE,
  qubitCount: number = PADIC_DEFAULT_QUBIT_COUNT,
  selectedBasis: string | null = null,
): void => {
  state.pAdic.prime = prime;
  state.pAdic.measurementModel = measurementModel;
  state.pAdic.geometryMode = geometryMode;
  state.pAdic.columns = [emptyColumn(), emptyColumn(), emptyColumn(), emptyColumn()];
  state.pAdic.selectedGate = "X";
  state.pAdic.selectedStageIndex = 0;
  state.pAdic.selectedBasis = null;
  setPAdicQubitCount(qubitCount);
  setPAdicSelectedBasis(selectedBasis);
};
