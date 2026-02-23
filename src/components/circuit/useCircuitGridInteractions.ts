import { ref } from "vue";
import type { DragPayload, DragSource, PendingPlacement } from "./grid-interaction-types";
import { useCircuitGridComputed } from "./useCircuitGridComputed";
import { useCircuitGridTokenHelpers } from "./useCircuitGridTokenHelpers";
import { useCircuitGridConnectors } from "./useCircuitGridConnectors";
import { useCircuitGridEntanglement } from "./useCircuitGridEntanglement";
import { useCircuitGridDragHandlers } from "./useCircuitGridDragHandlers";
import { useCircuitGridPlacementHandlers } from "./useCircuitGridPlacementHandlers";
import { useCircuitGridPlacementLifecycle } from "./useCircuitGridPlacementLifecycle";
import { lockReasonForCell, noLockedCellsPolicy, type CircuitGridLockPolicy } from "./lock-policy";
import { createFreeFormGridModelContext, type CircuitGridModelContext } from "./model-context";

export type { ConnectorSegment, MultipartiteBand } from "./grid-interaction-types";

export type CircuitGridInteractionOptions = {
  lockPolicy?: CircuitGridLockPolicy;
  context?: CircuitGridModelContext;
};

export const useCircuitGridInteractions = (options: CircuitGridInteractionOptions = {}) => {
  const dragging = ref<DragPayload | null>(null);
  const dropTarget = ref<DragSource | null>(null);
  const pendingPlacement = ref<PendingPlacement | null>(null);
  const placementError = ref<string | null>(null);
  const context = options.context ?? createFreeFormGridModelContext();
  const lockPolicy = options.lockPolicy ?? noLockedCellsPolicy();
  const isCellLockedAt = (column: number, row: number) => lockPolicy.isCellLockedAt(column, row);
  const lockReasonAt = (column: number, row: number) => lockReasonForCell(lockPolicy, column, row);

  const clearPendingPlacement = () => {
    pendingPlacement.value = null;
    placementError.value = null;
  };

  const { rows, gateArity, firstMeasurementColumnAtRow, isRowLockedAt, slotTitle, placementHint } = useCircuitGridComputed({
    pendingPlacement,
    placementError,
    isCellLockedAt,
    lockReasonForCell: lockReasonAt,
    columns: () => context.columns.value,
    qubitCount: () => context.qubitCount.value,
    selectedGate: () => context.selectedGate.value,
    gateArity: context.gateArity,
    gateName: context.gateName,
  });

  const tokenHelpers = useCircuitGridTokenHelpers({
    pendingPlacement,
    dragging,
    dropTarget,
    gateArity,
    isRowLockedAt,
    isCellLockedAt,
    gateInstanceAt: context.gateInstanceAt,
    gateLabel: context.gateLabel,
  });

  const { connectorSegments, connectorStyle } = useCircuitGridConnectors({ rows, pendingPlacement });
  const {
    entanglementLinksForColumn,
    multipartiteBandsForColumn,
    entanglementArcPath,
    entanglementArcStyle,
    multipartiteBandStyle,
    pairwiseTooltip,
    multipartiteTooltip,
  } = useCircuitGridEntanglement(rows, context.stageEntanglementLinks, context.stageEntanglementModels);

  const dragHandlers = useCircuitGridDragHandlers({
    dragging,
    dropTarget,
    placementError,
    gateArity,
    firstMeasurementColumnAtRow,
    clearPendingPlacement,
    isCellLockedAt,
    lockReasonForCell: lockReasonAt,
    gateInstanceAt: context.gateInstanceAt,
    setSelectedGate: context.setSelectedGate,
    clearGateAt: context.clearGateAt,
    setSingleGateAt: context.setSingleGateAt,
  });

  const placementHandlers = useCircuitGridPlacementHandlers({
    pendingPlacement,
    placementError,
    gateArity,
    firstMeasurementColumnAtRow,
    clearPendingPlacement,
    isCellLockedAt,
    lockReasonForCell: lockReasonAt,
    qubitCount: () => context.qubitCount.value,
    selectedGate: () => context.selectedGate.value,
    clearGateAt: context.clearGateAt,
    setSingleGateAt: context.setSingleGateAt,
    placeCnotAt: context.placeCnotAt,
    placeToffoliAt: context.placeToffoliAt,
    placeMultiGateAt: context.placeMultiGateAt,
  });

  useCircuitGridPlacementLifecycle({
    pendingPlacement,
    placementError,
    gateArity,
    clearPendingPlacement,
    qubitCount: () => context.qubitCount.value,
    selectedGate: () => context.selectedGate.value,
    columnCount: () => context.columns.value.length,
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
    pairwiseTooltip,
    multipartiteTooltip,
    isPaletteDraggable: dragHandlers.isPaletteDraggable,
    startPaletteDrag: dragHandlers.startPaletteDrag,
    startCellDrag: (col: number, row: number, event: DragEvent) =>
      dragHandlers.startCellDrag(context.columns.value, col, row, event),
    handleDragOver: dragHandlers.handleDragOver,
    handleDragLeave: dragHandlers.handleDragLeave,
    handleDrop: dragHandlers.handleDrop,
    endDrag: dragHandlers.endDrag,
    handleSlotHover: placementHandlers.handleSlotHover,
    handleSlotLeave: placementHandlers.handleSlotLeave,
    handleSlotClick: placementHandlers.handleSlotClick,
    isCellLockedAt,
    isRowLockedAt,
    slotTitle,
  };
};
