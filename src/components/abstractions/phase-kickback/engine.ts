import type { BasisProbability, CircuitColumn, GateId, Qubit, StateEnsemble } from "../../../types";
import * as complex from "../../../complex";
import {
  bloch_pair_from_ensemble,
  measurement_distribution,
  measurement_distribution_for_ensemble,
  sample_circuit_run,
  simulate_columns_ensemble,
  tensor_product_qubits,
  type CircuitMeasurementOutcome,
} from "../../../quantum";
import { resolveOperator } from "../../../state/operators";

export const PHASE_KICKBACK_QUBIT_COUNT = 2;
export const PHASE_KICKBACK_LOCKED_COLUMNS = 4;

export type KickbackPhaseGate = "I" | "X" | "Y" | "Z" | "S" | "T";
export type ControlledPhaseGate = "CZ" | "CP";
export type KickbackModuleId = "phase-gates" | "controlled-phase-variants";

export type PhaseKickbackConfig = {
  moduleId?: KickbackModuleId;
  targetPhaseGate?: KickbackPhaseGate;
  controlledPhaseGate?: ControlledPhaseGate;
};

type PhaseKickbackConfigInput = PhaseKickbackConfig | KickbackPhaseGate | ControlledPhaseGate | undefined;

type BlochReadout = {
  x: number;
  y: number;
  z: number;
  p0: number;
  p1: number;
};

export type PhaseKickbackCoreMetrics = {
  controlBeforeKickback: BlochReadout;
  controlAfterKickback: BlochReadout;
  targetBeforeKickback: BlochReadout;
  targetAfterKickback: BlochReadout;
  readoutAfterFinalH: BlochReadout;
  phaseFlipDetected: boolean;
  effectiveFactor: number;
};

export type PhaseKickbackBranchSample = {
  outcomes: ReadonlyArray<CircuitMeasurementOutcome>;
  distribution: BasisProbability[];
  finalBasis: string;
  finalBasisProbability: number;
};

const DEFAULT_MODULE: KickbackModuleId = "phase-gates";
const DEFAULT_TARGET_PHASE_GATE: KickbackPhaseGate = "Z";
const DEFAULT_CONTROLLED_PHASE_GATE: ControlledPhaseGate = "CZ";

const phaseGateOptions: readonly KickbackPhaseGate[] = ["I", "X", "Y", "Z", "S", "T"];
const controlledPhaseGateOptions: readonly ControlledPhaseGate[] = ["CZ", "CP"];

const ketZero: Qubit = {
  a: complex.from_real(1),
  b: complex.from_real(0),
};

const resolveGate = (gate: GateId) => resolveOperator(gate, []);

const isKickbackPhaseGate = (value: string): value is KickbackPhaseGate => phaseGateOptions.includes(value as KickbackPhaseGate);
const isControlledPhaseGate = (value: string): value is ControlledPhaseGate =>
  controlledPhaseGateOptions.includes(value as ControlledPhaseGate);
const isKickbackModuleId = (value: string): value is KickbackModuleId =>
  value === "phase-gates" || value === "controlled-phase-variants";

const normalizeConfig = (input?: PhaseKickbackConfigInput): Required<PhaseKickbackConfig> => {
  if (typeof input === "string") {
    if (isKickbackPhaseGate(input)) {
      return {
        moduleId: "phase-gates",
        targetPhaseGate: input,
        controlledPhaseGate: DEFAULT_CONTROLLED_PHASE_GATE,
      };
    }

    if (isControlledPhaseGate(input)) {
      return {
        moduleId: "controlled-phase-variants",
        targetPhaseGate: DEFAULT_TARGET_PHASE_GATE,
        controlledPhaseGate: input,
      };
    }
  }

  const config = input ?? {};
  const moduleId = config.moduleId && isKickbackModuleId(config.moduleId) ? config.moduleId : DEFAULT_MODULE;
  const targetPhaseGate =
    config.targetPhaseGate && isKickbackPhaseGate(config.targetPhaseGate) ? config.targetPhaseGate : DEFAULT_TARGET_PHASE_GATE;
  const controlledPhaseGate =
    config.controlledPhaseGate && isControlledPhaseGate(config.controlledPhaseGate)
      ? config.controlledPhaseGate
      : DEFAULT_CONTROLLED_PHASE_GATE;

  return {
    moduleId,
    targetPhaseGate,
    controlledPhaseGate,
  };
};

const phaseGateCoreColumns = (targetPhaseGate: KickbackPhaseGate): CircuitColumn[] => [
  {
    gates: [{ id: "kick-core-h-target", gate: "H", wires: [1] }],
  },
  {
    gates: [
      { id: "kick-core-target-phase", gate: targetPhaseGate, wires: [1] },
      { id: "kick-core-h-control", gate: "H", wires: [0] },
    ],
  },
  {
    gates: [{ id: "kick-core-cnot", gate: "CNOT", wires: [0, 1] }],
  },
  {
    gates: [{ id: "kick-core-h-readout", gate: "H", wires: [0] }],
  },
];

const controlledPhaseCoreColumns = (controlledPhaseGate: ControlledPhaseGate): CircuitColumn[] => [
  {
    gates: [
      { id: "kick-core-h-control", gate: "H", wires: [0] },
      { id: "kick-core-x-target", gate: "X", wires: [1] },
    ],
  },
  {
    gates: [{ id: "kick-core-controlled-phase", gate: controlledPhaseGate, wires: [0, 1] }],
  },
  {
    gates: [{ id: "kick-core-h-readout", gate: "H", wires: [0] }],
  },
];

export const createPhaseKickbackCoreColumns = (input?: PhaseKickbackConfigInput): CircuitColumn[] => {
  const config = normalizeConfig(input);
  if (config.moduleId === "controlled-phase-variants") {
    return controlledPhaseCoreColumns(config.controlledPhaseGate);
  }
  return phaseGateCoreColumns(config.targetPhaseGate);
};

export const phaseKickbackLockedColumnCount = (input?: PhaseKickbackConfigInput): number =>
  createPhaseKickbackCoreColumns(input).length;

const cloneColumns = (columns: ReadonlyArray<CircuitColumn>): CircuitColumn[] =>
  columns.map((column) => ({
    gates: column.gates.map((gate) => ({
      id: gate.id,
      gate: gate.gate,
      wires: [...gate.wires],
    })),
  }));

const kickbackColumns = (editableColumns: ReadonlyArray<CircuitColumn>, input?: PhaseKickbackConfigInput): CircuitColumn[] => [
  ...createPhaseKickbackCoreColumns(input),
  ...cloneColumns(editableColumns),
];

const zeroPreparedState = () =>
  tensor_product_qubits(Array.from({ length: PHASE_KICKBACK_QUBIT_COUNT }, () => ketZero));

export const phaseKickbackSnapshots = (
  editableColumns: ReadonlyArray<CircuitColumn>,
  input?: PhaseKickbackConfigInput,
): StateEnsemble[] =>
  simulate_columns_ensemble(
    zeroPreparedState(),
    kickbackColumns(editableColumns, input),
    resolveGate,
    PHASE_KICKBACK_QUBIT_COUNT,
  );

export const phaseKickbackFinalDistribution = (
  editableColumns: ReadonlyArray<CircuitColumn>,
  input?: PhaseKickbackConfigInput,
): BasisProbability[] => {
  const snapshots = phaseKickbackSnapshots(editableColumns, input);
  return measurement_distribution_for_ensemble(snapshots[snapshots.length - 1]!);
};

const q0OneProbability = (distribution: ReadonlyArray<BasisProbability>): number =>
  distribution.reduce((acc, entry) => acc + (entry.basis.startsWith("1") ? entry.probability : 0), 0);

export const phaseKickbackFinalQ0OneProbability = (
  editableColumns: ReadonlyArray<CircuitColumn>,
  input?: PhaseKickbackConfigInput,
): number =>
  q0OneProbability(phaseKickbackFinalDistribution(editableColumns, input));

const snapshotAt = (snapshots: ReadonlyArray<StateEnsemble>, index: number): StateEnsemble => snapshots[index] ?? snapshots[0]!;

const toBloch = (ensemble: StateEnsemble, row: 0 | 1): BlochReadout => bloch_pair_from_ensemble(ensemble)[row]!;

export const phaseKickbackCoreMetrics = (
  editableColumns: ReadonlyArray<CircuitColumn>,
  input?: PhaseKickbackConfigInput,
): PhaseKickbackCoreMetrics => {
  const coreLength = phaseKickbackLockedColumnCount(input);
  const snapshots = phaseKickbackSnapshots(editableColumns, input);
  const beforeKickback = snapshotAt(snapshots, Math.max(0, coreLength - 2));
  const afterKickback = snapshotAt(snapshots, Math.max(0, coreLength - 1));
  const afterReadout = snapshotAt(snapshots, coreLength);

  const controlBeforeKickback = toBloch(beforeKickback, 0);
  const controlAfterKickback = toBloch(afterKickback, 0);
  const targetBeforeKickback = toBloch(beforeKickback, 1);
  const targetAfterKickback = toBloch(afterKickback, 1);
  const readoutAfterFinalH = toBloch(afterReadout, 0);

  return {
    controlBeforeKickback,
    controlAfterKickback,
    targetBeforeKickback,
    targetAfterKickback,
    readoutAfterFinalH,
    phaseFlipDetected: controlBeforeKickback.x > 0 && controlAfterKickback.x < 0,
    effectiveFactor: controlAfterKickback.x,
  };
};

export const phaseKickbackBranchSample = (
  editableColumns: ReadonlyArray<CircuitColumn>,
  input?: PhaseKickbackConfigInput,
  random: () => number = Math.random,
): PhaseKickbackBranchSample => {
  const sampled = sample_circuit_run(
    zeroPreparedState(),
    kickbackColumns(editableColumns, input),
    resolveGate,
    PHASE_KICKBACK_QUBIT_COUNT,
    random,
  );

  return {
    outcomes: sampled.outcomes,
    distribution: measurement_distribution(sampled.finalState),
    finalBasis: sampled.finalSample.basis,
    finalBasisProbability: sampled.finalSample.probability,
  };
};
