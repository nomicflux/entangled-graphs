import type { Complex } from "./types";

export function from_real(real: number): Complex {
    return {real, imag: 0};
}

export function complex(real: number, imag: number): Complex {
    return { real, imag };
}

export function conjugate(c: Complex): Complex {
    return { real: c.real, imag: -c.imag };
}

export function scale(c: Complex, s: number): Complex {
    return complex(c.real * s, c.imag * s);
}

export function add(a: Complex, b: Complex): Complex {
    return complex(a.real + b.real, a.imag + b.imag);
}

export function mult(a: Complex, b: Complex): Complex {
    return complex(a.real * b.real - a.imag * b.imag, a.imag * b.real + a.real * b.imag );
}
