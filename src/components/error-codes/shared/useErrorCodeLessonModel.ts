import { computed, ref, watch, type ComputedRef } from "vue";
import type {
  CircuitColumn,
  EntanglementLink,
  GateId,
  GateInstance,
  QubitRow,
  QubitState,
  StageEntanglementModel,
  StageSnapshot,
} from "../../../types";
import { simulate_columns_ensemble } from "../../../quantum";
import { gateTouchesRow, removeOverlaps } from "../../../state/gate-instance-utils";
import { isRowLockedAtColumn } from "../../../state/measurement-locks";
import { operatorArityForGate, resolveOperator } from "../../../state/operators";
import type { CircuitGridModelContext } from "../../circuit/model-context";
import type { PaletteEntry, PaletteGroup } from "../../circuit/palette-types";
import { useCircuitGridInteractionCore } from "../../circuit/useCircuitGridInteractionCore";
import type { LessonRowSpec, LessonStepSpec, VisibleLessonColumn } from "./lesson-spec";
import { visibleColumnsFromLessonSteps } from "./lesson-spec";

type ErrorCodeLessonConfig = {
  qubitCount: number;
  rowSpecs: ComputedRef<readonly LessonRowSpec[]>;
  allowedErrorGates: readonly GateId[];
  paletteTitle?: string;
  defaultSelectedGate?: GateId | null;
  preparedState: ComputedRef<QubitState>;
  lessonSteps: ComputedRef<readonly LessonStepSpec[]>;
  columnLabels: ComputedRef<readonly string[]>;
  stageLabels: ComputedRef<readonly string[]>;
  lockReason?: string;
  gateIdPrefix: string;
};

const EMPTY_ENTANGLEMENT_MODEL: StageEntanglementModel = {
  cuts: [],
  components: [],
};

const EMPTY_COLUMN: CircuitColumn = { gates: [] };

const editableRowsForColumn = (column: VisibleLessonColumn | undefined): ReadonlySet<QubitRow> =>
  column?.kind === "error" ? new Set(column.editableRows) : new Set<QubitRow>();

export const useErrorCodeLessonModel = (config: ErrorCodeLessonConfig) => {
  const errorColumns = ref<CircuitColumn[]>([{ gates: [] }]);
  const selectedGate = ref<GateId | null>(config.defaultSelectedGate ?? config.allowedErrorGates[0] ?? null);
  const selectedStageIndex = ref(0);

  let gateInstanceCounter = 0;
  const nextGateId = (): string => {
    gateInstanceCounter += 1;
    return `${config.gateIdPrefix}-${gateInstanceCounter}`;
  };

  const visibleColumns = computed<readonly VisibleLessonColumn[]>(() =>
    visibleColumnsFromLessonSteps(config.lessonSteps.value),
  );

  const renderColumns = computed<readonly CircuitColumn[]>(() => {
    const columns: CircuitColumn[] = [];

    for (const step of config.lessonSteps.value) {
      if (step.kind === "primitive-columns") {
        const renderColumn = step.executionColumns[step.executionColumns.length - 1] ?? EMPTY_COLUMN;
        columns.push(renderColumn);
        continue;
      }

      if (step.kind === "error-injection") {
        columns.push(errorColumns.value[0] ?? EMPTY_COLUMN);
        continue;
      }

      const laneGroupCount = Math.max(1, Math.ceil(step.family.checks.length / 3));
      for (let index = 0; index < laneGroupCount; index += 1) {
        columns.push(EMPTY_COLUMN);
      }
    }

    return columns;
  });

  const errorColumnIndex = computed(() => visibleColumns.value.findIndex((column) => column.kind === "error"));
  const errorEditableRows = computed(() => editableRowsForColumn(visibleColumns.value[errorColumnIndex.value]));

  const executionColumns = computed<CircuitColumn[]>(() =>
    config.lessonSteps.value.flatMap((step) => {
      if (step.kind === "error-injection") {
        return errorColumns.value;
      }
      return [...step.executionColumns];
    }),
  );

  const injectedErrors = computed<ReadonlyArray<{ gate: GateId; row: QubitRow }>>(() =>
    [...(errorColumns.value[0]?.gates ?? [])]
      .map((gate) => {
        const row = gate.wires[0];
        if (row === undefined) {
          return null;
        }
        return {
          gate: gate.gate,
          row,
        };
      })
      .filter((entry): entry is { gate: GateId; row: QubitRow } => entry !== null)
      .sort((left, right) => left.row - right.row),
  );

  const injectedError = computed<{ gate: GateId; row: QubitRow } | null>(() => injectedErrors.value[0] ?? null);

  const resolveGate = (gate: GateId) => resolveOperator(gate, []);

  const ensembleSnapshots = computed(() =>
    simulate_columns_ensemble(config.preparedState.value, executionColumns.value, resolveGate, config.qubitCount),
  );

  const stageBoundaries = computed(() => [0, ...visibleColumns.value.map((column) => column.executionRange[1])]);

  const stageSnapshots = computed<StageSnapshot[]>(() => {
    const lastIndex = stageBoundaries.value.length - 1;
    return stageBoundaries.value.map((executionBoundary, visibleStageIndex) => ({
      id:
        visibleStageIndex === 0
          ? `${config.gateIdPrefix}-prepared`
          : `${config.gateIdPrefix}-t${visibleStageIndex}`,
      index: visibleStageIndex,
      label: config.stageLabels.value[visibleStageIndex] ?? `t${visibleStageIndex}`,
      ensemble: ensembleSnapshots.value[executionBoundary] ?? ensembleSnapshots.value[ensembleSnapshots.value.length - 1]!,
      isFinal: visibleStageIndex === lastIndex,
    }));
  });

  const selectedStageSnapshot = computed<StageSnapshot>(() =>
    stageSnapshots.value[selectedStageIndex.value] ?? stageSnapshots.value[0]!,
  );

  const stageEntanglementLinks = computed<ReadonlyArray<ReadonlyArray<EntanglementLink>>>(() =>
    Array.from({ length: stageSnapshots.value.length }, () => []),
  );

  const stageEntanglementModels = computed<ReadonlyArray<StageEntanglementModel>>(() =>
    Array.from({ length: stageSnapshots.value.length }, () => EMPTY_ENTANGLEMENT_MODEL),
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
    visibleColumns,
    (columns) => {
      selectedStageIndex.value = columns.length;
    },
    { deep: true, immediate: true },
  );

  const isValidWire = (row: QubitRow): boolean => Number.isInteger(row) && row >= 0 && row < config.qubitCount;

  const gateInstanceAt = (column: CircuitColumn, row: QubitRow): GateInstance | null =>
    column.gates.find((entry) => gateTouchesRow(entry, row)) ?? null;

  const setSelectedGate = (gate: GateId | null): void => {
    if (gate === null) {
      selectedGate.value = null;
      return;
    }
    if (!config.allowedErrorGates.includes(gate)) {
      return;
    }
    selectedGate.value = gate;
  };

  const clearInjectedError = (): void => {
    errorColumns.value = [{ gates: [] }];
  };

  const clearGateAt = (column: number, row: QubitRow): boolean => {
    if (column !== errorColumnIndex.value || !isValidWire(row) || !errorEditableRows.value.has(row)) {
      return false;
    }
    const current = errorColumns.value[0];
    if (!current) {
      return false;
    }
    current.gates = current.gates.filter((gate) => !gateTouchesRow(gate, row));
    return true;
  };

  const setSingleGateAt = (column: number, row: QubitRow, gate: GateId): boolean => {
    if (column !== errorColumnIndex.value || !isValidWire(row) || !errorEditableRows.value.has(row)) {
      return false;
    }
    if (!config.allowedErrorGates.includes(gate)) {
      return false;
    }
    if (operatorArityForGate(gate, []) !== 1) {
      return false;
    }
    if (isRowLockedAtColumn(renderColumns.value, row, column)) {
      return false;
    }

    const errorColumn = errorColumns.value[0];
    if (!errorColumn) {
      return false;
    }
    removeOverlaps(errorColumn, [row]);
    errorColumn.gates.push({ id: nextGateId(), gate, wires: [row] });
    errorColumn.gates.sort((left, right) => (left.wires[0] ?? 0) - (right.wires[0] ?? 0));
    return true;
  };

  const setInjectedError = (gate: GateId | null, row: QubitRow | null): boolean => {
    if (gate === null || row === null) {
      clearInjectedError();
      return true;
    }
    return setSingleGateAt(errorColumnIndex.value, row, gate);
  };

  const context: CircuitGridModelContext = {
    columns: computed(() => renderColumns.value),
    qubitCount: computed(() => config.qubitCount),
    selectedGate: computed(() => selectedGate.value),
    gateArity: (gate: GateId): number => operatorArityForGate(gate, []) ?? 0,
    gateName: (gate: GateId): string => resolveOperator(gate, [])?.label ?? gate,
    gateLabel: (gate: GateId): string => gate,
    gateInstanceAt,
    setSelectedGate,
    clearGateAt,
    setSingleGateAt,
    placeCnotAt: () => false,
    placeToffoliAt: () => false,
    placeMultiGateAt: () => false,
    stageEntanglementLinks,
    stageEntanglementModels,
  };

  const interactions = useCircuitGridInteractionCore({
    context,
    lockPolicy: {
      isCellLockedAt: (column, row) => column !== errorColumnIndex.value || !errorEditableRows.value.has(row),
      lockReasonAt: (column, row) => {
        if (column !== errorColumnIndex.value) {
          return config.lockReason ?? "Locked.";
        }
        if (!errorEditableRows.value.has(row)) {
          return "Inject errors only on editable data wires.";
        }
        return null;
      },
    },
  });

  const paletteGroups = computed<PaletteGroup[]>(() => [
    {
      arity: 1,
      title: config.paletteTitle ?? "Error Gates",
      entries: config.allowedErrorGates.map((gate) => ({ id: gate, label: gate, isCustom: false })),
    },
  ]);

  const measurementEntries = computed<PaletteEntry[]>(() => []);

  const handlePaletteChipClick = (entry: PaletteEntry): void => {
    const next = selectedGate.value === entry.id ? null : entry.id;
    setSelectedGate(next);
    interactions.clearPendingPlacement();
  };

  const setSelectedStage = (index: number): void => {
    if (index < 0 || index >= stageSnapshots.value.length) {
      return;
    }
    selectedStageIndex.value = index;
  };

  return {
    rowSpecs: config.rowSpecs,
    visibleColumns,
    columns: renderColumns,
    columnLabels: config.columnLabels,
    stageSnapshots,
    selectedStageIndex,
    selectedStageSnapshot,
    selectedGate,
    allowedErrorGates: config.allowedErrorGates,
    paletteGroups,
    measurementEntries,
    errorColumnIndex,
    injectedErrors,
    injectedError,
    clearInjectedError,
    setInjectedError,
    setSelectedStage,
    handlePaletteChipClick,
    ...interactions,
  };
};

