import type { Complex, Operator } from "./types";

import * as complex from "./complex";

const mk_op = (o00: Complex, o01: Complex, o10: Complex, o11: Complex): Operator => ({ o00, o01, o10, o11 });

const mk_real_op = (o00: number, o01: number, o10: number, o11: number): Operator => ({
    o00: complex.from_real(o00),
    o01: complex.from_real(o01),
    o10: complex.from_real(o10),
    o11: complex.from_real(o11)
});

const scale = (op: Operator, s: number): Operator =>
    mk_op(
        complex.scale(op.o00, s),
        complex.scale(op.o01, s),
        complex.scale(op.o10, s),
        complex.scale(op.o11, s)
    );

export const X: Operator = mk_real_op(0,1,1,0);
export const H: Operator = scale(mk_real_op(1,1,1,-1), 1/Math.sqrt(2));
export const I: Operator = mk_real_op(1,0,0,1);
export const S: Operator = mk_op(
    complex.from_real(1), 
    complex.from_real(0), 
    complex.from_real(0), 
    complex.complex(0, 1)
);
