import type { Ref } from "vue";
import type { GateId, QubitRow } from "../../types";
import {
  clearGateAt,
  placeCnot,
  placeMultiGate,
  placeToffoli,
  qubitCount,
  setGateAt,
  state,
  toCellRef,
  toCnotPlacement,
  toMultiGatePlacement,
  toSingleGatePlacement,
  toToffoliPlacement,
} from "../../state";
import type { PendingPlacement } from "./grid-interaction-types";

type GridPlacementHandlerDeps = {
  pendingPlacement: Ref<PendingPlacement | null>;
  placementError: Ref<string | null>;
  gateArity: (gate: GateId) => number;
  firstMeasurementColumnAtRow: (row: QubitRow) => number | null;
  clearPendingPlacement: () => void;
};

export const useCircuitGridPlacementHandlers = ({
  pendingPlacement,
  placementError,
  gateArity,
  firstMeasurementColumnAtRow,
  clearPendingPlacement,
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
    if (qubitCount.value < 2) {
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

    const placement = toCnotPlacement(col, pending.control, row);
    if (!placement) {
      placementError.value = "CNOT placement is invalid for the current circuit.";
      return;
    }

    placeCnot(placement);
    clearPendingPlacement();
  };

  const handleToffoliSlotClick = (col: number, row: QubitRow) => {
    if (qubitCount.value < 3) {
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

    const placement = toToffoliPlacement(col, pending.controlA, pending.controlB, row);
    if (!placement) {
      placementError.value = "Toffoli placement is invalid for the current circuit.";
      return;
    }

    placeToffoli(placement);
    clearPendingPlacement();
  };

  const handleMultiSlotClick = (col: number, row: QubitRow, gate: GateId) => {
    const arity = gateArity(gate);
    if (arity < 2 || qubitCount.value < arity) {
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

    const placement = toMultiGatePlacement(col, nextWires, gate);
    if (!placement) {
      placementError.value = "Gate placement is invalid for the current circuit.";
      return;
    }

    placeMultiGate(placement);
    clearPendingPlacement();
  };

  const handleSlotClick = (col: number, row: QubitRow, event: MouseEvent) => {
    if (event.altKey) {
      const cell = toCellRef(col, row);
      if (cell) {
        clearGateAt(cell);
      }
      if (pendingPlacement.value?.column === col) {
        clearPendingPlacement();
      }
      return;
    }

    const selected = state.selectedGate;
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
    const placement = toSingleGatePlacement(col, row, selected);
    if (placement) {
      setGateAt(placement);
    }
  };

  return {
    handleSlotHover,
    handleSlotLeave,
    handleSlotClick,
  };
};
