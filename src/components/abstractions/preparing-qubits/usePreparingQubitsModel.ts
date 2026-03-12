import { computed, ref, watch } from "vue";
import { classicalStatesFromEnsemble } from "../../../classical";
import type {
  CircuitColumn,
  EntanglementLink,
  GateId,
  GateInstance,
  QubitRow,
  StageSnapshot,
  StageEntanglementModel,
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
import { resolveOperator } from "../../../state/operators";
import type { CircuitGridModelContext } from "../../circuit/model-context";
import type { PaletteEntry, PaletteGroup } from "../../circuit/palette-types";
import { noLockedCellsPolicy } from "../../circuit/lock-policy";
import { useCircuitGridInteractionCore } from "../../circuit/useCircuitGridInteractionCore";
import { dataLessonRowSpecs, primitiveVisibleColumns } from "../../error-codes/shared/lesson-spec";
import { PREPARATION_TARGETS, preparationFidelity } from "./engine";
import type { PreparationTargetId } from "./model-types";

const PREPARING_QUBIT_COUNT = 2;
const FIXED_EDITABLE_COLUMNS = 2;
const TARGET_FIDELITY_THRESHOLD = 0.98;
const PREPARATION_TARGETS_STORAGE_KEY = "entangled.abstractions.preparing.targets.v1";

const ALLOWED_SINGLE_GATES: readonly GateId[] = ["X", "H"];

const ketZero = {
  a: complex.from_real(1),
  b: complex.from_real(0),
};

const rows = [0, 1] as const;

const isPreparationTarget = (value: string | null): value is PreparationTargetId =>
  value === "one" || value === "plus" || value === "minus";

const defaultTargetsByRow = (): PreparationTargetId[] => Array.from({ length: PREPARING_QUBIT_COUNT }, () => "one");

const loadTargetsFromStorage = (): PreparationTargetId[] => {
  const raw = window.localStorage.getItem(PREPARATION_TARGETS_STORAGE_KEY);
  if (!raw) {
    return defaultTargetsByRow();
  }

  try {
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed) || parsed.length !== PREPARING_QUBIT_COUNT) {
      return defaultTargetsByRow();
    }
    if (!parsed.every((entry) => isPreparationTarget(entry))) {
      return defaultTargetsByRow();
    }
    return parsed;
  } catch {
    return defaultTargetsByRow();
  }
};

const isAllowedSingleGate = (gate: GateId): gate is "X" | "H" =>
  gate === "X" || gate === "H";

const emptyColumn = (): CircuitColumn => ({ gates: [] });

const createEditableColumns = (count: number): CircuitColumn[] =>
  Array.from({ length: count }, () => emptyColumn());

export const usePreparingQubitsModel = () => {
  const editableColumns = ref<CircuitColumn[]>(createEditableColumns(FIXED_EDITABLE_COLUMNS));
  const selectedGate = ref<GateId | null>("X");
  const selectedStageIndex = ref(editableColumns.value.length);
  const targetIds = ref<PreparationTargetId[]>(loadTargetsFromStorage());

  let gateInstanceCounter = 0;
  const nextGateId = (): string => {
    gateInstanceCounter += 1;
    return `prep-g${gateInstanceCounter}`;
  };

  const combinedColumns = computed<CircuitColumn[]>(() => [...editableColumns.value]);

  const stageLabels = computed<string[]>(() => [
    "Prepared |00>",
    ...combinedColumns.value.map((_, index) => `Explore t${index + 1}`),
  ]);

  const columnLabels = computed<string[]>(() =>
    combinedColumns.value.map((_, index) => `Prep t${index + 1}`),
  );
  const visibleColumns = computed(() => primitiveVisibleColumns(combinedColumns.value.length));
  const rowSpecs = computed(() => dataLessonRowSpecs(rows));

  const preparedState = computed(() => tensor_product_qubits(Array.from({ length: PREPARING_QUBIT_COUNT }, () => ketZero)));

  const resolveGate = (gate: GateId) => resolveOperator(gate, []);

  const ensembleSnapshots = computed(() =>
    simulate_columns_ensemble(preparedState.value, combinedColumns.value, resolveGate, PREPARING_QUBIT_COUNT),
  );

  const stageSnapshots = computed<StageSnapshot[]>(() => {
    const lastIndex = ensembleSnapshots.value.length - 1;
    return ensembleSnapshots.value.map((snapshot, index) => ({
      id: index === 0 ? "prep-prepared" : `prep-t${index}`,
      index,
      label: stageLabels.value[index] ?? `t${index}`,
      ensemble: snapshot,
      classicalStates: classicalStatesFromEnsemble(snapshot),
      isFinal: index === lastIndex,
    }));
  });

  const selectedStageSnapshot = computed<StageSnapshot>(() => stageSnapshots.value[selectedStageIndex.value] ?? stageSnapshots.value[0]!);

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
    targetIds,
    (next) => {
      window.localStorage.setItem(PREPARATION_TARGETS_STORAGE_KEY, JSON.stringify(next));
    },
    { deep: true },
  );

  const setSelectedStage = (index: number) => {
    if (index < 0 || index >= stageSnapshots.value.length) {
      return;
    }
    selectedStageIndex.value = index;
  };

  const setTargetForRow = (row: QubitRow, target: PreparationTargetId): void => {
    if (!isValidWire(row) || !isPreparationTarget(target)) {
      return;
    }
    const next = [...targetIds.value];
    next[row] = target;
    targetIds.value = next;
  };

  const editableColumnAt = (column: number): CircuitColumn | null => {
    return editableColumns.value[column] ?? null;
  };

  const isValidWire = (row: QubitRow): boolean => Number.isInteger(row) && row >= 0 && row < PREPARING_QUBIT_COUNT;

  const enforceMeasurementRules = () => {
    enforceMeasurementLockRulesForColumns(combinedColumns.value as Array<{ gates: GateInstance[] }>);
  };

  const gateInstanceAt = (column: CircuitColumn, row: QubitRow): GateInstance | null =>
    column.gates.find((entry) => gateTouchesRow(entry, row)) ?? null;

  const setSelectedGate = (gate: GateId | null): void => {
    if (gate === null) {
      selectedGate.value = null;
      return;
    }
    if (!isAllowedSingleGate(gate)) {
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
    if (!isAllowedSingleGate(gate)) {
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

  const placeCnotAt = (_column: number, _control: QubitRow, _target: QubitRow): boolean => false;
  const placeToffoliAt = (
    _column: number,
    _controlA: QubitRow,
    _controlB: QubitRow,
    _target: QubitRow,
  ): boolean => false;
  const placeMultiGateAt = (_column: number, _wires: ReadonlyArray<QubitRow>, _gate: GateId): boolean => false;

  const context: CircuitGridModelContext = {
    columns: computed(() => combinedColumns.value),
    qubitCount: computed(() => PREPARING_QUBIT_COUNT),
    selectedGate: computed(() => selectedGate.value),
    gateArity: (gate: GateId): number => (isAllowedSingleGate(gate) ? 1 : 0),
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

  const lockPolicy = noLockedCellsPolicy();

  const interactions = useCircuitGridInteractionCore({
    context,
    lockPolicy,
  });

  const paletteGroups = computed<PaletteGroup[]>(() => [
    {
      arity: 1,
      title: "Prep Gates",
      entries: ALLOWED_SINGLE_GATES.map((gate) => ({ id: gate, label: gate, isCustom: false })),
    },
  ]);

  const measurementEntries = computed<PaletteEntry[]>(() => []);

  const handlePaletteChipClick = (entry: PaletteEntry) => {
    const next = selectedGate.value === entry.id ? null : entry.id;
    setSelectedGate(next);
    interactions.clearPendingPlacement();
  };

  const resetEditableColumns = () => {
    editableColumns.value = createEditableColumns(FIXED_EDITABLE_COLUMNS);
    selectedStageIndex.value = editableColumns.value.length;
    interactions.clearPendingPlacement();
  };
  const targetOptions = PREPARATION_TARGETS;
  const targetById = (id: PreparationTargetId) => PREPARATION_TARGETS.find((entry) => entry.id === id) ?? PREPARATION_TARGETS[0]!;
  const selectedTargetsByRow = computed(() => rows.map((row) => targetById(targetIds.value[row] ?? "one")));
  const taskSummary = computed(() =>
    rows.map((row) => `q${row} -> ${selectedTargetsByRow.value[row]!.label}`).join(" | "),
  );

  const finalStageSnapshot = computed<StageSnapshot>(() => stageSnapshots.value[stageSnapshots.value.length - 1]!);
  const finalDistribution = computed(() => measurement_distribution_for_ensemble(finalStageSnapshot.value.ensemble));
  const finalBlochPair = computed(() => bloch_pair_from_ensemble(finalStageSnapshot.value.ensemble));

  const rowReadouts = computed(() =>
    rows.map((row) => {
      const bloch = finalBlochPair.value[row];
      const targetIdForRow = targetIds.value[row] ?? "one";
      const target = targetById(targetIdForRow);
      const fidelity = bloch ? preparationFidelity(bloch, targetIdForRow) : 0;
      return {
        row,
        targetLabel: target.label,
        p0: bloch?.p0 ?? 0,
        p1: bloch?.p1 ?? 0,
        fidelity,
        reached: fidelity >= TARGET_FIDELITY_THRESHOLD,
      };
    }),
  );

  const allRowsReady = computed(() => rowReadouts.value.every((entry) => entry.reached));

  return {
    columns: combinedColumns,
    visibleColumns,
    rowSpecs,
    columnLabels,
    paletteGroups,
    measurementEntries,
    selectedGate,
    selectedStageIndex,
    selectedStageSnapshot,
    stageSnapshots,
    targetIds,
    targetOptions,
    selectedTargetsByRow,
    taskSummary,
    rowReadouts,
    allRowsReady,
    finalDistribution,
    fixedColumnCount: FIXED_EDITABLE_COLUMNS,
    resetEditableColumns,
    setTargetForRow,
    setSelectedStage,
    handlePaletteChipClick,
    ...interactions,
  };
};
