import type { Ref } from "vue";
import type { CircuitColumn, GateId, QubitRow } from "../../types";
import { gateInstanceAt, gateLabel } from "../../state";
import type { DragPayload, DragSource, PendingPlacement } from "./grid-interaction-types";

export type GridTokenHelperDeps = {
  pendingPlacement: Ref<PendingPlacement | null>;
  dragging: Ref<DragPayload | null>;
  dropTarget: Ref<DragSource | null>;
  gateArity: (gate: GateId) => number;
  isRowLockedAt: (column: number, row: QubitRow) => boolean;
};

export const useCircuitGridTokenHelpers = ({
  pendingPlacement,
  dragging,
  dropTarget,
  gateArity,
  isRowLockedAt,
}: GridTokenHelperDeps) => {
  const slotInstance = (column: CircuitColumn, row: QubitRow) => gateInstanceAt(column, row);

  const tokenFor = (column: CircuitColumn, row: QubitRow): string => {
    const instance = slotInstance(column, row);
    if (!instance) {
      return "";
    }
    if (instance.gate === "CNOT" || instance.gate === "TOFFOLI") {
      return "";
    }
    if (instance.wires.length > 1) {
      return instance.wires[0] === row ? gateLabel(instance.gate) : "•";
    }
    return gateLabel(instance.gate);
  };

  const isDraggableToken = (column: CircuitColumn, row: QubitRow): boolean => {
    const instance = slotInstance(column, row);
    if (!instance) {
      return false;
    }
    return gateArity(instance.gate) === 1;
  };

  const isCnotControl = (column: CircuitColumn, row: QubitRow): boolean => {
    const gate = slotInstance(column, row);
    return gate?.gate === "CNOT" && gate.wires[0] === row;
  };

  const isCnotTarget = (column: CircuitColumn, row: QubitRow): boolean => {
    const gate = slotInstance(column, row);
    return gate?.gate === "CNOT" && gate.wires[1] === row;
  };

  const isToffoliControl = (column: CircuitColumn, row: QubitRow): boolean => {
    const gate = slotInstance(column, row);
    return gate?.gate === "TOFFOLI" && (gate.wires[0] === row || gate.wires[1] === row);
  };

  const isToffoliTarget = (column: CircuitColumn, row: QubitRow): boolean => {
    const gate = slotInstance(column, row);
    return gate?.gate === "TOFFOLI" && gate.wires[2] === row;
  };

  const isCustomMultiWire = (column: CircuitColumn, row: QubitRow): boolean => {
    const gate = slotInstance(column, row);
    if (!gate || gate.gate === "CNOT" || gate.gate === "TOFFOLI") {
      return false;
    }
    return gate.wires.length > 1;
  };

  const isMeasurementToken = (column: CircuitColumn, row: QubitRow): boolean => {
    const gate = slotInstance(column, row);
    return gate?.gate === "M";
  };

  const isPendingCnotControl = (columnIndex: number, row: QubitRow): boolean => {
    const pending = pendingPlacement.value;
    return pending?.kind === "cnot" && pending.column === columnIndex && pending.control === row;
  };

  const isPendingCnotTarget = (columnIndex: number, row: QubitRow): boolean => {
    const pending = pendingPlacement.value;
    return (
      pending?.kind === "cnot" &&
      pending.column === columnIndex &&
      pending.hoverRow !== null &&
      pending.hoverRow !== pending.control &&
      pending.hoverRow === row
    );
  };

  const isPendingToffoliControl = (columnIndex: number, row: QubitRow): boolean => {
    const pending = pendingPlacement.value;
    if (pending?.kind !== "toffoli" || pending.column !== columnIndex) {
      return false;
    }
    return pending.controlA === row || pending.controlB === row;
  };

  const isPendingToffoliTarget = (columnIndex: number, row: QubitRow): boolean => {
    const pending = pendingPlacement.value;
    if (pending?.kind !== "toffoli" || pending.column !== columnIndex || pending.controlB === null || pending.hoverRow === null) {
      return false;
    }
    if (pending.hoverRow === pending.controlA || pending.hoverRow === pending.controlB) {
      return false;
    }
    return pending.hoverRow === row;
  };

  const isPendingMultiWire = (columnIndex: number, row: QubitRow): boolean => {
    const pending = pendingPlacement.value;
    if (pending?.kind !== "multi" || pending.column !== columnIndex) {
      return false;
    }
    return pending.wires.includes(row);
  };

  const isPendingMultiHover = (columnIndex: number, row: QubitRow): boolean => {
    const pending = pendingPlacement.value;
    if (pending?.kind !== "multi" || pending.column !== columnIndex || pending.hoverRow === null) {
      return false;
    }
    if (pending.wires.includes(pending.hoverRow)) {
      return false;
    }
    return pending.hoverRow === row;
  };

  const isDropTarget = (col: number, row: QubitRow): boolean =>
    dropTarget.value !== null && dropTarget.value.col === col && dropTarget.value.row === row && !isRowLockedAt(col, row);

  const isDragSource = (col: number, row: QubitRow): boolean => {
    if (!dragging.value?.from) {
      return false;
    }
    if (dragging.value.from.col !== col) {
      return false;
    }
    return dragging.value.from.row === row;
  };

  return {
    slotInstance,
    tokenFor,
    isDraggableToken,
    isCnotControl,
    isCnotTarget,
    isToffoliControl,
    isToffoliTarget,
    isCustomMultiWire,
    isMeasurementToken,
    isPendingCnotControl,
    isPendingCnotTarget,
    isPendingToffoliControl,
    isPendingToffoliTarget,
    isPendingMultiWire,
    isPendingMultiHover,
    isDropTarget,
    isDragSource,
  };
};
