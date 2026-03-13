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
import type { LessonRowSpec, LessonStepSpec } from "../shared/lesson-spec";
import { useErrorCodeLessonModel } from "../shared/useErrorCodeLessonModel";

const ZERO_QUBIT = {
  a: complex.from_real(1),
  b: complex.from_real(0),
};

const EMPTY_COLUMN: CircuitColumn = { gates: [] };
const SYNDROME_ROWS = [9, 10] as const;

const BLOCKS = [
  { label: "Block A", register: "shor_block_a", start: 0, leader: 0, ancillaA: 1, ancillaB: 2 },
  { label: "Block B", register: "shor_block_b", start: 3, leader: 3, ancillaA: 4, ancillaB: 5 },
  { label: "Block C", register: "shor_block_c", start: 6, leader: 6, ancillaA: 7, ancillaB: 8 },
] as const;

const PHASE_REGISTER = { id: "shor_phase", label: "Phase bits", size: 2 } as const;

const bitsArray = (bits: string): ReadonlyArray<0 | 1> =>
  bits.split("").map((bit) => (bit === "1" ? 1 : 0)) as ReadonlyArray<0 | 1>;

const registerEquals = (register: string, bits: string): ClassicalPredicate => ({
  kind: "register-equals",
  register,
  value: bitsArray(bits),
});

const outerCopyColumn = (id: string, targets: readonly number[]): CircuitColumn => ({
  gates: targets.map((target, index) => ({ id: `${id}-${index}`, gate: "CNOT", wires: [0, target] })),
});

const hOnLeadersColumn = (id: string): CircuitColumn => ({
  gates: BLOCKS.map((block, index) => ({ id: `${id}-${index}`, gate: "H", wires: [block.leader] })),
});

const blockCopyColumn = (id: string, key: "ancillaA" | "ancillaB"): CircuitColumn => ({
  gates: BLOCKS.map((block, index) => ({
    id: `${id}-${index}`,
    gate: "CNOT",
    wires: [block.leader, block[key]],
  })),
});

const resetColumn = (id: string, rows: readonly QubitRow[]): CircuitColumn => ({
  gates: rows.map((row, index) => ({ id: `${id}-${index}`, gate: "RESET", wires: [row] })),
});

const withinBlockCheckColumns = (id: string, key: "ancillaA" | "ancillaB", bitIndex: 0 | 1, helperRow: QubitRow): CircuitColumn[] =>
  BLOCKS.flatMap((block, blockIndex) => [
    {
      gates: [{ id: `${id}-${blockIndex}-c1`, gate: "CNOT", wires: [block.leader, helperRow] }],
    },
    {
      gates: [{ id: `${id}-${blockIndex}-c2`, gate: "CNOT", wires: [block[key], helperRow] }],
    },
    {
      gates: [
        {
          id: `${id}-${blockIndex}-m`,
          gate: "M",
          wires: [helperRow],
          writesClassicalBit: { register: block.register, index: bitIndex },
        },
      ],
    },
    {
      gates: [{ id: `${id}-${blockIndex}-r`, gate: "RESET", wires: [helperRow] }],
    },
  ]);

const withinBlockCorrectionColumns = (): CircuitColumn[] => {
  const gates = BLOCKS.flatMap((block) => [
    {
      id: `${block.register}-x-leader`,
      gate: "X" as const,
      wires: [block.leader],
      condition: registerEquals(block.register, "11"),
    },
    {
      id: `${block.register}-x-a`,
      gate: "X" as const,
      wires: [block.ancillaA],
      condition: registerEquals(block.register, "10"),
    },
    {
      id: `${block.register}-x-b`,
      gate: "X" as const,
      wires: [block.ancillaB],
      condition: registerEquals(block.register, "01"),
    },
  ]);

  return [
    ...gates.map((gate) => ({ gates: [gate] })),
    blockCopyColumn("shor-inner-decode-a", "ancillaA"),
    blockCopyColumn("shor-inner-decode-b", "ancillaB"),
    EMPTY_COLUMN,
  ];
};

const phaseCheckColumns = (
  id: string,
  helperRow: QubitRow,
  leftLeader: QubitRow,
  rightLeader: QubitRow,
  bitIndex: 0 | 1,
): CircuitColumn[] => [
  {
    gates: [{ id: `${id}-c1`, gate: "CNOT", wires: [leftLeader, helperRow] }],
  },
  {
    gates: [{ id: `${id}-c2`, gate: "CNOT", wires: [rightLeader, helperRow] }],
  },
  {
    gates: [
      {
        id: `${id}-m`,
        gate: "M",
        wires: [helperRow],
        writesClassicalBit: { register: PHASE_REGISTER.id, index: bitIndex },
      },
    ],
  },
  {
    gates: [{ id: `${id}-r`, gate: "RESET", wires: [helperRow] }],
  },
];

const phaseCorrectionColumns = (): CircuitColumn[] => {
  const gates = [
    {
      id: "shor-phase-x-a",
      gate: "X" as const,
      wires: [BLOCKS[0].leader],
      condition: registerEquals(PHASE_REGISTER.id, "11"),
    },
    {
      id: "shor-phase-x-b",
      gate: "X" as const,
      wires: [BLOCKS[1].leader],
      condition: registerEquals(PHASE_REGISTER.id, "10"),
    },
    {
      id: "shor-phase-x-c",
      gate: "X" as const,
      wires: [BLOCKS[2].leader],
      condition: registerEquals(PHASE_REGISTER.id, "01"),
    },
  ];

  return [
    ...gates.map((gate) => ({ gates: [gate] })),
    {
      gates: [{ id: "shor-phase-decode-0", gate: "CNOT", wires: [0, 3] }],
    },
    {
      gates: [{ id: "shor-phase-decode-1", gate: "CNOT", wires: [0, 6] }],
    },
    EMPTY_COLUMN,
  ];
};

const dominantRegisterBits = (
  states: ReadonlyArray<{ weight: number; state: ReadonlyArray<{ bit: { register: string; index: number }; value: 0 | 1 }> }> | undefined,
  register: { id: string; size: number },
): string => {
  const dominant = [...(states ?? [])].sort((left, right) => right.weight - left.weight)[0];
  return formatClassicalBits(readClassicalRegister(dominant?.state, register));
};

const wireInBlockFromBits = (bits: string): number | null => {
  if (bits === "11") {
    return 0;
  }
  if (bits === "10") {
    return 1;
  }
  if (bits === "01") {
    return 2;
  }
  return null;
};

const phaseBlockFromBits = (bits: string): number | null => {
  if (bits === "11") {
    return 0;
  }
  if (bits === "10") {
    return 1;
  }
  if (bits === "01") {
    return 2;
  }
  return null;
};

const blockWireLabel = (blockIndex: number, wireInBlock: number | null): string | null => {
  if (wireInBlock === null) {
    return null;
  }
  return `q${BLOCKS[blockIndex]!.start + wireInBlock}`;
};

export const useShorNineQubitModel = () => {
  const selectedPreset = ref<LogicalPresetId>("plus");

  const preparedState = computed(() =>
    tensor_product_qubits([
      logicalPresetById(selectedPreset.value).qubit,
      ...Array.from({ length: 10 }, () => ZERO_QUBIT),
    ]),
  );

  const rowSpecs = computed<readonly LessonRowSpec[]>(() =>
    Array.from({ length: 11 }, (_, row) => ({
      row,
      role: row <= 8 ? "data" : "syndrome",
    })),
  );

  const lessonSteps = computed<readonly LessonStepSpec[]>(() => [
    {
      id: "shor-outer-copy",
      kind: "primitive-columns",
      executionColumns: [outerCopyColumn("shor-outer-copy", [3, 6])],
    },
    {
      id: "shor-outer-h",
      kind: "primitive-columns",
      executionColumns: [hOnLeadersColumn("shor-outer-h")],
    },
    {
      id: "shor-inner-copy-a",
      kind: "primitive-columns",
      executionColumns: [blockCopyColumn("shor-inner-copy-a", "ancillaA")],
    },
    {
      id: "shor-inner-copy-b",
      kind: "primitive-columns",
      executionColumns: [blockCopyColumn("shor-inner-copy-b", "ancillaB")],
    },
    {
      id: "shor-error",
      kind: "error-injection",
      editableRows: Array.from({ length: 9 }, (_, row) => row),
    },
    {
      id: "shor-bit-check-1",
      kind: "primitive-columns",
      executionColumns: withinBlockCheckColumns("shor-bit-check-1", "ancillaA", 0, SYNDROME_ROWS[0]),
    },
    {
      id: "shor-bit-check-2",
      kind: "primitive-columns",
      executionColumns: withinBlockCheckColumns("shor-bit-check-2", "ancillaB", 1, SYNDROME_ROWS[1]),
    },
    {
      id: "shor-bit-correct",
      kind: "primitive-columns",
      executionColumns: withinBlockCorrectionColumns(),
      visibleProjection: { kind: "active-conditioned-gates" },
    },
    {
      id: "shor-phase-prep",
      kind: "primitive-columns",
      executionColumns: [hOnLeadersColumn("shor-phase-leader-h")],
    },
    {
      id: "shor-phase-check-1",
      kind: "primitive-columns",
      executionColumns: phaseCheckColumns("shor-phase-check-1", SYNDROME_ROWS[0], BLOCKS[0].leader, BLOCKS[1].leader, 0),
    },
    {
      id: "shor-phase-check-2",
      kind: "primitive-columns",
      executionColumns: phaseCheckColumns("shor-phase-check-2", SYNDROME_ROWS[1], BLOCKS[0].leader, BLOCKS[2].leader, 1),
    },
    {
      id: "shor-phase-correct",
      kind: "primitive-columns",
      executionColumns: phaseCorrectionColumns(),
      visibleProjection: { kind: "active-conditioned-gates" },
    },
  ]);

  const columnLabels = computed(() => [
    "Copy q0 into the other block leaders",
    "Rotate the block leaders with H",
    "Expand each block: first copy",
    "Expand each block: second copy",
    "Inject errors",
    "Within-block parity check 1",
    "Within-block parity check 2",
    "Within-block correction",
    "Undo the leader-basis rotation",
    "Block-level phase check 1",
    "Block-level phase check 2",
    "Block-level correction",
  ]);

  const stageLabels = computed(() => [
    `Start with ${logicalPresetById(selectedPreset.value).label}|0000000000>`,
    "After distributing the logical state across the three block leaders",
    "After rotating the block leaders into the phase-sensitive basis",
    "After the first within-block copy",
    "After the second within-block copy",
    "After the injected-error stage",
    "After the first within-block parity check",
    "After the second within-block parity check",
    "After within-block correction",
    "After rotating the block leaders back",
    "After the first block-level phase check",
    "After the second block-level phase check",
    "After block-level correction",
  ]);

  let circuit!: ReturnType<typeof useErrorCodeLessonModel>;

  const classicalLayout = computed<FixedPanelClassicalLayout>(() => {
    const selectedStage = circuit?.selectedStageSnapshot.value;
    const blockBits = BLOCKS.map((block) => dominantRegisterBits(selectedStage?.classicalStates, { id: block.register, size: 2 }));
    const phaseBits = dominantRegisterBits(selectedStage?.classicalStates, PHASE_REGISTER);
    const phaseBlockIndex = phaseBlockFromBits(phaseBits);
    const blockRoutes: FixedPanelClassicalLayout["routes"] = BLOCKS.map((block, blockIndex) => {
      const wireLabel = blockWireLabel(blockIndex, wireInBlockFromBits(blockBits[blockIndex] ?? "??"));
      const belowRegisterSide = blockIndex === 0 ? "left" : "right";
      const gateEntrySide = blockIndex === 2 ? "right" : "left";

      return {
        id: `shor-route-${block.register}`,
        from: { columnId: "shor-bit-check-2", row: blockIndex % 2 === 0 ? 9 : 10 },
        to:
          wireLabel === null
            ? { kind: "below-register", columnId: "shor-bit-correct", side: belowRegisterSide }
            : {
                kind: "gate",
                columnId: "shor-bit-correct",
                row: Number.parseInt(wireLabel.slice(1), 10),
                entrySide: gateEntrySide,
              },
        lane: `block-${block.label.slice(-1).toLowerCase()}`,
        kind: "bundle",
      };
    });

    return {
      lanes: [
        { id: "block-a", label: "A" },
        { id: "block-b", label: "B" },
        { id: "block-c", label: "C" },
        { id: "phase", label: "Phase" },
      ],
      registers: [
        ...BLOCKS.map((block, blockIndex) => ({
          id: `shor-register-${block.register}`,
          label: block.label.slice(-1),
          lane: `block-${block.label.slice(-1).toLowerCase()}`,
          anchorColumnId: "shor-bit-check-2",
          valueText: blockBits[blockIndex] ?? "??",
          kind: "bundle" as const,
        })),
        {
          id: "shor-register-phase",
          label: "Phase",
          lane: "phase",
          anchorColumnId: "shor-phase-check-2",
          valueText: phaseBits,
          kind: "bundle" as const,
        },
      ],
      routes: [
        ...blockRoutes,
        {
          id: "shor-route-phase",
          from: { columnId: "shor-phase-check-2", row: 10 },
          to:
            phaseBlockIndex === null
              ? { kind: "below-register", columnId: "shor-phase-correct", side: "right" }
              : {
                  kind: "gate",
                  columnId: "shor-phase-correct",
                  row: BLOCKS[phaseBlockIndex]!.leader,
                  entrySide: "right",
                },
          lane: "phase",
          kind: "bundle" as const,
        },
      ],
      conditionBadges: [],
    };
  });

  circuit = useErrorCodeLessonModel({
    qubitCount: 11,
    rowSpecs,
    allowedErrorGates: ["X", "Y", "Z"],
    paletteTitle: "Error Gates",
    defaultSelectedGate: "X",
    preparedState,
    lessonSteps,
    columnLabels,
    stageLabels,
    classicalLayout,
    gateIdPrefix: "shor-code",
  });

  const finalStageSnapshot = computed(() => circuit.stageSnapshots.value[circuit.stageSnapshots.value.length - 1]!);
  const recoveredLogical = computed(() => bloch_pair_from_ensemble(finalStageSnapshot.value.ensemble)[0] ?? null);
  const recoveryFidelity = computed(() => logicalPresetFidelity(selectedPreset.value, recoveredLogical.value));

  const blockSyndromes = computed(() =>
    BLOCKS.map((block, blockIndex) => {
      const dominantBits = dominantRegisterBits(finalStageSnapshot.value.classicalStates, { id: block.register, size: 2 });
      const wireInBlock = wireInBlockFromBits(dominantBits);
      return {
        blockIndex,
        blockLabel: block.label,
        dominantBits,
        dominantProbability: 1,
        rows: [{ bits: dominantBits, probability: 1 }],
        wireInBlock,
        wireLabel: blockWireLabel(blockIndex, wireInBlock),
      };
    }),
  );

  const phaseSyndrome = computed(() => {
    const dominantBits = dominantRegisterBits(finalStageSnapshot.value.classicalStates, PHASE_REGISTER);
    const blockIndex = phaseBlockFromBits(dominantBits);
    return {
      dominantBits,
      dominantProbability: 1,
      rows: [{ bits: dominantBits, probability: 1 }],
      blockIndex,
      blockLabel: blockIndex === null ? null : BLOCKS[blockIndex]!.label,
    };
  });

  const selectedPresetLabel = computed(() => logicalPresetById(selectedPreset.value).label);
  const outputPresetLabel = computed(() => closestLogicalPreset(recoveredLogical.value)?.label ?? "—");

  const diagnosisSummary = computed(() => {
    const phaseBlock = phaseSyndrome.value.blockIndex;
    const bitFinding = blockSyndromes.value.find((entry) => entry.wireInBlock !== null) ?? null;

    if (phaseBlock === null && !bitFinding) {
      return "—";
    }
    if (phaseBlock === null && bitFinding?.wireLabel) {
      return `X @ ${bitFinding.wireLabel}`;
    }
    if (phaseBlock !== null && !bitFinding) {
      return `Z @ ${BLOCKS[phaseBlock]!.label}`;
    }
    if (phaseBlock !== null && bitFinding && bitFinding.blockIndex === phaseBlock && bitFinding.wireLabel) {
      return `Y @ ${bitFinding.wireLabel}`;
    }
    return "mixed";
  });

  return {
    selectedPreset,
    selectedPresetLabel,
    outputPresetLabel,
    recoveryFidelity,
    diagnosisSummary,
    blockSyndromes,
    phaseSyndrome,
    ...circuit,
  };
};
