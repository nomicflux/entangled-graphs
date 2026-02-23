import type {
  BasisProbability,
  CircuitColumn,
  EntanglementLink,
  GateId,
  Qubit,
  QubitRow,
  StateEnsemble,
} from "../../../types";
import * as complex from "../../../complex";
import {
  entanglement_links_from_ensemble,
  measurement_distribution,
  measurement_distribution_for_ensemble,
  sample_circuit_run,
  simulate_columns_ensemble,
  tensor_product_qubits,
  type CircuitMeasurementOutcome,
} from "../../../quantum";
import { resolveOperator } from "../../../state/operators";

export type EntanglementScenarioId = "bell-family" | "ghz-growth" | "entanglement-swapping";

type ScenarioPair = readonly [QubitRow, QubitRow];
export type EntanglementScenarioSummary = {
  id: EntanglementScenarioId;
  title: string;
  subtitle: string;
  qubitCount: number;
  lockedCoreCount: number;
  coreLockReason: string;
  instructions: readonly string[];
  measurementPrompt: string;
  initialEditableColumns: number;
  minEditableColumns: number;
  maxEditableColumns: number;
  focusPairs: readonly ScenarioPair[];
  createCoreColumns: () => CircuitColumn[];
  columnLabelAt: (index: number) => string;
  stageLabelAt: (index: number) => string;
};

type BranchSample = {
  outcomes: ReadonlyArray<CircuitMeasurementOutcome>;
  distribution: BasisProbability[];
  links: ReadonlyArray<EntanglementLink>;
  finalBasis: string;
  finalBasisProbability: number;
};

export const ENTANGLEMENT_QUBIT_COUNT = 2;
export const ENTANGLEMENT_LOCKED_CORE_COLUMNS = 2;

const ketZero: Qubit = {
  a: complex.from_real(1),
  b: complex.from_real(0),
};

const resolveGate = (gate: GateId) => resolveOperator(gate, []);

export const createEntanglementCoreColumns = (): CircuitColumn[] => [
  {
    gates: [{ id: "ent-core-h", gate: "H", wires: [0] }],
  },
  {
    gates: [{ id: "ent-core-cnot", gate: "CNOT", wires: [0, 1] }],
  },
];

const cloneColumns = (columns: ReadonlyArray<CircuitColumn>): CircuitColumn[] =>
  columns.map((column) => ({
    gates: column.gates.map((gate) => ({
      id: gate.id,
      gate: gate.gate,
      wires: [...gate.wires],
    })),
  }));

const zeroPreparedState = (qubitCount: number) =>
  tensor_product_qubits(Array.from({ length: qubitCount }, () => ketZero));

const bellScenario: EntanglementScenarioSummary = {
  id: "bell-family",
  title: "Bell Family Explorer",
  subtitle: "Start from the Bell setup, then use local bit/phase flips to navigate Phi/Psi families.",
  qubitCount: 2,
  lockedCoreCount: 2,
  coreLockReason: "This starting step is fixed for the lesson setup and cannot be edited.",
  instructions: [
    "Add X on q0 or q1 to move between Phi and Psi families.",
    "Add Z on q0 or q1 to flip +/− phase while keeping strength high.",
    "Use H on one wire to change measurement basis and compare stage metrics.",
  ],
  measurementPrompt: "Place M on one row before the final column to observe early-collapse behavior.",
  initialEditableColumns: 2,
  minEditableColumns: 1,
  maxEditableColumns: 6,
  focusPairs: [[0, 1]],
  createCoreColumns: () => createEntanglementCoreColumns(),
  columnLabelAt: (index: number) => {
    if (index === 0) {
      return "Step 1: H(q0)";
    }
    if (index === 1) {
      return "Step 2: CNOT(q0->q1)";
    }
    return `Explore t${index - 1}`;
  },
  stageLabelAt: (index: number) => {
    if (index === 0) {
      return "Prepared |00>";
    }
    if (index === 1) {
      return "Step 1: H(q0)";
    }
    if (index === 2) {
      return "Step 2: CNOT(q0->q1)";
    }
    return `Explore step ${index - 2}`;
  },
};

const ghzCoreColumns = (): CircuitColumn[] => [
  {
    gates: [{ id: "ghz-core-h", gate: "H", wires: [0] }],
  },
  {
    gates: [{ id: "ghz-core-cnot-01", gate: "CNOT", wires: [0, 1] }],
  },
  {
    gates: [{ id: "ghz-core-cnot-12", gate: "CNOT", wires: [1, 2] }],
  },
];

const ghzScenario: EntanglementScenarioSummary = {
  id: "ghz-growth",
  title: "GHZ Growth",
  subtitle: "Grow a 3-qubit GHZ chain and compare weak pairwise links against strong multipartite structure.",
  qubitCount: 3,
  lockedCoreCount: 3,
  coreLockReason: "This starting step is fixed for the lesson setup and cannot be edited.",
  instructions: [
    "Inspect pair table after the core: pairwise links stay weak even with global correlation.",
    "Check multipartite summary to see GHZ strength emerge across three wires.",
    "Apply local X/Z/H to one wire and watch multipartite vs pairwise signatures shift.",
  ],
  measurementPrompt: "Measure one GHZ wire early, then compare the multipartite strength drop.",
  initialEditableColumns: 2,
  minEditableColumns: 1,
  maxEditableColumns: 6,
  focusPairs: [[0, 1], [0, 2], [1, 2]],
  createCoreColumns: ghzCoreColumns,
  columnLabelAt: (index: number) => {
    if (index === 0) {
      return "Step 1: H(q0)";
    }
    if (index === 1) {
      return "Step 2: CNOT(q0->q1)";
    }
    if (index === 2) {
      return "Step 3: CNOT(q1->q2)";
    }
    return `Explore t${index - 2}`;
  },
  stageLabelAt: (index: number) => {
    if (index === 0) {
      return "Prepared |000>";
    }
    if (index === 1) {
      return "Step 1: H(q0)";
    }
    if (index === 2) {
      return "Step 2: CNOT(q0->q1)";
    }
    if (index === 3) {
      return "Step 3: CNOT(q1->q2)";
    }
    return `Explore step ${index - 3}`;
  },
};

const swappingCoreColumns = (): CircuitColumn[] => [
  {
    gates: [
      { id: "swap-core-h0", gate: "H", wires: [0] },
      { id: "swap-core-h2", gate: "H", wires: [2] },
    ],
  },
  {
    gates: [
      { id: "swap-core-cnot01", gate: "CNOT", wires: [0, 1] },
      { id: "swap-core-cnot23", gate: "CNOT", wires: [2, 3] },
    ],
  },
  {
    gates: [{ id: "swap-core-bell-cnot", gate: "CNOT", wires: [1, 2] }],
  },
  {
    gates: [{ id: "swap-core-bell-h", gate: "H", wires: [1] }],
  },
  {
    gates: [
      { id: "swap-core-m1", gate: "M", wires: [1] },
      { id: "swap-core-m2", gate: "M", wires: [2] },
    ],
  },
];

const swappingScenario: EntanglementScenarioSummary = {
  id: "entanglement-swapping",
  title: "Entanglement Swapping",
  subtitle: "Create two Bell pairs, perform Bell-basis measurement on middle wires, and inspect outer-wire transfer.",
  qubitCount: 4,
  lockedCoreCount: 5,
  coreLockReason: "This starting step is fixed for the lesson setup and cannot be edited.",
  instructions: [
    "Core measurements on q1/q2 produce branch-dependent outcomes.",
    "Use branch sampling to inspect q0/q3 entanglement in a specific measurement branch.",
    "Add final gates on q0/q3 to probe the swapped link after measurement.",
  ],
  measurementPrompt: "Run branch sampling repeatedly and compare q0-q3 Bell class/strength across outcomes.",
  initialEditableColumns: 1,
  minEditableColumns: 1,
  maxEditableColumns: 4,
  focusPairs: [[0, 3], [0, 1], [2, 3]],
  createCoreColumns: swappingCoreColumns,
  columnLabelAt: (index: number) => {
    if (index === 0) {
      return "Step 1: H(q0), H(q2)";
    }
    if (index === 1) {
      return "Step 2: CNOT(0->1), CNOT(2->3)";
    }
    if (index === 2) {
      return "Step 3: Bell CNOT(1->2)";
    }
    if (index === 3) {
      return "Step 4: Bell H(q1)";
    }
    if (index === 4) {
      return "Step 5: M(q1), M(q2)";
    }
    return `Explore t${index - 4}`;
  },
  stageLabelAt: (index: number) => {
    if (index === 0) {
      return "Prepared |0000>";
    }
    if (index === 1) {
      return "Step 1: H(q0), H(q2)";
    }
    if (index === 2) {
      return "Step 2: CNOT(0->1), CNOT(2->3)";
    }
    if (index === 3) {
      return "Step 3: Bell CNOT(1->2)";
    }
    if (index === 4) {
      return "Step 4: Bell H(q1)";
    }
    if (index === 5) {
      return "Step 5: M(q1), M(q2)";
    }
    return `Explore step ${index - 5}`;
  },
};

export const ENTANGLEMENT_SCENARIOS: readonly EntanglementScenarioSummary[] = [bellScenario, ghzScenario, swappingScenario];

export const entanglementScenarioById = (id: EntanglementScenarioId): EntanglementScenarioSummary =>
  ENTANGLEMENT_SCENARIOS.find((entry) => entry.id === id) ?? bellScenario;

const scenarioColumns = (
  scenarioId: EntanglementScenarioId,
  editableColumns: ReadonlyArray<CircuitColumn>,
): {
  scenario: EntanglementScenarioSummary;
  columns: CircuitColumn[];
} => {
  const scenario = entanglementScenarioById(scenarioId);
  return {
    scenario,
    columns: [...scenario.createCoreColumns(), ...cloneColumns(editableColumns)],
  };
};

export const entanglementScenarioSnapshots = (
  scenarioId: EntanglementScenarioId,
  editableColumns: ReadonlyArray<CircuitColumn>,
): StateEnsemble[] => {
  const { scenario, columns } = scenarioColumns(scenarioId, editableColumns);
  return simulate_columns_ensemble(
    zeroPreparedState(scenario.qubitCount),
    columns,
    resolveGate,
    scenario.qubitCount,
  );
};

export const entanglementLessonFinalDistribution = (
  editableColumns: ReadonlyArray<CircuitColumn>,
): BasisProbability[] => {
  const snapshots = entanglementScenarioSnapshots("bell-family", editableColumns);
  return measurement_distribution_for_ensemble(snapshots[snapshots.length - 1]!);
};

export const entanglementLessonFinalLink = (editableColumns: ReadonlyArray<CircuitColumn>): EntanglementLink | null => {
  const snapshots = entanglementScenarioSnapshots("bell-family", editableColumns);
  const finalLinks = entanglement_links_from_ensemble(snapshots[snapshots.length - 1]!);
  return finalLinks.find((link) => link.fromRow === 0 && link.toRow === 1) ?? null;
};

export const entanglementScenarioFinalDistribution = (
  scenarioId: EntanglementScenarioId,
  editableColumns: ReadonlyArray<CircuitColumn>,
): BasisProbability[] => {
  const snapshots = entanglementScenarioSnapshots(scenarioId, editableColumns);
  return measurement_distribution_for_ensemble(snapshots[snapshots.length - 1]!);
};

export const entanglementScenarioFinalLinkForPair = (
  scenarioId: EntanglementScenarioId,
  editableColumns: ReadonlyArray<CircuitColumn>,
  left: QubitRow,
  right: QubitRow,
): EntanglementLink | null => {
  const from = Math.min(left, right);
  const to = Math.max(left, right);
  const snapshots = entanglementScenarioSnapshots(scenarioId, editableColumns);
  const finalLinks = entanglement_links_from_ensemble(snapshots[snapshots.length - 1]!);
  return finalLinks.find((link) => link.fromRow === from && link.toRow === to) ?? null;
};

export const entanglementScenarioBranchSample = (
  scenarioId: EntanglementScenarioId,
  editableColumns: ReadonlyArray<CircuitColumn>,
  random: () => number = Math.random,
): BranchSample => {
  const { scenario, columns } = scenarioColumns(scenarioId, editableColumns);
  const sampled = sample_circuit_run(
    zeroPreparedState(scenario.qubitCount),
    columns,
    resolveGate,
    scenario.qubitCount,
    random,
  );
  const branchEnsemble: StateEnsemble = [{ weight: 1, state: sampled.finalState }];
  const links = entanglement_links_from_ensemble(branchEnsemble);
  return {
    outcomes: sampled.outcomes,
    distribution: measurement_distribution(sampled.finalState),
    links,
    finalBasis: sampled.finalSample.basis,
    finalBasisProbability: sampled.finalSample.probability,
  };
};
