import type {
  BlochPair,
  BlochVector,
  PairPhaseOverlay,
  QubitPhaseOverlay,
  StageSnapshot,
  StageVisualModel,
} from "../../types";
import { bloch_pair_from_ensemble, measurement_distribution_for_ensemble } from "../../quantum";
import { reduced_density_for_subset_ensemble } from "../../quantum/reduced-density";

export const distributionForStageSnapshot = (snapshot: StageSnapshot) =>
  measurement_distribution_for_ensemble(snapshot.ensemble);

export const blochPairForStageSnapshot = (snapshot: StageSnapshot): BlochPair =>
  bloch_pair_from_ensemble(snapshot.ensemble);

const qubitPhaseOverlaysForBlochPair = (blochPair: BlochPair): ReadonlyArray<QubitPhaseOverlay> =>
  blochPair.map((vector, row) => ({
    row,
    angle: Math.atan2(vector.y, vector.x),
    magnitude: Math.hypot(vector.x, vector.y),
    paletteBias: vector.x,
  }));

const pairPhaseOverlaysForBlochPair = (blochPair: BlochPair): ReadonlyArray<PairPhaseOverlay> =>
  blochPair.length < 2
    ? []
    : Array.from({ length: blochPair.length - 1 }, (_, fromRow) =>
        Array.from({ length: blochPair.length - fromRow - 1 }, (_, offset) => {
          const toRow = fromRow + offset + 1;
          return {
            fromRow,
            toRow,
            sameParityMagnitude: 0,
            sameParityAngle: 0,
            oppositeParityMagnitude: 0,
            oppositeParityAngle: 0,
          };
        }),
      ).flat();

const complexMagnitude = (real: number, imag: number): number => Math.hypot(real, imag);

const pairPhaseOverlaysForStageSnapshot = (snapshot: StageSnapshot, blochPair: BlochPair): ReadonlyArray<PairPhaseOverlay> =>
  blochPair.length < 2
    ? []
    : Array.from({ length: blochPair.length - 1 }, (_, fromRow) =>
        Array.from({ length: blochPair.length - fromRow - 1 }, (_, offset) => {
          const toRow = fromRow + offset + 1;
          const rho = reduced_density_for_subset_ensemble(snapshot.ensemble, [fromRow, toRow], blochPair.length);
          const sameParity = rho[0]![3]!;
          const oppositeParity = rho[1]![2]!;

          return {
            fromRow,
            toRow,
            sameParityMagnitude: complexMagnitude(sameParity.real, sameParity.imag),
            sameParityAngle: Math.atan2(sameParity.imag, sameParity.real),
            oppositeParityMagnitude: complexMagnitude(oppositeParity.real, oppositeParity.imag),
            oppositeParityAngle: Math.atan2(oppositeParity.imag, oppositeParity.real),
          };
        }),
      ).flat();

type DominantPairChannel = {
  magnitude: number;
  angle: number;
};

const dominantPairChannelForRow = (
  row: number,
  pairPhaseOverlays: ReadonlyArray<PairPhaseOverlay>,
): DominantPairChannel | null => {
  let best: DominantPairChannel | null = null;

  for (const overlay of pairPhaseOverlays) {
    if (overlay.fromRow !== row && overlay.toRow !== row) {
      continue;
    }

    const channels: ReadonlyArray<DominantPairChannel> = [
      { magnitude: overlay.sameParityMagnitude, angle: overlay.sameParityAngle },
      { magnitude: overlay.oppositeParityMagnitude, angle: overlay.oppositeParityAngle },
    ];

    for (const channel of channels) {
      if (best === null || channel.magnitude > best.magnitude) {
        best = channel;
      }
    }
  }

  return best;
};

const renderVectorForPairPhase = (
  vector: BlochVector,
  row: number,
  pairPhaseOverlays: ReadonlyArray<PairPhaseOverlay>,
): BlochVector => {
  const localMagnitude = Math.hypot(vector.x, vector.y);
  const dominantPair = dominantPairChannelForRow(row, pairPhaseOverlays);

  if (!dominantPair) {
    return vector;
  }

  if (dominantPair.magnitude <= 0.08 || dominantPair.magnitude <= localMagnitude + 0.04) {
    return vector;
  }

  const renderMagnitude = Math.max(localMagnitude, Math.min(0.82, dominantPair.magnitude * 1.64));
  const x = Math.cos(dominantPair.angle) * renderMagnitude;
  const y = Math.sin(dominantPair.angle) * renderMagnitude;
  const certainty = Math.min(1, Math.sqrt((x * x) + (y * y) + (vector.z * vector.z)));

  return {
    ...vector,
    x,
    y,
    certainty,
    uncertainty: 1 - certainty,
  };
};

export const deriveStageVisualModel = (snapshot: StageSnapshot): StageVisualModel => {
  const distribution = distributionForStageSnapshot(snapshot);
  const blochPair = blochPairForStageSnapshot(snapshot);
  const pairPhaseOverlays = pairPhaseOverlaysForStageSnapshot(snapshot, blochPair);
  const renderPair = blochPair.map((vector, row) => renderVectorForPairPhase(vector, row, pairPhaseOverlays));

  return {
    distribution,
    blochPair,
    renderPair,
    qubitPhaseOverlays: qubitPhaseOverlaysForBlochPair(renderPair),
    pairPhaseOverlays,
  };
};
