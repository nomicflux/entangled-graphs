import type { GateId, MixedGateInstance, NoiseStrengthPreset, QubitRow, RawSingleQubitRhoInput } from "../types";
import { MIXED_MAX_QUBITS, MIXED_MIN_QUBITS } from "./constants";
import { emptyMixedColumn, mixedState, nextMixedGateInstanceId } from "./store";
import { createEmptyRhoInput, rhoPresetInput, type RhoPresetId } from "./rho-inputs";
import { mixedProcessArity, noiseToolId, parseNoiseToolId, processForToolId } from "./gates";
import { operatorArityForGate } from "../state/operators";

const gateTouchesRow = (gate: MixedGateInstance, row: QubitRow): boolean => gate.wires.includes(row);

const removeOverlaps = (columnIndex: number, wires: ReadonlyArray<QubitRow>) => {
  mixedState.columns[columnIndex]!.gates = mixedState.columns[columnIndex]!.gates.filter(
    (gate) => !gate.wires.some((wire) => wires.includes(wire)),
  );
};

const enforceDisjoint = (columnIndex: number) => {
  const column = mixedState.columns[columnIndex]!;
  const occupied = new Set<QubitRow>();
  const kept: MixedGateInstance[] = [];

  for (const gate of column.gates) {
    if (gate.wires.some((wire) => occupied.has(wire))) {
      continue;
    }
    gate.wires.forEach((wire) => occupied.add(wire));
    kept.push(gate);
  }

  column.gates = kept;
};

const firstMeasurementColumnForRow = (row: QubitRow): number | null => {
  for (let columnIndex = 0; columnIndex < mixedState.columns.length; columnIndex += 1) {
    const gate = mixedState.columns[columnIndex]!.gates.find(
      (entry) => entry.process.kind === "measurement" && entry.wires[0] === row,
    );
    if (gate) {
      return columnIndex;
    }
  }
  return null;
};

const isRowLockedAtColumn = (row: QubitRow, column: number): boolean => {
  const firstMeasurementColumn = firstMeasurementColumnForRow(row);
  return firstMeasurementColumn !== null && column > firstMeasurementColumn;
};

const enforceMeasurementLockRules = (): void => {
  const firstMeasurementByRow = new Map<QubitRow, number>();

  for (let columnIndex = 0; columnIndex < mixedState.columns.length; columnIndex += 1) {
    const column = mixedState.columns[columnIndex]!;
    column.gates = column.gates.filter((gate) => {
      if (
        gate.wires.some((wire) => {
          const measuredAt = firstMeasurementByRow.get(wire);
          return measuredAt !== undefined && columnIndex > measuredAt;
        })
      ) {
        return false;
      }

      if (gate.process.kind === "measurement") {
        const row = gate.wires[0];
        if (row === undefined || firstMeasurementByRow.has(row)) {
          return false;
        }
        firstMeasurementByRow.set(row, columnIndex);
      }

      return true;
    });

    enforceDisjoint(columnIndex);
  }
};

const mapGateAfterQubitRemoval = (gate: MixedGateInstance, removed: number): MixedGateInstance | null => {
  const mapped: number[] = [];

  for (const wire of gate.wires) {
    if (wire === removed) {
      return null;
    }
    mapped.push(wire > removed ? wire - 1 : wire);
  }

  return { ...gate, wires: mapped };
};

const processArityForToolId = (toolId: GateId): number | null => {
  const process = processForToolId(toolId);
  if (!process) {
    return null;
  }
  if (process.kind === "unitary") {
    return operatorArityForGate(process.gateId, []);
  }
  return mixedProcessArity(process);
};

const sanitizeColumnsForQubitCount = (count: number): void => {
  for (let columnIndex = 0; columnIndex < mixedState.columns.length; columnIndex += 1) {
    const column = mixedState.columns[columnIndex]!;
    column.gates = column.gates.filter((gate) => {
      if (gate.wires.some((wire) => wire < 0 || wire >= count)) {
        return false;
      }
      if (gate.wires.length !== mixedProcessArity(gate.process)) {
        return false;
      }
      if (count < gate.wires.length) {
        return false;
      }
      return true;
    });
      enforceDisjoint(columnIndex);
  }

  enforceMeasurementLockRules();

  if (mixedState.selectedGate !== null) {
    const arity = processArityForToolId(mixedState.selectedGate);
    if (arity === null || count < arity) {
      mixedState.selectedGate = null;
    }
  }
};

const pushGate = (columnIndex: number, gate: MixedGateInstance): void => {
  removeOverlaps(columnIndex, gate.wires);
  mixedState.columns[columnIndex]!.gates.push(gate);
  enforceDisjoint(columnIndex);
  enforceMeasurementLockRules();
};

const insertedColumnIndexAfter = (columnIndex: number): number => {
  mixedState.columns.splice(columnIndex + 1, 0, emptyMixedColumn());
  if (mixedState.selectedStageIndex > columnIndex + 1) {
    mixedState.selectedStageIndex += 1;
  }
  return columnIndex + 1;
};

const rollbackInsertedColumn = (columnIndex: number, previousStageIndex: number) => {
  mixedState.columns.splice(columnIndex, 1);
  mixedState.selectedStageIndex = previousStageIndex;
};

export const setMixedSelectedGate = (gate: GateId | null): void => {
  if (gate !== null) {
    const arity = processArityForToolId(gate);
    if (arity === null || arity > mixedState.preparedInputs.length) {
      return;
    }
  }

  mixedState.selectedGate = gate;
};

export const setMixedNoiseStrength = (strength: NoiseStrengthPreset): void => {
  mixedState.noiseStrength = strength;
  const selectedNoise = mixedState.selectedGate === null ? null : parseNoiseToolId(mixedState.selectedGate);
  if (selectedNoise) {
    mixedState.selectedGate = noiseToolId(selectedNoise.channelId, strength);
  }
};

export const addMixedQubit = (): void => {
  if (mixedState.preparedInputs.length >= MIXED_MAX_QUBITS) {
    return;
  }
  mixedState.preparedInputs.push(createEmptyRhoInput());
  sanitizeColumnsForQubitCount(mixedState.preparedInputs.length);
};

export const removeMixedQubit = (index: number = mixedState.preparedInputs.length - 1): void => {
  if (mixedState.preparedInputs.length <= MIXED_MIN_QUBITS) {
    return;
  }

  const target = Math.max(0, Math.min(index, mixedState.preparedInputs.length - 1));
  mixedState.preparedInputs.splice(target, 1);

  for (let columnIndex = 0; columnIndex < mixedState.columns.length; columnIndex += 1) {
    mixedState.columns[columnIndex]!.gates = mixedState.columns[columnIndex]!.gates
      .map((gate) => mapGateAfterQubitRemoval(gate, target))
      .filter((gate): gate is MixedGateInstance => gate !== null);
    enforceDisjoint(columnIndex);
  }

  sanitizeColumnsForQubitCount(mixedState.preparedInputs.length);
};

export const setMixedQubitCount = (nextCount: number): void => {
  const parsed = Number.isFinite(nextCount) ? Math.trunc(nextCount) : mixedState.preparedInputs.length;
  const bounded = Math.max(MIXED_MIN_QUBITS, Math.min(MIXED_MAX_QUBITS, parsed));

  while (mixedState.preparedInputs.length < bounded) {
    addMixedQubit();
  }

  while (mixedState.preparedInputs.length > bounded) {
    removeMixedQubit(mixedState.preparedInputs.length - 1);
  }
};

export const setMixedRhoInput = (index: number, patch: Partial<RawSingleQubitRhoInput>): void => {
  const entry = mixedState.preparedInputs[index];
  if (!entry) {
    return;
  }
  mixedState.preparedInputs[index] = { ...entry, ...patch };
};

export const applyMixedRhoPreset = (index: number, preset: RhoPresetId): void => {
  if (!mixedState.preparedInputs[index]) {
    return;
  }
  mixedState.preparedInputs[index] = rhoPresetInput(preset);
};

export const placeMixedCnot = (column: number, control: QubitRow, target: QubitRow): void => {
  pushGate(column, {
    id: nextMixedGateInstanceId(),
    process: { kind: "unitary", gateId: "CNOT" },
    wires: [control, target],
  });
};

export const placeMixedToffoli = (column: number, controlA: QubitRow, controlB: QubitRow, target: QubitRow): void => {
  pushGate(column, {
    id: nextMixedGateInstanceId(),
    process: { kind: "unitary", gateId: "TOFFOLI" },
    wires: [controlA, controlB, target],
  });
};

export const placeMixedMultiGate = (column: number, wires: ReadonlyArray<QubitRow>, gate: GateId): void => {
  pushGate(column, {
    id: nextMixedGateInstanceId(),
    process: { kind: "unitary", gateId: gate },
    wires: [...wires],
  });
};

export const setMixedGateAt = (column: number, row: QubitRow, gate: GateId): boolean => {
  if (column < 0 || column >= mixedState.columns.length) {
    return false;
  }
  const process = processForToolId(gate);
  if (process === null || mixedProcessArity(process) !== 1) {
    return false;
  }

  let targetColumn = column;
  const rowGate = mixedState.columns[column]!.gates.find((entry) => gateTouchesRow(entry, row)) ?? null;
  if (process.kind === "noise" && rowGate !== null) {
    const previousStageIndex = mixedState.selectedStageIndex;
    targetColumn = insertedColumnIndexAfter(column);
    if (isRowLockedAtColumn(row, targetColumn)) {
      rollbackInsertedColumn(targetColumn, previousStageIndex);
      return false;
    }
  }

  if (isRowLockedAtColumn(row, targetColumn)) {
    return false;
  }

  pushGate(targetColumn, {
    id: nextMixedGateInstanceId(),
    process,
    wires: [row],
  });
  return true;
};

export const clearMixedGateAt = (column: number, row: QubitRow): void => {
  if (column < 0 || column >= mixedState.columns.length) {
    return;
  }
  mixedState.columns[column]!.gates = mixedState.columns[column]!.gates.filter((gate) => !gateTouchesRow(gate, row));
};

export const appendMixedColumn = (): void => {
  mixedState.columns.push(emptyMixedColumn());
};

export const removeLastMixedColumn = (): void => {
  if (mixedState.columns.length === 0) {
    return;
  }
  mixedState.columns.pop();
  if (mixedState.selectedStageIndex > mixedState.columns.length) {
    mixedState.selectedStageIndex = mixedState.columns.length;
  }
};

export const setMixedSelectedStage = (index: number): void => {
  if (index < 0 || index > mixedState.columns.length) {
    return;
  }
  mixedState.selectedStageIndex = index;
};
