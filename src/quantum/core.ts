import type { Operator, Qubit, QubitState } from "../types";
import * as complex from "../complex";

export const isSingleQubitOperator = (operator: Operator): operator is Operator<1> => operator.qubitArity === 1;

export const qubitCountFromState = (state: QubitState): number => Math.log2(state.length);

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

export function apply_single_qubit_gate(state: QubitState, gate: Operator<1>, target: number, qubitCount: number): QubitState {
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

export function apply_operator_on_wires(
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
