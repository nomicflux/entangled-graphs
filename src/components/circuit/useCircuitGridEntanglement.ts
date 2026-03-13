import { computed, type ComputedRef } from "vue";
import type { EntanglementLink, QubitRow, StageEntanglementModel } from "../../types";
import { entanglement_delta_links } from "../../quantum";
import { entanglementArcStyle, multipartiteBandStyle, multipartiteTooltip, pairwiseTooltip } from "./entanglement-display";
import { pairwiseEntanglementArcPath } from "./entanglement-geometry";
import { multipartiteBandsForStageColumn } from "./entanglement-overlays";
import type { MultipartiteBand } from "./grid-interaction-types";

export const useCircuitGridEntanglement = (
  rows: ComputedRef<QubitRow[]>,
  stageLinks: ComputedRef<ReadonlyArray<ReadonlyArray<EntanglementLink>>>,
  stageModels: ComputedRef<ReadonlyArray<StageEntanglementModel>>,
) => {
  const entanglementLinksByColumn = computed<ReadonlyArray<ReadonlyArray<EntanglementLink>>>(() =>
    stageLinks.value.slice(0, -1).map((_, columnIndex) => {
      const previous = stageLinks.value[columnIndex] ?? [];
      const current = stageLinks.value[columnIndex + 1] ?? [];
      return entanglement_delta_links(previous, current).filter((link) => link.strength > 0.08);
    }),
  );

  const multipartiteBandsByColumn = computed<ReadonlyArray<ReadonlyArray<MultipartiteBand>>>(() =>
    stageModels.value
      .slice(0, -1)
      .map((_, columnIndex) => multipartiteBandsForStageColumn(stageModels.value, columnIndex, rows.value.length)),
  );

  const entanglementLinksForColumn = (columnIndex: number): EntanglementLink[] => [...(entanglementLinksByColumn.value[columnIndex] ?? [])];

  const multipartiteBandsForColumn = (columnIndex: number): MultipartiteBand[] => [...(multipartiteBandsByColumn.value[columnIndex] ?? [])];

  return {
    entanglementLinksForColumn,
    multipartiteBandsForColumn,
    entanglementArcPath: pairwiseEntanglementArcPath,
    entanglementArcStyle,
    multipartiteBandStyle,
    pairwiseTooltip,
    multipartiteTooltip,
  };
};
