import { watch, type Ref } from "vue";
import type { GateId } from "../../types";
import type { PendingPlacement } from "./grid-interaction-types";

type GridPlacementStateDeps = {
  pendingPlacement: Ref<PendingPlacement | null>;
  placementError: Ref<string | null>;
  gateArity: (gate: GateId) => number;
  clearPendingPlacement: () => void;
  qubitCount: () => number;
  selectedGate: () => GateId | null;
  columnCount: () => number;
};

export const useCircuitGridPlacementState = ({
  pendingPlacement,
  placementError,
  gateArity,
  clearPendingPlacement,
  qubitCount,
  selectedGate,
  columnCount,
}: GridPlacementStateDeps) => {
  const validatePendingPlacement = () => {
    const pending = pendingPlacement.value;
    if (!pending) {
      return;
    }
    if (pending.column >= columnCount()) {
      clearPendingPlacement();
      return;
    }

    if (pending.kind === "cnot") {
      if (qubitCount() < 2 || pending.control >= qubitCount() || (pending.hoverRow ?? 0) >= qubitCount()) {
        clearPendingPlacement();
      }
      return;
    }

    if (pending.kind === "multi") {
      const wrongArity = gateArity(pending.gate) !== pending.arity || qubitCount() < pending.arity;
      const invalidWires = pending.wires.some((wire) => wire >= qubitCount());
      if (wrongArity || invalidWires) {
        clearPendingPlacement();
        return;
      }
      if (pending.hoverRow !== null && pending.hoverRow >= qubitCount()) {
        pending.hoverRow = null;
      }
      return;
    }

    if (qubitCount() < 3 || pending.controlA >= qubitCount()) {
      clearPendingPlacement();
      return;
    }
    if (pending.controlB !== null && pending.controlB >= qubitCount()) {
      clearPendingPlacement();
      return;
    }
    if (pending.hoverRow !== null && pending.hoverRow >= qubitCount()) {
      pending.hoverRow = null;
    }
  };

  watch(
    () => selectedGate(),
    (gate) => {
      if (gate === null) {
        clearPendingPlacement();
        return;
      }

      const pending = pendingPlacement.value;
      if (!pending) {
        placementError.value = null;
        return;
      }
      if (gate === "CNOT" && pending.kind !== "cnot") {
        clearPendingPlacement();
        return;
      }
      if (gate === "TOFFOLI" && pending.kind !== "toffoli") {
        clearPendingPlacement();
        return;
      }
      if (gate !== "CNOT" && gate !== "TOFFOLI" && pending.kind !== "multi") {
        clearPendingPlacement();
        return;
      }
      if (pending.kind === "multi" && pending.gate !== gate) {
        clearPendingPlacement();
      }
    },
  );

  watch([() => qubitCount(), () => columnCount()], validatePendingPlacement);
};
