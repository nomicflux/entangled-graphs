import type {
  BasisLabel,
  BasisProbability,
  BlochPair,
  BlochVector,
  CircuitColumn,
  Operator,
  Qubit,
  SingleGateRef,
  TwoQubitState,
} from "./types";
import * as complex from "./complex";

export type MeasurementSample = {
  basis: BasisProbability["basis"];
  probability: number;
};
export type SingleGateResolver = (gate: SingleGateRef) => Operator | null;

const basisLabels: BasisProbability["basis"][] = ["00", "01", "10", "11"];

export function tensor_product_qubits(q0: Qubit, q1: Qubit): TwoQubitState {
  return [
    complex.mult(q0.a, q1.a),
    complex.mult(q0.a, q1.b),
    complex.mult(q0.b, q1.a),
    complex.mult(q0.b, q1.b),
  ];
}

export function apply_single_qubit_gate(state: TwoQubitState, gate: Operator, target: 0 | 1): TwoQubitState {
  const next: TwoQubitState = [
    complex.from_real(0),
    complex.from_real(0),
    complex.from_real(0),
    complex.from_real(0),
  ];

  if (target === 0) {
    const [a00, a01, a10, a11] = state;
    next[0] = complex.add(complex.mult(gate.o00, a00), complex.mult(gate.o01, a10));
    next[2] = complex.add(complex.mult(gate.o10, a00), complex.mult(gate.o11, a10));
    next[1] = complex.add(complex.mult(gate.o00, a01), complex.mult(gate.o01, a11));
    next[3] = complex.add(complex.mult(gate.o10, a01), complex.mult(gate.o11, a11));
    return next;
  }

  const [a00, a01, a10, a11] = state;
  next[0] = complex.add(complex.mult(gate.o00, a00), complex.mult(gate.o01, a01));
  next[1] = complex.add(complex.mult(gate.o10, a00), complex.mult(gate.o11, a01));
  next[2] = complex.add(complex.mult(gate.o00, a10), complex.mult(gate.o01, a11));
  next[3] = complex.add(complex.mult(gate.o10, a10), complex.mult(gate.o11, a11));
  return next;
}

export function apply_column(state: TwoQubitState, column: CircuitColumn, resolveSingleGate: SingleGateResolver): TwoQubitState {
  if (column.kind === "cnot") {
    const [a00, a01, a10, a11] = state;
    if (column.control === 0 && column.target === 1) {
      return [a00, a01, a11, a10];
    }
    return [a00, a11, a10, a01];
  }

  let next = state;

  if (column.q0 !== null) {
    const op = resolveSingleGate(column.q0);
    if (op !== null) {
      next = apply_single_qubit_gate(next, op, 0);
    }
  }

  if (column.q1 !== null) {
    const op = resolveSingleGate(column.q1);
    if (op !== null) {
      next = apply_single_qubit_gate(next, op, 1);
    }
  }

  return next;
}

export function simulate_columns(
  prepared: TwoQubitState,
  columns: CircuitColumn[],
  resolveSingleGate: SingleGateResolver,
): TwoQubitState[] {
  const snapshots: TwoQubitState[] = [prepared];
  let current = prepared;

  for (const column of columns) {
    current = apply_column(current, column, resolveSingleGate);
    snapshots.push(current);
  }

  return snapshots;
}

export function measurement_distribution(state: TwoQubitState): BasisProbability[] {
  const raw = state.map((amp) => complex.magnitude_squared(amp));
  const total = raw.reduce((acc, value) => acc + value, 0);
  const normalized = total > 0 ? raw.map((value) => value / total) : [0, 0, 0, 0];

  return basisLabels.map((basis, index) => ({
    basis,
    probability: normalized[index],
  }));
}

export function sample_distribution(distribution: BasisProbability[], randomValue: number = Math.random()): MeasurementSample {
  let running = 0;

  for (const entry of distribution) {
    running += entry.probability;
    if (randomValue <= running) {
      return { basis: entry.basis, probability: entry.probability };
    }
  }

  const fallback = distribution[distribution.length - 1];
  return { basis: fallback.basis, probability: fallback.probability };
}

function reduced_bloch_vector(state: TwoQubitState, target: 0 | 1): BlochVector {
  const [a00, a01, a10, a11] = state;

  if (target === 0) {
    const rho00 = complex.magnitude_squared(a00) + complex.magnitude_squared(a01);
    const rho11 = complex.magnitude_squared(a10) + complex.magnitude_squared(a11);
    const rho01 = complex.add(complex.mult(a00, complex.conjugate(a10)), complex.mult(a01, complex.conjugate(a11)));
    const x = 2 * rho01.real;
    const y = -2 * rho01.imag;
    const z = rho00 - rho11;
    const certainty = Math.sqrt(x * x + y * y + z * z);
    return { x, y, z, p0: rho00, p1: rho11, certainty, uncertainty: 1 - certainty };
  }

  const rho00 = complex.magnitude_squared(a00) + complex.magnitude_squared(a10);
  const rho11 = complex.magnitude_squared(a01) + complex.magnitude_squared(a11);
  const rho01 = complex.add(complex.mult(a00, complex.conjugate(a01)), complex.mult(a10, complex.conjugate(a11)));
  const x = 2 * rho01.real;
  const y = -2 * rho01.imag;
  const z = rho00 - rho11;
  const certainty = Math.sqrt(x * x + y * y + z * z);
  return { x, y, z, p0: rho00, p1: rho11, certainty, uncertainty: 1 - certainty };
}

export function bloch_pair_from_state(state: TwoQubitState): BlochPair {
  return [reduced_bloch_vector(state, 0), reduced_bloch_vector(state, 1)];
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

  if (basis === "00") {
    return [pure(1), pure(1)];
  }
  if (basis === "01") {
    return [pure(1), pure(-1)];
  }
  if (basis === "10") {
    return [pure(-1), pure(1)];
  }
  return [pure(-1), pure(-1)];
}
