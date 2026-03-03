import type { NoiseStrengthPreset } from "../types";

export const MIXED_MIN_QUBITS = 1;
export const MIXED_MAX_QUBITS = 4;

export const MIXED_NOISE_STRENGTH_PRESETS: readonly NoiseStrengthPreset[] = [0, 0.1, 0.25, 0.5];
export const MIXED_DEFAULT_NOISE_STRENGTH: NoiseStrengthPreset = 0.25;
