import * as d3 from 'd3';

type Complex = {
    real: number;
    imag: number;
}

function from_real(real: number): Complex {
    return {real, imag: 0};
}

function complex(real: number, imag: number): Complex {
    return { real, imag };
}

type Qubit = {
    a: Complex;
    b: Complex;
}

function qubit(a: Complex, b: Complex): Qubit {
    return { a, b };
}

type Operator = {
    o00: Complex;
    o01: Complex;
    o10: Complex;
    o11: Complex;
}

function mk_op(o00: Complex, o01: Complex, o10: Complex, o11: Complex): Operator {
    return { o00, o01, o10, o11 };
}

function mk_real_op(o00: number, o01: number, o10: number, o11: number): Operator {
    return {
        o00: from_real(o00),
        o01: from_real(o01),
        o10: from_real(o10),
        o11: from_real(o11)
    };
}

function conjugate(c: Complex): Complex {
    return { real: c.real, imag: -c.imag };
}

function transpose(op: Operator): Operator {
    return mk_op(op.o00, op.o10, op.o01, op.o11);
}

function adjoint(op: Operator): Operator {
    return mk_op(
        conjugate(op.o00),
        conjugate(op.o10),
        conjugate(op.o01),
        conjugate(op.o11)
    );
}

function scale_complex(c: Complex, s: number): Complex {
    return complex(c.real * s, c.imag * s);
}

function add_complex(a: Complex, b: Complex): Complex {
    return complex(a.real + b.real, a.imag + b.imag);
}

function mult_complex(a: Complex, b: Complex): Complex {
    return complex(a.real * b.real - a.imag * b.imag, a.imag * b.real + a.real * b.imag );
}

function scale_op(op: Operator, s: number): Operator {
    return mk_op(
        scale_complex(op.o00, s),
        scale_complex(op.o01, s),
        scale_complex(op.o10, s),
        scale_complex(op.o11, s)
    );
}

function mult_op(op1: Operator, op2: Operator): Operator {
    return mk_op(
        add_complex(mult_complex(op1.o00, op2.o00), mult_complex(op1.o01, op2.o10)),
        add_complex(mult_complex(op1.o00, op2.o01), mult_complex(op1.o01, op2.o11)),
        add_complex(mult_complex(op1.o10, op2.o00), mult_complex(op1.o11, op2.o10)),
        add_complex(mult_complex(op1.o10, op2.o01), mult_complex(op1.o11, op2.o11)),
    );
}

function apply(op: Operator, q: Qubit): Qubit {
    return qubit(
        add_complex(mult_complex(q.a, op.o00), mult_complex(q.b, op.o01)),
        add_complex(mult_complex(q.a, op.o10), mult_complex(q.b, op.o11)),
    );
}

const X: Operator = mk_real_op(0,1,1,0);
const H: Operator = scale_op(mk_real_op(1,1,1,-1), 1/Math.sqrt(2));

