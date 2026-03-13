import type { EntanglementLink } from "../../types";
import { CIRCUIT_ROW_HEIGHT_PX, quantumRowCenterY } from "./quantum-register-layout";

const ENTANGLEMENT_ARC_START_X = 24;
const ENTANGLEMENT_ARC_CONTROL_X_BASE = 16;
const MULTIPARTITE_BAND_INSET_PX = 6;

export const pairwiseEntanglementArcPath = (link: EntanglementLink): string => {
  const startY = quantumRowCenterY(Math.min(link.fromRow, link.toRow));
  const endY = quantumRowCenterY(Math.max(link.fromRow, link.toRow));
  const midY = (startY + endY) * 0.5;
  const controlX = ENTANGLEMENT_ARC_CONTROL_X_BASE - (link.strength * 6);
  return `M ${ENTANGLEMENT_ARC_START_X} ${startY} Q ${controlX} ${midY} ${ENTANGLEMENT_ARC_START_X} ${endY}`;
};

export const multipartiteBandTopY = (minRow: number): number =>
  minRow * CIRCUIT_ROW_HEIGHT_PX + MULTIPARTITE_BAND_INSET_PX;

export const multipartiteBandBottomY = (maxRow: number): number =>
  (maxRow + 1) * CIRCUIT_ROW_HEIGHT_PX - MULTIPARTITE_BAND_INSET_PX;
