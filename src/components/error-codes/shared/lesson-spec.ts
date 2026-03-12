import type { CircuitColumn, QubitRow } from "../../../types";

export type LessonWireRole = "data" | "syndrome" | "helper";

export type LessonRowSpec = {
  row: QubitRow;
  role: LessonWireRole;
};

export type CheckBasis = "X" | "Z";

export type StabilizerCheckSpec = {
  id: string;
  syndromeRow: QubitRow;
  supportRows: readonly QubitRow[];
};

export type StabilizerCheckFamilySpec = {
  id: string;
  basis: CheckBasis;
  dataRows: readonly QubitRow[];
  checks: readonly StabilizerCheckSpec[];
};

export type LessonStepSpec =
  | {
      id: string;
      kind: "primitive-columns";
      executionColumns: readonly CircuitColumn[];
    }
  | {
      id: string;
      kind: "error-injection";
      editableRows: readonly QubitRow[];
    }
  | {
      id: string;
      kind: "check-family";
      family: StabilizerCheckFamilySpec;
      executionColumns: readonly CircuitColumn[];
    };

export type ParityLaneView = {
  laneIndex: number;
  syndromeRow: QubitRow;
  supportRows: readonly QubitRow[];
};

export type VisibleLessonColumn =
  | {
      id: string;
      kind: "primitive";
      width: "regular";
      executionRange: readonly [start: number, endExclusive: number];
    }
  | {
      id: string;
      kind: "error";
      width: "regular";
      executionRange: readonly [start: number, endExclusive: number];
      editableRows: readonly QubitRow[];
    }
  | {
      id: string;
      kind: "parity-family";
      width: "matrix-3";
      executionRange: readonly [start: number, endExclusive: number];
      basis: CheckBasis;
      lanes: readonly ParityLaneView[];
    };

export const MAX_PARITY_FAMILY_LANES = 3;

const chunkChecks = (
  checks: readonly StabilizerCheckSpec[],
  chunkSize: number,
): ReadonlyArray<readonly StabilizerCheckSpec[]> => {
  const batches: StabilizerCheckSpec[][] = [];
  for (let index = 0; index < checks.length; index += chunkSize) {
    batches.push(checks.slice(index, index + chunkSize));
  }
  return batches;
};

export const lessonStepExecutionLength = (step: LessonStepSpec): number =>
  step.kind === "error-injection" ? 1 : step.executionColumns.length;

export const visibleColumnsFromLessonSteps = (
  steps: readonly LessonStepSpec[],
): readonly VisibleLessonColumn[] => {
  const columns: VisibleLessonColumn[] = [];
  let executionCursor = 0;

  for (const step of steps) {
    const start = executionCursor;
    const end = start + lessonStepExecutionLength(step);
    executionCursor = end;

    if (step.kind === "primitive-columns") {
      columns.push({
        id: step.id,
        kind: "primitive",
        width: "regular",
        executionRange: [start, end],
      });
      continue;
    }

    if (step.kind === "error-injection") {
      columns.push({
        id: step.id,
        kind: "error",
        width: "regular",
        executionRange: [start, end],
        editableRows: [...step.editableRows],
      });
      continue;
    }

    const chunks = chunkChecks(step.family.checks, MAX_PARITY_FAMILY_LANES);
    chunks.forEach((checks, chunkIndex) => {
      columns.push({
        id: chunks.length === 1 ? step.id : `${step.id}-${chunkIndex + 1}`,
        kind: "parity-family",
        width: "matrix-3",
        executionRange: [start, end],
        basis: step.family.basis,
        lanes: checks.map((check, laneIndex) => ({
          laneIndex,
          syndromeRow: check.syndromeRow,
          supportRows: [...check.supportRows],
        })),
      });
    });
  }

  return columns;
};

export const primitiveVisibleColumns = (count: number): readonly VisibleLessonColumn[] =>
  Array.from({ length: count }, (_, index) => ({
    id: `column-${index}`,
    kind: "primitive",
    width: "regular",
    executionRange: [index, index + 1],
  }));

export const dataLessonRowSpecs = (rows: readonly QubitRow[]): readonly LessonRowSpec[] =>
  rows.map((row) => ({
    row,
    role: "data",
  }));
