"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
function from_real(real) {
    return { real, imag: 0 };
}
function complex(real, imag) {
    return { real, imag };
}
function qubit(a, b) {
    return { a, b };
}
function mk_op(o00, o01, o10, o11) {
    return { o00, o01, o10, o11 };
}
function mk_real_op(o00, o01, o10, o11) {
    return {
        o00: from_real(o00),
        o01: from_real(o01),
        o10: from_real(o10),
        o11: from_real(o11)
    };
}
function conjugate(c) {
    return { real: c.real, imag: -c.imag };
}
function transpose(op) {
    return mk_op(op.o00, op.o10, op.o01, op.o11);
}
function adjoint(op) {
    return mk_op(conjugate(op.o00), conjugate(op.o10), conjugate(op.o01), conjugate(op.o11));
}
function scale_complex(c, s) {
    return complex(c.real * s, c.imag * s);
}
function add_complex(a, b) {
    return complex(a.real + b.real, a.imag + b.imag);
}
function mult_complex(a, b) {
    return complex(a.real * b.real - a.imag * b.imag, a.imag * b.real + a.real * b.imag);
}
function scale_op(op, s) {
    return mk_op(scale_complex(op.o00, s), scale_complex(op.o01, s), scale_complex(op.o10, s), scale_complex(op.o11, s));
}
function mult_op(op1, op2) {
    return mk_op(add_complex(mult_complex(op1.o00, op2.o00), mult_complex(op1.o01, op2.o10)), add_complex(mult_complex(op1.o00, op2.o01), mult_complex(op1.o01, op2.o11)), add_complex(mult_complex(op1.o10, op2.o00), mult_complex(op1.o11, op2.o10)), add_complex(mult_complex(op1.o10, op2.o01), mult_complex(op1.o11, op2.o11)));
}
function apply(op, q) {
    return qubit(add_complex(mult_complex(q.a, op.o00), mult_complex(q.b, op.o01)), add_complex(mult_complex(q.a, op.o10), mult_complex(q.b, op.o11)));
}
const X = mk_real_op(0, 1, 1, 0);
const H = scale_op(mk_real_op(1, 1, 1, -1), 1 / Math.sqrt(2));
