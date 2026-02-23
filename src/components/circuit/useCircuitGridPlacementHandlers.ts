import type { Ref } from "vue";
import type { GateId, QubitRow } from "../../types";
import type { PendingPlacement } from "./grid-interaction-types";

type GridPlacementHandlerDeps = {
  pendingPlacement: Ref<PendingPlacement | null>;
  placementError: Ref<string | null>;
  gateArity: (gate: GateId) => number;
  firstMeasurementColumnAtRow: (row: QubitRow) => number | null;
  clearPendingPlacement: () => void;
  isCellLockedAt: (column: number, row: QubitRow) => boolean;
  lockReasonForCell: (column: number, row: QubitRow) => string | null;
  qubitCount: () => number;
  selectedGate: () => GateId | null;
  clearGateAt: (column: number, row: QubitRow) => boolean;
  setSingleGateAt: (column: number, row: QubitRow, gate: GateId) => boolean;
  placeCnotAt: (column: number, control: QubitRow, target: QubitRow) => boolean;
  placeToffoliAt: (column: number, controlA: QubitRow, controlB: QubitRow, target: QubitRow) => boolean;
  placeMultiGateAt: (column: number, wires: ReadonlyArray<QubitRow>, gate: GateId) => boolean;
};

export const useCircuitGridPlacementHandlers = ({
  pendingPlacement,
  placementError,
  gateArity,
  firstMeasurementColumnAtRow,
  clearPendingPlacement,
  isCellLockedAt,
  lockReasonForCell,
  qubitCount,
  selectedGate,
  clearGateAt,
  setSingleGateAt,
  placeCnotAt,
  placeToffoliAt,
  placeMultiGateAt,
}: GridPlacementHandlerDeps) => {
  const handleSlotHover = (col: number, row: QubitRow) => {
    const pending = pendingPlacement.value;
    if (pending && pending.column === col) {
      pending.hoverRow = row;
    }
  };

  const handleSlotLeave = (col: number, row: QubitRow) => {
    const pending = pendingPlacement.value;
    if (pending && pending.column === col && pending.hoverRow === row) {
      pending.hoverRow = null;
    }
  };

  const beginCnotPlacement = (column: number, control: QubitRow) => {
    pendingPlacement.value = { kind: "cnot", column, control, hoverRow: control };
    placementError.value = null;
  };

  const beginToffoliPlacement = (column: number, controlA: QubitRow) => {
    pendingPlacement.value = { kind: "toffoli", column, controlA, controlB: null, hoverRow: controlA };
    placementError.value = null;
  };

  const beginMultiPlacement = (column: number, gate: GateId, arity: number, firstWire: QubitRow) => {
    pendingPlacement.value = { kind: "multi", column, gate, arity, wires: [firstWire], hoverRow: firstWire };
    placementError.value = null;
  };

  const handleCnotSlotClick = (col: number, row: QubitRow) => {
    if (qubitCount() < 2) {
      return;
    }

    const pending = pendingPlacement.value;
    if (!pending || pending.kind !== "cnot" || pending.column !== col) {
      beginCnotPlacement(col, row);
      return;
    }
    if (row === pending.control) {
      placementError.value = "CNOT target must be on a different wire.";
      pending.hoverRow = row;
      return;
    }

    if (!placeCnotAt(col, pending.control, row)) {
      placementError.value = "CNOT placement is invalid for the current circuit.";
      return;
    }
    clearPendingPlacement();
  };

  const handleToffoliSlotClick = (col: number, row: QubitRow) => {
    if (qubitCount() < 3) {
      return;
    }

    const pending = pendingPlacement.value;
    if (!pending || pending.kind !== "toffoli" || pending.column !== col) {
      beginToffoliPlacement(col, row);
      return;
    }

    if (pending.controlB === null) {
      if (row === pending.controlA) {
        placementError.value = "Second Toffoli control must be on a different wire.";
        pending.hoverRow = row;
        return;
      }
      pendingPlacement.value = { ...pending, controlB: row, hoverRow: row };
      placementError.value = null;
      return;
    }

    if (row === pending.controlA || row === pending.controlB) {
      placementError.value = "Toffoli target must be different from both controls.";
      pending.hoverRow = row;
      return;
    }

    if (!placeToffoliAt(col, pending.controlA, pending.controlB, row)) {
      placementError.value = "Toffoli placement is invalid for the current circuit.";
      return;
    }
    clearPendingPlacement();
  };

  const handleMultiSlotClick = (col: number, row: QubitRow, gate: GateId) => {
    const arity = gateArity(gate);
    if (arity < 2 || qubitCount() < arity) {
      return;
    }

    const pending = pendingPlacement.value;
    if (!pending || pending.kind !== "multi" || pending.column !== col || pending.gate !== gate) {
      beginMultiPlacement(col, gate, arity, row);
      return;
    }
    if (pending.wires.includes(row)) {
      placementError.value = "Each wire can only be selected once.";
      pending.hoverRow = row;
      return;
    }

    const nextWires = [...pending.wires, row];
    if (nextWires.length < pending.arity) {
      pendingPlacement.value = { ...pending, wires: nextWires, hoverRow: row };
      placementError.value = null;
      return;
    }

    if (!placeMultiGateAt(col, nextWires, gate)) {
      placementError.value = "Gate placement is invalid for the current circuit.";
      return;
    }
    clearPendingPlacement();
  };

  const handleSlotClick = (col: number, row: QubitRow, event: MouseEvent) => {
    if (isCellLockedAt(col, row)) {
      placementError.value = lockReasonForCell(col, row) ?? `Locked: q${row} at t${col + 1} cannot be edited.`;
      return;
    }

    if (event.altKey) {
      clearGateAt(col, row);
      if (pendingPlacement.value?.column === col) {
        clearPendingPlacement();
      }
      return;
    }

    const selected = selectedGate();
    if (!selected) {
      return;
    }

    const measuredAt = firstMeasurementColumnAtRow(row);
    if (measuredAt !== null && col > measuredAt) {
      placementError.value = `q${row} was measured at t${measuredAt + 1}; later columns are locked.`;
      return;
    }

    if (selected === "CNOT") {
      handleCnotSlotClick(col, row);
      return;
    }
    if (selected === "TOFFOLI") {
      handleToffoliSlotClick(col, row);
      return;
    }
    if (gateArity(selected) > 1) {
      handleMultiSlotClick(col, row, selected);
      return;
    }

    clearPendingPlacement();
    setSingleGateAt(col, row, selected);
  };

  return {
    handleSlotHover,
    handleSlotLeave,
    handleSlotClick,
  };
};
