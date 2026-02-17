export type Complex = {
    real: number;
    imag: number;
}

export type Qubit = {
    a: Complex;
    b: Complex;
}

export type Operator = {
    o00: Complex;
    o01: Complex;
    o10: Complex;
    o11: Complex;
}

export type BlochParams = {
    theta: number;
    phi: number;
};

export type QubitRow = 0 | 1;

export type BuiltinSingleGateId = "I" | "X" | "H" | "S";
export type CustomGateId = string;
export type SingleGateId = BuiltinSingleGateId;
export type SingleGateRef = BuiltinSingleGateId | CustomGateId;
export type MultiGateId = "CNOT";
export type GateId = SingleGateRef | MultiGateId;
export type GateCell = GateId | null;

export type SingleGateColumn = {
    kind: "single";
    q0: SingleGateRef | null;
    q1: SingleGateRef | null;
};

export type CnotColumn = {
    kind: "cnot";
    control: QubitRow;
    target: QubitRow;
};

export type CircuitColumn = SingleGateColumn | CnotColumn;

export type CustomOperator = {
    id: CustomGateId;
    label: string;
    operator: Operator;
};

export type BasisLabel = string;
export type TwoQubitState = [Complex, Complex, Complex, Complex];

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

export type BlochPair = [BlochVector, BlochVector];

export type StageView = {
    id: string;
    index: number;
    label: string;
    distribution: BasisProbability[];
    blochPair: BlochPair;
    isFinal: boolean;
};
