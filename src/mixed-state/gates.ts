import type { GateId, MixedGateProcess, NoiseChannelId, NoiseStrengthPreset } from "../types";
import { operatorArityForGate } from "../state/operators";

const noiseStrengthTokenMap: Record<NoiseStrengthPreset, "0" | "10" | "25" | "50"> = {
  0: "0",
  0.1: "10",
  0.25: "25",
  0.5: "50",
};

const noiseStrengthFromToken = (token: string): NoiseStrengthPreset | null => {
  if (token === "0") {
    return 0;
  }
  if (token === "10") {
    return 0.1;
  }
  if (token === "25") {
    return 0.25;
  }
  if (token === "50") {
    return 0.5;
  }
  return null;
};

const noiseToolPattern = /^noise:(bit-flip|phase-flip|dephasing|depolarizing|amplitude-damping):(0|10|25|50)$/;

export const noiseToolId = (channelId: NoiseChannelId, strength: NoiseStrengthPreset): GateId =>
  `noise:${channelId}:${noiseStrengthTokenMap[strength]}`;

export const parseNoiseToolId = (
  toolId: GateId,
): { channelId: NoiseChannelId; strength: NoiseStrengthPreset } | null => {
  const match = noiseToolPattern.exec(toolId);
  if (!match) {
    return null;
  }
  const [, channelId, rawStrength] = match;
  const strength = noiseStrengthFromToken(rawStrength);
  return strength === null ? null : { channelId: channelId as NoiseChannelId, strength };
};

export const isNoiseToolId = (toolId: GateId): boolean => parseNoiseToolId(toolId) !== null;

export const formatNoiseStrength = (strength: NoiseStrengthPreset): string => `${Math.round(strength * 100)}%`;

export const noiseChannelLabel = (channelId: NoiseChannelId): string => {
  if (channelId === "bit-flip") {
    return "Bit Flip";
  }
  if (channelId === "phase-flip") {
    return "Phase Flip";
  }
  if (channelId === "dephasing") {
    return "Dephase";
  }
  if (channelId === "depolarizing") {
    return "Depolarizing";
  }
  return "Amplitude Damping";
};

export const noiseChannelShortLabel = (channelId: NoiseChannelId): string => {
  if (channelId === "bit-flip") {
    return "Bit";
  }
  if (channelId === "phase-flip") {
    return "Phase";
  }
  if (channelId === "dephasing") {
    return "Deph";
  }
  if (channelId === "depolarizing") {
    return "Depol";
  }
  return "Damp";
};

export const mixedProcessArity = (process: MixedGateProcess): number => {
  if (process.kind === "unitary") {
    return operatorArityForGate(process.gateId, []) ?? 0;
  }
  return 1;
};

export const toolIdForProcess = (process: MixedGateProcess): GateId => {
  if (process.kind === "unitary") {
    return process.gateId;
  }
  if (process.kind === "measurement") {
    return "M";
  }
  return noiseToolId(process.channelId, process.strength);
};

export const processForToolId = (toolId: GateId): MixedGateProcess | null => {
  const noise = parseNoiseToolId(toolId);
  if (noise) {
    return { kind: "noise", channelId: noise.channelId, strength: noise.strength };
  }
  if (toolId === "M") {
    return { kind: "measurement" };
  }
  const arity = operatorArityForGate(toolId, []);
  if (arity === null) {
    return null;
  }
  return { kind: "unitary", gateId: toolId };
};

export const mixedToolLabel = (
  toolId: GateId,
  options: { compact?: boolean; includeStrength?: boolean } = {},
): string => {
  const noise = parseNoiseToolId(toolId);
  if (noise) {
    const base = options.compact ? noiseChannelShortLabel(noise.channelId) : noiseChannelLabel(noise.channelId);
    return options.includeStrength ? `${base} ${formatNoiseStrength(noise.strength)}` : base;
  }
  return toolId;
};

export const mixedProcessLabel = (
  process: MixedGateProcess,
  options: { compact?: boolean; includeStrength?: boolean } = {},
): string => mixedToolLabel(toolIdForProcess(process), options);
