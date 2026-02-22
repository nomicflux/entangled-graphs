import type { PAdicDerivedNode, PAdicOutcomeRow, PAdicPrime, PAdicViewMode } from "../types";

const EPSILON = 1e-12;

const normalizePoints = (points: ReadonlyArray<{ x: number; y: number }>): Array<{ x: number; y: number }> => {
  if (points.length === 0) {
    return [];
  }

  const xs = points.map((point) => point.x);
  const ys = points.map((point) => point.y);
  const minX = Math.min(...xs);
  const maxX = Math.max(...xs);
  const minY = Math.min(...ys);
  const maxY = Math.max(...ys);
  const span = Math.max(maxX - minX, maxY - minY);

  if (span <= EPSILON) {
    return points.map(() => ({ x: 0, y: 0 }));
  }

  const centerX = (minX + maxX) * 0.5;
  const centerY = (minY + maxY) * 0.5;
  const scale = 2 / span;

  return points.map((point) => ({
    x: (point.x - centerX) * scale,
    y: (point.y - centerY) * scale,
  }));
};

const pointsForValuationRing = (rows: ReadonlyArray<PAdicOutcomeRow>, prime: PAdicPrime): Array<{ x: number; y: number }> => {
  const maxNorm = rows.reduce((best, row) => Math.max(best, row.norm), 0);
  const normScale = maxNorm > 0 ? maxNorm : 1;

  const points = rows.map((row, index) => {
    const residue = row.unitResidue ?? index;
    const angle = (2 * Math.PI * residue) / Math.max(2, prime);
    const radial = row.norm / normScale;
    const radius = radial <= EPSILON ? 0 : 0.08 + (0.92 * radial);
    return {
      x: radius * Math.cos(angle),
      y: radius * Math.sin(angle),
    };
  });

  return normalizePoints(points);
};

const pointsForDigitVector = (rows: ReadonlyArray<PAdicOutcomeRow>, prime: PAdicPrime): Array<{ x: number; y: number }> => {
  const points = rows.map((row) => {
    let x = 0;
    let y = 0;

    for (let index = 0; index < row.digits.digits.length; index += 1) {
      const digit = row.digits.digits[index] ?? 0;
      const radius = 1 / Math.pow(prime, index + 1);
      const angle = (2 * Math.PI * digit) / prime;
      x += radius * Math.cos(angle);
      y += radius * Math.sin(angle);
    }

    return { x, y };
  });

  return normalizePoints(points);
};

export const derivedNodesFromRows = (
  rows: ReadonlyArray<PAdicOutcomeRow>,
  prime: PAdicPrime,
  mode: PAdicViewMode,
): ReadonlyArray<PAdicDerivedNode> => {
  const points =
    mode === "valuation_ring"
      ? pointsForValuationRing(rows, prime)
      : pointsForDigitVector(rows, prime);

  return rows.map((row, index) => ({
    id: row.id,
    label: row.label,
    x: points[index]?.x ?? 0,
    y: points[index]?.y ?? 0,
    norm: row.norm,
    wNorm: row.wNorm,
    valuation: row.valuation,
    residue: row.unitResidue,
  }));
};
