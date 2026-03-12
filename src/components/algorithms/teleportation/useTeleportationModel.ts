import { computed, ref, watch } from "vue";
import { classicalStatesFromEnsemble } from "../../../classical";
import type { BlochParams, FixedPanelClassicalLayout, GateId, Qubit, StageSnapshot } from "../../../types";
import * as complex from "../../../complex";
import {
  measurement_distribution,
  measurement_distribution_for_ensemble,
  sample_circuit_run,
  sample_distribution,
  simulate_columns_ensemble,
  tensor_product_qubits,
} from "../../../quantum";
import { qubitFromBloch } from "../../../state/qubit-helpers";
import { resolveOperator } from "../../../state/operators";
import { useAlgorithmEntanglement } from "../shared/useAlgorithmEntanglement";
import { loadBlochParams, saveBlochParams } from "../shared/storage";
import {
  bobQubitFromStateForOutcome,
  buildTeleportationBranchResults,
  teleportationSummaries,
  teleportationSummaryForPolicy,
} from "./engine";
import {
  TELEPORT_ROWS,
  type PrepPreset,
  type BranchPreview,
  type TeleportationBranchResult,
  type TeleportationCorrectionMode,
  type TeleportationCorrectionPolicy,
  type TeleportationColumn,
  type TeleportationSampleResult,
} from "./model-types";

const TELEPORT_SOURCE_KEY = "entangled.algorithms.teleportation.source";
const TELEPORT_CORRECTION_MODE_KEY = "entangled.algorithms.teleportation.correction.mode";
const TELEPORT_MANUAL_Z_KEY = "entangled.algorithms.teleportation.correction.manualZ";
const TELEPORT_MANUAL_X_KEY = "entangled.algorithms.teleportation.correction.manualX";

const loadCorrectionMode = (): TeleportationCorrectionMode => {
  const raw = window.localStorage.getItem(TELEPORT_CORRECTION_MODE_KEY);
  return raw === "manual" ? "manual" : "auto";
};

const loadBoolean = (key: string, fallback: boolean): boolean => {
  const raw = window.localStorage.getItem(key);
  if (raw === null) {
    return fallback;
  }
  return raw === "true";
};

export const useTeleportationModel = () => {
  const sourceBloch = ref<BlochParams>(loadBlochParams(TELEPORT_SOURCE_KEY, { theta: 0, phi: 0 }));
  const selectedStageIndex = ref(0);
  const correctionMode = ref<TeleportationCorrectionMode>(loadCorrectionMode());
  const manualApplyZ = ref<boolean>(loadBoolean(TELEPORT_MANUAL_Z_KEY, true));
  const manualApplyX = ref<boolean>(loadBoolean(TELEPORT_MANUAL_X_KEY, true));
  const sampledResult = ref<TeleportationSampleResult | null>(null);

  watch(
    sourceBloch,
    (value) => {
      saveBlochParams(TELEPORT_SOURCE_KEY, value);
      sampledResult.value = null;
    },
    { deep: true },
  );

  watch(correctionMode, (value) => {
    window.localStorage.setItem(TELEPORT_CORRECTION_MODE_KEY, value);
    sampledResult.value = null;
  });

  watch(manualApplyZ, (value) => {
    window.localStorage.setItem(TELEPORT_MANUAL_Z_KEY, value ? "true" : "false");
    sampledResult.value = null;
  });

  watch(manualApplyX, (value) => {
    window.localStorage.setItem(TELEPORT_MANUAL_X_KEY, value ? "true" : "false");
    sampledResult.value = null;
  });

  const correctionPolicy = computed<TeleportationCorrectionPolicy>(() => {
    if (correctionMode.value === "auto") {
      return { applyZ: true, applyX: true };
    }
    return {
      applyZ: manualApplyZ.value,
      applyX: manualApplyX.value,
    };
  });

  const circuitColumns = computed<TeleportationColumn[]>(() => [
    {
      id: "bell-h",
      label: "Bell H",
      gates: [{ id: "bell-h-gate", gate: "H", wires: [1] }],
    },
    {
      id: "bell-cnot",
      label: "Bell CNOT",
      gates: [{ id: "bell-cnot-gate", gate: "CNOT", wires: [1, 2] }],
    },
    {
      id: "alice-cnot",
      label: "Alice CNOT",
      gates: [{ id: "alice-cnot-gate", gate: "CNOT", wires: [0, 1] }],
    },
    {
      id: "alice-h",
      label: "Alice H",
      gates: [{ id: "alice-h-gate", gate: "H", wires: [0] }],
    },
    {
      id: "measure",
      label: "Measure",
      gates: [
        { id: "measure-q0", gate: "M", wires: [0], writesClassicalBit: { register: "teleport", index: 0 } },
        { id: "measure-q1", gate: "M", wires: [1], writesClassicalBit: { register: "teleport", index: 1 } },
      ],
    },
    {
      id: "corr-z",
      label: "Corr Z (m0)",
      gates: correctionPolicy.value.applyZ
        ? [
            {
              id: "corr-z-gate",
              gate: "Z",
              wires: [2],
              condition: { kind: "bit-equals", bit: { register: "teleport", index: 0 }, value: 1 },
            },
          ]
        : [],
    },
    {
      id: "corr-x",
      label: "Corr X (m1)",
      gates: correctionPolicy.value.applyX
        ? [
            {
              id: "corr-x-gate",
              gate: "X",
              wires: [2],
              condition: { kind: "bit-equals", bit: { register: "teleport", index: 1 }, value: 1 },
            },
          ]
        : [],
    },
  ]);

  const quantumColumns = computed(() => circuitColumns.value.map((column) => ({ gates: column.gates })));
  const sourceAmplitudes = computed<Qubit>(() => qubitFromBloch(sourceBloch.value));

  const preparedState = computed(() => {
    const ketZero = { a: complex.from_real(1), b: complex.from_real(0) };
    return tensor_product_qubits([sourceAmplitudes.value, ketZero, ketZero]);
  });

  const resolveGate = (gate: GateId) => resolveOperator(gate, []);

  const ensembleSnapshots = computed(() =>
    simulate_columns_ensemble(preparedState.value, quantumColumns.value, resolveGate, 3),
  );

  const stageSnapshots = computed<StageSnapshot[]>(() => {
    const labels = ["Prepared", ...circuitColumns.value.map((column) => column.label)];
    const lastIndex = ensembleSnapshots.value.length - 1;

    return ensembleSnapshots.value.map((snapshot, index) => ({
      id: index === 0 ? "tele-prepared" : `tele-t${index}`,
      index,
      label: labels[index] ?? `t${index}`,
      ensemble: snapshot,
      classicalStates: classicalStatesFromEnsemble(snapshot),
      isFinal: index === lastIndex,
    }));
  });

  const selectedStageSnapshot = computed<StageSnapshot>(() =>
    stageSnapshots.value[selectedStageIndex.value] ?? stageSnapshots.value[0]!,
  );

  watch(
    stageSnapshots,
    (snapshots) => {
      const maxIndex = Math.max(0, snapshots.length - 1);
      if (selectedStageIndex.value > maxIndex) {
        selectedStageIndex.value = maxIndex;
      }
    },
    { deep: true },
  );

  const branchStageIndex = 4;
  const branchStageLabel = computed(() => stageSnapshots.value[branchStageIndex]?.label ?? "Alice H");
  const preMeasurementState = computed(() => ensembleSnapshots.value[branchStageIndex]?.[0]?.state ?? preparedState.value);

  const teleportationBranches = computed<TeleportationBranchResult[]>(() =>
    buildTeleportationBranchResults(preMeasurementState.value, sourceAmplitudes.value),
  );

  const branchPreviews = computed<BranchPreview[]>(() =>
    teleportationBranches.value.map((entry) => ({
      basis: entry.basis,
      operation: entry.operation,
      state: entry.withoutCorrection,
    })),
  );

  const teleportationOutput = computed(() => teleportationSummaries(teleportationBranches.value, sourceAmplitudes.value));
  const activeExpectedSummary = computed(() =>
    teleportationSummaryForPolicy(teleportationBranches.value, sourceAmplitudes.value, correctionPolicy.value),
  );
  const activeExpectedDistribution = computed(() =>
    measurement_distribution_for_ensemble(ensembleSnapshots.value[ensembleSnapshots.value.length - 1] ?? []),
  );
  const activeExpected = computed(() => ({
    summary: activeExpectedSummary.value.summary,
    distribution: activeExpectedDistribution.value,
  }));

  const classicalLayout = computed<FixedPanelClassicalLayout>(() => {
    const m0Value = sampledResult.value ? `=${sampledResult.value.m0}` : "=?";
    const m1Value = sampledResult.value ? `=${sampledResult.value.m1}` : "=?";
    return {
      lanes: [
        { id: "m0", label: "m0" },
        { id: "m1", label: "m1" },
      ],
      registers: [
        {
          id: "teleport-register-m0",
          label: "m0",
          lane: "m0",
          anchorColumnId: "measure",
          valueText: m0Value,
          kind: "bit",
        },
        {
          id: "teleport-register-m1",
          label: "m1",
          lane: "m1",
          anchorColumnId: "measure",
          valueText: m1Value,
          kind: "bit",
        },
      ],
      routes: [
        {
          id: "teleport-route-m0",
          from: { columnId: "measure", row: 0 },
          to: { columnId: "corr-z", row: 2 },
          lane: "m0",
          kind: "bit",
        },
        {
          id: "teleport-route-m1",
          from: { columnId: "measure", row: 1 },
          to: { columnId: "corr-x", row: 2 },
          lane: "m1",
          kind: "bit",
        },
      ],
      conditionBadges: [
        ...(correctionPolicy.value.applyZ
          ? [{ id: "teleport-badge-z", columnId: "corr-z", row: 2, text: "if m0", kind: "bit" as const }]
          : []),
        ...(correctionPolicy.value.applyX
          ? [{ id: "teleport-badge-x", columnId: "corr-x", row: 2, text: "if m1", kind: "bit" as const }]
          : []),
      ],
    };
  });

  const measurementBits = (outcomes: ReadonlyArray<{ gateId: string; value: 0 | 1 }>): { m0: 0 | 1; m1: 0 | 1 } => {
    const m0 = outcomes.find((entry) => entry.gateId === "measure-q0")!.value;
    const m1 = outcomes.find((entry) => entry.gateId === "measure-q1")!.value;
    return { m0, m1 };
  };

  const normalizeQubit = (qubit: Qubit): Qubit => {
    const norm = complex.magnitude_squared(qubit.a) + complex.magnitude_squared(qubit.b);
    const scale = norm > 0 ? 1 / Math.sqrt(norm) : 1;
    return {
      a: complex.scale(qubit.a, scale),
      b: complex.scale(qubit.b, scale),
    };
  };

  const fidelityToSource = (candidate: Qubit): number => {
    const source = normalizeQubit(sourceAmplitudes.value);
    const target = normalizeQubit(candidate);
    const overlap = complex.add(
      complex.mult(complex.conjugate(source.a), target.a),
      complex.mult(complex.conjugate(source.b), target.b),
    );
    return complex.magnitude_squared(overlap);
  };

  const executeSample = (
    replay?: {
      priorOutcomes: ReadonlyArray<{ gateId: string; value: 0 | 1 }>;
      resampleFromGateId: string;
    },
  ) => {
    const sampled = sample_circuit_run(
      preparedState.value,
      quantumColumns.value,
      resolveGate,
      3,
      Math.random,
      replay,
    );
    const bits = measurementBits(sampled.outcomes);
    const distribution = measurement_distribution(sampled.finalState);
    const finalSample = sample_distribution(distribution);
    const bob = bobQubitFromStateForOutcome(sampled.finalState, bits.m0, bits.m1);

    sampledResult.value = {
      basis: finalSample.basis,
      probability: finalSample.probability,
      distribution,
      outcomes: sampled.outcomes,
      m0: bits.m0,
      m1: bits.m1,
      q2P0: complex.magnitude_squared(bob.a),
      q2P1: complex.magnitude_squared(bob.b),
      fidelityToSource: fidelityToSource(bob),
    };
  };

  const applyPreset = (preset: PrepPreset) => {
    if (preset === "zero") {
      sourceBloch.value.theta = 0;
      sourceBloch.value.phi = 0;
      return;
    }
    if (preset === "one") {
      sourceBloch.value.theta = Math.PI;
      sourceBloch.value.phi = 0;
      return;
    }
    sourceBloch.value.theta = Math.PI / 2;
    sourceBloch.value.phi = 0;
  };

  const runSample = () => {
    executeSample();
  };

  const resampleFrom = (gateId: string) => {
    if (!sampledResult.value) {
      executeSample();
      return;
    }
    executeSample({
      priorOutcomes: sampledResult.value.outcomes.map((entry) => ({ gateId: entry.gateId, value: entry.value })),
      resampleFromGateId: gateId,
    });
  };

  const entanglement = useAlgorithmEntanglement({ ensembleSnapshots, rows: TELEPORT_ROWS });

  return {
    sourceBloch,
    sourceAmplitudes,
    branchStageLabel,
    branchPreviews,
    teleportationBranches,
    teleportationOutput,
    activeExpected,
    correctionMode,
    manualApplyZ,
    manualApplyX,
    sampledResult,
    circuitColumns,
    classicalLayout,
    rows: TELEPORT_ROWS,
    stageSnapshots,
    stageEntanglementModels: entanglement.stageEntanglementModels,
    selectedStageIndex,
    selectedStageSnapshot,
    applyPreset,
    runSample,
    resampleFrom,
    entanglementLinksForColumn: entanglement.entanglementLinksForColumn,
    entanglementArcPath: entanglement.entanglementArcPath,
    entanglementArcStyle: entanglement.entanglementArcStyle,
    pairwiseTooltip: entanglement.pairwiseTooltip,
  };
};
