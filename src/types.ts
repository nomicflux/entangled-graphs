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
