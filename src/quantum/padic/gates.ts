import { p_adic_basis_from_digits, p_adic_digits_from_basis, prune_p_adic_state } from "./raw-state";
import type { PAdicState } from "./types";

const zPhaseForDigit = (digit: number, p: number): number => Math.cos((2 * Math.PI * digit) / p);

const transformBasisForGate = (basis: string, gate: string, wires: ReadonlyArray<number>, p: number): { basis: string; scale: number } => {
  const digits = p_adic_digits_from_basis(basis);
  const next = [...digits];
  let scale = 1;

  if (gate === "I") {
    return { basis, scale };
  }

  if (gate === "X") {
    const wire = wires[0];
    if (wire !== undefined) {
      next[wire] = ((next[wire] ?? 0) + 1) % p;
    }
    return { basis: p_adic_basis_from_digits(next), scale };
  }

  if (gate === "Z") {
    const wire = wires[0];
    if (wire !== undefined) {
      scale = zPhaseForDigit(next[wire] ?? 0, p);
    }
    return { basis, scale };
  }

  if (gate === "CNOT") {
    const [control, target] = wires;
    if (control !== undefined && target !== undefined) {
      next[target] = ((next[target] ?? 0) + (next[control] ?? 0)) % p;
    }
    return { basis: p_adic_basis_from_digits(next), scale };
  }

  if (gate === "SWAP") {
    const [left, right] = wires;
    if (left !== undefined && right !== undefined) {
      const hold = next[left] ?? 0;
      next[left] = next[right] ?? 0;
      next[right] = hold;
    }
    return { basis: p_adic_basis_from_digits(next), scale };
  }

  if (gate === "TOFFOLI") {
    const [controlA, controlB, target] = wires;
    if (
      controlA !== undefined &&
      controlB !== undefined &&
      target !== undefined &&
      (next[controlA] ?? 0) !== 0 &&
      (next[controlB] ?? 0) !== 0
    ) {
      next[target] = ((next[target] ?? 0) + 1) % p;
    }
    return { basis: p_adic_basis_from_digits(next), scale };
  }

  if (gate === "CSWAP") {
    const [control, left, right] = wires;
    if (control !== undefined && left !== undefined && right !== undefined && (next[control] ?? 0) !== 0) {
      const hold = next[left] ?? 0;
      next[left] = next[right] ?? 0;
      next[right] = hold;
    }
    return { basis: p_adic_basis_from_digits(next), scale };
  }

  return { basis, scale };
};

export const apply_padic_gate_to_state = (state: PAdicState, gate: string, wires: ReadonlyArray<number>, p: number): PAdicState => {
  const next: PAdicState = new Map();

  for (const [basis, amplitude] of state.entries()) {
    const transformed = transformBasisForGate(basis, gate, wires, p);
    const prior = next.get(transformed.basis) ?? 0;
    next.set(transformed.basis, prior + (amplitude * transformed.scale));
  }

  return prune_p_adic_state(next);
};
