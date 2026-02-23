import { computed, ref, watch } from "vue";
import type {
  BasisProbability,
  CircuitColumn,
  EntanglementLink,
  GateId,
  GateInstance,
  QubitRow,
  StageEntanglementModel,
  StageView,
} from "../../../types";
import * as complex from "../../../complex";
import {
  bloch_pair_from_ensemble,
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
import type { CircuitGridLockPolicy } from "../../circuit/lock-policy";
import type { PaletteEntry, PaletteGroup } from "../../circuit/palette-types";
import { useCircuitGridInteractions } from "../../circuit/useCircuitGridInteractions";
import {
  ENTANGLEMENT_SCENARIOS,
  entanglementScenarioBranchSample,
  entanglementScenarioById,
  type EntanglementScenarioId,
} from "./engine";

type PairMetrics = {
  pairLabel: string;
  coreBell: EntanglementLink["dominantBell"] | null;
  selectedBell: EntanglementLink["dominantBell"] | null;
  finalBell: EntanglementLink["dominantBell"] | null;
  selectedStrength: number;
  finalStrength: number;
  branchStrength: number | null;
};

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

const normalizePair = (left: QubitRow, right: QubitRow): readonly [QubitRow, QubitRow] =>
  left <= right ? [left, right] : [right, left];

const findPairLink = (
  links: ReadonlyArray<EntanglementLink>,
  left: QubitRow,
  right: QubitRow,
): EntanglementLink | null => {
  const [from, to] = normalizePair(left, right);
  return links.find((link) => link.fromRow === from && link.toRow === to) ?? null;
};

const pairParityFromDistribution = (
  distribution: ReadonlyArray<BasisProbability>,
  left: QubitRow,
  right: QubitRow,
): { same: number; opposite: number } => {
  let same = 0;
  let opposite = 0;
  for (const entry of distribution) {
    const a = entry.basis[left];
    const b = entry.basis[right];
    if (a === undefined || b === undefined) {
      continue;
    }
    if (a === b) {
      same += entry.probability;
      continue;
    }
    opposite += entry.probability;
  }
  return { same, opposite };
};

const summarizeEntanglementModel = (
  model: StageEntanglementModel | null | undefined,
): {
  pairwiseCount: number;
  multipartiteCount: number;
  strongestKind: "single" | "pairwise" | "multipartite";
  strongestStrength: number;
} => {
  if (!model || model.components.length === 0) {
    return {
      pairwiseCount: 0,
      multipartiteCount: 0,
      strongestKind: "single",
      strongestStrength: 0,
    };
  }

  const pairwiseCount = model.components.filter((component) => component.kind === "pairwise").length;
  const multipartiteCount = model.components.filter((component) => component.kind === "multipartite").length;
  const strongest = model.components.reduce((best, current) =>
    current.strength > best.strength ? current : best,
  );
  return {
    pairwiseCount,
    multipartiteCount,
    strongestKind: strongest.kind,
    strongestStrength: strongest.strength,
  };
};

export const useEntanglementModel = () => {
  const scenarioId = ref<EntanglementScenarioId>("bell-family");
  const scenario = computed(() => entanglementScenarioById(scenarioId.value));

  const coreColumns = ref<CircuitColumn[]>(scenario.value.createCoreColumns());
  const editableColumns = ref<CircuitColumn[]>(createEditableColumns(scenario.value.initialEditableColumns));
  const selectedGate = ref<GateId | null>("X");
  const selectedStageIndex = ref(coreColumns.value.length + editableColumns.value.length);
  const sampledBranch = ref<ReturnType<typeof entanglementScenarioBranchSample> | null>(null);

  let gateInstanceCounter = 0;
  const nextGateId = (): string => {
    gateInstanceCounter += 1;
    return `ent-g${gateInstanceCounter}`;
  };

  const combinedColumns = computed<CircuitColumn[]>(() => [...coreColumns.value, ...editableColumns.value]);

  const columnLabels = computed<string[]>(() =>
    combinedColumns.value.map((_, index) => scenario.value.columnLabelAt(index)),
  );

  const stageLabels = computed<string[]>(() =>
    Array.from({ length: combinedColumns.value.length + 1 }, (_, index) => scenario.value.stageLabelAt(index)),
  );

  const preparedState = computed(() =>
    tensor_product_qubits(Array.from({ length: scenario.value.qubitCount }, () => ketZero)),
  );

  const resolveGate = (gate: GateId) => resolveOperator(gate, []);

  const ensembleSnapshots = computed(() =>
    simulate_columns_ensemble(
      preparedState.value,
      combinedColumns.value,
      resolveGate,
      scenario.value.qubitCount,
    ),
  );

  const stageViews = computed<StageView[]>(() => {
    const lastIndex = ensembleSnapshots.value.length - 1;
    return ensembleSnapshots.value.map((snapshot, index) => ({
      id: index === 0 ? `ent-${scenarioId.value}-prepared` : `ent-${scenarioId.value}-t${index}`,
      index,
      label: stageLabels.value[index] ?? `t${index}`,
      distribution: measurement_distribution_for_ensemble(snapshot),
      blochPair: bloch_pair_from_ensemble(snapshot),
      isFinal: index === lastIndex,
    }));
  });

  const selectedStage = computed<StageView>(() => stageViews.value[selectedStageIndex.value] ?? stageViews.value[0]!);

  const stageEntanglementLinks = computed<ReadonlyArray<ReadonlyArray<EntanglementLink>>>(() =>
    ensembleSnapshots.value.map((snapshot) => entanglement_links_from_ensemble(snapshot)),
  );

  const stageEntanglementModels = computed<ReadonlyArray<StageEntanglementModel>>(() =>
    stage_entanglement_models_from_snapshots(ensembleSnapshots.value),
  );

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

  const setSelectedStage = (index: number): void => {
    if (index < 0 || index >= stageViews.value.length) {
      return;
    }
    selectedStageIndex.value = index;
  };

  const isValidWire = (row: QubitRow): boolean =>
    Number.isInteger(row) && row >= 0 && row < scenario.value.qubitCount;

  const editableColumnAt = (absoluteColumn: number): CircuitColumn | null => {
    const editableIndex = absoluteColumn - scenario.value.lockedCoreCount;
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
    if (arity === null || arity < 1 || arity > scenario.value.qubitCount) {
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

  const placeGateOnWiresAt = (
    column: number,
    gate: GateId,
    wires: ReadonlyArray<QubitRow>,
  ): boolean => {
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
    qubitCount: computed(() => scenario.value.qubitCount),
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

  const lockPolicy: CircuitGridLockPolicy = {
    isCellLockedAt: (column) => column >= 0 && column < scenario.value.lockedCoreCount,
    lockReasonAt: (column) => (column >= 0 && column < scenario.value.lockedCoreCount ? scenario.value.coreLockReason : null),
  };

  const interactions = useCircuitGridInteractions({
    context,
    lockPolicy,
  });

  const resetScenarioState = () => {
    coreColumns.value = scenario.value.createCoreColumns();
    editableColumns.value = createEditableColumns(scenario.value.initialEditableColumns);
    selectedStageIndex.value = coreColumns.value.length + editableColumns.value.length;
    sampledBranch.value = null;
    interactions.clearPendingPlacement();
  };

  watch(scenarioId, () => {
    resetScenarioState();
  });

  watch(
    combinedColumns,
    () => {
      sampledBranch.value = null;
    },
    { deep: true },
  );

  const availableGates = computed<GateId[]>(() =>
    availableBuiltinGatesForQubitCount(scenario.value.qubitCount).filter((gate) => paletteBuiltinGates.includes(gate)),
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
    if (editableColumns.value.length >= scenario.value.maxEditableColumns) {
      return;
    }
    editableColumns.value = [...editableColumns.value, { gates: [] }];
    selectedStageIndex.value = combinedColumns.value.length;
    interactions.clearPendingPlacement();
  };

  const removeLastEditableColumn = () => {
    if (editableColumns.value.length <= scenario.value.minEditableColumns) {
      return;
    }
    editableColumns.value = editableColumns.value.slice(0, -1);
    selectedStageIndex.value = combinedColumns.value.length;
    interactions.clearPendingPlacement();
  };

  const resetEditableColumns = () => {
    editableColumns.value = createEditableColumns(scenario.value.initialEditableColumns);
    selectedStageIndex.value = combinedColumns.value.length;
    sampledBranch.value = null;
    interactions.clearPendingPlacement();
  };

  const scenarioOptions = ENTANGLEMENT_SCENARIOS.map((entry) => ({
    id: entry.id,
    title: entry.title,
  }));

  const focusPairs = computed(() =>
    scenario.value.focusPairs.map((pair) => normalizePair(pair[0], pair[1])),
  );

  const selectedLinks = computed(() => stageEntanglementLinks.value[selectedStageIndex.value] ?? []);
  const finalLinks = computed(() => stageEntanglementLinks.value[stageEntanglementLinks.value.length - 1] ?? []);
  const coreLinks = computed(() => stageEntanglementLinks.value[scenario.value.lockedCoreCount] ?? []);

  const focusPairMetrics = computed<PairMetrics[]>(() =>
    focusPairs.value.map(([from, to]) => {
      const selectedLink = findPairLink(selectedLinks.value, from, to);
      const finalLink = findPairLink(finalLinks.value, from, to);
      const coreLink = findPairLink(coreLinks.value, from, to);
      const branchLink = sampledBranch.value ? findPairLink(sampledBranch.value.links, from, to) : null;
      return {
        pairLabel: `q${from}-q${to}`,
        coreBell: coreLink?.dominantBell ?? null,
        selectedBell: selectedLink?.dominantBell ?? null,
        finalBell: finalLink?.dominantBell ?? null,
        selectedStrength: selectedLink?.strength ?? 0,
        finalStrength: finalLink?.strength ?? 0,
        branchStrength: branchLink?.strength ?? null,
      };
    }),
  );

  const primaryPair = computed(() => focusPairs.value[0] ?? normalizePair(0, 1));
  const selectedStageLink = computed<EntanglementLink | null>(() =>
    findPairLink(selectedLinks.value, primaryPair.value[0], primaryPair.value[1]),
  );
  const finalStageLink = computed<EntanglementLink | null>(() =>
    findPairLink(finalLinks.value, primaryPair.value[0], primaryPair.value[1]),
  );

  const finalStage = computed<StageView>(() => stageViews.value[stageViews.value.length - 1]!);
  const finalDistribution = computed(() => finalStage.value.distribution);

  const selectedCorrelation = computed(() =>
    pairParityFromDistribution(selectedStage.value.distribution, primaryPair.value[0], primaryPair.value[1]),
  );
  const finalCorrelation = computed(() =>
    pairParityFromDistribution(finalDistribution.value, primaryPair.value[0], primaryPair.value[1]),
  );

  const selectedModelSummary = computed(() =>
    summarizeEntanglementModel(stageEntanglementModels.value[selectedStageIndex.value]),
  );
  const finalModelSummary = computed(() =>
    summarizeEntanglementModel(stageEntanglementModels.value[stageEntanglementModels.value.length - 1]),
  );

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

  const runBranchMeasurement = () => {
    sampledBranch.value = entanglementScenarioBranchSample(scenarioId.value, editableColumns.value);
  };

  const sampledBranchPrimaryLink = computed<EntanglementLink | null>(() => {
    if (!sampledBranch.value) {
      return null;
    }
    return findPairLink(sampledBranch.value.links, primaryPair.value[0], primaryPair.value[1]);
  });

  const sampledBranchCorrelation = computed(() => {
    if (!sampledBranch.value) {
      return null;
    }
    return pairParityFromDistribution(
      sampledBranch.value.distribution,
      primaryPair.value[0],
      primaryPair.value[1],
    );
  });

  const lessonStatus = computed(() => {
    if (scenarioId.value === "ghz-growth") {
      if (finalModelSummary.value.multipartiteCount > 0 && finalModelSummary.value.strongestStrength > 0.9) {
        return "Multipartite GHZ structure is dominant even when pairwise links remain weak.";
      }
      if (hasEarlyMeasurement.value) {
        return "Early measurement reduced GHZ multipartite structure; compare selected vs final summaries.";
      }
      return "Use local gates or early measurement to stress-test multipartite robustness.";
    }

    if (scenarioId.value === "entanglement-swapping") {
      if (!sampledBranch.value) {
        return "Run a branch measurement sample to reveal outcome-conditioned q0-q3 entanglement.";
      }
      const strength = sampledBranchPrimaryLink.value?.strength ?? 0;
      if (strength > 0.9) {
        return "Sampled branch shows strong swapped q0-q3 entanglement.";
      }
      return "Sampled branch has weak swapped link; run again to inspect another measurement branch.";
    }

    const strength = finalStageLink.value?.strength ?? 0;
    if (hasEarlyMeasurement.value && strength < 0.2) {
      return "Early measurement collapsed Bell coherence. Remaining correlation is mostly classical.";
    }
    if (strength > 0.98) {
      return "Bell entanglement remains strong. Local X/Z/H changed Bell class or basis.";
    }
    if (strength > 0.45) {
      return "Entanglement is partially preserved after your edits.";
    }
    return "Entanglement is weak. Reset and rebuild from the starting steps to compare.";
  });

  return {
    scenarioId,
    scenario,
    scenarioOptions,
    columns: combinedColumns,
    columnLabels,
    paletteGroups,
    measurementEntries,
    selectedGate,
    selectedStageIndex,
    selectedStage,
    stageViews,
    focusPairMetrics,
    selectedStageLink,
    finalStageLink,
    finalDistribution,
    selectedCorrelation,
    finalCorrelation,
    selectedModelSummary,
    finalModelSummary,
    firstMeasurement,
    hasEarlyMeasurement,
    lessonStatus,
    sampledBranch,
    sampledBranchPrimaryLink,
    sampledBranchCorrelation,
    runBranchMeasurement,
    editableColumnCount: computed(() => editableColumns.value.length),
    minEditableColumns: computed(() => scenario.value.minEditableColumns),
    maxEditableColumns: computed(() => scenario.value.maxEditableColumns),
    appendEditableColumn,
    removeLastEditableColumn,
    resetEditableColumns,
    setSelectedStage,
    handlePaletteChipClick,
    ...interactions,
  };
};
