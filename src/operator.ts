import type { Complex, Operator } from "./types";

import * as complex from "./complex";

export function mk_op(o00: Complex, o01: Complex, o10: Complex, o11: Complex): Operator {
    return { o00, o01, o10, o11 };
}

export function mk_real_op(o00: number, o01: number, o10: number, o11: number): Operator {
    return {
        o00: complex.from_real(o00),
        o01: complex.from_real(o01),
        o10: complex.from_real(o10),
        o11: complex.from_real(o11)
    };
}

export function transpose(op: Operator): Operator {
    return mk_op(op.o00, op.o10, op.o01, op.o11);
}

export function adjoint(op: Operator): Operator {
    return mk_op(
        complex.conjugate(op.o00),
        complex.conjugate(op.o10),
        complex.conjugate(op.o01),
        complex.conjugate(op.o11)
    );
}

export function scale(op: Operator, s: number): Operator {
    return mk_op(
        complex.scale(op.o00, s),
        complex.scale(op.o01, s),
        complex.scale(op.o10, s),
        complex.scale(op.o11, s)
    );
}

export function mult_op(op1: Operator, op2: Operator): Operator {
    return mk_op(
        complex.add(complex.mult(op1.o00, op2.o00), complex.mult(op1.o01, op2.o10)),
        complex.add(complex.mult(op1.o00, op2.o01), complex.mult(op1.o01, op2.o11)),
        complex.add(complex.mult(op1.o10, op2.o00), complex.mult(op1.o11, op2.o10)),
        complex.add(complex.mult(op1.o10, op2.o01), complex.mult(op1.o11, op2.o11)),
    );
}

export const X: Operator = mk_real_op(0,1,1,0);
export const H: Operator = scale(mk_real_op(1,1,1,-1), 1/Math.sqrt(2));
export const I: Operator = mk_real_op(1,0,0,1);
export const S: Operator = mk_op(
    complex.from_real(1), 
    complex.from_real(0), 
    complex.from_real(0), 
    complex.complex(0, 1)
);
