import type { GateInstance } from "../types";
import { enforceDisjoint } from "./gate-instance-utils";

export const enforceMeasurementLockRulesForColumns = (columns: Array<{ gates: GateInstance[] }>): void => {
  const firstMeasurementByRow = new Map<number, number>();

  for (let columnIndex = 0; columnIndex < columns.length; columnIndex += 1) {
    const column = columns[columnIndex]!;
    column.gates = column.gates.filter((gate) => {
      if (gate.wires.some((wire) => {
        const measuredAt = firstMeasurementByRow.get(wire);
        return measuredAt !== undefined && columnIndex > measuredAt;
      })) {
        return false;
      }

      if (gate.gate === "M") {
        const row = gate.wires[0];
        if (row === undefined || firstMeasurementByRow.has(row)) {
          return false;
        }
        firstMeasurementByRow.set(row, columnIndex);
      }

      return true;
    });

    enforceDisjoint(column);
  }
};
