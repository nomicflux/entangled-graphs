import type { CircuitColumn } from "../../../types";

export const bitFlipEncodeColumns = (prefix: string): CircuitColumn[] => [
  {
    gates: [{ id: `${prefix}-encode-1`, gate: "CNOT", wires: [0, 1] }],
  },
  {
    gates: [{ id: `${prefix}-encode-2`, gate: "CNOT", wires: [0, 2] }],
  },
];

export const bitFlipRecoveryColumns = (prefix: string): CircuitColumn[] => [
  {
    gates: [{ id: `${prefix}-recover-1`, gate: "CNOT", wires: [0, 1] }],
  },
  {
    gates: [{ id: `${prefix}-recover-2`, gate: "CNOT", wires: [0, 2] }],
  },
  {
    gates: [{ id: `${prefix}-recover-3`, gate: "TOFFOLI", wires: [2, 1, 0] }],
  },
];

export const repetitionSyndromeMeaning = (bits: string): string => {
  if (bits === "00") {
    return "No bit-flip mismatch.";
  }
  if (bits === "01") {
    return "Points to q2.";
  }
  if (bits === "10") {
    return "Points to q1.";
  }
  if (bits === "11") {
    return "Points to q0.";
  }
  return "Not in the single-error lookup.";
};

export const repetitionSyndromeTarget = (bits: string): string => {
  if (bits === "01") {
    return "q2";
  }
  if (bits === "10") {
    return "q1";
  }
  if (bits === "11") {
    return "q0";
  }
  return "—";
};
