import type { ComputedRef } from "vue";
import type { BellStateId, EntanglementLink, QubitRow } from "../../types";
import { stageEntanglementLinks, stageEntanglementModels } from "../../state";
import { entanglement_delta_links } from "../../quantum";
import type { MultipartiteBand } from "./grid-interaction-types";

const bellColorByState: Record<BellStateId, string> = {
  "phi+": "rgba(255, 122, 102, 0.95)",
  "phi-": "rgba(255, 196, 96, 0.95)",
  "psi+": "rgba(128, 165, 255, 0.95)",
  "psi-": "rgba(198, 130, 255, 0.95)",
};

export const useCircuitGridEntanglement = (rows: ComputedRef<QubitRow[]>) => {
  const entanglementLinksForColumn = (columnIndex: number): EntanglementLink[] => {
    const previous = stageEntanglementLinks.value[columnIndex] ?? [];
    const current = stageEntanglementLinks.value[columnIndex + 1] ?? [];
    return entanglement_delta_links(previous, current).filter((link) => link.strength > 0.08);
  };

  const multipartiteBandsForColumn = (columnIndex: number): MultipartiteBand[] => {
    const previous = stageEntanglementModels.value[columnIndex]?.components ?? [];
    const current = stageEntanglementModels.value[columnIndex + 1]?.components ?? [];
    const previousStrengthByRows = new Map(
      previous
        .filter((component) => component.kind === "multipartite")
        .map((component) => [component.rows.join("-"), component.strength]),
    );

    return current
      .filter((component) => component.kind === "multipartite")
      .filter((component) => component.strength > 0.06)
      .filter((component) => component.strength > ((previousStrengthByRows.get(component.rows.join("-")) ?? 0) + 0.015))
      .map((component) => {
        const minRow = Math.min(...component.rows);
        const maxRow = Math.max(...component.rows);
        const top = ((minRow / rows.value.length) * 100) + 3.5;
        const bottom = (((maxRow + 1) / rows.value.length) * 100) - 3.5;
        return {
          id: component.rows.join("-"),
          x: 7,
          y: top,
          width: 30,
          height: bottom - top,
          rx: 4,
          strength: component.strength,
        };
      });
  };

  const rowCenterViewBox = (row: number): number => ((row + 0.5) / rows.value.length) * 100;

  const entanglementArcPath = (link: EntanglementLink): string => {
    const startY = rowCenterViewBox(Math.min(link.fromRow, link.toRow));
    const endY = rowCenterViewBox(Math.max(link.fromRow, link.toRow));
    const midY = (startY + endY) * 0.5;
    const startX = 24;
    const controlX = 16 - (link.strength * 6);
    return `M ${startX} ${startY} Q ${controlX} ${midY} ${startX} ${endY}`;
  };

  const entanglementArcStyle = (link: EntanglementLink): Record<string, string> => ({
    stroke: bellColorByState[link.dominantBell],
    strokeWidth: `${0.6 + (link.strength * 1.8)}`,
    opacity: `${0.22 + (link.strength * 0.55)}`,
  });

  const multipartiteBandStyle = (strength: number): Record<string, string> => ({
    fill: `rgba(255, 203, 118, ${0.08 + (strength * 0.24)})`,
    stroke: `rgba(255, 223, 162, ${0.22 + (strength * 0.45)})`,
    strokeWidth: `${0.25 + (strength * 0.9)}`,
  });

  return {
    entanglementLinksForColumn,
    multipartiteBandsForColumn,
    entanglementArcPath,
    entanglementArcStyle,
    multipartiteBandStyle,
  };
};
