import { computed, type ComputedRef } from "vue";
import type { EntanglementLink, QubitRow } from "../../../types";
import { pAdicStageEntanglementLinks, pAdicStageEntanglementModels } from "../../../state";
import { entanglement_delta_links } from "../../../quantum";
import { entanglementArcStyle, multipartiteBandStyle, multipartiteTooltip, pairwiseTooltip } from "../../circuit/entanglement-display";
import { multipartiteBandsForStageColumn } from "../../circuit/entanglement-overlays";
import type { MultipartiteBand } from "../../circuit/grid-interaction-types";

export const usePAdicCircuitEntanglement = (rows: ComputedRef<QubitRow[]>) => {
  const entanglementLinksByColumn = computed<ReadonlyArray<ReadonlyArray<EntanglementLink>>>(() =>
    pAdicStageEntanglementLinks.value.slice(0, -1).map((_, columnIndex) => {
      const previous = pAdicStageEntanglementLinks.value[columnIndex] ?? [];
      const current = pAdicStageEntanglementLinks.value[columnIndex + 1] ?? [];
      return entanglement_delta_links(previous, current).filter((link) => link.strength > 0.08);
    }),
  );

  const multipartiteBandsByColumn = computed<ReadonlyArray<ReadonlyArray<MultipartiteBand>>>(() =>
    pAdicStageEntanglementModels.value
      .slice(0, -1)
      .map((_, columnIndex) => multipartiteBandsForStageColumn(pAdicStageEntanglementModels.value, columnIndex, rows.value.length)),
  );

  const entanglementLinksForColumn = (columnIndex: number): EntanglementLink[] => [...(entanglementLinksByColumn.value[columnIndex] ?? [])];

  const multipartiteBandsForColumn = (columnIndex: number): MultipartiteBand[] => [...(multipartiteBandsByColumn.value[columnIndex] ?? [])];

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
