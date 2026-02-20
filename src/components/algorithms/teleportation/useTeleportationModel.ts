import { computed, ref, watch } from "vue";
import type { BellStateId, BlochParams, EntanglementLink, GateId, Qubit, StageView } from "../../../types";
import * as complex from "../../../complex";
import {
  bloch_pair_from_ensemble,
  entanglement_delta_links,
  entanglement_links_from_ensemble,
  measurement_distribution_for_ensemble,
  simulate_columns_ensemble,
  tensor_product_qubits,
} from "../../../quantum";
import { qubitFromBloch } from "../../../state/qubit-helpers";
import { resolveOperator } from "../../../state/operators";
import { buildTeleportationBranchResults, teleportationSummaries } from "./engine";
import {
  TELEPORT_ROWS,
  type PrepPreset,
  type BranchPreview,
  type TeleportationBranchResult,
  type TeleportationColumn,
} from "./model-types";

const TELEPORT_SOURCE_KEY = "entangled.algorithms.teleportation.source";

const loadSourceBloch = (): BlochParams => {
  const raw = window.localStorage.getItem(TELEPORT_SOURCE_KEY);
  if (!raw) {
    return { theta: 0, phi: 0 };
  }

  try {
    const parsed = JSON.parse(raw) as Partial<BlochParams>;
    if (typeof parsed.theta !== "number" || typeof parsed.phi !== "number") {
      return { theta: 0, phi: 0 };
    }
    return { theta: parsed.theta, phi: parsed.phi };
  } catch {
    return { theta: 0, phi: 0 };
  }
};

export const useTeleportationModel = () => {
  const sourceBloch = ref<BlochParams>(loadSourceBloch());
  const selectedStageIndex = ref(0);

  watch(
    sourceBloch,
    (value) => {
      window.localStorage.setItem(TELEPORT_SOURCE_KEY, JSON.stringify(value));
    },
    { deep: true },
  );

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
        { id: "measure-q0", gate: "M", wires: [0] },
        { id: "measure-q1", gate: "M", wires: [1] },
      ],
    },
    {
      id: "corr-z",
      label: "Corr Z (m0)",
      gates: [],
    },
    {
      id: "corr-x",
      label: "Corr X (m1)",
      gates: [],
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

  const stageViews = computed<StageView[]>(() => {
    const labels = ["Prepared", ...circuitColumns.value.map((column) => column.label)];
    const lastIndex = ensembleSnapshots.value.length - 1;

    return ensembleSnapshots.value.map((snapshot, index) => ({
      id: index === 0 ? "tele-prepared" : `tele-t${index}`,
      index,
      label: labels[index] ?? `t${index}`,
      distribution: measurement_distribution_for_ensemble(snapshot),
      blochPair: bloch_pair_from_ensemble(snapshot),
      isFinal: index === lastIndex,
    }));
  });

  const selectedStage = computed<StageView>(() => stageViews.value[selectedStageIndex.value] ?? stageViews.value[0]!);

  watch(
    stageViews,
    (views) => {
      const maxIndex = Math.max(0, views.length - 1);
      if (selectedStageIndex.value > maxIndex) {
        selectedStageIndex.value = maxIndex;
      }
    },
    { deep: true },
  );

  const branchStageIndex = 4;
  const branchStageLabel = computed(() => stageViews.value[branchStageIndex]?.label ?? "Alice H");
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

  const stageEntanglementLinks = computed(() => ensembleSnapshots.value.map((snapshot) => entanglement_links_from_ensemble(snapshot)));

  const bellColorByState: Record<BellStateId, string> = {
    "phi+": "rgba(255, 122, 102, 0.95)",
    "phi-": "rgba(255, 196, 96, 0.95)",
    "psi+": "rgba(128, 165, 255, 0.95)",
    "psi-": "rgba(198, 130, 255, 0.95)",
  };

  const entanglementLinksForColumn = (columnIndex: number): EntanglementLink[] => {
    const previous = stageEntanglementLinks.value[columnIndex] ?? [];
    const current = stageEntanglementLinks.value[columnIndex + 1] ?? [];
    return entanglement_delta_links(previous, current).filter((link) => link.strength > 0.08);
  };

  const rowCenterViewBox = (row: number): number => ((row + 0.5) / TELEPORT_ROWS.length) * 100;

  const entanglementArcPath = (link: EntanglementLink): string => {
    const startY = rowCenterViewBox(Math.min(link.fromRow, link.toRow));
    const endY = rowCenterViewBox(Math.max(link.fromRow, link.toRow));
    const midY = (startY + endY) * 0.5;
    const startX = 24;
    const controlX = 16 - (link.strength * 6);
    return `M ${startX} ${startY} Q ${controlX} ${midY} ${startX} ${endY}`;
  };

  const entanglementArcStyle = (link: EntanglementLink): Record<string, string> => ({
    stroke: bellColorByState[link.dominantBell],
    strokeWidth: `${0.6 + (link.strength * 1.8)}`,
    opacity: `${0.22 + (link.strength * 0.55)}`,
  });

  return {
    sourceBloch,
    sourceAmplitudes,
    branchStageLabel,
    branchPreviews,
    teleportationBranches,
    teleportationOutput,
    circuitColumns,
    rows: TELEPORT_ROWS,
    stageViews,
    selectedStageIndex,
    selectedStage,
    applyPreset,
    entanglementLinksForColumn,
    entanglementArcPath,
    entanglementArcStyle,
  };
};
