import { computed, ref } from "vue";
import { formatClassicalBits, readClassicalRegister } from "../../../classical";
import type {
  ClassicalPredicate,
  CircuitColumn,
  FixedPanelClassicalLayout,
  GateId,
  QubitRow,
} from "../../../types";
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
const SYNDROME_ROWS = [7, 8, 9] as const;
const Z_SYNDROME_REGISTER = { id: "z_syndrome", label: "Z-check bits", size: 3 } as const;
const X_SYNDROME_REGISTER = { id: "x_syndrome", label: "X-check bits", size: 3 } as const;

const STEANE_SUPPORTS: readonly (readonly QubitRow[])[] = [
  [0, 2, 4, 6],
  [1, 2, 5, 6],
  [3, 4, 5, 6],
] as const;

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

const syndromeBitsForRow = (row: QubitRow): string =>
  STEANE_SUPPORTS.map((supportRows) => (supportRows.includes(row) ? "1" : "0")).join("");

const bitsArray = (bits: string): ReadonlyArray<0 | 1> =>
  bits.split("").map((bit) => (bit === "1" ? 1 : 0)) as ReadonlyArray<0 | 1>;

const hColumn = (id: string, rows: readonly QubitRow[]): CircuitColumn => ({
  gates: rows.map((row, index) => ({
    id: `${id}-${index + 1}`,
    gate: "H",
    wires: [row],
  })),
});

const cnotColumn = (id: string, pairs: readonly (readonly [QubitRow, QubitRow])[]): CircuitColumn => ({
  gates: pairs.map(([control, target], index) => ({
    id: `${id}-${index + 1}`,
    gate: "CNOT",
    wires: [control, target],
  })),
});

const measureColumn = (id: string, registerId: string, rows: readonly QubitRow[]): CircuitColumn => ({
  gates: rows.map((row, index) => ({
    id: `${id}-${index + 1}`,
    gate: "M",
    wires: [row],
    writesClassicalBit: { register: registerId, index },
  })),
});

const resetColumn = (id: string, rows: readonly QubitRow[]): CircuitColumn => ({
  gates: rows.map((row, index) => ({
    id: `${id}-${index + 1}`,
    gate: "RESET",
    wires: [row],
  })),
});

const parityExtractionColumns = (
  id: string,
  supports: readonly (readonly QubitRow[])[],
  ancillaRows: readonly QubitRow[],
  direction: "data-to-ancilla" | "ancilla-to-data",
): CircuitColumn[] =>
  supports.flatMap((supportRows, checkIndex) =>
    supportRows.map((supportRow, supportIndex) => ({
      gates: [
        {
          id: `${id}-${checkIndex + 1}-${supportIndex + 1}`,
          gate: "CNOT",
          wires:
            direction === "data-to-ancilla"
              ? [supportRow, ancillaRows[checkIndex]!]
              : [ancillaRows[checkIndex]!, supportRow],
        },
      ],
    })),
  );

const makeCheckFamily = (id: string, basis: CheckBasis): StabilizerCheckFamilySpec => ({
  id,
  basis,
  dataRows: [...DATA_ROWS],
  checks: STEANE_SUPPORTS.map((supportRows, index) => ({
    id: `${id}-${index + 1}`,
    syndromeRow: SYNDROME_ROWS[index]!,
    supportRows: [...supportRows],
  })),
});

const zCheckFamily = makeCheckFamily("steane-z-check", "Z");
const xCheckFamily = makeCheckFamily("steane-x-check", "X");

const registerEquals = (register: string, bits: string): ClassicalPredicate => ({
  kind: "register-equals",
  register,
  value: bitsArray(bits),
});

const allOf = (...predicates: ClassicalPredicate[]): ClassicalPredicate => ({
  kind: "all",
  predicates,
});

const syndromeBitsFromSnapshot = (
  states: ReadonlyArray<{ weight: number; state: ReadonlyArray<{ bit: { register: string; index: number }; value: 0 | 1 }> }> | undefined,
  register: typeof Z_SYNDROME_REGISTER | typeof X_SYNDROME_REGISTER,
): string => {
  const dominant = [...(states ?? [])].sort((left, right) => right.weight - left.weight)[0];
  return formatClassicalBits(readClassicalRegister(dominant?.state, register));
};

const correctionLabel = (xBits: string, zBits: string): string => {
  const xRow = DATA_ROWS.find((row) => syndromeBitsForRow(row) === zBits) ?? null;
  const zRow = DATA_ROWS.find((row) => syndromeBitsForRow(row) === xBits) ?? null;

  if (zBits !== "000" && xBits === "000" && xRow !== null) {
    return `X @ q${xRow}`;
  }
  if (xBits !== "000" && zBits === "000" && zRow !== null) {
    return `Z @ q${zRow}`;
  }
  if (xBits !== "000" && zBits !== "000" && xBits === zBits && xRow !== null) {
    return `Y @ q${xRow}`;
  }
  if (xBits === "000" && zBits === "000") {
    return "—";
  }
  return "mixed";
};

const correctionRow = (diagnosis: string): QubitRow | null => {
  const match = /q(\d+)/.exec(diagnosis);
  return match ? Number.parseInt(match[1] ?? "", 10) : null;
};

const correctionExecutionColumns = (): CircuitColumn[] => {
  const gates = DATA_ROWS.flatMap((row) => {
    const bits = syndromeBitsForRow(row);
    return [
      {
        id: `steane-x-correct-${row}`,
        gate: "X" as const,
        wires: [row],
        condition: allOf(registerEquals(Z_SYNDROME_REGISTER.id, bits), registerEquals(X_SYNDROME_REGISTER.id, "000")),
      },
      {
        id: `steane-z-correct-${row}`,
        gate: "Z" as const,
        wires: [row],
        condition: allOf(registerEquals(X_SYNDROME_REGISTER.id, bits), registerEquals(Z_SYNDROME_REGISTER.id, "000")),
      },
      {
        id: `steane-y-correct-${row}`,
        gate: "Y" as const,
        wires: [row],
        condition: allOf(registerEquals(X_SYNDROME_REGISTER.id, bits), registerEquals(Z_SYNDROME_REGISTER.id, bits)),
      },
    ];
  });

  return [
    ...gates.map((gate) => ({ gates: [gate] })),
    EMPTY_COLUMN,
  ];
};

export const useSteaneSevenQubitModel = () => {
  const selectedPreset = ref<LogicalPresetId>("plus");

  const preparedState = computed(() =>
    tensor_product_qubits([
      logicalPresetById(selectedPreset.value).qubit,
      ...Array.from({ length: 9 }, () => ZERO_QUBIT),
    ]),
  );

  const rowSpecs = computed<readonly LessonRowSpec[]>(() =>
    Array.from({ length: 10 }, (_, row) => ({
      row,
      role: row <= 6 ? "data" : "syndrome",
    })),
  );

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
      executionColumns: [
        ...parityExtractionColumns("steane-z-check", STEANE_SUPPORTS, SYNDROME_ROWS, "data-to-ancilla"),
        measureColumn("steane-z-measure", Z_SYNDROME_REGISTER.id, SYNDROME_ROWS),
        resetColumn("steane-z-reset", SYNDROME_ROWS),
      ],
    },
    {
      id: "steane-x-checks",
      kind: "check-family",
      family: xCheckFamily,
      executionColumns: [
        hColumn("steane-x-prep", SYNDROME_ROWS),
        ...parityExtractionColumns("steane-x-check", STEANE_SUPPORTS, SYNDROME_ROWS, "ancilla-to-data"),
        hColumn("steane-x-unprep", SYNDROME_ROWS),
        measureColumn("steane-x-measure", X_SYNDROME_REGISTER.id, SYNDROME_ROWS),
        resetColumn("steane-x-reset", SYNDROME_ROWS),
      ],
    },
    {
      id: "steane-correct",
      kind: "primitive-columns",
      executionColumns: correctionExecutionColumns(),
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
    `Start with ${logicalPresetById(selectedPreset.value).label}|000000000>`,
    "After encoding the logical state",
    "After the injected-error stage",
    "After Z-type Hamming checks",
    "After X-type Hamming checks",
    "After the correction step",
    "After decoding back to q0",
  ]);

  let circuit!: ReturnType<typeof useErrorCodeLessonModel>;

  const classicalLayout = computed<FixedPanelClassicalLayout>(() => {
    const lastStage = circuit?.stageSnapshots.value[circuit.stageSnapshots.value.length - 1];
    const zBits = syndromeBitsFromSnapshot(lastStage?.classicalStates, Z_SYNDROME_REGISTER);
    const xBits = syndromeBitsFromSnapshot(lastStage?.classicalStates, X_SYNDROME_REGISTER);
    const diagnosis = correctionLabel(xBits, zBits);
    return {
      lanes: [
        { id: "z-syndrome", label: "Z syndrome" },
        { id: "x-syndrome", label: "X syndrome" },
      ],
      registers: [
        {
          id: "steane-register-z",
          label: "Z",
          lane: "z-syndrome",
          anchorColumnId: "steane-z-checks",
          valueText: zBits,
          kind: "bundle",
        },
        {
          id: "steane-register-x",
          label: "X",
          lane: "x-syndrome",
          anchorColumnId: "steane-x-checks",
          valueText: xBits,
          kind: "bundle",
        },
      ],
      routes: [
        {
          id: "steane-route-z",
          from: { columnId: "steane-z-checks", row: 7 },
          to: { columnId: "steane-correct", row: 7 },
          lane: "z-syndrome",
          kind: "bundle",
        },
        {
          id: "steane-route-x",
          from: { columnId: "steane-x-checks", row: 9 },
          to: { columnId: "steane-correct", row: 9 },
          lane: "x-syndrome",
          kind: "bundle",
        },
      ],
      conditionBadges:
        diagnosis === "—" || correctionRow(diagnosis) === null
          ? []
          : [
              {
                id: "steane-badge-correction",
                columnId: "steane-correct",
                row: correctionRow(diagnosis)!,
                text: diagnosis,
                kind: "bundle",
              },
            ],
    };
  });

  circuit = useErrorCodeLessonModel({
    qubitCount: 10,
    rowSpecs,
    allowedErrorGates: ["X", "Y", "Z"],
    paletteTitle: "Error Gates",
    defaultSelectedGate: "X",
    preparedState,
    lessonSteps,
    columnLabels,
    stageLabels,
    classicalLayout,
    gateIdPrefix: "steane-code",
  });

  const finalStageSnapshot = computed(() => circuit.stageSnapshots.value[circuit.stageSnapshots.value.length - 1]!);
  const recoveredLogical = computed(() => bloch_pair_from_ensemble(finalStageSnapshot.value.ensemble)[0] ?? null);
  const recoveryFidelity = computed(() => logicalPresetFidelity(selectedPreset.value, recoveredLogical.value));

  const xSyndromeBits = computed(() => syndromeBitsFromSnapshot(finalStageSnapshot.value.classicalStates, X_SYNDROME_REGISTER));
  const zSyndromeBits = computed(() => syndromeBitsFromSnapshot(finalStageSnapshot.value.classicalStates, Z_SYNDROME_REGISTER));
  const diagnosisSummary = computed(() => correctionLabel(xSyndromeBits.value, zSyndromeBits.value));

  const selectedPresetLabel = computed(() => logicalPresetById(selectedPreset.value).label);
  const outputPresetLabel = computed(() => closestLogicalPreset(recoveredLogical.value)?.label ?? "—");

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
