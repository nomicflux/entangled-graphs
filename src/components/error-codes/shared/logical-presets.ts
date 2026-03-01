import type { BlochVector, Qubit } from "../../../types";
import * as complex from "../../../complex";

export type LogicalPresetId = "zero" | "one" | "plus" | "minus";

export type LogicalPreset = {
  id: LogicalPresetId;
  label: string;
  qubit: Qubit;
  bloch: {
    x: number;
    y: number;
    z: number;
  };
};

const rootHalf = 1 / Math.sqrt(2);

export const LOGICAL_PRESETS: readonly LogicalPreset[] = [
  {
    id: "zero",
    label: "|0>",
    qubit: {
      a: complex.from_real(1),
      b: complex.from_real(0),
    },
    bloch: { x: 0, y: 0, z: 1 },
  },
  {
    id: "one",
    label: "|1>",
    qubit: {
      a: complex.from_real(0),
      b: complex.from_real(1),
    },
    bloch: { x: 0, y: 0, z: -1 },
  },
  {
    id: "plus",
    label: "|+>",
    qubit: {
      a: complex.from_real(rootHalf),
      b: complex.from_real(rootHalf),
    },
    bloch: { x: 1, y: 0, z: 0 },
  },
  {
    id: "minus",
    label: "|->",
    qubit: {
      a: complex.from_real(rootHalf),
      b: complex.from_real(-rootHalf),
    },
    bloch: { x: -1, y: 0, z: 0 },
  },
] as const;

export const logicalPresetById = (presetId: LogicalPresetId): LogicalPreset =>
  LOGICAL_PRESETS.find((preset) => preset.id === presetId) ?? LOGICAL_PRESETS[0]!;

export const logicalPresetFidelity = (presetId: LogicalPresetId, vector: BlochVector | null | undefined): number => {
  if (!vector) {
    return 0;
  }

  const target = logicalPresetById(presetId).bloch;
  const fidelity = (1 + (target.x * vector.x) + (target.y * vector.y) + (target.z * vector.z)) / 2;
  return Math.max(0, Math.min(1, fidelity));
};

export const closestLogicalPreset = (vector: BlochVector | null | undefined): LogicalPreset | null => {
  if (!vector) {
    return null;
  }

  let bestPreset: LogicalPreset | null = null;
  let bestFidelity = -1;

  for (const preset of LOGICAL_PRESETS) {
    const fidelity = logicalPresetFidelity(preset.id, vector);
    if (fidelity > bestFidelity) {
      bestFidelity = fidelity;
      bestPreset = preset;
    }
  }

  return bestPreset;
};
