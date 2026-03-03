import { computed } from "vue";
import type {
  DensityMatrix,
  GateId,
  MixedCircuitColumn,
  MixedGateInstance,
  MixedStageSnapshot,
  ValidSingleQubitDensity,
} from "../types";
import {
  measurementDistributionForDensityMatrix,
  simulateMixedColumns,
  singleQubitDensityMatrix,
  tensorProductDensityMatrices,
  zeroDensityMatrix,
} from "../quantum";
import { resolveOperator } from "../state/operators";
import { parseSingleQubitDensityInput } from "./rho-inputs";
import { mixedProcessLabel } from "./gates";
import { mixedState } from "./store";

export const mixedQubitCount = computed(() => mixedState.preparedInputs.length);

export const mixedParsedRhoCards = computed(() => mixedState.preparedInputs.map((entry) => parseSingleQubitDensityInput(entry)));

export const mixedPreparedSingleQubitDensities = computed<Array<ValidSingleQubitDensity | null>>(() =>
  mixedParsedRhoCards.value.map((entry) => entry.validDensity),
);

export const mixedPreparedDensityIsCanonical = computed(() =>
  mixedPreparedSingleQubitDensities.value.every((entry) => entry !== null),
);

export const mixedPreparedDensityMatrix = computed<DensityMatrix>(() => {
  if (!mixedPreparedDensityIsCanonical.value) {
    return zeroDensityMatrix(mixedQubitCount.value);
  }
  return tensorProductDensityMatrices(
    mixedPreparedSingleQubitDensities.value.map((entry) => singleQubitDensityMatrix(entry!)),
  );
});

const resolveMixedGate = (gate: GateId) => resolveOperator(gate, []);

export const mixedDensitySnapshots = computed(() =>
  simulateMixedColumns(mixedPreparedDensityMatrix.value, mixedState.columns, resolveMixedGate, mixedQubitCount.value),
);

export const mixedStageSnapshots = computed<MixedStageSnapshot[]>(() => {
  const lastIndex = mixedDensitySnapshots.value.length - 1;
  return mixedDensitySnapshots.value.map((rho, index) => ({
    id: index === 0 ? "prepared" : index === lastIndex ? "final" : `t${index}`,
    index,
    label: index === 0 ? "Prepared" : index === lastIndex ? "Final" : `After t${index}`,
    rho,
    isFinal: index === lastIndex,
  }));
});

export const mixedFinalStageSnapshot = computed(() => mixedStageSnapshots.value[mixedStageSnapshots.value.length - 1]!);

export const mixedSelectedStageSnapshot = computed<MixedStageSnapshot>(() => {
  const index = Math.max(0, Math.min(mixedState.selectedStageIndex, mixedStageSnapshots.value.length - 1));
  return mixedStageSnapshots.value[index]!;
});

export const mixedFinalDistribution = computed(() => measurementDistributionForDensityMatrix(mixedFinalStageSnapshot.value.rho));

export const mixedGateInstanceAt = (column: MixedCircuitColumn, row: number): MixedGateInstance | null =>
  column.gates.find((entry) => entry.wires.includes(row)) ?? null;

export const mixedGateLabel = (instance: MixedGateInstance | null): string => {
  if (instance === null) {
    return "";
  }
  if (
    instance.process.kind === "unitary" &&
    (instance.process.gateId === "CNOT" || instance.process.gateId === "TOFFOLI")
  ) {
    return "";
  }
  if (instance.wires.length > 1) {
    return mixedGateProcessLabel(instance);
  }
  return mixedGateProcessLabel(instance);
};

export const mixedGateProcessLabel = (instance: MixedGateInstance): string =>
  mixedProcessLabel(instance.process, {
    compact: instance.process.kind === "noise",
    includeStrength: instance.process.kind === "noise",
  });
