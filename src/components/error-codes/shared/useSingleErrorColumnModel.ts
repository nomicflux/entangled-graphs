import { computed, ref, watch, type ComputedRef } from "vue";
import type {
  CircuitColumn,
  EntanglementLink,
  GateId,
  GateInstance,
  QubitRow,
  QubitState,
  StageEntanglementModel,
  StageView,
} from "../../../types";
import {
  bloch_pair_from_ensemble,
  measurement_distribution_for_ensemble,
  simulate_columns_ensemble,
} from "../../../quantum";
import { gateTouchesRow, removeOverlaps } from "../../../state/gate-instance-utils";
import { isRowLockedAtColumn } from "../../../state/measurement-locks";
import { operatorArityForGate, resolveOperator } from "../../../state/operators";
import type { CircuitGridModelContext } from "../../circuit/model-context";
import type { PaletteEntry, PaletteGroup } from "../../circuit/palette-types";
import { useCircuitGridInteractionCore } from "../../circuit/useCircuitGridInteractionCore";

type SingleErrorColumnConfig = {
  qubitCount: number;
  allowedErrorGates: readonly GateId[];
  paletteTitle?: string;
  defaultSelectedGate?: GateId | null;
  preparedState: ComputedRef<QubitState>;
  prefixColumns: ComputedRef<CircuitColumn[]>;
  suffixColumns: ComputedRef<CircuitColumn[]>;
  columnLabels: ComputedRef<string[]>;
  stageLabels: ComputedRef<string[]>;
  lockReason?: string;
  gateIdPrefix: string;
};

const EMPTY_ENTANGLEMENT_MODEL: StageEntanglementModel = {
  cuts: [],
  components: [],
};

export const useSingleErrorColumnModel = (config: SingleErrorColumnConfig) => {
  const errorColumns = ref<CircuitColumn[]>([{ gates: [] }]);
  const selectedGate = ref<GateId | null>(config.defaultSelectedGate ?? config.allowedErrorGates[0] ?? null);
  const selectedStageIndex = ref(0);

  let gateInstanceCounter = 0;
  const nextGateId = (): string => {
    gateInstanceCounter += 1;
    return `${config.gateIdPrefix}-${gateInstanceCounter}`;
  };

  const errorColumnIndex = computed(() => config.prefixColumns.value.length);
  const columns = computed<CircuitColumn[]>(() => [
    ...config.prefixColumns.value,
    ...errorColumns.value,
    ...config.suffixColumns.value,
  ]);

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
    simulate_columns_ensemble(config.preparedState.value, columns.value, resolveGate, config.qubitCount),
  );

  const stageViews = computed<StageView[]>(() => {
    const lastIndex = ensembleSnapshots.value.length - 1;
    return ensembleSnapshots.value.map((snapshot, index) => ({
      id: index === 0 ? `${config.gateIdPrefix}-prepared` : `${config.gateIdPrefix}-t${index}`,
      index,
      label: config.stageLabels.value[index] ?? `t${index}`,
      distribution: measurement_distribution_for_ensemble(snapshot),
      blochPair: bloch_pair_from_ensemble(snapshot),
      isFinal: index === lastIndex,
    }));
  });

  const selectedStage = computed<StageView>(() => stageViews.value[selectedStageIndex.value] ?? stageViews.value[0]!);

  const stageEntanglementLinks = computed<ReadonlyArray<ReadonlyArray<EntanglementLink>>>(() =>
    Array.from({ length: ensembleSnapshots.value.length }, () => []),
  );

  const stageEntanglementModels = computed<ReadonlyArray<StageEntanglementModel>>(() =>
    Array.from({ length: ensembleSnapshots.value.length }, () => EMPTY_ENTANGLEMENT_MODEL),
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

  watch(
    columns,
    () => {
      selectedStageIndex.value = columns.value.length;
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
    if (column !== errorColumnIndex.value || !isValidWire(row)) {
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
    if (column !== errorColumnIndex.value || !isValidWire(row)) {
      return false;
    }
    if (!config.allowedErrorGates.includes(gate)) {
      return false;
    }
    if (operatorArityForGate(gate, []) !== 1) {
      return false;
    }
    if (isRowLockedAtColumn(columns.value, row, column)) {
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
    columns: computed(() => columns.value),
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
      isCellLockedAt: (column) => column !== errorColumnIndex.value,
      lockReasonAt: (column) =>
        column === errorColumnIndex.value
          ? null
          : config.lockReason ?? "This lesson keeps the encoding and recovery steps fixed. Edit only the error-injection column.",
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
    if (index < 0 || index >= stageViews.value.length) {
      return;
    }
    selectedStageIndex.value = index;
  };

  return {
    columns,
    columnLabels: config.columnLabels,
    stageViews,
    selectedStageIndex,
    selectedStage,
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
