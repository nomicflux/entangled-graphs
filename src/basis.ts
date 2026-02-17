import type { BasisLabel } from "./types";

function basisLabel(index: number, qubitCount: number): BasisLabel {
  return index.toString(2).padStart(qubitCount, "0");
}

export function basisLabels(qubitCount: number): BasisLabel[] {
  const total = 1 << qubitCount;
  const labels: BasisLabel[] = [];

  for (let index = 0; index < total; index += 1) {
    labels.push(basisLabel(index, qubitCount));
  }

  return labels;
}
