import type { CircuitColumn, GateInstance, QubitRow } from "../types";

export const gateWires = (gate: GateInstance): QubitRow[] => {
  if (gate.kind === "single") {
    return [gate.target];
  }
  if (gate.kind === "cnot") {
    return [gate.control, gate.target];
  }
  return [gate.controlA, gate.controlB, gate.target];
};

export const gateTouchesRow = (gate: GateInstance, row: QubitRow): boolean => gateWires(gate).includes(row);

export const removeOverlaps = (column: CircuitColumn, wires: QubitRow[]): void => {
  column.gates = column.gates.filter((gate) => !gateWires(gate).some((wire) => wires.includes(wire)));
};

export const enforceDisjoint = (column: CircuitColumn): void => {
  const occupied = new Set<QubitRow>();
  const kept: GateInstance[] = [];

  for (const gate of column.gates) {
    const wires = gateWires(gate);
    if (wires.some((wire) => occupied.has(wire))) {
      continue;
    }

    wires.forEach((wire) => occupied.add(wire));
    kept.push(gate);
  }

  column.gates = kept;
};

export const mapGateAfterQubitRemoval = (gate: GateInstance, removed: number): GateInstance | null => {
  const remap = (wire: number): number | null => {
    if (wire === removed) {
      return null;
    }
    return wire > removed ? wire - 1 : wire;
  };

  if (gate.kind === "single") {
    const target = remap(gate.target);
    if (target === null) {
      return null;
    }
    return { ...gate, target };
  }

  if (gate.kind === "cnot") {
    const control = remap(gate.control);
    const target = remap(gate.target);
    if (control === null || target === null || control === target) {
      return null;
    }
    return { ...gate, control, target };
  }

  const controlA = remap(gate.controlA);
  const controlB = remap(gate.controlB);
  const target = remap(gate.target);

  if (controlA === null || controlB === null || target === null) {
    return null;
  }
  if (new Set([controlA, controlB, target]).size < 3) {
    return null;
  }

  return { ...gate, controlA, controlB, target };
};
