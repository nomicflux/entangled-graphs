import type { BasisProbability, BlochParams, Qubit } from "../types";
import * as complex from "../complex";
import { basisLabels } from "../basis";

export const zeroBloch: BlochParams = { theta: 0, phi: 0 };

export const qubitFromBloch = (params: BlochParams): Qubit => {
  const halfTheta = params.theta / 2;
  const magnitude = Math.sin(halfTheta);

  return {
    a: complex.complex(Math.cos(halfTheta), 0),
    b: complex.complex(Math.cos(params.phi) * magnitude, Math.sin(params.phi) * magnitude),
  };
};

export const zeroQubit = (): Qubit => ({
  a: complex.complex(1, 0),
  b: complex.complex(0, 0),
});

export const preparedDistributionForQubits = (qubits: Qubit[]): BasisProbability[] => {
  const labels = basisLabels(qubits.length);

  return labels.map((basis) => {
    let probability = 1;

    for (let bitIndex = 0; bitIndex < basis.length; bitIndex += 1) {
      const qubit = qubits[bitIndex] ?? zeroQubit();
      const bit = basis[bitIndex];
      const p0 = complex.magnitude_squared(qubit.a);
      const p1 = complex.magnitude_squared(qubit.b);
      probability *= bit === "0" ? p0 : p1;
    }

    return { basis, probability };
  });
};
