import { reactive } from "vue";
import type {
  GateId,
  MixedCircuitColumn,
  MixedGateInstance,
  NoiseStrengthPreset,
  RawSingleQubitRhoInput,
} from "../types";
import { MIXED_DEFAULT_NOISE_STRENGTH } from "./constants";
import { rhoPresetInput } from "./rho-inputs";

export type MixedCircuitState = {
  preparedInputs: RawSingleQubitRhoInput[];
  columns: MixedCircuitColumn[];
  selectedGate: GateId | null;
  selectedStageIndex: number;
  noiseStrength: NoiseStrengthPreset;
};

let mixedGateInstanceCounter = 0;

export const nextMixedGateInstanceId = (): string => {
  mixedGateInstanceCounter += 1;
  return `mg${mixedGateInstanceCounter}`;
};

export const emptyMixedColumn = (): MixedCircuitColumn => ({ gates: [] });

const makeUnitaryGate = (gateId: GateId, wire: number): MixedGateInstance => ({
  id: nextMixedGateInstanceId(),
  process: { kind: "unitary", gateId },
  wires: [wire],
});

export const mixedState = reactive<MixedCircuitState>({
  preparedInputs: [rhoPresetInput("zero"), rhoPresetInput("zero")],
  columns: [
    { gates: [makeUnitaryGate("H", 0), makeUnitaryGate("X", 1)] },
    { gates: [makeUnitaryGate("S", 0), makeUnitaryGate("H", 1)] },
    emptyMixedColumn(),
    emptyMixedColumn(),
  ],
  selectedGate: "H",
  selectedStageIndex: 4,
  noiseStrength: MIXED_DEFAULT_NOISE_STRENGTH,
});
