import { computed, type ComputedRef } from "vue";
import type { EntanglementLink, QubitRow, StateEnsemble } from "../../../types";
import { entanglement_delta_links, entanglement_links_from_ensemble, stage_entanglement_models_from_snapshots } from "../../../quantum";
import { pairwiseEntanglementArcPath } from "../../circuit/entanglement-geometry";
import { entanglementArcStyle, pairwiseTooltip } from "../../circuit/entanglement-display";

type UseAlgorithmEntanglementInput = {
  ensembleSnapshots: ComputedRef<ReadonlyArray<StateEnsemble>>;
  rows: readonly QubitRow[];
};

export const useAlgorithmEntanglement = ({ ensembleSnapshots, rows }: UseAlgorithmEntanglementInput) => {
  const stageEntanglementLinks = computed(() => ensembleSnapshots.value.map((snapshot) => entanglement_links_from_ensemble(snapshot)));
  const stageEntanglementModels = computed(() => stage_entanglement_models_from_snapshots(ensembleSnapshots.value));

  const entanglementLinksByColumn = computed<ReadonlyArray<ReadonlyArray<EntanglementLink>>>(() =>
    stageEntanglementLinks.value.slice(0, -1).map((_, columnIndex) => {
      const previous = stageEntanglementLinks.value[columnIndex] ?? [];
      const current = stageEntanglementLinks.value[columnIndex + 1] ?? [];
      return entanglement_delta_links(previous, current).filter((link) => link.strength > 0.08);
    }),
  );

  const entanglementLinksForColumn = (columnIndex: number): EntanglementLink[] => [...(entanglementLinksByColumn.value[columnIndex] ?? [])];

  return {
    stageEntanglementModels,
    entanglementLinksForColumn,
    entanglementArcPath: pairwiseEntanglementArcPath,
    entanglementArcStyle,
    pairwiseTooltip,
  };
};
