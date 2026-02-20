import type { BellStateId, EntanglementLink, QubitRow } from "../../types";

export const bellColorByState: Record<BellStateId, string> = {
  "phi+": "rgba(255, 122, 102, 0.95)",
  "phi-": "rgba(255, 196, 96, 0.95)",
  "psi+": "rgba(128, 165, 255, 0.95)",
  "psi-": "rgba(198, 130, 255, 0.95)",
};

export const bellLabelByState: Record<BellStateId, string> = {
  "phi+": "Phi+",
  "phi-": "Phi-",
  "psi+": "Psi+",
  "psi-": "Psi-",
};

const formatStrength = (value: number): string => value.toFixed(3);

const formatRows = (rows: ReadonlyArray<QubitRow>): string => rows.map((row) => `q${row}`).join(", ");

export const pairwiseTooltip = (link: EntanglementLink): string =>
  `Pairwise link ${formatRows([link.fromRow, link.toRow])}. ` +
  `Dominant Bell: ${bellLabelByState[link.dominantBell]} (${(link.dominantProbability * 100).toFixed(1)}%). ` +
  `Strength: ${formatStrength(link.strength)} (Bell-derived).`;

export const multipartiteTooltip = (rows: ReadonlyArray<QubitRow>, strength: number): string =>
  `Multipartite component ${formatRows(rows)}. ` +
  `Strength: ${formatStrength(strength)} (minimum cut entropy across cuts that split the component).`;

export const entanglementArcStyle = (link: EntanglementLink): Record<string, string> => ({
  stroke: bellColorByState[link.dominantBell],
  strokeWidth: `${0.6 + (link.strength * 1.8)}`,
  opacity: `${0.22 + (link.strength * 0.55)}`,
});

export const multipartiteBandStyle = (strength: number): Record<string, string> => ({
  fill: `rgba(255, 203, 118, ${0.08 + (strength * 0.24)})`,
  stroke: `rgba(255, 223, 162, ${0.22 + (strength * 0.45)})`,
  strokeWidth: `${0.25 + (strength * 0.9)}`,
});
