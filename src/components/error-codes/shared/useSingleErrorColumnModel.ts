import { computed, type ComputedRef } from "vue";
import type { CircuitColumn, GateId, QubitRow, QubitState } from "../../../types";
import type { LessonStepSpec } from "./lesson-spec";
import { useErrorCodeLessonModel } from "./useErrorCodeLessonModel";

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
  editableRows?: readonly QubitRow[];
  lockReason?: string;
  gateIdPrefix: string;
};

export const useSingleErrorColumnModel = (config: SingleErrorColumnConfig) => {
  const rowSpecs = computed(() =>
    Array.from({ length: config.qubitCount }, (_, row) => ({
      row,
      role: "data" as const,
    })),
  );

  const lessonSteps = computed<readonly LessonStepSpec[]>(() => [
    ...config.prefixColumns.value.map((column, index) => ({
      id: `${config.gateIdPrefix}-prefix-${index + 1}`,
      kind: "primitive-columns" as const,
      executionColumns: [column],
    })),
    {
      id: `${config.gateIdPrefix}-error`,
      kind: "error-injection" as const,
      editableRows:
        config.editableRows ??
        Array.from({ length: config.qubitCount }, (_, row) => row),
    },
    ...config.suffixColumns.value.map((column, index) => ({
      id: `${config.gateIdPrefix}-suffix-${index + 1}`,
      kind: "primitive-columns" as const,
      executionColumns: [column],
    })),
  ]);

  return useErrorCodeLessonModel({
    qubitCount: config.qubitCount,
    rowSpecs,
    allowedErrorGates: config.allowedErrorGates,
    paletteTitle: config.paletteTitle,
    defaultSelectedGate: config.defaultSelectedGate,
    preparedState: config.preparedState,
    lessonSteps,
    columnLabels: config.columnLabels,
    stageLabels: config.stageLabels,
    lockReason: config.lockReason,
    gateIdPrefix: config.gateIdPrefix,
  });
};
