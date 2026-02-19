import type { CircuitColumn, QubitRow } from "../types";

const isMeasurementGate = (gateId: string): boolean => gateId === "M";

export const firstMeasurementColumnByRow = (columns: ReadonlyArray<CircuitColumn>): Map<QubitRow, number> => {
  const byRow = new Map<QubitRow, number>();

  for (let columnIndex = 0; columnIndex < columns.length; columnIndex += 1) {
    const column = columns[columnIndex]!;
    for (const gate of column.gates) {
      if (!isMeasurementGate(gate.gate)) {
        continue;
      }
      const row = gate.wires[0];
      if (row === undefined || byRow.has(row)) {
        continue;
      }
      byRow.set(row, columnIndex);
    }
  }

  return byRow;
};

export const firstMeasurementColumnForRow = (
  columns: ReadonlyArray<CircuitColumn>,
  row: QubitRow,
): number | null => {
  const column = firstMeasurementColumnByRow(columns).get(row);
  return column === undefined ? null : column;
};

export const isRowLockedAtColumn = (
  columns: ReadonlyArray<CircuitColumn>,
  row: QubitRow,
  column: number,
): boolean => {
  const firstMeasurementColumn = firstMeasurementColumnForRow(columns, row);
  if (firstMeasurementColumn === null) {
    return false;
  }
  return column > firstMeasurementColumn;
};
