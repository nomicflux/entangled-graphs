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
type CustomGateId = string;
export type SingleGateRef = BuiltinSingleGateId | CustomGateId;
type MultiGateId = "CNOT" | "TOFFOLI";
export type GateId = SingleGateRef | MultiGateId;
export type GateCell = GateId | null;

type SingleGateInstance = {
    id: string;
    kind: "single";
    gate: SingleGateRef;
    target: QubitRow;
};

type CnotGateInstance = {
    id: string;
    kind: "cnot";
    control: QubitRow;
    target: QubitRow;
};

type ToffoliGateInstance = {
    id: string;
    kind: "toffoli";
    controlA: QubitRow;
    controlB: QubitRow;
    target: QubitRow;
};

export type GateInstance = SingleGateInstance | CnotGateInstance | ToffoliGateInstance;

export type CircuitColumn = {
    gates: GateInstance[];
};

export type CustomOperator = Operator<1> & { id: CustomGateId };

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
