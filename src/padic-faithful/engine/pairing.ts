import type { Matrix2, PAdicOutcomeRow, PAdicPrime, PAdicSovm, PAdicStatisticalOperator } from "../types";
import { pAdicDigitsFromReal } from "./digits";
import {
  addPAdicScalars,
  isZeroPAdicScalar,
  multiplyPAdicScalars,
  pAdicNormExponentOfScalar,
  pAdicScalarToNumber,
  pAdicUnitResidueOfScalar,
  pAdicValuationOfScalar,
  type PAdicScalar,
} from "./scalar";

const product2x2 = (left: Matrix2, right: Matrix2): Matrix2 => [
  [
    addPAdicScalars(
      multiplyPAdicScalars(left[0][0], right[0][0]),
      multiplyPAdicScalars(left[0][1], right[1][0]),
    ),
    addPAdicScalars(
      multiplyPAdicScalars(left[0][0], right[0][1]),
      multiplyPAdicScalars(left[0][1], right[1][1]),
    ),
  ],
  [
    addPAdicScalars(
      multiplyPAdicScalars(left[1][0], right[0][0]),
      multiplyPAdicScalars(left[1][1], right[1][0]),
    ),
    addPAdicScalars(
      multiplyPAdicScalars(left[1][0], right[0][1]),
      multiplyPAdicScalars(left[1][1], right[1][1]),
    ),
  ],
];

const trace2x2 = (rows: Matrix2): PAdicScalar => addPAdicScalars(rows[0][0], rows[1][1]);

const tracePairing = (rho: Matrix2, effect: Matrix2): PAdicScalar => trace2x2(product2x2(rho, effect));

const pAdicNormFromScalar = (value: PAdicScalar, prime: number): number => {
  if (isZeroPAdicScalar(value)) {
    return 0;
  }

  const exponent = pAdicNormExponentOfScalar(value, prime);
  if (!Number.isFinite(exponent)) {
    return 0;
  }

  return Math.pow(prime, exponent);
};

export const outcomeRowsFromPairing = (
  rho: PAdicStatisticalOperator,
  sovm: PAdicSovm,
  prime: PAdicPrime,
): ReadonlyArray<PAdicOutcomeRow> => {
  const base = sovm.effects.map((effect) => {
    const omegaScalar = tracePairing(rho.entries, effect.operator);
    const omega = pAdicScalarToNumber(omegaScalar);
    const valuation = pAdicValuationOfScalar(omegaScalar, prime);
    const norm = pAdicNormFromScalar(omegaScalar, prime);
    const residue = pAdicUnitResidueOfScalar(omegaScalar, prime);
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
