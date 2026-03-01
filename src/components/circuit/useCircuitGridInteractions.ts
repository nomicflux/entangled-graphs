import { useCircuitGridPlacementLifecycle } from "./useCircuitGridPlacementLifecycle";
import { useCircuitGridInteractionCore, type CircuitGridInteractionOptions } from "./useCircuitGridInteractionCore";

export { type ConnectorSegment, type MultipartiteBand } from "./useCircuitGridInteractionCore";
export type { CircuitGridInteractionOptions } from "./useCircuitGridInteractionCore";

export const useCircuitGridInteractions = (options: CircuitGridInteractionOptions = {}) => {
  const interactions = useCircuitGridInteractionCore(options);
  useCircuitGridPlacementLifecycle({
    pendingPlacement: interactions.pendingPlacement,
    clearPendingPlacement: interactions.clearPendingPlacement,
  });
  return interactions;
};
