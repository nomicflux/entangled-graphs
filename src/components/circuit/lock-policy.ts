import type { QubitRow } from "../../types";

export type CircuitGridLockPolicy = {
  isCellLockedAt: (column: number, row: QubitRow) => boolean;
  lockReasonAt?: (column: number, row: QubitRow) => string | null;
};

const fallbackLockReason = (column: number, row: QubitRow): string =>
  `Locked: core gate at t${column + 1} on q${row} cannot be edited.`;

export const noLockedCellsPolicy = (): CircuitGridLockPolicy => ({
  isCellLockedAt: () => false,
  lockReasonAt: () => null,
});

export const lockedPrefixColumnsPolicy = (
  lockedColumnCount: number,
  reason: string = "Locked core gate. This column is not editable.",
): CircuitGridLockPolicy => ({
  isCellLockedAt: (column) => column >= 0 && column < lockedColumnCount,
  lockReasonAt: (column) => (column >= 0 && column < lockedColumnCount ? reason : null),
});

export const lockReasonForCell = (
  lockPolicy: CircuitGridLockPolicy,
  column: number,
  row: QubitRow,
): string | null => {
  if (!lockPolicy.isCellLockedAt(column, row)) {
    return null;
  }

  const reason = lockPolicy.lockReasonAt?.(column, row);
  if (reason && reason.trim().length > 0) {
    return reason;
  }
  return fallbackLockReason(column, row);
};
