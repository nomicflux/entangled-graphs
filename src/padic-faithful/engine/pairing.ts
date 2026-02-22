import type { Matrix2, PAdicOutcomeRow, PAdicPrime, PAdicSovm, PAdicStatisticalOperator } from "../types";
import { pAdicDigitsFromScalar } from "./digits";
import {
  isZeroPAdicScalar,
  pAdicNormExponentOfScalar,
  pAdicScalarToNumber,
  pAdicUnitResidueOfScalar,
  pAdicValuationOfScalar,
  type PAdicScalar,
} from "./scalar";
import { matrixMultiply, matrixTrace } from "./matrix";

const tracePairing = (rho: Matrix2, effect: Matrix2): PAdicScalar =>
  matrixTrace(matrixMultiply(rho, effect));

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

const DIGIT_PREFIX_WIDTH = 3;

const digitPrefixKey = (row: PAdicOutcomeRow): string => {
  const signPrefix = row.digits.sign < 0 ? "-" : "+";
  const prefix = row.digits.digits.slice(0, DIGIT_PREFIX_WIDTH).join(",");
  return `${signPrefix}:${prefix}`;
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
    const digits = pAdicDigitsFromScalar(omegaScalar, prime);

    return {
      id: effect.id,
      label: effect.label,
      basis: effect.id,
      w_raw: omega,
      v_p: valuation,
      abs_p: norm,
      unitResidue: residue,
      digits,
      w_norm: 0,
    } satisfies PAdicOutcomeRow;
  });

  const normTotal = base.reduce((sum, row) => sum + row.abs_p, 0);

  return base.map((row) => ({
    ...row,
    w_norm: normTotal > 0 ? row.abs_p / normTotal : 0,
  }));
};

export const sortOutcomeRowsByShell = (rows: ReadonlyArray<PAdicOutcomeRow>): ReadonlyArray<PAdicOutcomeRow> =>
  [...rows].sort((left, right) => {
    const leftV = Number.isFinite(left.v_p) ? left.v_p : Number.POSITIVE_INFINITY;
    const rightV = Number.isFinite(right.v_p) ? right.v_p : Number.POSITIVE_INFINITY;
    if (leftV !== rightV) {
      return leftV - rightV;
    }

    const leftPrefix = digitPrefixKey(left);
    const rightPrefix = digitPrefixKey(right);
    if (leftPrefix !== rightPrefix) {
      return leftPrefix.localeCompare(rightPrefix);
    }

    const leftResidue = left.unitResidue ?? Number.POSITIVE_INFINITY;
    const rightResidue = right.unitResidue ?? Number.POSITIVE_INFINITY;
    if (leftResidue !== rightResidue) {
      return leftResidue - rightResidue;
    }

    return left.id.localeCompare(right.id);
  });
