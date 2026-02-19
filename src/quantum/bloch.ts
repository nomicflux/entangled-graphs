import type { BasisLabel, BlochPair, BlochVector, QubitState } from "../types";
import * as complex from "../complex";
import { qubitCountFromState } from "./core";

const reduced_bloch_vector = (state: QubitState, target: number, qubitCount: number): BlochVector => {
  const targetMask = 1 << (qubitCount - 1 - target);
  let rho00 = 0;
  let rho11 = 0;
  let rho01 = complex.from_real(0);

  for (let index = 0; index < state.length; index += 1) {
    const amplitude = state[index]!;
    const probability = complex.magnitude_squared(amplitude);

    if ((index & targetMask) === 0) {
      rho00 += probability;
      const pairIndex = index | targetMask;
      const pairAmplitude = state[pairIndex]!;
      rho01 = complex.add(rho01, complex.mult(amplitude, complex.conjugate(pairAmplitude)));
    } else {
      rho11 += probability;
    }
  }

  const x = 2 * rho01.real;
  const y = -2 * rho01.imag;
  const z = rho00 - rho11;
  const certainty = Math.sqrt(x * x + y * y + z * z);
  return { x, y, z, p0: rho00, p1: rho11, certainty, uncertainty: 1 - certainty };
};

export function bloch_pair_from_state(state: QubitState): BlochPair {
  const qubitCount = qubitCountFromState(state);
  const vectors: BlochPair = [];

  for (let target = 0; target < qubitCount; target += 1) {
    vectors.push(reduced_bloch_vector(state, target, qubitCount));
  }

  return vectors;
}

export function basis_to_bloch_pair(basis: BasisLabel): BlochPair {
  const pure = (z: number): BlochVector => ({
    x: 0,
    y: 0,
    z,
    p0: z === 1 ? 1 : 0,
    p1: z === -1 ? 1 : 0,
    certainty: 1,
    uncertainty: 0,
  });

  return basis.split("").map((bit) => pure(bit === "0" ? 1 : -1));
}
