import { onMounted, onUnmounted, watch, type Ref } from "vue";
import type { GateId } from "../../types";
import { qubitCount, state } from "../../state";
import type { PendingPlacement } from "./grid-interaction-types";

type GridPlacementLifecycleDeps = {
  pendingPlacement: Ref<PendingPlacement | null>;
  placementError: Ref<string | null>;
  gateArity: (gate: GateId) => number;
  clearPendingPlacement: () => void;
};

export const useCircuitGridPlacementLifecycle = ({
  pendingPlacement,
  placementError,
  gateArity,
  clearPendingPlacement,
}: GridPlacementLifecycleDeps) => {
  const validatePendingPlacement = () => {
    const pending = pendingPlacement.value;
    if (!pending) {
      return;
    }
    if (pending.column >= state.columns.length) {
      clearPendingPlacement();
      return;
    }

    if (pending.kind === "cnot") {
      if (qubitCount.value < 2 || pending.control >= qubitCount.value || (pending.hoverRow ?? 0) >= qubitCount.value) {
        clearPendingPlacement();
      }
      return;
    }

    if (pending.kind === "multi") {
      const wrongArity = gateArity(pending.gate) !== pending.arity || qubitCount.value < pending.arity;
      const invalidWires = pending.wires.some((wire) => wire >= qubitCount.value);
      if (wrongArity || invalidWires) {
        clearPendingPlacement();
        return;
      }
      if (pending.hoverRow !== null && pending.hoverRow >= qubitCount.value) {
        pending.hoverRow = null;
      }
      return;
    }

    if (qubitCount.value < 3 || pending.controlA >= qubitCount.value) {
      clearPendingPlacement();
      return;
    }
    if (pending.controlB !== null && pending.controlB >= qubitCount.value) {
      clearPendingPlacement();
      return;
    }
    if (pending.hoverRow !== null && pending.hoverRow >= qubitCount.value) {
      pending.hoverRow = null;
    }
  };

  watch(
    () => state.selectedGate,
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

  watch([() => qubitCount.value, () => state.columns.length], validatePendingPlacement);

  const onWindowKeyDown = (event: KeyboardEvent) => {
    if (event.key === "Escape" && pendingPlacement.value) {
      clearPendingPlacement();
    }
  };

  onMounted(() => window.addEventListener("keydown", onWindowKeyDown));
  onUnmounted(() => window.removeEventListener("keydown", onWindowKeyDown));
};
