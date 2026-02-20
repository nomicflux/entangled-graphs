import { computed, type Ref } from "vue";
import type { GateId, QubitRow } from "../../types";
import {
  firstMeasurementColumnByRow,
  isRowLockedAtColumn,
  operatorArityForGate,
  qubitCount,
  resolveOperator,
  state,
} from "../../state";
import type { PendingPlacement } from "./grid-interaction-types";

export type GridComputedDeps = {
  pendingPlacement: Ref<PendingPlacement | null>;
  placementError: Ref<string | null>;
};

export const useCircuitGridComputed = ({ pendingPlacement, placementError }: GridComputedDeps) => {
  const rows = computed<QubitRow[]>(() => Array.from({ length: qubitCount.value }, (_, index) => index));

  const gateArity = (gate: GateId): number => operatorArityForGate(gate, state.customOperators) ?? 0;
  const gateName = (gate: GateId): string => resolveOperator(gate, state.customOperators)?.label ?? gate;

  const measurementLockByRow = computed(() => firstMeasurementColumnByRow(state.columns));
  const firstMeasurementColumnAtRow = (row: QubitRow): number | null => measurementLockByRow.value.get(row) ?? null;
  const isRowLockedAt = (column: number, row: QubitRow): boolean => isRowLockedAtColumn(state.columns, row, column);

  const slotTitle = (column: number, row: QubitRow): string => {
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
    if (state.selectedGate === "CNOT") {
      return "CNOT: click a control wire to start placement.";
    }
    if (state.selectedGate === "TOFFOLI") {
      return "Toffoli: click the first control wire to start placement.";
    }
    if (state.selectedGate === "M") {
      return "M: click a wire to measure it. Later columns on that row are locked.";
    }
    if (state.selectedGate !== null && gateArity(state.selectedGate) > 1) {
      return `${gateName(state.selectedGate)}: click wire 1/${gateArity(state.selectedGate)} to start placement.`;
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
