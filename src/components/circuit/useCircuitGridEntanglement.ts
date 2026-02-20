import type { ComputedRef } from "vue";
import type { EntanglementLink, QubitRow } from "../../types";
import { stageEntanglementLinks, stageEntanglementModels } from "../../state";
import { entanglement_delta_links } from "../../quantum";
import { entanglementArcStyle, multipartiteBandStyle, multipartiteTooltip, pairwiseTooltip } from "./entanglement-display";
import { multipartiteBandsForStageColumn } from "./entanglement-overlays";
import type { MultipartiteBand } from "./grid-interaction-types";

export const useCircuitGridEntanglement = (rows: ComputedRef<QubitRow[]>) => {
  const entanglementLinksForColumn = (columnIndex: number): EntanglementLink[] => {
    const previous = stageEntanglementLinks.value[columnIndex] ?? [];
    const current = stageEntanglementLinks.value[columnIndex + 1] ?? [];
    return entanglement_delta_links(previous, current).filter((link) => link.strength > 0.08);
  };

  const multipartiteBandsForColumn = (columnIndex: number): MultipartiteBand[] =>
    multipartiteBandsForStageColumn(stageEntanglementModels.value, columnIndex, rows.value.length);

  const rowCenterViewBox = (row: number): number => ((row + 0.5) / rows.value.length) * 100;

  const entanglementArcPath = (link: EntanglementLink): string => {
    const startY = rowCenterViewBox(Math.min(link.fromRow, link.toRow));
    const endY = rowCenterViewBox(Math.max(link.fromRow, link.toRow));
    const midY = (startY + endY) * 0.5;
    const startX = 24;
    const controlX = 16 - (link.strength * 6);
    return `M ${startX} ${startY} Q ${controlX} ${midY} ${startX} ${endY}`;
  };

  return {
    entanglementLinksForColumn,
    multipartiteBandsForColumn,
    entanglementArcPath,
    entanglementArcStyle,
    multipartiteBandStyle,
    pairwiseTooltip,
    multipartiteTooltip,
  };
};
