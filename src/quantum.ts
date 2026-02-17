import type { BasisProbability, CircuitColumn, GateId, Operator, Qubit, TwoQubitState } from "./types";
import * as complex from "./complex";
import { H, I, S, X } from "./operator";

export type MeasurementSample = {
  basis: BasisProbability["basis"];
  probability: number;
};

const gateMap: Record<GateId, Operator> = {
  I,
  X,
  H,
  S,
};

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

export function apply_column(state: TwoQubitState, column: CircuitColumn): TwoQubitState {
  let next = state;

  if (column[0] !== null) {
    next = apply_single_qubit_gate(next, gateMap[column[0]], 0);
  }

  if (column[1] !== null) {
    next = apply_single_qubit_gate(next, gateMap[column[1]], 1);
  }

  return next;
}

export function simulate_columns(prepared: TwoQubitState, columns: CircuitColumn[]): TwoQubitState[] {
  const snapshots: TwoQubitState[] = [prepared];
  let current = prepared;

  for (const column of columns) {
    current = apply_column(current, column);
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
