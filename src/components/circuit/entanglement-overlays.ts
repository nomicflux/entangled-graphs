import type { QubitRow, StageEntanglementModel } from "../../types";
import { multipartiteBandBottomY, multipartiteBandTopY } from "./entanglement-geometry";
import type { MultipartiteBand } from "./grid-interaction-types";

export const multipartiteBandsForStageColumn = (
  stageModels: ReadonlyArray<StageEntanglementModel>,
  columnIndex: number,
  rowCount: number,
): MultipartiteBand[] => {
  const previous = stageModels[columnIndex]?.components ?? [];
  const current = stageModels[columnIndex + 1]?.components ?? [];
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
      const top = multipartiteBandTopY(minRow);
      const bottom = multipartiteBandBottomY(maxRow);
      return {
        id: component.rows.join("-"),
        rows: component.rows as ReadonlyArray<QubitRow>,
        x: 7,
        y: top,
        width: 30,
        height: bottom - top,
        rx: 4,
        strength: component.strength,
      };
    });
};
