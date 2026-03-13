import type { ClassicalRouteAnchor, ClassicalRouteOverlay, FixedPanelClassicalLayout } from "../../types";

export const REGULAR_COLUMN_WIDTH_PX = 96;
export const MATRIX_COLUMN_WIDTH_PX = 156;
export const COLUMN_GAP_PX = 24;
export const CIRCUIT_HEADER_HEIGHT_PX = 52;
export const CIRCUIT_SLOT_HEIGHT_PX = 56;
export const CLASSICAL_BAND_BASE_HEIGHT_PX = 40;
export const CLASSICAL_LANE_HEIGHT_PX = 28;
export const CLASSICAL_ROUTE_RAIL_OFFSET_PX = 3;
export const CLASSICAL_REGISTER_HEIGHT_PX = 24;
export const CLASSICAL_CONDITION_TOP_OFFSET_PX = 30;
export const CLASSICAL_OVERLAY_SIDE_PAD_PX = 88;
export const CLASSICAL_BELOW_REGISTER_BREAKOUT_PX = 30;

export const EMPTY_FIXED_PANEL_CLASSICAL_LAYOUT: FixedPanelClassicalLayout = {
  lanes: [],
  registers: [],
  routes: [],
  conditionBadges: [],
};

export const fixedGridTemplateColumns = (columnWidths: readonly number[]): string =>
  columnWidths.map((width) => `${width}px`).join(" ");

export const fixedPanelBodyWidth = (columnWidths: readonly number[]): number =>
  columnWidths.reduce((sum, width) => sum + width, 0) + Math.max(0, columnWidths.length - 1) * COLUMN_GAP_PX;

export const fixedPanelContentPadding = (layout: FixedPanelClassicalLayout): number => {
  if (layout.lanes.length === 0) {
    return 0;
  }

  if (
    layout.conditionBadges.length > 0 ||
    layout.routes.some((route) => route.from.kind === "below-register" || route.to.kind === "below-register")
  ) {
    return CLASSICAL_OVERLAY_SIDE_PAD_PX;
  }

  return Math.floor(CLASSICAL_OVERLAY_SIDE_PAD_PX * 0.75);
};

export const fixedPanelContentWidth = (columnWidths: readonly number[], layout: FixedPanelClassicalLayout): number =>
  fixedPanelBodyWidth(columnWidths) + (fixedPanelContentPadding(layout) * 2);

export const fixedPanelBodyHeight = (rowCount: number, laneCount: number): number =>
  rowCount * CIRCUIT_SLOT_HEIGHT_PX + classicalBandHeight(laneCount);

export const classicalBandHeight = (laneCount: number): number =>
  laneCount === 0 ? 0 : CLASSICAL_BAND_BASE_HEIGHT_PX + laneCount * CLASSICAL_LANE_HEIGHT_PX;

export const rowCenterY = (row: number): number => row * CIRCUIT_SLOT_HEIGHT_PX + (CIRCUIT_SLOT_HEIGHT_PX * 0.5);

export const laneCenterY = (rowCount: number, laneIndex: number): number =>
  rowCount * CIRCUIT_SLOT_HEIGHT_PX + 20 + laneIndex * CLASSICAL_LANE_HEIGHT_PX;

export const quantumRegisterBottomY = (rowCount: number): number => rowCount * CIRCUIT_SLOT_HEIGHT_PX;

const sideSign = (side: "left" | "right" | undefined): number => (side === "left" ? -1 : 1);

export const routeAnchorX = (anchor: ClassicalRouteAnchor, columnCenterX: number): number => {
  if (anchor.kind === "gate") {
    return columnCenterX;
  }
  if (anchor.kind === "below-register") {
    return columnCenterX + (sideSign(anchor.side) * (anchor.breakoutOffset ?? CLASSICAL_BELOW_REGISTER_BREAKOUT_PX));
  }
  return columnCenterX;
};

export const routeAnchorY = (anchor: ClassicalRouteAnchor, rowCount: number): number => {
  if (anchor.kind === "below-register") {
    return quantumRegisterBottomY(rowCount);
  }
  return rowCenterY(anchor.row);
};

export const routeRailPath = (
  fromX: number,
  fromY: number,
  toX: number,
  toY: number,
  laneY: number,
  railOffset: number,
): string =>
  `M ${fromX + railOffset} ${fromY} L ${fromX + railOffset} ${laneY + railOffset} L ${toX + railOffset} ${laneY + railOffset} L ${toX + railOffset} ${toY}`;

export const routeRailPathForOverlay = (
  route: ClassicalRouteOverlay,
  rowCount: number,
  railOffset: number,
  laneY: number,
  resolveColumnCenterX: (columnId: string) => number,
): string =>
  routeRailPath(
    routeAnchorX(route.from, resolveColumnCenterX(route.from.columnId)),
    routeAnchorY(route.from, rowCount),
    routeAnchorX(route.to, resolveColumnCenterX(route.to.columnId)),
    routeAnchorY(route.to, rowCount),
    laneY,
    railOffset,
  );
