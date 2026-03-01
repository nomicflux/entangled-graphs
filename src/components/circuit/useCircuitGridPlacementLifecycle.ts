import { onMounted, onUnmounted, type Ref } from "vue";
import type { PendingPlacement } from "./grid-interaction-types";

type GridPlacementLifecycleDeps = {
  pendingPlacement: Ref<PendingPlacement | null>;
  clearPendingPlacement: () => void;
};

export const useCircuitGridPlacementLifecycle = ({
  pendingPlacement,
  clearPendingPlacement,
}: GridPlacementLifecycleDeps) => {
  const onWindowKeyDown = (event: KeyboardEvent) => {
    if (event.key === "Escape" && pendingPlacement.value) {
      clearPendingPlacement();
    }
  };

  onMounted(() => window.addEventListener("keydown", onWindowKeyDown));
  onUnmounted(() => window.removeEventListener("keydown", onWindowKeyDown));
};
