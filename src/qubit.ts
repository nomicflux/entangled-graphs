import type { Complex, Operator, Qubit } from "./types";

import * as complex from "./complex";

export function qubit(a: Complex, b: Complex): Qubit {
    return { a, b };
}

export function apply(op: Operator, q: Qubit): Qubit {
    return qubit(
        complex.add(complex.mult(q.a, op.o00), complex.mult(q.b, op.o01)),
        complex.add(complex.mult(q.a, op.o10), complex.mult(q.b, op.o11)),
    );
}
