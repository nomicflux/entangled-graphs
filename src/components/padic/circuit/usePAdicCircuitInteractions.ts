import { computed, ref } from "vue";
import type { GateId } from "../../../types";
import {
  clearPAdicGateAt,
  operatorArityForGate,
  placePAdicCnot,
  placePAdicMultiGate,
  placePAdicToffoli,
  setPAdicGateAt,
  setSelectedPAdicGate,
  state,
} from "../../../state";
import type { PaletteEntry } from "../../circuit/palette-types";

export type PendingPlacement =
  | { kind: "cnot"; column: number; control: number }
  | { kind: "toffoli"; column: number; controlA: number; controlB: number | null }
  | { kind: "multi"; column: number; gate: GateId; arity: number; wires: number[] };

export const usePAdicCircuitInteractions = (isRowLocked: (column: number, row: number) => boolean) => {
  const dragging = ref<{ gate: GateId } | null>(null);
  const dropTarget = ref<{ column: number; row: number } | null>(null);
  const pendingPlacement = ref<PendingPlacement | null>(null);
  const placementError = ref<string | null>(null);

  const clearPendingPlacement = () => {
    pendingPlacement.value = null;
    placementError.value = null;
  };

  const placementHint = computed(() => {
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
      return `${pending.gate} in t${pending.column + 1}: click wire ${nextStep}/${pending.arity} (Esc to cancel).`;
    }

    const selected = state.pAdic.selectedGate;
    if (selected === "CNOT") {
      return "CNOT: click a control wire to start placement.";
    }
    if (selected === "TOFFOLI") {
      return "Toffoli: click the first control wire to start placement.";
    }
    if (selected === "M") {
      return "M: click a wire to measure it. Later columns on that row are locked.";
    }
    if (selected && (operatorArityForGate(selected, []) ?? 0) > 1) {
      const arity = operatorArityForGate(selected, []) ?? 0;
      return `${selected}: click wire 1/${arity} to start placement.`;
    }

    return null;
  });

  const startPaletteDrag = (gate: GateId, event: DragEvent, isPaletteDraggable: (id: GateId) => boolean) => {
    if (!isPaletteDraggable(gate)) {
      return;
    }

    dragging.value = { gate };
    event.dataTransfer?.setData("text/plain", gate);
    event.dataTransfer?.setData("application/x-entangled-gate", gate);
    if (event.dataTransfer) {
      event.dataTransfer.effectAllowed = "copy";
    }
  };

  const endDrag = () => {
    dragging.value = null;
    dropTarget.value = null;
  };

  const isDropTarget = (column: number, row: number): boolean =>
    dropTarget.value?.column === column && dropTarget.value?.row === row;

  const handleDragOver = (column: number, row: number) => {
    if (!dragging.value) {
      return;
    }

    if (isRowLocked(column, row)) {
      dropTarget.value = null;
      return;
    }

    dropTarget.value = { column, row };
  };

  const handleDragLeave = (column: number, row: number) => {
    if (dropTarget.value?.column === column && dropTarget.value?.row === row) {
      dropTarget.value = null;
    }
  };

  const handleDrop = (column: number, row: number) => {
    const payload = dragging.value;
    dropTarget.value = null;
    if (!payload) {
      return;
    }

    if (isRowLocked(column, row)) {
      placementError.value = `q${row} was measured earlier; later columns are locked.`;
      return;
    }

    const arity = operatorArityForGate(payload.gate, []) ?? 0;
    if (arity !== 1) {
      return;
    }

    setPAdicGateAt(column, row, payload.gate);
    placementError.value = null;
  };

  const handlePaletteChipClick = (entry: PaletteEntry) => {
    const next = state.pAdic.selectedGate === entry.id ? null : entry.id;
    setSelectedPAdicGate(next);
    clearPendingPlacement();
  };

  const handleCnotSlotClick = (column: number, row: number) => {
    const pending = pendingPlacement.value;
    if (!pending || pending.kind !== "cnot" || pending.column !== column) {
      pendingPlacement.value = { kind: "cnot", column, control: row };
      placementError.value = null;
      return;
    }

    if (row === pending.control) {
      placementError.value = "CNOT target must be on a different wire.";
      return;
    }

    if (!placePAdicCnot(column, pending.control, row)) {
      placementError.value = "CNOT placement is invalid for the current circuit.";
      return;
    }

    clearPendingPlacement();
  };

  const handleToffoliSlotClick = (column: number, row: number) => {
    const pending = pendingPlacement.value;
    if (!pending || pending.kind !== "toffoli" || pending.column !== column) {
      pendingPlacement.value = { kind: "toffoli", column, controlA: row, controlB: null };
      placementError.value = null;
      return;
    }

    if (pending.controlB === null) {
      if (row === pending.controlA) {
        placementError.value = "Second Toffoli control must be on a different wire.";
        return;
      }

      pendingPlacement.value = { ...pending, controlB: row };
      placementError.value = null;
      return;
    }

    if (new Set([pending.controlA, pending.controlB, row]).size !== 3) {
      placementError.value = "Toffoli target must be different from both controls.";
      return;
    }

    if (!placePAdicToffoli(column, pending.controlA, pending.controlB, row)) {
      placementError.value = "Toffoli placement is invalid for the current circuit.";
      return;
    }

    clearPendingPlacement();
  };

  const handleMultiSlotClick = (column: number, row: number, gate: GateId, arity: number) => {
    if (state.pAdic.qubitCount < arity) {
      return;
    }

    const pending = pendingPlacement.value;
    if (!pending || pending.kind !== "multi" || pending.column !== column || pending.gate !== gate) {
      pendingPlacement.value = { kind: "multi", column, gate, arity, wires: [row] };
      placementError.value = null;
      return;
    }

    if (pending.wires.includes(row)) {
      placementError.value = "Each wire can only be selected once.";
      return;
    }

    const wires = [...pending.wires, row];
    if (wires.length < arity) {
      pendingPlacement.value = { ...pending, wires };
      placementError.value = null;
      return;
    }

    if (!placePAdicMultiGate(column, gate, wires)) {
      placementError.value = "Gate placement is invalid for the current circuit.";
      return;
    }

    clearPendingPlacement();
  };

  const handleSlotClick = (column: number, row: number, event: MouseEvent) => {
    if (event.altKey) {
      clearPAdicGateAt(column, row);
      if (pendingPlacement.value?.column === column) {
        clearPendingPlacement();
      }
      return;
    }

    if (isRowLocked(column, row)) {
      placementError.value = `q${row} was measured earlier; later columns are locked.`;
      return;
    }

    const selected = state.pAdic.selectedGate;
    if (!selected) {
      return;
    }

    if (selected === "CNOT") {
      handleCnotSlotClick(column, row);
      return;
    }
    if (selected === "TOFFOLI") {
      handleToffoliSlotClick(column, row);
      return;
    }

    const arity = operatorArityForGate(selected, []) ?? 0;
    if (arity > 1) {
      handleMultiSlotClick(column, row, selected, arity);
      return;
    }

    clearPendingPlacement();
    setPAdicGateAt(column, row, selected);
  };

  return {
    placementHint,
    handlePaletteChipClick,
    startPaletteDrag,
    endDrag,
    isDropTarget,
    handleDragOver,
    handleDragLeave,
    handleDrop,
    handleSlotClick,
  };
};
