"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.from_real = from_real;
exports.complex = complex;
exports.conjugate = conjugate;
exports.scale = scale;
exports.add = add;
exports.mult = mult;
function from_real(real) {
    return { real, imag: 0 };
}
function complex(real, imag) {
    return { real, imag };
}
function conjugate(c) {
    return { real: c.real, imag: -c.imag };
}
function scale(c, s) {
    return complex(c.real * s, c.imag * s);
}
function add(a, b) {
    return complex(a.real + b.real, a.imag + b.imag);
}
function mult(a, b) {
    return complex(a.real * b.real - a.imag * b.imag, a.imag * b.real + a.real * b.imag);
}
