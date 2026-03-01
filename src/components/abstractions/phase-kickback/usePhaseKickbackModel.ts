import { computed, ref, watch } from "vue";
import type {
  BasisProbability,
  CircuitColumn,
  EntanglementLink,
  GateId,
  GateInstance,
  QubitRow,
  StageEntanglementModel,
  StageSnapshot,
} from "../../../types";
import * as complex from "../../../complex";
import {
  entanglement_links_from_ensemble,
  measurement_distribution_for_ensemble,
  simulate_columns_ensemble,
  stage_entanglement_models_from_snapshots,
  tensor_product_qubits,
} from "../../../quantum";
import { enforceMeasurementLockRulesForColumns } from "../../../state/action-helpers";
import { enforceDisjoint, gateTouchesRow, removeOverlaps } from "../../../state/gate-instance-utils";
import { isRowLockedAtColumn } from "../../../state/measurement-locks";
import { availableBuiltinGatesForQubitCount, operatorArityForGate, resolveOperator } from "../../../state/operators";
import type { CircuitGridModelContext } from "../../circuit/model-context";
import type { PaletteEntry, PaletteGroup } from "../../circuit/palette-types";
import { useCircuitGridInteractionCore } from "../../circuit/useCircuitGridInteractionCore";
import {
  createPhaseKickbackCoreColumns,
  type ControlledPhaseGate,
  type KickbackModuleId,
  type KickbackPhaseGate,
  phaseKickbackLockedColumnCount,
  type PhaseKickbackConfig,
  PHASE_KICKBACK_QUBIT_COUNT,
  phaseKickbackBranchSample,
  phaseKickbackCoreMetrics,
} from "./engine";

const INITIAL_EDITABLE_COLUMNS = 2;
const MIN_EDITABLE_COLUMNS = 1;
const MAX_EDITABLE_COLUMNS = 6;

const paletteBuiltinGates: readonly GateId[] = [
  "I",
  "X",
  "Y",
  "Z",
  "H",
  "S",
  "T",
  "M",
  "CNOT",
  "CZ",
  "CP",
  "SWAP",
  "TOFFOLI",
  "CSWAP",
];

const ketZero = {
  a: complex.from_real(1),
  b: complex.from_real(0),
};

const createEditableColumns = (count: number): CircuitColumn[] =>
  Array.from({ length: count }, () => ({ gates: [] }));

const phaseKickbackModuleOptions = [
  {
    id: "phase-gates",
    title: "Single-Qubit Phase Kickback",
    subtitle: "Use a single-qubit phase gate on q1, then CNOT to transfer that phase class onto q0.",
    instructions: [
      "Compare I/X (+1 full phase) against Z/Y (-1 full phase).",
      "Try S and T to see intermediate complex kickback.",
      "Track effective factor and q0 readout bias before/after exploration gates.",
    ],
    measurementPrompt: "Place M early to see how collapse can hide kickback before final readout.",
  },
  {
    id: "controlled-phase-variants",
    title: "Controlled-Phase Variants (CZ / CP=e^{i*pi/2})",
    subtitle: "Use native CZ and CP=e^{i*pi/2} to kick phase directly onto q0 and compare full vs partial kickback.",
    instructions: [
      "Switch between CZ and CP=e^{i*pi/2} and compare effective factor on q0 coherence.",
      "Verify CZ gives full -1 kickback while CP=e^{i*pi/2} gives intermediate/complex kickback.",
      "Add post-core gates to test how phase-bias can be amplified, canceled, or erased.",
    ],
    measurementPrompt: "Measure q0 or q1 before final readout to compare branch collapse vs ensemble bias.",
  },
] as const satisfies ReadonlyArray<{
  id: KickbackModuleId;
  title: string;
  subtitle: string;
  instructions: readonly string[];
  measurementPrompt: string;
}>;

const kickbackPhaseGateOptions: readonly KickbackPhaseGate[] = ["I", "X", "Y", "Z", "S", "T"];
const controlledPhaseGateOptions: readonly ControlledPhaseGate[] = ["CZ", "CP"];

const q0OneProbability = (distribution: ReadonlyArray<BasisProbability>): number =>
  distribution.reduce((acc, entry) => acc + (entry.basis.startsWith("1") ? entry.probability : 0), 0);

const q0ZeroProbability = (distribution: ReadonlyArray<BasisProbability>): number =>
  distribution.reduce((acc, entry) => acc + (entry.basis.startsWith("0") ? entry.probability : 0), 0);

const phaseLabel = (x: number, y: number): string => {
  const coherence = Math.hypot(x, y);
  if (coherence < 0.2) {
    return "low coherence";
  }
  if (x >= 0) {
    return "positive phase (|+>-like)";
  }
  return "negative phase (|->-like)";
};

export const usePhaseKickbackModel = () => {
  const moduleId = ref<KickbackModuleId>("phase-gates");
  const editableColumns = ref<CircuitColumn[]>(createEditableColumns(INITIAL_EDITABLE_COLUMNS));
  const targetPhaseGate = ref<KickbackPhaseGate>("Z");
  const controlledPhaseGate = ref<ControlledPhaseGate>("CZ");
  const selectedGate = ref<GateId | null>("X");
  const selectedStageIndex = ref(0);
  const sampledBranch = ref<ReturnType<typeof phaseKickbackBranchSample> | null>(null);

  let gateInstanceCounter = 0;
  const nextGateId = (): string => {
    gateInstanceCounter += 1;
    return `kick-g${gateInstanceCounter}`;
  };

  const module = computed(() => phaseKickbackModuleOptions.find((entry) => entry.id === moduleId.value) ?? phaseKickbackModuleOptions[0]);

  const kickbackConfig = computed<Required<PhaseKickbackConfig>>(() => ({
    moduleId: moduleId.value,
    targetPhaseGate: targetPhaseGate.value,
    controlledPhaseGate: controlledPhaseGate.value,
  }));

  const coreColumns = computed<CircuitColumn[]>(() => createPhaseKickbackCoreColumns(kickbackConfig.value));
  const lockedCoreColumnCount = computed<number>(() => phaseKickbackLockedColumnCount(kickbackConfig.value));

  const combinedColumns = computed<CircuitColumn[]>(() => [...coreColumns.value, ...editableColumns.value]);

  if (selectedStageIndex.value === 0) {
    selectedStageIndex.value = combinedColumns.value.length;
  }

  const stageLabels = computed<string[]>(() => {
    const labels = [
      "Prepared |00>",
      ...(moduleId.value === "phase-gates"
        ? [
            "Step 1: H(q1)",
            `Step 2: ${targetPhaseGate.value}(q1), H(q0)`,
            "Step 3: CNOT(q0->q1)",
            "Step 4: H(q0)",
          ]
        : ["Step 1: H(q0), X(q1)", `Step 2: ${controlledPhaseGate.value}(q0,q1)`, "Step 3: H(q0)"]),
    ];
    for (let index = 0; index < editableColumns.value.length; index += 1) {
      labels.push(`Explore step ${index + 1}`);
    }
    return labels;
  });

  const columnLabels = computed<string[]>(() =>
    combinedColumns.value.map((_, index) => {
      if (index === 0) {
        return moduleId.value === "phase-gates" ? "Step 1: H(q1)" : "Step 1: H(q0), X(q1)";
      }
      if (index === 1) {
        return moduleId.value === "phase-gates"
          ? `Step 2: ${targetPhaseGate.value}(q1), H(q0)`
          : `Step 2: ${controlledPhaseGate.value}(q0,q1)`;
      }
      if (index === 2) {
        return moduleId.value === "phase-gates" ? "Step 3: CNOT(q0->q1)" : "Step 3: H(q0)";
      }
      if (moduleId.value === "phase-gates" && index === 3) {
        return "Step 4: H(q0)";
      }
      return `Explore t${index - (lockedCoreColumnCount.value - 1)}`;
    }),
  );

  const preparedState = computed(() =>
    tensor_product_qubits(Array.from({ length: PHASE_KICKBACK_QUBIT_COUNT }, () => ketZero)),
  );

  const resolveGate = (gate: GateId) => resolveOperator(gate, []);

  const ensembleSnapshots = computed(() =>
    simulate_columns_ensemble(
      preparedState.value,
      combinedColumns.value,
      resolveGate,
      PHASE_KICKBACK_QUBIT_COUNT,
    ),
  );

  const stageSnapshots = computed<StageSnapshot[]>(() => {
    const lastIndex = ensembleSnapshots.value.length - 1;
    return ensembleSnapshots.value.map((snapshot, index) => ({
      id: index === 0 ? "kick-prepared" : `kick-t${index}`,
      index,
      label: stageLabels.value[index] ?? `t${index}`,
      ensemble: snapshot,
      isFinal: index === lastIndex,
    }));
  });

  const selectedStageSnapshot = computed<StageSnapshot>(() =>
    stageSnapshots.value[selectedStageIndex.value] ?? stageSnapshots.value[0]!,
  );

  const stageEntanglementLinks = computed<ReadonlyArray<ReadonlyArray<EntanglementLink>>>(() =>
    ensembleSnapshots.value.map((snapshot) => entanglement_links_from_ensemble(snapshot)),
  );

  const stageEntanglementModels = computed<ReadonlyArray<StageEntanglementModel>>(() =>
    stage_entanglement_models_from_snapshots(ensembleSnapshots.value),
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

  watch(
    combinedColumns,
    () => {
      sampledBranch.value = null;
    },
    { deep: true },
  );

  watch([moduleId, targetPhaseGate, controlledPhaseGate], () => {
    sampledBranch.value = null;
    selectedStageIndex.value = combinedColumns.value.length;
    interactions.clearPendingPlacement();
  });

  const setSelectedStage = (index: number): void => {
    if (index < 0 || index >= stageSnapshots.value.length) {
      return;
    }
    selectedStageIndex.value = index;
  };

  const isValidWire = (row: QubitRow): boolean =>
    Number.isInteger(row) && row >= 0 && row < PHASE_KICKBACK_QUBIT_COUNT;

  const editableColumnAt = (absoluteColumn: number): CircuitColumn | null => {
    const editableIndex = absoluteColumn - lockedCoreColumnCount.value;
    if (editableIndex < 0) {
      return null;
    }
    return editableColumns.value[editableIndex] ?? null;
  };

  const enforceMeasurementRules = () => {
    enforceMeasurementLockRulesForColumns(editableColumns.value as Array<{ gates: GateInstance[] }>);
  };

  const gateInstanceAt = (column: CircuitColumn, row: QubitRow): GateInstance | null =>
    column.gates.find((entry) => gateTouchesRow(entry, row)) ?? null;

  const setSelectedGate = (gate: GateId | null): void => {
    if (gate === null) {
      selectedGate.value = null;
      return;
    }

    const arity = operatorArityForGate(gate, []);
    if (arity === null || arity < 1 || arity > PHASE_KICKBACK_QUBIT_COUNT) {
      return;
    }
    selectedGate.value = gate;
  };

  const clearGateAt = (column: number, row: QubitRow): boolean => {
    if (!isValidWire(row)) {
      return false;
    }
    const targetColumn = editableColumnAt(column);
    if (!targetColumn) {
      return false;
    }
    targetColumn.gates = targetColumn.gates.filter((gate) => !gateTouchesRow(gate, row));
    return true;
  };

  const setSingleGateAt = (column: number, row: QubitRow, gate: GateId): boolean => {
    if (!isValidWire(row)) {
      return false;
    }
    const arity = operatorArityForGate(gate, []);
    if (arity !== 1) {
      return false;
    }
    if (isRowLockedAtColumn(combinedColumns.value, row, column)) {
      return false;
    }
    const targetColumn = editableColumnAt(column);
    if (!targetColumn) {
      return false;
    }

    removeOverlaps(targetColumn, [row]);
    targetColumn.gates.push({ id: nextGateId(), gate, wires: [row] });
    enforceDisjoint(targetColumn);
    enforceMeasurementRules();
    return true;
  };

  const placeGateOnWiresAt = (column: number, gate: GateId, wires: ReadonlyArray<QubitRow>): boolean => {
    const arity = operatorArityForGate(gate, []);
    if (arity === null || arity < 2 || wires.length !== arity) {
      return false;
    }
    if (!wires.every((wire) => isValidWire(wire))) {
      return false;
    }
    if (new Set(wires).size !== wires.length) {
      return false;
    }
    if (wires.some((wire) => isRowLockedAtColumn(combinedColumns.value, wire, column))) {
      return false;
    }

    const targetColumn = editableColumnAt(column);
    if (!targetColumn) {
      return false;
    }
    removeOverlaps(targetColumn, wires);
    targetColumn.gates.push({ id: nextGateId(), gate, wires: [...wires] });
    enforceDisjoint(targetColumn);
    enforceMeasurementRules();
    return true;
  };

  const placeCnotAt = (column: number, control: QubitRow, target: QubitRow): boolean =>
    control !== target && placeGateOnWiresAt(column, "CNOT", [control, target]);

  const placeToffoliAt = (
    column: number,
    controlA: QubitRow,
    controlB: QubitRow,
    target: QubitRow,
  ): boolean =>
    controlA !== controlB &&
    controlA !== target &&
    controlB !== target &&
    placeGateOnWiresAt(column, "TOFFOLI", [controlA, controlB, target]);

  const placeMultiGateAt = (column: number, wires: ReadonlyArray<QubitRow>, gate: GateId): boolean =>
    placeGateOnWiresAt(column, gate, wires);

  const context: CircuitGridModelContext = {
    columns: computed(() => combinedColumns.value),
    qubitCount: computed(() => PHASE_KICKBACK_QUBIT_COUNT),
    selectedGate: computed(() => selectedGate.value),
    gateArity: (gate: GateId): number => operatorArityForGate(gate, []) ?? 0,
    gateName: (gate: GateId): string => resolveOperator(gate, [])?.label ?? gate,
    gateLabel: (gate: GateId): string => gate,
    gateInstanceAt,
    setSelectedGate,
    clearGateAt,
    setSingleGateAt,
    placeCnotAt,
    placeToffoliAt,
    placeMultiGateAt,
    stageEntanglementLinks,
    stageEntanglementModels,
  };

  const interactions = useCircuitGridInteractionCore({
    context,
    lockPolicy: {
      isCellLockedAt: (column) => column >= 0 && column < lockedCoreColumnCount.value,
      lockReasonAt: (column) =>
        column >= 0 && column < lockedCoreColumnCount.value
          ? "These starting steps are fixed for this lesson module."
          : null,
    },
  });

  const availableGates = computed<GateId[]>(() =>
    availableBuiltinGatesForQubitCount(PHASE_KICKBACK_QUBIT_COUNT).filter((gate) => paletteBuiltinGates.includes(gate)),
  );

  const paletteGroups = computed<PaletteGroup[]>(() => {
    const byArity = new Map<number, PaletteEntry[]>();
    for (const gate of availableGates.value) {
      if (gate === "M") {
        continue;
      }
      const arity = operatorArityForGate(gate, []) ?? 0;
      const entries = byArity.get(arity) ?? [];
      entries.push({ id: gate, label: gate, isCustom: false });
      byArity.set(arity, entries);
    }

    return [...byArity.entries()]
      .sort(([left], [right]) => left - right)
      .map(([arity, entries]) => ({
        arity,
        title: `${arity}Q Gates`,
        entries,
      }));
  });

  const measurementEntries = computed<PaletteEntry[]>(() =>
    availableGates.value.includes("M") ? [{ id: "M", label: "M", isCustom: false }] : [],
  );

  const handlePaletteChipClick = (entry: PaletteEntry): void => {
    const next = selectedGate.value === entry.id ? null : entry.id;
    setSelectedGate(next);
    interactions.clearPendingPlacement();
  };

  const appendEditableColumn = () => {
    if (editableColumns.value.length >= MAX_EDITABLE_COLUMNS) {
      return;
    }
    editableColumns.value = [...editableColumns.value, { gates: [] }];
    selectedStageIndex.value = combinedColumns.value.length;
    interactions.clearPendingPlacement();
  };

  const removeLastEditableColumn = () => {
    if (editableColumns.value.length <= MIN_EDITABLE_COLUMNS) {
      return;
    }
    editableColumns.value = editableColumns.value.slice(0, -1);
    selectedStageIndex.value = combinedColumns.value.length;
    interactions.clearPendingPlacement();
  };

  const resetEditableColumns = () => {
    editableColumns.value = createEditableColumns(INITIAL_EDITABLE_COLUMNS);
    selectedStageIndex.value = combinedColumns.value.length;
    sampledBranch.value = null;
    interactions.clearPendingPlacement();
  };

  const coreMetrics = computed(() => phaseKickbackCoreMetrics(editableColumns.value, kickbackConfig.value));
  const controlBeforeKickback = computed(() => coreMetrics.value.controlBeforeKickback);
  const controlAfterKickback = computed(() => coreMetrics.value.controlAfterKickback);
  const targetBeforeKickback = computed(() => coreMetrics.value.targetBeforeKickback);
  const targetAfterKickback = computed(() => coreMetrics.value.targetAfterKickback);
  const readoutAfterFinalH = computed(() => coreMetrics.value.readoutAfterFinalH);
  const phaseFlipDetected = computed(() => coreMetrics.value.phaseFlipDetected);
  const effectiveKickbackFactor = computed(() => coreMetrics.value.effectiveFactor);
  const sourcePhaseAngleRadians = computed(() =>
    moduleId.value === "phase-gates"
      ? Math.atan2(targetBeforeKickback.value.y, targetBeforeKickback.value.x)
      : Math.atan2(controlAfterKickback.value.y, controlAfterKickback.value.x),
  );

  const controlPhaseBeforeLabel = computed(() =>
    phaseLabel(controlBeforeKickback.value.x, controlBeforeKickback.value.y),
  );
  const controlPhaseAfterLabel = computed(() =>
    phaseLabel(controlAfterKickback.value.x, controlAfterKickback.value.y),
  );

  const finalStageSnapshot = computed<StageSnapshot>(() => stageSnapshots.value[stageSnapshots.value.length - 1]!);
  const finalDistribution = computed(() => measurement_distribution_for_ensemble(finalStageSnapshot.value.ensemble));

  const baselineReadoutQ0P1 = computed(() => readoutAfterFinalH.value.p1);
  const finalQ0P1 = computed(() => q0OneProbability(finalDistribution.value));
  const finalQ0P0 = computed(() => q0ZeroProbability(finalDistribution.value));

  const measurementEvents = computed(() => {
    const events: Array<{ column: number; row: QubitRow }> = [];
    combinedColumns.value.forEach((column, columnIndex) => {
      column.gates.forEach((gate) => {
        if (gate.gate !== "M") {
          return;
        }
        const row = gate.wires[0];
        if (row === undefined) {
          return;
        }
        events.push({ column: columnIndex, row });
      });
    });
    return events;
  });

  const firstMeasurement = computed(() => measurementEvents.value[0] ?? null);
  const hasEarlyMeasurement = computed(() => {
    const event = firstMeasurement.value;
    if (!event) {
      return false;
    }
    return event.column < combinedColumns.value.length - 1;
  });

  const runSampledBranch = () => {
    sampledBranch.value = phaseKickbackBranchSample(editableColumns.value, kickbackConfig.value);
  };

  const lessonStatus = computed(() => {
    if (hasEarlyMeasurement.value) {
      return "An early measurement collapses branches and can hide kickback before the final q0 readout.";
    }
    const factor = effectiveKickbackFactor.value;
    const prefix = moduleId.value === "controlled-phase-variants" ? "Controlled-phase" : "Kickback";
    if (factor <= -0.9) {
      if (finalQ0P1.value > 0.9) {
        return `${prefix} shows full -1 behavior: q0 phase flips and reads out near q0=1.`;
      }
      return `Full -1 ${prefix.toLowerCase()} happened, but later exploration gates changed the final q0 readout.`;
    }
    if (factor >= 0.9) {
      if (finalQ0P0.value > 0.9) {
        return `${prefix} shows full +1 behavior: no phase flip on q0, so readout stays near q0=0.`;
      }
      return `Full +1 ${prefix.toLowerCase()} appeared at the core step, but later exploration changed the final q0 readout.`;
    }
    return `Intermediate/complex phase: q0 receives partial ${prefix.toLowerCase()}, so final readout is a bias instead of a full flip.`;
  });

  const setModuleId = (next: KickbackModuleId) => {
    if (!phaseKickbackModuleOptions.some((entry) => entry.id === next)) {
      return;
    }
    moduleId.value = next;
  };

  const setTargetPhaseGate = (gate: KickbackPhaseGate) => {
    if (!kickbackPhaseGateOptions.includes(gate)) {
      return;
    }
    targetPhaseGate.value = gate;
  };

  const setControlledPhaseGate = (gate: ControlledPhaseGate) => {
    if (!controlledPhaseGateOptions.includes(gate)) {
      return;
    }
    controlledPhaseGate.value = gate;
  };

  return {
    moduleId,
    setModuleId,
    moduleOptions: phaseKickbackModuleOptions,
    module,
    targetPhaseGate,
    setTargetPhaseGate,
    phaseGateChoices: kickbackPhaseGateOptions,
    controlledPhaseGate,
    setControlledPhaseGate,
    controlledPhaseChoices: controlledPhaseGateOptions,
    columns: combinedColumns,
    lockedCoreColumnCount,
    columnLabels,
    paletteGroups,
    measurementEntries,
    selectedGate,
    selectedStageIndex,
    selectedStageSnapshot,
    stageSnapshots,
    controlBeforeKickback,
    controlAfterKickback,
    targetBeforeKickback,
    targetAfterKickback,
    readoutAfterFinalH,
    controlPhaseBeforeLabel,
    controlPhaseAfterLabel,
    phaseFlipDetected,
    effectiveKickbackFactor,
    sourcePhaseAngleRadians,
    baselineReadoutQ0P1,
    finalQ0P1,
    finalQ0P0,
    finalDistribution,
    firstMeasurement,
    hasEarlyMeasurement,
    lessonStatus,
    sampledBranch,
    editableColumnCount: computed(() => editableColumns.value.length),
    minEditableColumns: MIN_EDITABLE_COLUMNS,
    maxEditableColumns: MAX_EDITABLE_COLUMNS,
    appendEditableColumn,
    removeLastEditableColumn,
    resetEditableColumns,
    setSelectedStage,
    handlePaletteChipClick,
    runSampledBranch,
    ...interactions,
  };
};
