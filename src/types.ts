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

export type GateId = "I" | "X" | "H" | "S";
export type GateCell = GateId | null;
export type CircuitColumn = [GateCell, GateCell];

export type BasisLabel = "00" | "01" | "10" | "11";
export type TwoQubitState = [Complex, Complex, Complex, Complex];

export type BasisProbability = {
    basis: BasisLabel;
    probability: number;
};
