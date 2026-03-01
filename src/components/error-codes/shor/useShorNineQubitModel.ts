import { computed, ref } from "vue";
import type { BasisProbability, CircuitColumn } from "../../../types";
import * as complex from "../../../complex";
import { bloch_pair_from_ensemble, measurement_distribution_for_ensemble, tensor_product_qubits } from "../../../quantum";
import { closestLogicalPreset, logicalPresetById, logicalPresetFidelity, type LogicalPresetId } from "../shared/logical-presets";
import { useSingleErrorColumnModel } from "../shared/useSingleErrorColumnModel";

const ZERO_QUBIT = {
  a: complex.from_real(1),
  b: complex.from_real(0),
};

const BLOCKS = [
  { label: "Block A", start: 0, leader: 0, ancillaA: 1, ancillaB: 2 },
  { label: "Block B", start: 3, leader: 3, ancillaA: 4, ancillaB: 5 },
  { label: "Block C", start: 6, leader: 6, ancillaA: 7, ancillaB: 8 },
] as const;

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

const blockRecoverColumn = (id: string): CircuitColumn => ({
  gates: BLOCKS.map((block, index) => ({
    id: `${id}-${index}`,
    gate: "TOFFOLI",
    wires: [block.ancillaB, block.ancillaA, block.leader],
  })),
});

const outerRecoverColumns = (prefix: string): CircuitColumn[] => [
  hOnLeadersColumn(`${prefix}-h`),
  {
    gates: [{ id: `${prefix}-copy-0`, gate: "CNOT", wires: [0, 3] }],
  },
  {
    gates: [{ id: `${prefix}-copy-1`, gate: "CNOT", wires: [0, 6] }],
  },
  {
    gates: [{ id: `${prefix}-correct`, gate: "TOFFOLI", wires: [6, 3, 0] }],
  },
];

const marginalBits = (distribution: ReadonlyArray<BasisProbability>, positions: readonly number[]) => {
  const totals = new Map<string, number>();
  for (const entry of distribution) {
    const bits = positions.map((position) => entry.basis[position] ?? "0").join("");
    totals.set(bits, (totals.get(bits) ?? 0) + entry.probability);
  }
  return [...totals.entries()]
    .map(([bits, probability]) => ({ bits, probability }))
    .sort((left, right) => right.probability - left.probability);
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
      ...Array.from({ length: 8 }, () => ZERO_QUBIT),
    ]),
  );

  const prefixColumns = computed<CircuitColumn[]>(() => [
    outerCopyColumn("shor-outer-copy", [3, 6]),
    hOnLeadersColumn("shor-outer-h"),
    blockCopyColumn("shor-inner-copy-a", "ancillaA"),
    blockCopyColumn("shor-inner-copy-b", "ancillaB"),
  ]);

  const suffixColumns = computed<CircuitColumn[]>(() => [
    blockCopyColumn("shor-inner-recover-a", "ancillaA"),
    blockCopyColumn("shor-inner-recover-b", "ancillaB"),
    blockRecoverColumn("shor-inner-correct"),
    ...outerRecoverColumns("shor-outer-recover"),
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
    `Start with ${logicalPresetById(selectedPreset.value).label}|00000000>`,
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

  const circuit = useSingleErrorColumnModel({
    qubitCount: 9,
    allowedErrorGates: ["X", "Y", "Z"],
    paletteTitle: "Error Gates",
    defaultSelectedGate: "X",
    preparedState,
    prefixColumns,
    suffixColumns,
    columnLabels,
    stageLabels,
    gateIdPrefix: "shor-code",
  });

  const finalStageSnapshot = computed(() => circuit.stageSnapshots.value[circuit.stageSnapshots.value.length - 1]!);
  const finalDistribution = computed(() => measurement_distribution_for_ensemble(finalStageSnapshot.value.ensemble));
  const recoveredLogical = computed(() => bloch_pair_from_ensemble(finalStageSnapshot.value.ensemble)[0] ?? null);
  const recoveryFidelity = computed(() => logicalPresetFidelity(selectedPreset.value, recoveredLogical.value));

  const blockSyndromes = computed(() =>
    BLOCKS.map((block, blockIndex) => {
      const rows = marginalBits(finalDistribution.value, [block.ancillaA, block.ancillaB]);
      const dominant = rows[0] ?? { bits: "00", probability: 0 };
      const wireInBlock = wireInBlockFromBits(dominant.bits);
      return {
        blockIndex,
        blockLabel: block.label,
        dominantBits: dominant.bits,
        dominantProbability: dominant.probability,
        rows,
        wireInBlock,
        wireLabel: blockWireLabel(blockIndex, wireInBlock),
      };
    }),
  );

  const phaseSyndrome = computed(() => {
    const rows = marginalBits(finalDistribution.value, [3, 6]);
    const dominant = rows[0] ?? { bits: "00", probability: 0 };
    const blockIndex = phaseBlockFromBits(dominant.bits);
    return {
      dominantBits: dominant.bits,
      dominantProbability: dominant.probability,
      rows,
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
