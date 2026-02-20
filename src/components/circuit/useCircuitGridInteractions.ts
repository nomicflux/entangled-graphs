import { ref } from "vue";
import { state } from "../../state";
import type { DragPayload, DragSource, PendingPlacement } from "./grid-interaction-types";
import { useCircuitGridComputed } from "./useCircuitGridComputed";
import { useCircuitGridTokenHelpers } from "./useCircuitGridTokenHelpers";
import { useCircuitGridConnectors } from "./useCircuitGridConnectors";
import { useCircuitGridEntanglement } from "./useCircuitGridEntanglement";
import { useCircuitGridDragHandlers } from "./useCircuitGridDragHandlers";
import { useCircuitGridPlacementHandlers } from "./useCircuitGridPlacementHandlers";
import { useCircuitGridPlacementLifecycle } from "./useCircuitGridPlacementLifecycle";

export type { ConnectorSegment, MultipartiteBand } from "./grid-interaction-types";

export const useCircuitGridInteractions = () => {
  const dragging = ref<DragPayload | null>(null);
  const dropTarget = ref<DragSource | null>(null);
  const pendingPlacement = ref<PendingPlacement | null>(null);
  const placementError = ref<string | null>(null);

  const clearPendingPlacement = () => {
    pendingPlacement.value = null;
    placementError.value = null;
  };

  const { rows, gateArity, firstMeasurementColumnAtRow, isRowLockedAt, slotTitle, placementHint } = useCircuitGridComputed({
    pendingPlacement,
    placementError,
  });

  const tokenHelpers = useCircuitGridTokenHelpers({
    pendingPlacement,
    dragging,
    dropTarget,
    gateArity,
    isRowLockedAt,
  });

  const { connectorSegments, connectorStyle } = useCircuitGridConnectors({ rows, pendingPlacement });
  const {
    entanglementLinksForColumn,
    multipartiteBandsForColumn,
    entanglementArcPath,
    entanglementArcStyle,
    multipartiteBandStyle,
  } = useCircuitGridEntanglement(rows);

  const dragHandlers = useCircuitGridDragHandlers({
    dragging,
    dropTarget,
    placementError,
    gateArity,
    firstMeasurementColumnAtRow,
    clearPendingPlacement,
  });

  const placementHandlers = useCircuitGridPlacementHandlers({
    pendingPlacement,
    placementError,
    gateArity,
    firstMeasurementColumnAtRow,
    clearPendingPlacement,
  });

  useCircuitGridPlacementLifecycle({
    pendingPlacement,
    placementError,
    gateArity,
    clearPendingPlacement,
  });

  return {
    rows,
    gateArity,
    placementHint,
    clearPendingPlacement,
    ...tokenHelpers,
    connectorSegments,
    connectorStyle,
    entanglementLinksForColumn,
    multipartiteBandsForColumn,
    entanglementArcPath,
    entanglementArcStyle,
    multipartiteBandStyle,
    isPaletteDraggable: dragHandlers.isPaletteDraggable,
    startPaletteDrag: dragHandlers.startPaletteDrag,
    startCellDrag: (col: number, row: number, event: DragEvent) => dragHandlers.startCellDrag(state.columns, col, row, event),
    handleDragOver: dragHandlers.handleDragOver,
    handleDragLeave: dragHandlers.handleDragLeave,
    handleDrop: dragHandlers.handleDrop,
    endDrag: dragHandlers.endDrag,
    handleSlotHover: placementHandlers.handleSlotHover,
    handleSlotLeave: placementHandlers.handleSlotLeave,
    handleSlotClick: placementHandlers.handleSlotClick,
    isRowLockedAt,
    slotTitle,
  };
};
