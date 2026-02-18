import type {
  BasisLabel,
  BasisProbability,
  BlochPair,
  BlochVector,
  CircuitColumn,
  GateId,
  Operator,
  QubitState,
  Qubit,
} from "./types";
import * as complex from "./complex";
import { basisLabels } from "./basis";

type MeasurementSample = {
  basis: BasisProbability["basis"];
  probability: number;
};
type GateResolver = (gate: GateId) => Operator | null;
const isSingleQubitOperator = (operator: Operator): operator is Operator<1> => operator.qubitArity === 1;

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

function apply_single_qubit_gate(state: QubitState, gate: Operator<1>, target: number, qubitCount: number): QubitState {
  const targetMask = 1 << (qubitCount - 1 - target);
  const [[o00, o01], [o10, o11]] = gate.matrix;
  const next = [...state];

  for (let index = 0; index < state.length; index += 1) {
    if ((index & targetMask) !== 0) {
      continue;
    }

    const zeroIndex = index;
    const oneIndex = index | targetMask;
    const a0 = state[zeroIndex]!;
    const a1 = state[oneIndex]!;
    next[zeroIndex] = complex.add(complex.mult(o00!, a0), complex.mult(o01!, a1));
    next[oneIndex] = complex.add(complex.mult(o10!, a0), complex.mult(o11!, a1));
  }

  return next;
}

function apply_operator_on_wires(
  state: QubitState,
  operator: Operator,
  wires: ReadonlyArray<number>,
  qubitCount: number,
): QubitState {
  const order = 1 << operator.qubitArity;
  const masks = wires.map((wire) => 1 << (qubitCount - 1 - wire));
  const combinedMask = masks.reduce((acc, mask) => acc | mask, 0);
  const next = [...state];

  for (let base = 0; base < state.length; base += 1) {
    if ((base & combinedMask) !== 0) {
      continue;
    }

    const input = Array.from({ length: order }, (_, columnPattern) => {
      let index = base;
      for (let bit = 0; bit < masks.length; bit += 1) {
        if (((columnPattern >> (masks.length - 1 - bit)) & 1) === 1) {
          index |= masks[bit]!;
        }
      }
      return state[index]!;
    });

    for (let rowPattern = 0; rowPattern < order; rowPattern += 1) {
      let out = complex.from_real(0);
      for (let columnPattern = 0; columnPattern < order; columnPattern += 1) {
        out = complex.add(out, complex.mult(operator.matrix[rowPattern]![columnPattern]!, input[columnPattern]!));
      }

      let outputIndex = base;
      for (let bit = 0; bit < masks.length; bit += 1) {
        if (((rowPattern >> (masks.length - 1 - bit)) & 1) === 1) {
          outputIndex |= masks[bit]!;
        }
      }
      next[outputIndex] = out;
    }
  }

  return next;
}

function apply_column(state: QubitState, column: CircuitColumn, resolveGate: GateResolver, qubitCount: number): QubitState {
  let next = state;

  for (const gate of column.gates) {
    const operator = resolveGate(gate.gate);
    if (operator === null) {
      continue;
    }

    if (isSingleQubitOperator(operator)) {
      next = apply_single_qubit_gate(next, operator, gate.wires[0]!, qubitCount);
      continue;
    }

    next = apply_operator_on_wires(next, operator, gate.wires, qubitCount);
  }

  return next;
}

export function simulate_columns(
  prepared: QubitState,
  columns: CircuitColumn[],
  resolveGate: GateResolver,
  qubitCount: number,
): QubitState[] {
  const snapshots: QubitState[] = [prepared];
  let current = prepared;

  for (const column of columns) {
    current = apply_column(current, column, resolveGate, qubitCount);
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
