export type Complex = {
  real: number;
  imag: number;
};

export type Qubit = {
  a: Complex;
  b: Complex;
};

export type QubitArity = 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8;
export type Operator<Arity extends QubitArity = QubitArity> = {
  id: string;
  label: string;
  qubitArity: Arity;
  matrix: ReadonlyArray<ReadonlyArray<Complex>>;
};

export type BlochParams = {
  theta: number;
  phi: number;
};

export type QubitRow = number;

export type ClassicalBitRef = {
  register: string;
  index: number;
};

export type ClassicalRegisterSpec = {
  id: string;
  label: string;
  bitLabels?: ReadonlyArray<string>;
};

export type ClassicalPredicate =
  | { kind: "bit-equals"; bit: ClassicalBitRef; value: 0 | 1 }
  | { kind: "register-equals"; register: string; value: ReadonlyArray<0 | 1> }
  | { kind: "all"; predicates: ReadonlyArray<ClassicalPredicate> };

export type ClassicalBitAssignment = {
  bit: ClassicalBitRef;
  value: 0 | 1;
};

export type ClassicalState = ReadonlyArray<ClassicalBitAssignment>;

export type ClassicalStateBranch = {
  weight: number;
  state: ClassicalState;
};

export type ClassicalOverlayLane = {
  id: string;
  label: string;
};

export type ClassicalRouteEntrySide = "left" | "right";

export type ClassicalRouteAnchor =
  | {
      kind?: "row";
      columnId: string;
      row: QubitRow;
    }
  | {
      kind: "gate";
      columnId: string;
      row: QubitRow;
      entrySide?: ClassicalRouteEntrySide;
      entryOffset?: number;
    }
  | {
      kind: "below-register";
      columnId: string;
      side?: ClassicalRouteEntrySide;
      breakoutOffset?: number;
    };

export type ClassicalRegisterOverlay = {
  id: string;
  label: string;
  lane: string;
  anchorColumnId: string;
  valueText: string;
  kind?: "bit" | "bundle";
};

export type ClassicalRouteOverlay = {
  id: string;
  from: ClassicalRouteAnchor;
  to: ClassicalRouteAnchor;
  lane: string;
  kind: "bit" | "bundle";
};

export type ClassicalConditionBadge = {
  id: string;
  columnId: string;
  row: QubitRow;
  text: string;
  kind?: "bit" | "bundle";
};

export type FixedPanelClassicalLayout = {
  lanes: ReadonlyArray<ClassicalOverlayLane>;
  registers: ReadonlyArray<ClassicalRegisterOverlay>;
  routes: ReadonlyArray<ClassicalRouteOverlay>;
  conditionBadges: ReadonlyArray<ClassicalConditionBadge>;
};

export type BuiltinSingleGateId = "I" | "X" | "Y" | "Z" | "H" | "S" | "T" | "M" | "RESET";
export type BuiltinMultiGateId = "CNOT" | "CZ" | "CP" | "SWAP" | "TOFFOLI" | "CSWAP";
export type BuiltinGateId = BuiltinSingleGateId | BuiltinMultiGateId;
type CustomGateId = string;
export type GateId = BuiltinGateId | CustomGateId;
export type SingleGateRef = GateId;
export type GateCell = GateId | null;

export type GateInstance = {
  id: string;
  gate: GateId;
  wires: ReadonlyArray<QubitRow>;
  writesClassicalBit?: ClassicalBitRef;
  condition?: ClassicalPredicate;
};

export type CircuitColumn = {
  gates: GateInstance[];
};

export type CustomOperator = Operator & { id: CustomGateId };

export type BasisLabel = string;
export type QubitState = Complex[];
export type WeightedStateBranch = {
  weight: number;
  state: QubitState;
  classicalState?: ClassicalState;
};
export type StateEnsemble = WeightedStateBranch[];

export type BasisProbability = {
  basis: BasisLabel;
  probability: number;
};

export type StageSnapshot = {
  id: string;
  index: number;
  label: string;
  ensemble: StateEnsemble;
  classicalStates?: ReadonlyArray<ClassicalStateBranch>;
  isFinal: boolean;
};

export type BlochVector = {
  x: number;
  y: number;
  z: number;
  p0: number;
  p1: number;
  certainty: number;
  uncertainty: number;
};

export type BlochPair = BlochVector[];

export type QubitPhaseOverlay = {
  row: QubitRow;
  angle: number;
  magnitude: number;
  paletteBias: number;
};

export type PairPhaseOverlay = {
  fromRow: QubitRow;
  toRow: QubitRow;
  sameParityMagnitude: number;
  sameParityAngle: number;
  oppositeParityMagnitude: number;
  oppositeParityAngle: number;
};

export type StageVisualModel = {
  distribution: BasisProbability[];
  blochPair: BlochPair;
  renderPair: BlochPair;
  qubitPhaseOverlays: ReadonlyArray<QubitPhaseOverlay>;
  pairPhaseOverlays: ReadonlyArray<PairPhaseOverlay>;
};

export type BellStateId = "phi+" | "phi-" | "psi+" | "psi-";

export type EntanglementLink = {
  fromRow: QubitRow;
  toRow: QubitRow;
  dominantBell: BellStateId;
  dominantProbability: number;
  strength: number;
};

export type CutEntanglementScore = {
  subset: ReadonlyArray<QubitRow>;
  complement: ReadonlyArray<QubitRow>;
  entropy: number;
};

export type EntanglementComponentKind = "single" | "pairwise" | "multipartite";

export type EntanglementComponent = {
  rows: ReadonlyArray<QubitRow>;
  kind: EntanglementComponentKind;
  strength: number;
};

export type StageEntanglementModel = {
  cuts: ReadonlyArray<CutEntanglementScore>;
  components: ReadonlyArray<EntanglementComponent>;
};

export type RawSingleQubitRhoInput = {
  rho00: string;
  rho11: string;
  rho01Real: string;
  rho01Imag: string;
};

export type ValidSingleQubitDensity = {
  rho00: number;
  rho11: number;
  rho01: Complex;
};

export type DensityMatrix = ReadonlyArray<ReadonlyArray<Complex>>;

export type NoiseChannelId =
  | "bit-flip"
  | "phase-flip"
  | "dephasing"
  | "depolarizing"
  | "amplitude-damping";

export type NoiseStrengthPreset = 0 | 0.1 | 0.25 | 0.5;

export type MixedGateProcess =
  | { kind: "unitary"; gateId: GateId }
  | { kind: "measurement" }
  | { kind: "noise"; channelId: NoiseChannelId; strength: NoiseStrengthPreset };

export type MixedGateInstance = {
  id: string;
  process: MixedGateProcess;
  wires: ReadonlyArray<QubitRow>;
};

export type MixedCircuitColumn = {
  gates: MixedGateInstance[];
};

export type MixedStageSnapshot = {
  id: string;
  index: number;
  label: string;
  rho: DensityMatrix;
  isFinal: boolean;
};

export type DensityCloudVector = {
  x: number;
  y: number;
  z: number;
  radius: number;
  purity: number;
  p0: number;
  p1: number;
  coherenceMagnitude: number;
  coherencePhase: number | null;
};

export type PairCorrelationOverlay = {
  fromRow: QubitRow;
  toRow: QubitRow;
  strength: number;
  dominantChannel: "same-parity" | "opposite-parity" | "classical";
  angle: number | null;
};

export type DensityStageVisualModel = {
  distribution: BasisProbability[];
  qubits: ReadonlyArray<DensityCloudVector>;
  pairCorrelations: ReadonlyArray<PairCorrelationOverlay>;
  correlationGroups: ReadonlyArray<ReadonlyArray<QubitRow>>;
};

export type MeasurementBasis = "z" | "x" | "y";
