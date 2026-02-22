import type { PAdicDigitExpansion } from "../types";
import { isZeroPAdicScalar, pAdicScalarFromFraction, type PAdicScalar } from "./scalar";

const absBigInt = (value: bigint): bigint => (value < 0n ? -value : value);

const powBigInt = (base: bigint, exponent: number): bigint => {
  let result = 1n;
  for (let index = 0; index < exponent; index += 1) {
    result *= base;
  }
  return result;
};

const modBigInt = (value: bigint, modulus: bigint): bigint => {
  const residue = value % modulus;
  return residue >= 0n ? residue : residue + modulus;
};

const extendedGcd = (left: bigint, right: bigint): { gcd: bigint; x: bigint; y: bigint } => {
  if (right === 0n) {
    return {
      gcd: absBigInt(left),
      x: left < 0n ? -1n : 1n,
      y: 0n,
    };
  }

  const next = extendedGcd(right, left % right);
  return {
    gcd: next.gcd,
    x: next.y,
    y: next.x - (left / right) * next.y,
  };
};

const modInverse = (value: bigint, modulus: bigint): bigint | null => {
  const normalized = modBigInt(value, modulus);
  const egcd = extendedGcd(normalized, modulus);
  if (egcd.gcd !== 1n) {
    return null;
  }

  return modBigInt(egcd.x, modulus);
};

const vpInteger = (value: bigint, prime: number): number => {
  const p = BigInt(prime);
  let remaining = absBigInt(value);
  let valuation = 0;
  while (remaining !== 0n && remaining % p === 0n) {
    remaining /= p;
    valuation += 1;
  }
  return valuation;
};

const divideByPrimePower = (value: bigint, prime: number, power: number): bigint => {
  if (power <= 0) {
    return value;
  }

  const p = BigInt(prime);
  let result = value;
  for (let index = 0; index < power; index += 1) {
    result /= p;
  }
  return result;
};

const textForDigits = (sign: 1 | -1, digits: number[], truncated: boolean): string => {
  const signPrefix = sign < 0 ? "-" : "";
  const suffix = truncated ? " ..." : "";
  return `${signPrefix}${digits.join(" ")}${suffix}`;
};

export const pAdicDigitsFromScalar = (
  value: PAdicScalar,
  prime: number,
  maxDigits: number = 10,
): PAdicDigitExpansion => {
  if (isZeroPAdicScalar(value)) {
    return {
      sign: 1,
      digits: [0],
      truncated: false,
      text: "0",
    };
  }

  const sign: 1 | -1 = value.numerator < 0n ? -1 : 1;
  const p = BigInt(prime);
  const numeratorVp = vpInteger(value.numerator, prime);
  const denominatorVp = vpInteger(value.denominator, prime);
  const unitNumerator = divideByPrimePower(value.numerator, prime, numeratorVp);
  const unitDenominator = divideByPrimePower(value.denominator, prime, denominatorVp);

  const digits: number[] = [];

  if (unitDenominator === 1n && unitNumerator >= 0n) {
    let remaining = unitNumerator;
    while (remaining > 0n && digits.length < maxDigits) {
      digits.push(Number(remaining % p));
      remaining /= p;
    }

    if (digits.length === 0) {
      digits.push(0);
    }

    const truncated = remaining > 0n;
    return {
      sign,
      digits,
      truncated,
      text: textForDigits(sign, digits, truncated),
    };
  }

  const modulus = powBigInt(p, maxDigits);
  const inverse = modInverse(unitDenominator, modulus);
  if (inverse === null) {
    return {
      sign,
      digits: [0],
      truncated: true,
      text: textForDigits(sign, [0], true),
    };
  }

  let residue = modBigInt(modBigInt(unitNumerator, modulus) * inverse, modulus);
  for (let index = 0; index < maxDigits; index += 1) {
    digits.push(Number(residue % p));
    residue /= p;
  }

  const truncated = true;

  return {
    sign,
    digits,
    truncated,
    text: textForDigits(sign, digits, truncated),
  };
};

export const pAdicDigitsFromReal = (value: number, prime: number, maxDigits: number = 10): PAdicDigitExpansion =>
  pAdicDigitsFromScalar(pAdicScalarFromFraction(BigInt(Math.round(value * 1_000_000)), 1_000_000n), prime, maxDigits);
