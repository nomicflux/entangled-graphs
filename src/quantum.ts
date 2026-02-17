import type {
  BasisLabel,
  BasisProbability,
  BlochPair,
  BlochVector,
  CircuitColumn,
  Operator,
  QubitState,
  Qubit,
  SingleGateRef,
} from "./types";
import * as complex from "./complex";
import { basisLabels } from "./basis";

export type MeasurementSample = {
  basis: BasisProbability["basis"];
  probability: number;
};
export type SingleGateResolver = (gate: SingleGateRef) => Operator | null;

const qubitCountFromState = (state: QubitState): number => Math.log2(state.length);

export function tensor_product_qubits(qubits: Qubit[]): QubitState {
  let state: QubitState = [complex.from_real(1)];

  for (const qubit of qubits) {
    const next: QubitState = [];

    for (const amplitude of state) {
      next.push(complex.mult(amplitude, qubit.a));
      next.push(complex.mult(amplitude, qubit.b));
    }

    state = next;
  }

  return state;
}

export function apply_single_qubit_gate(state: QubitState, gate: Operator, target: number, qubitCount: number): QubitState {
  const targetMask = 1 << (qubitCount - 1 - target);
  const next = [...state];

  for (let index = 0; index < state.length; index += 1) {
    if ((index & targetMask) !== 0) {
      continue;
    }

    const zeroIndex = index;
    const oneIndex = index | targetMask;
    const a0 = state[zeroIndex]!;
    const a1 = state[oneIndex]!;
    next[zeroIndex] = complex.add(complex.mult(gate.o00, a0), complex.mult(gate.o01, a1));
    next[oneIndex] = complex.add(complex.mult(gate.o10, a0), complex.mult(gate.o11, a1));
  }

  return next;
}

function apply_controlled_x(state: QubitState, control: number, target: number, qubitCount: number): QubitState {
  if (control === target) {
    return state;
  }

  const controlBit = qubitCount - 1 - control;
  const targetBit = qubitCount - 1 - target;
  const controlMask = 1 << controlBit;
  const targetMask = 1 << targetBit;
  const next: QubitState = Array.from({ length: state.length }, () => complex.from_real(0));

  for (let index = 0; index < state.length; index += 1) {
    const mapped = (index & controlMask) !== 0 ? index ^ targetMask : index;
    next[mapped] = state[index]!;
  }

  return next;
}

function apply_toffoli_x(
  state: QubitState,
  controlA: number,
  controlB: number,
  target: number,
  qubitCount: number,
): QubitState {
  if (controlA === controlB || controlA === target || controlB === target) {
    return state;
  }

  const controlMaskA = 1 << (qubitCount - 1 - controlA);
  const controlMaskB = 1 << (qubitCount - 1 - controlB);
  const targetMask = 1 << (qubitCount - 1 - target);
  const next: QubitState = Array.from({ length: state.length }, () => complex.from_real(0));

  for (let index = 0; index < state.length; index += 1) {
    const controlsActive = (index & controlMaskA) !== 0 && (index & controlMaskB) !== 0;
    const mapped = controlsActive ? index ^ targetMask : index;
    next[mapped] = state[index]!;
  }

  return next;
}

export function apply_column(
  state: QubitState,
  column: CircuitColumn,
  resolveSingleGate: SingleGateResolver,
  qubitCount: number,
): QubitState {
  let next = state;

  for (const gate of column.gates) {
    if (gate.kind === "single") {
      if (gate.target < 0 || gate.target >= qubitCount) {
        continue;
      }
      const op = resolveSingleGate(gate.gate);
      if (op !== null) {
        next = apply_single_qubit_gate(next, op, gate.target, qubitCount);
      }
      continue;
    }

    if (gate.kind === "cnot") {
      if (
        gate.control < 0 ||
        gate.control >= qubitCount ||
        gate.target < 0 ||
        gate.target >= qubitCount
      ) {
        continue;
      }
      next = apply_controlled_x(next, gate.control, gate.target, qubitCount);
      continue;
    }

    if (
      gate.controlA < 0 ||
      gate.controlA >= qubitCount ||
      gate.controlB < 0 ||
      gate.controlB >= qubitCount ||
      gate.target < 0 ||
      gate.target >= qubitCount
    ) {
      continue;
    }

    next = apply_toffoli_x(next, gate.controlA, gate.controlB, gate.target, qubitCount);
  }

  return next;
}

export function simulate_columns(
  prepared: QubitState,
  columns: CircuitColumn[],
  resolveSingleGate: SingleGateResolver,
  qubitCount: number,
): QubitState[] {
  const snapshots: QubitState[] = [prepared];
  let current = prepared;

  for (const column of columns) {
    current = apply_column(current, column, resolveSingleGate, qubitCount);
    snapshots.push(current);
  }

  return snapshots;
}

export function measurement_distribution(state: QubitState): BasisProbability[] {
  const raw = state.map((amp) => complex.magnitude_squared(amp));
  const total = raw.reduce((acc, value) => acc + value, 0);
  const normalized = total > 0 ? raw.map((value) => value / total) : raw.map(() => 0);
  const labels = basisLabels(qubitCountFromState(state));

  return labels.map((basis, index) => ({
    basis,
    probability: normalized[index]!,
  }));
}

export function sample_distribution(distribution: BasisProbability[], randomValue: number = Math.random()): MeasurementSample {
  const total = distribution.reduce((acc, entry) => acc + entry.probability, 0);
  if (total <= 0) {
    const fallback = distribution[distribution.length - 1]!;
    return { basis: fallback.basis, probability: 0 };
  }

  const threshold = randomValue * total;
  let running = 0;

  for (const entry of distribution) {
    running += entry.probability;
    if (threshold <= running) {
      return { basis: entry.basis, probability: entry.probability };
    }
  }

  const fallback = distribution[distribution.length - 1]!;
  return { basis: fallback.basis, probability: fallback.probability };
}

function reduced_bloch_vector(state: QubitState, target: number, qubitCount: number): BlochVector {
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
}

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
