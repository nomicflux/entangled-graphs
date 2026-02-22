import type { Matrix2, PAdicOutcomeRow, PAdicPrime, PAdicSovm, PAdicStatisticalOperator } from "../types";
import { pAdicDigitsFromReal } from "./digits";
import { pAdicNormFromReal, pAdicValuationFromReal, unitResidueFromReal } from "./valuation";

const product2x2 = (left: Matrix2, right: Matrix2): Matrix2 => [
  [
    left[0][0] * right[0][0] + left[0][1] * right[1][0],
    left[0][0] * right[0][1] + left[0][1] * right[1][1],
  ],
  [
    left[1][0] * right[0][0] + left[1][1] * right[1][0],
    left[1][0] * right[0][1] + left[1][1] * right[1][1],
  ],
];

const trace2x2 = (rows: Matrix2): number => rows[0][0] + rows[1][1];

const tracePairing = (rho: Matrix2, effect: Matrix2): number => trace2x2(product2x2(rho, effect));

export const outcomeRowsFromPairing = (
  rho: PAdicStatisticalOperator,
  sovm: PAdicSovm,
  prime: PAdicPrime,
): ReadonlyArray<PAdicOutcomeRow> => {
  const base = sovm.effects.map((effect) => {
    const omega = tracePairing(rho.entries, effect.operator);
    const valuation = pAdicValuationFromReal(omega, prime);
    const norm = pAdicNormFromReal(omega, prime);
    const residue = unitResidueFromReal(omega, valuation, prime);
    const digits = pAdicDigitsFromReal(omega, prime);

    return {
      id: effect.id,
      label: effect.label,
      omega,
      valuation,
      norm,
      unitResidue: residue,
      digits,
      wNorm: 0,
    } satisfies PAdicOutcomeRow;
  });

  const normTotal = base.reduce((sum, row) => sum + row.norm, 0);

  return base.map((row) => ({
    ...row,
    wNorm: normTotal > 0 ? row.norm / normTotal : 0,
  }));
};

export const sortOutcomeRowsByShell = (rows: ReadonlyArray<PAdicOutcomeRow>): ReadonlyArray<PAdicOutcomeRow> =>
  [...rows].sort((left, right) => {
    const leftV = Number.isFinite(left.valuation) ? left.valuation : Number.POSITIVE_INFINITY;
    const rightV = Number.isFinite(right.valuation) ? right.valuation : Number.POSITIVE_INFINITY;
    if (leftV !== rightV) {
      return leftV - rightV;
    }

    const leftResidue = left.unitResidue ?? Number.POSITIVE_INFINITY;
    const rightResidue = right.unitResidue ?? Number.POSITIVE_INFINITY;
    if (leftResidue !== rightResidue) {
      return leftResidue - rightResidue;
    }

    return left.id.localeCompare(right.id);
  });
