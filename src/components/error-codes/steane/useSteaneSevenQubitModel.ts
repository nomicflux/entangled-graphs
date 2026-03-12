import { computed, ref, shallowRef } from "vue";
import type { CircuitColumn, GateId, QubitRow } from "../../../types";
import * as complex from "../../../complex";
import { bloch_pair_from_ensemble, tensor_product_qubits } from "../../../quantum";
import {
  closestLogicalPreset,
  logicalPresetById,
  logicalPresetFidelity,
  type LogicalPresetId,
} from "../shared/logical-presets";
import type {
  CheckBasis,
  LessonRowSpec,
  LessonStepSpec,
  StabilizerCheckFamilySpec,
} from "../shared/lesson-spec";
import { useErrorCodeLessonModel } from "../shared/useErrorCodeLessonModel";

const ZERO_QUBIT = {
  a: complex.from_real(1),
  b: complex.from_real(0),
};

const EMPTY_COLUMN: CircuitColumn = { gates: [] };
const DATA_ROWS = [0, 1, 2, 3, 4, 5, 6] as const;
const COLLECTOR_ROWS = [4, 5, 6] as const;

const STEANE_SUPPORTS: readonly (readonly QubitRow[])[] = [
  [0, 2, 4, 6],
  [1, 2, 5, 6],
  [3, 4, 5, 6],
];

const ENCODE_CNOT_PAIRS = [
  [3, 6],
  [3, 5],
  [3, 4],
  [2, 5],
  [2, 4],
  [2, 0],
  [1, 6],
  [1, 4],
  [1, 0],
  [0, 6],
  [0, 5],
] as const;

const DECODE_CNOT_PAIRS = [
  [0, 5],
  [0, 6],
  [1, 0],
  [1, 4],
  [1, 6],
  [2, 0],
  [2, 4],
  [2, 5],
  [3, 4],
  [3, 5],
  [3, 6],
] as const;

const hColumn = (id: string, rows: readonly QubitRow[]): CircuitColumn => ({
  gates: rows.map((row, index) => ({
    id: `${id}-${index + 1}`,
    gate: "H",
    wires: [row],
  })),
});

const cnotColumn = (
  id: string,
  pairs: readonly (readonly [QubitRow, QubitRow])[],
): CircuitColumn => ({
  gates: pairs.map(([control, target], index) => ({
    id: `${id}-${index + 1}`,
    gate: "CNOT",
    wires: [control, target],
  })),
});

const isDataRow = (row: QubitRow): row is (typeof DATA_ROWS)[number] =>
  Number.isInteger(row) && row >= 0 && row <= 6;

const syndromeBitsForRow = (row: QubitRow): string =>
  STEANE_SUPPORTS.map((supportRows) => (supportRows.includes(row) ? "1" : "0")).join("");

const xorSyndromeBits = (left: string, right: string): string =>
  left
    .split("")
    .map((bit, index) => String(Number(bit) ^ Number(right[index] ?? "0")))
    .join("");

const makeCheckFamily = (
  id: string,
  basis: CheckBasis,
): StabilizerCheckFamilySpec => ({
  id,
  basis,
  dataRows: [...DATA_ROWS],
  checks: STEANE_SUPPORTS.map((supportRows, index) => ({
    id: `${id}-${index + 1}`,
    syndromeRow: COLLECTOR_ROWS[index]!,
    supportRows: [...supportRows],
  })),
});

const zCheckFamily = makeCheckFamily("steane-z-check", "Z");
const xCheckFamily = makeCheckFamily("steane-x-check", "X");

type InjectedError = { gate: GateId; row: QubitRow };

const hasXComponent = (gate: GateId): boolean => gate === "X" || gate === "Y";
const hasZComponent = (gate: GateId): boolean => gate === "Z" || gate === "Y";

const rowsWithComponent = (
  errors: readonly InjectedError[],
  includesComponent: (gate: GateId) => boolean,
): ReadonlySet<QubitRow> => {
  const rows = new Set<QubitRow>();
  for (const error of errors) {
    if (isDataRow(error.row) && includesComponent(error.gate)) {
      rows.add(error.row);
    }
  }
  return rows;
};

const syndromeBitsFromErrors = (
  errors: readonly InjectedError[],
  includesComponent: (gate: GateId) => boolean,
): string => {
  let bits = "000";
  for (const error of errors) {
    if (!isDataRow(error.row) || !includesComponent(error.gate)) {
      continue;
    }
    bits = xorSyndromeBits(bits, syndromeBitsForRow(error.row));
  }
  return bits;
};

const firstSetRow = (rows: ReadonlySet<QubitRow>): QubitRow | null => {
  const iterator = rows.values().next();
  return iterator.done ? null : iterator.value;
};

export const useSteaneSevenQubitModel = () => {
  const selectedPreset = ref<LogicalPresetId>("plus");
  const modelRef = shallowRef<ReturnType<typeof useErrorCodeLessonModel> | null>(null);

  const preparedState = computed(() =>
    tensor_product_qubits([
      logicalPresetById(selectedPreset.value).qubit,
      ...Array.from({ length: 8 }, () => ZERO_QUBIT),
    ]),
  );

  const rowSpecs = computed<readonly LessonRowSpec[]>(() =>
    Array.from({ length: 9 }, (_, row) => ({
      row,
      role: row <= 6 ? "data" : "helper",
    })),
  );

  const injectedErrors = computed<readonly InjectedError[]>(() =>
    modelRef.value?.injectedErrors.value ?? [],
  );

  const xErrorRows = computed(() => rowsWithComponent(injectedErrors.value, hasXComponent));
  const zErrorRows = computed(() => rowsWithComponent(injectedErrors.value, hasZComponent));

  const xSyndromeBits = computed(() =>
    syndromeBitsFromErrors(injectedErrors.value, hasXComponent),
  );
  const zSyndromeBits = computed(() =>
    syndromeBitsFromErrors(injectedErrors.value, hasZComponent),
  );

  const correctionGate = computed<{ gate: GateId; row: QubitRow } | null>(() => {
    const xRows = xErrorRows.value;
    const zRows = zErrorRows.value;
    const xRow = firstSetRow(xRows);
    const zRow = firstSetRow(zRows);

    if (xRows.size === 1 && zRows.size === 0 && xRow !== null) {
      return { gate: "X", row: xRow };
    }
    if (xRows.size === 0 && zRows.size === 1 && zRow !== null) {
      return { gate: "Z", row: zRow };
    }
    if (xRows.size === 1 && zRows.size === 1 && xRow !== null && zRow !== null && xRow === zRow) {
      return { gate: "Y", row: xRow };
    }
    return null;
  });

  const diagnosisSummary = computed(() => {
    const correction = correctionGate.value;
    if (correction) {
      return `${correction.gate} @ q${correction.row}`;
    }
    if (xErrorRows.value.size === 0 && zErrorRows.value.size === 0) {
      return "—";
    }
    return "mixed";
  });

  const correctionColumn = computed<CircuitColumn>(() => {
    const correction = correctionGate.value;
    if (!correction) {
      return EMPTY_COLUMN;
    }
    return {
      gates: [
        {
          id: `steane-correct-${correction.gate.toLowerCase()}-${correction.row}`,
          gate: correction.gate,
          wires: [correction.row],
        },
      ],
    };
  });

  const lessonSteps = computed<readonly LessonStepSpec[]>(() => [
    {
      id: "steane-encode",
      kind: "primitive-columns",
      executionColumns: [
        hColumn("steane-encode-h", [1, 2, 3]),
        cnotColumn("steane-encode-cnot", ENCODE_CNOT_PAIRS),
        EMPTY_COLUMN,
      ],
    },
    {
      id: "steane-error",
      kind: "error-injection",
      editableRows: [...DATA_ROWS],
    },
    {
      id: "steane-z-checks",
      kind: "check-family",
      family: zCheckFamily,
      executionColumns: [EMPTY_COLUMN],
    },
    {
      id: "steane-x-checks",
      kind: "check-family",
      family: xCheckFamily,
      executionColumns: [EMPTY_COLUMN],
    },
    {
      id: "steane-correct",
      kind: "primitive-columns",
      executionColumns: [correctionColumn.value],
    },
    {
      id: "steane-decode",
      kind: "primitive-columns",
      executionColumns: [
        cnotColumn("steane-decode-cnot", DECODE_CNOT_PAIRS),
        hColumn("steane-decode-h", [1, 2, 3]),
      ],
    },
  ]);

  const columnLabels = computed(() => [
    "Encode the logical state",
    "Inject errors",
    "Z-type Hamming checks",
    "X-type Hamming checks",
    "Apply the diagnosed correction",
    "Decode back to q0",
  ]);

  const stageLabels = computed(() => [
    `Start with ${logicalPresetById(selectedPreset.value).label}|00000000>`,
    "After encoding the logical state",
    "After the injected-error stage",
    "After Z-type Hamming checks",
    "After X-type Hamming checks",
    "After the correction step",
    "After decoding back to q0",
  ]);

  const circuit = useErrorCodeLessonModel({
    qubitCount: 9,
    rowSpecs,
    allowedErrorGates: ["X", "Y", "Z"],
    paletteTitle: "Error Gates",
    defaultSelectedGate: "X",
    preparedState,
    lessonSteps,
    columnLabels,
    stageLabels,
    gateIdPrefix: "steane-code",
  });

  modelRef.value = circuit;

  const finalStageSnapshot = computed(
    () => circuit.stageSnapshots.value[circuit.stageSnapshots.value.length - 1]!,
  );
  const recoveredLogical = computed(
    () => bloch_pair_from_ensemble(finalStageSnapshot.value.ensemble)[0] ?? null,
  );
  const recoveryFidelity = computed(() =>
    logicalPresetFidelity(selectedPreset.value, recoveredLogical.value),
  );

  const selectedPresetLabel = computed(
    () => logicalPresetById(selectedPreset.value).label,
  );
  const outputPresetLabel = computed(
    () => closestLogicalPreset(recoveredLogical.value)?.label ?? "—",
  );

  return {
    selectedPreset,
    selectedPresetLabel,
    outputPresetLabel,
    recoveryFidelity,
    diagnosisSummary,
    xSyndromeBits,
    zSyndromeBits,
    ...circuit,
  };
};
