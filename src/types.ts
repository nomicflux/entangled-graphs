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

export type SingleGateId = "I" | "X" | "H" | "S";
export type MultiGateId = "CNOT";
export type GateId = SingleGateId | MultiGateId;
export type GateCell = GateId | null;

export type SingleGateColumn = {
    kind: "single";
    q0: SingleGateId | null;
    q1: SingleGateId | null;
};

export type CnotColumn = {
    kind: "cnot";
    control: QubitRow;
    target: QubitRow;
};

export type CircuitColumn = SingleGateColumn | CnotColumn;

export type BasisLabel = "00" | "01" | "10" | "11";
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
