export type Complex = {
    real: number;
    imag: number;
}

export type Qubit = {
    a: Complex;
    b: Complex;
}

export type QubitArity = 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8;
export type Operator<Arity extends QubitArity = QubitArity> = {
    id: string;
    label: string;
    qubitArity: Arity;
    matrix: ReadonlyArray<ReadonlyArray<Complex>>;
}

export type BlochParams = {
    theta: number;
    phi: number;
};

export type QubitRow = number;

export type BuiltinSingleGateId = "I" | "X" | "H" | "S";
export type BuiltinMultiGateId = "CNOT" | "TOFFOLI";
export type BuiltinGateId = BuiltinSingleGateId | BuiltinMultiGateId;
type CustomGateId = string;
export type GateId = BuiltinGateId | CustomGateId;
export type SingleGateRef = GateId;
export type GateCell = GateId | null;

export type GateInstance = {
    id: string;
    gate: GateId;
    wires: ReadonlyArray<QubitRow>;
};

export type CircuitColumn = {
    gates: GateInstance[];
};

export type CustomOperator = Operator & { id: CustomGateId };

export type BasisLabel = string;
export type QubitState = Complex[];

export type BasisProbability = {
    basis: BasisLabel;
    probability: number;
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

export type StageView = {
    id: string;
    index: number;
    label: string;
    distribution: BasisProbability[];
    blochPair: BlochPair;
    isFinal: boolean;
};
