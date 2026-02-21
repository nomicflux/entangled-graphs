import type { GateId, GateInstance } from "../types";
import { defaultPAdicPreparedQubitForPrime, emptyColumn, nextGateInstanceId, state } from "./store";
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

const availablePAdicGates = (qubitCount: number): GateId[] => availablePAdicBuiltinGatesForQubitCount(qubitCount);

const enforcePAdicMeasurementLockRules = (): void => {
  enforceMeasurementLockRulesForColumns(state.pAdic.columns);
};

const isValidPAdicBasis = (basis: string, qubitCount: number, prime: number): boolean => {
  if (basis.length !== qubitCount || basis.length === 0) {
    return false;
  }

  return [...basis].every((char) => {
    const digit = Number.parseInt(char, 10);
    return Number.isInteger(digit) && digit >= 0 && digit < prime;
  });
};

const normalizePAdicSelectedBasis = (): void => {
  const basis = state.pAdic.selectedBasis;
  if (basis === null) {
    return;
  }

  if (!isValidPAdicBasis(basis, state.pAdic.qubitCount, state.pAdic.prime)) {
    state.pAdic.selectedBasis = null;
  }
};

const normalizePreparedQubitForPrime = (
  qubit: (typeof state.pAdic.preparedQubits)[number],
  prime: number,
): (typeof state.pAdic.preparedQubits)[number] => {
  const byValue = new Map<number, string>();
  for (const local of qubit.localStates) {
    byValue.set(local.value, local.amplitude.raw);
  }

  return {
    localStates: Array.from({ length: prime }, (_, value) => ({
      value,
      amplitude: {
        raw: byValue.get(value) ?? "0",
      },
    })),
  };
};

const normalizePreparedQubitsForPrime = (prime: number): void => {
  state.pAdic.preparedQubits = state.pAdic.preparedQubits.map((entry) => normalizePreparedQubitForPrime(entry, prime));
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
  normalizePreparedQubitsForPrime(prime);
  normalizePAdicSelectedBasis();
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
    state.pAdic.preparedQubits.push(defaultPAdicPreparedQubitForPrime(state.pAdic.prime));
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

export const setPAdicLocalAmplitude = (qubitIndex: number, localValue: number, raw: string): void => {
  const target = state.pAdic.preparedQubits[qubitIndex];
  if (!target) {
    return;
  }

  const local = target.localStates.find((entry) => entry.value === localValue);
  if (!local) {
    return;
  }

  local.amplitude.raw = raw;
};

const pAdicRawFromValuation = (unit: number, valuation: number): string => {
  const normalizedUnit = Number.isFinite(unit) ? Math.trunc(unit) : 1;
  const normalizedValuation = Number.isFinite(valuation) ? Math.trunc(valuation) : 0;

  if (normalizedValuation === 0) {
    return String(normalizedUnit);
  }

  if (normalizedUnit === 1) {
    return normalizedValuation === 1 ? "p" : `p^${normalizedValuation}`;
  }
  if (normalizedUnit === -1) {
    return normalizedValuation === 1 ? "-p" : `-p^${normalizedValuation}`;
  }

  return normalizedValuation === 1 ? `${normalizedUnit}p` : `${normalizedUnit}p^${normalizedValuation}`;
};

export const setPAdicLocalAmplitudeByValuation = (
  qubitIndex: number,
  localValue: number,
  valuation: number,
  unit: number = 1,
): void => {
  setPAdicLocalAmplitude(qubitIndex, localValue, pAdicRawFromValuation(unit, valuation));
};

const applyPAdicLocalPreset = (qubitIndex: number, nextRawForValue: (value: number) => string): void => {
  const target = state.pAdic.preparedQubits[qubitIndex];
  if (!target) {
    return;
  }

  for (const local of target.localStates) {
    local.amplitude.raw = nextRawForValue(local.value);
  }
};

export const applyPAdicPreset = (qubitIndex: number, preset: "zero" | "one" | "balanced"): void => {
  if (preset === "zero") {
    applyPAdicLocalPreset(qubitIndex, (value) => (value === 0 ? "1" : "0"));
    return;
  }

  if (preset === "one") {
    applyPAdicLocalPreset(qubitIndex, (value) => (value === 1 ? "1" : "0"));
    return;
  }

  applyPAdicLocalPreset(qubitIndex, () => "1");
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
  if (!isValidPAdicBasis(trimmed, state.pAdic.qubitCount, state.pAdic.prime)) {
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
  normalizePreparedQubitsForPrime(prime);
  setPAdicSelectedBasis(selectedBasis);
};
