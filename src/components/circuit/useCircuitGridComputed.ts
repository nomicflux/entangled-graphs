import { computed, type Ref } from "vue";
import type { CircuitColumn, GateId, QubitRow } from "../../types";
import { firstMeasurementColumnByRow, isRowLockedAtColumn } from "../../state";
import type { PendingPlacement } from "./grid-interaction-types";

export type GridComputedDeps = {
  pendingPlacement: Ref<PendingPlacement | null>;
  placementError: Ref<string | null>;
  isCellLockedAt: (column: number, row: QubitRow) => boolean;
  lockReasonForCell: (column: number, row: QubitRow) => string | null;
  columns: () => readonly CircuitColumn[];
  qubitCount: () => number;
  selectedGate: () => GateId | null;
  gateArity: (gate: GateId) => number;
  gateName: (gate: GateId) => string;
};

export const useCircuitGridComputed = ({
  pendingPlacement,
  placementError,
  isCellLockedAt,
  lockReasonForCell,
  columns,
  qubitCount,
  selectedGate,
  gateArity,
  gateName,
}: GridComputedDeps) => {
  const rows = computed<QubitRow[]>(() => Array.from({ length: qubitCount() }, (_, index) => index));

  const measurementLockByRow = computed(() => firstMeasurementColumnByRow(columns()));
  const firstMeasurementColumnAtRow = (row: QubitRow): number | null => measurementLockByRow.value.get(row) ?? null;
  const isRowLockedAt = (column: number, row: QubitRow): boolean => isRowLockedAtColumn(columns(), row, column);

  const slotTitle = (column: number, row: QubitRow): string => {
    if (isCellLockedAt(column, row)) {
      return lockReasonForCell(column, row) ?? "";
    }
    const measuredAt = firstMeasurementColumnAtRow(row);
    if (measuredAt === null || column <= measuredAt) {
      return "";
    }
    return `Locked: q${row} measured at t${measuredAt + 1}`;
  };

  const placementHint = computed<string | null>(() => {
    if (placementError.value) {
      return placementError.value;
    }

    const pending = pendingPlacement.value;
    if (pending?.kind === "cnot") {
      return `CNOT in t${pending.column + 1}: click target wire (Esc to cancel).`;
    }
    if (pending?.kind === "toffoli" && pending.controlB === null) {
      return `Toffoli in t${pending.column + 1}: click second control wire (Esc to cancel).`;
    }
    if (pending?.kind === "toffoli") {
      return `Toffoli in t${pending.column + 1}: click target wire (Esc to cancel).`;
    }
    if (pending?.kind === "multi") {
      const nextStep = Math.min(pending.wires.length + 1, pending.arity);
      return `${gateName(pending.gate)} in t${pending.column + 1}: click wire ${nextStep}/${pending.arity} (Esc to cancel).`;
    }
    if (selectedGate() === "CNOT") {
      return "CNOT: click a control wire to start placement.";
    }
    if (selectedGate() === "TOFFOLI") {
      return "Toffoli: click the first control wire to start placement.";
    }
    if (selectedGate() === "M") {
      return "M: click a wire to measure it. Later columns on that row are locked.";
    }
    const selected = selectedGate();
    if (selected !== null && gateArity(selected) > 1) {
      return `${gateName(selected)}: click wire 1/${gateArity(selected)} to start placement.`;
    }
    return null;
  });

  return {
    rows,
    gateArity,
    firstMeasurementColumnAtRow,
    isRowLockedAt,
    slotTitle,
    placementHint,
  };
};
