import type { PAdicInputPreset, RawMatrix2 } from "../types";

const cloneRawMatrix = (rows: RawMatrix2): RawMatrix2 =>
  rows.map((row) => [...row]);

export const presetRowsForInput = (preset: PAdicInputPreset): RawMatrix2 => {
  if (preset === "basis_0") {
    return [
      ["1", "0"],
      ["0", "0"],
    ];
  }
  if (preset === "basis_1") {
    return [
      ["0", "0"],
      ["0", "1"],
    ];
  }
  if (preset === "diag_balanced") {
    return [
      ["1/2", "0"],
      ["0", "1/2"],
    ];
  }
  if (preset === "offdiag_pos") {
    return [
      ["1/2", "1/2"],
      ["1/2", "1/2"],
    ];
  }
  if (preset === "offdiag_neg") {
    return [
      ["1/2", "-1/2"],
      ["-1/2", "1/2"],
    ];
  }

  return [
    ["1-p^-1", "0"],
    ["0", "p^-1"],
  ];
};

export const presetSummaryForInput = (preset: PAdicInputPreset): string => {
  if (preset === "basis_0") {
    return "Operator form: diag(1, 0).";
  }
  if (preset === "basis_1") {
    return "Operator form: diag(0, 1).";
  }
  if (preset === "diag_balanced") {
    return "Operator form: diag(1/2, 1/2).";
  }
  if (preset === "offdiag_pos") {
    return "Operator form: [[1/2, 1/2], [1/2, 1/2]].";
  }
  if (preset === "offdiag_neg") {
    return "Operator form: [[1/2, -1/2], [-1/2, 1/2]].";
  }
  return "Operator form: diag(1 - p^-1, p^-1).";
};

export const presetCards = (): ReadonlyArray<{ id: PAdicInputPreset; label: string; hint: string }> => [
  { id: "basis_0", label: "0-dominant state", hint: "deterministic basis-0 anchor" },
  { id: "basis_1", label: "1-dominant state", hint: "deterministic basis-1 anchor" },
  { id: "diag_balanced", label: "Even split state", hint: "symmetric 50/50 shell mix" },
  { id: "offdiag_pos", label: "Aligned mix state", hint: "balanced split with positive coupling" },
  { id: "offdiag_neg", label: "Opposed mix state", hint: "balanced split with negative coupling" },
  { id: "shell_weighted", label: "Prime-weighted state", hint: "valuation shell split by p^-1" },
];

export const clonePresetRowsForInput = (preset: PAdicInputPreset): RawMatrix2 =>
  cloneRawMatrix(presetRowsForInput(preset));
