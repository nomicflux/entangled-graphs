import { computed, ref } from "vue";
import type { BasisProbability } from "../../../types";
import * as complex from "../../../complex";
import { bloch_pair_from_ensemble, measurement_distribution_for_ensemble, tensor_product_qubits } from "../../../quantum";
import { formatInjectedErrorsLabel } from "../shared/error-labels";
import { logicalPresetById, logicalPresetFidelity, type LogicalPresetId } from "../shared/logical-presets";
import { bitFlipEncodeColumns, bitFlipRecoveryColumns, repetitionSyndromeMeaning } from "../shared/repetition-code";
import { useSingleErrorColumnModel } from "../shared/useSingleErrorColumnModel";

const ZERO_QUBIT = {
  a: complex.from_real(1),
  b: complex.from_real(0),
};

const syndromeDistribution = (distribution: ReadonlyArray<BasisProbability>) => {
  const totals = new Map<string, number>([
    ["00", 0],
    ["01", 0],
    ["10", 0],
    ["11", 0],
  ]);

  for (const entry of distribution) {
    const syndrome = entry.basis.slice(1, 3);
    totals.set(syndrome, (totals.get(syndrome) ?? 0) + entry.probability);
  }

  return [...totals.entries()].map(([bits, probability]) => ({ bits, probability }));
};

export const useBitFlipRepetitionModel = () => {
  const selectedPreset = ref<LogicalPresetId>("plus");

  const preparedState = computed(() =>
    tensor_product_qubits([
      logicalPresetById(selectedPreset.value).qubit,
      ZERO_QUBIT,
      ZERO_QUBIT,
    ]),
  );

  const prefixColumns = computed(() => bitFlipEncodeColumns("bit"));
  const suffixColumns = computed(() => bitFlipRecoveryColumns("bit"));

  const columnLabels = computed(() => [
    "Copy q0 to q1",
    "Copy q0 to q2",
    "Inject errors",
    "Compare q0 with q1",
    "Compare q0 with q2",
    "Majority-vote correction",
  ]);

  const stageLabels = computed(() => [
    `Start with ${logicalPresetById(selectedPreset.value).label}|00>`,
    "After copying q0 into q1",
    "After copying q0 into q2",
    "After the injected-error stage",
    "After the first parity check",
    "After the second parity check",
    "After majority-vote correction",
  ]);

  const circuit = useSingleErrorColumnModel({
    qubitCount: 3,
    allowedErrorGates: ["X", "Z"],
    paletteTitle: "Error Gates",
    defaultSelectedGate: "X",
    preparedState,
    prefixColumns,
    suffixColumns,
    columnLabels,
    stageLabels,
    lockReason: "Encoding and recovery are fixed in this lesson. Edit only the Inject errors column.",
    gateIdPrefix: "bit-code",
  });

  const finalStageSnapshot = computed(() => circuit.stageSnapshots.value[circuit.stageSnapshots.value.length - 1]!);
  const recoveredLogical = computed(() => bloch_pair_from_ensemble(finalStageSnapshot.value.ensemble)[0] ?? null);
  const recoveryFidelity = computed(() => logicalPresetFidelity(selectedPreset.value, recoveredLogical.value));
  const syndromeRows = computed(() =>
    syndromeDistribution(measurement_distribution_for_ensemble(finalStageSnapshot.value.ensemble)),
  );
  const dominantSyndrome = computed(() =>
    syndromeRows.value.reduce((best, current) => (current.probability > best.probability ? current : best), syndromeRows.value[0]!),
  );

  const selectedPresetLabel = computed(() => logicalPresetById(selectedPreset.value).label);
  const injectedErrorLabel = computed(() => formatInjectedErrorsLabel(circuit.injectedErrors.value));

  const statusSummary = computed(() => {
    const injected = circuit.injectedErrors.value;
    if (injected.length === 0) {
      return "No injected errors. Output should match input.";
    }
    if (injected.length > 1) {
      return "Multiple errors injected. This code corrects one X error.";
    }
    if (injected[0]!.gate === "X") {
      return recoveryFidelity.value > 0.99
        ? "One X error corrected."
        : "Output does not match input.";
    }
    return "Z errors are not corrected by this code.";
  });

  return {
    selectedPreset,
    selectedPresetLabel,
    injectedErrorLabel,
    statusSummary,
    recoveryFidelity,
    dominantSyndrome,
    syndromeRows,
    repetitionSyndromeMeaning,
    ...circuit,
  };
};
