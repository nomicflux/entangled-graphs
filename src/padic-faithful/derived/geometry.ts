import type { PAdicDerivedNode, PAdicOperatorEntryRow, PAdicPrime, PAdicViewMode } from "../types";

const absScaleFromNorm = (value: number): number => {
  if (!Number.isFinite(value) || value <= 0) {
    return 0;
  }
  return value / (1 + value);
};

const digitsForIndex = (index: number, prime: PAdicPrime, depth: number): number[] => {
  const out: number[] = [];
  let remaining = Math.max(0, Math.trunc(index));
  for (let i = 0; i < depth; i += 1) {
    out.push(remaining % prime);
    remaining = Math.floor(remaining / prime);
  }
  return out;
};

const pointsForValuationRing = (
  entries: ReadonlyArray<PAdicOperatorEntryRow>,
  prime: PAdicPrime,
): Array<{ x: number; y: number }> => {
  const residueSlots = Math.max(2, prime);
  const dimension = Math.max(1, Math.round(Math.sqrt(entries.length)));
  return entries.map((entry) => {
    const linearIndex = (entry.row * dimension) + entry.column;
    const residueSeed = entry.unitResidue ?? (linearIndex % residueSlots);
    const residue = ((residueSeed % residueSlots) + residueSlots) % residueSlots;
    const angle = ((2 * Math.PI * residue) / residueSlots) - (Math.PI / 2);
    const radius = Number.isFinite(entry.v_p) && entry.abs_p > 0
      ? 0.12 + (0.82 * absScaleFromNorm(entry.abs_p))
      : 0.045;
    return {
      x: radius * Math.cos(angle),
      y: radius * Math.sin(angle),
    };
  });
};

const pointsForDigitVector = (
  entries: ReadonlyArray<PAdicOperatorEntryRow>,
  prime: PAdicPrime,
): Array<{ x: number; y: number }> => {
  const dimension = Math.max(1, Math.round(Math.sqrt(entries.length)));
  const descriptorDepth = Math.max(1, Math.ceil(Math.log(dimension) / Math.log(prime)));

  return entries.map((entry) => {
    const rowDigits = digitsForIndex(entry.row, prime, descriptorDepth);
    const columnDigits = digitsForIndex(entry.column, prime, descriptorDepth);
    const descriptorDigits: number[] = [];
    for (let i = 0; i < descriptorDepth; i += 1) {
      descriptorDigits.push(rowDigits[i] ?? 0);
      descriptorDigits.push(columnDigits[i] ?? 0);
    }
    const allDigits = [...descriptorDigits, ...entry.digits.digits];

    let x = 0;
    let y = 0;
    for (let index = 0; index < allDigits.length; index += 1) {
      const digit = allDigits[index] ?? 0;
      const radius = 1 / Math.pow(prime, index + 1);
      const signOffset = entry.digits.sign < 0 ? Math.PI / prime : 0;
      const angle = ((2 * Math.PI * digit) / prime) + signOffset - (Math.PI / 2);
      x += radius * Math.cos(angle);
      y += radius * Math.sin(angle);
    }

    return {
      x,
      y,
    };
  });
};

export const derivedNodesFromEntries = (
  entries: ReadonlyArray<PAdicOperatorEntryRow>,
  prime: PAdicPrime,
  mode: PAdicViewMode,
): ReadonlyArray<PAdicDerivedNode> => {
  const points =
    mode === "valuation_ring"
      ? pointsForValuationRing(entries, prime)
      : pointsForDigitVector(entries, prime);

  return entries.map((entry, index) => ({
    id: entry.id,
    label: entry.label,
    x: points[index]?.x ?? 0,
    y: points[index]?.y ?? 0,
    abs_p: entry.abs_p,
    w_norm: entry.w_norm,
    v_p: entry.v_p,
    residue: entry.unitResidue,
  }));
};
