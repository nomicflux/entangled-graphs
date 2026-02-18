import type { CircuitColumn, GateInstance, QubitRow } from "../types";

export const gateWires = (gate: GateInstance): QubitRow[] => [...gate.wires];

export const gateTouchesRow = (gate: GateInstance, row: QubitRow): boolean => gateWires(gate).includes(row);

export const removeOverlaps = (column: CircuitColumn, wires: ReadonlyArray<QubitRow>): void => {
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

  const mapped: number[] = [];
  for (const wire of gate.wires) {
    const value = remap(wire);
    if (value === null) {
      return null;
    }
    mapped.push(value);
  }

  return { ...gate, wires: mapped };
};
