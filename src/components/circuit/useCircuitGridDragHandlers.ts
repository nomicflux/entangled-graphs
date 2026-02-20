import type { Ref } from "vue";
import type { CircuitColumn, GateId, QubitRow } from "../../types";
import {
  clearGateAt,
  gateInstanceAt,
  setGateAt,
  setSelectedGate,
  toCellRef,
  toSingleGatePlacement,
} from "../../state";
import type { DragPayload, DragSource } from "./grid-interaction-types";

type GridDragHandlerDeps = {
  dragging: Ref<DragPayload | null>;
  dropTarget: Ref<DragSource | null>;
  placementError: Ref<string | null>;
  gateArity: (gate: GateId) => number;
  firstMeasurementColumnAtRow: (row: QubitRow) => number | null;
  clearPendingPlacement: () => void;
};

export const useCircuitGridDragHandlers = ({
  dragging,
  dropTarget,
  placementError,
  gateArity,
  firstMeasurementColumnAtRow,
  clearPendingPlacement,
}: GridDragHandlerDeps) => {
  const isPaletteDraggable = (gate: GateId): boolean => gateArity(gate) === 1;

  const startPaletteDrag = (gate: GateId, event: DragEvent) => {
    if (!isPaletteDraggable(gate)) {
      event.preventDefault();
      return;
    }
    dragging.value = { gate };
    event.dataTransfer?.setData("text/plain", gate);
  };

  const startCellDrag = (columns: readonly CircuitColumn[], col: number, row: QubitRow, event: DragEvent) => {
    const instance = gateInstanceAt(columns[col]!, row);
    if (!instance || gateArity(instance.gate) !== 1) {
      return;
    }
    dragging.value = { gate: instance.gate, from: { col, row } };
    event.dataTransfer?.setData("text/plain", instance.gate);
  };

  const handleDragOver = (col: number, row: QubitRow) => {
    if (!dragging.value) {
      return;
    }
    const measuredAt = firstMeasurementColumnAtRow(row);
    dropTarget.value = measuredAt !== null && col > measuredAt ? null : { col, row };
  };

  const handleDragLeave = (col: number, row: QubitRow) => {
    if (dropTarget.value?.col === col && dropTarget.value.row === row) {
      dropTarget.value = null;
    }
  };

  const handleDrop = (col: number, row: QubitRow) => {
    if (!dragging.value) {
      return;
    }

    const { gate, from } = dragging.value;
    const measuredAt = firstMeasurementColumnAtRow(row);
    if (measuredAt !== null && col > measuredAt) {
      placementError.value = `q${row} was measured at t${measuredAt + 1}; later columns are locked.`;
      dragging.value = null;
      dropTarget.value = null;
      return;
    }
    if (gate === "CNOT" || gate === "TOFFOLI") {
      placementError.value = `${gate} placement uses click flow on the grid.`;
      dragging.value = null;
      dropTarget.value = null;
      return;
    }

    clearPendingPlacement();
    const placement = toSingleGatePlacement(col, row, gate);
    if (placement) {
      setGateAt(placement);
      if (from && (from.col !== col || from.row !== row)) {
        const source = toCellRef(from.col, from.row);
        if (source) {
          clearGateAt(source);
        }
      }
      setSelectedGate(gate);
    }

    dragging.value = null;
    dropTarget.value = null;
  };

  const endDrag = () => {
    dragging.value = null;
    dropTarget.value = null;
  };

  return {
    isPaletteDraggable,
    startPaletteDrag,
    startCellDrag,
    handleDragOver,
    handleDragLeave,
    handleDrop,
    endDrag,
  };
};
