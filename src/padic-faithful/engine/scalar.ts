export type PAdicScalar = {
  numerator: bigint;
  denominator: bigint;
};

const absBigInt = (value: bigint): bigint => (value < 0n ? -value : value);

const gcdBigInt = (left: bigint, right: bigint): bigint => {
  let a = absBigInt(left);
  let b = absBigInt(right);
  while (b !== 0n) {
    const next = a % b;
    a = b;
    b = next;
  }
  return a;
};

const normalizeScalar = (numerator: bigint, denominator: bigint): PAdicScalar => {
  if (denominator === 0n) {
    throw new Error("P-adic scalar denominator cannot be zero.");
  }

  if (numerator === 0n) {
    return {
      numerator: 0n,
      denominator: 1n,
    };
  }

  let nextNumerator = numerator;
  let nextDenominator = denominator;
  if (nextDenominator < 0n) {
    nextNumerator = -nextNumerator;
    nextDenominator = -nextDenominator;
  }

  const gcd = gcdBigInt(nextNumerator, nextDenominator);
  return {
    numerator: nextNumerator / gcd,
    denominator: nextDenominator / gcd,
  };
};

const integerToBigInt = (value: number | bigint, label: string): bigint => {
  if (typeof value === "bigint") {
    return value;
  }

  if (!Number.isInteger(value)) {
    throw new Error(`${label} must be an integer when provided as number.`);
  }

  return BigInt(value);
};

const modBigInt = (value: bigint, modulus: bigint): bigint => {
  const residue = value % modulus;
  return residue >= 0n ? residue : residue + modulus;
};

const extendedGcd = (left: bigint, right: bigint): { gcd: bigint; x: bigint; y: bigint } => {
  if (right === 0n) {
    return { gcd: absBigInt(left), x: left < 0n ? -1n : 1n, y: 0n };
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

export const pAdicScalarFromFraction = (numerator: number | bigint, denominator: number | bigint = 1): PAdicScalar =>
  normalizeScalar(integerToBigInt(numerator, "numerator"), integerToBigInt(denominator, "denominator"));

export const addPAdicScalars = (left: PAdicScalar, right: PAdicScalar): PAdicScalar =>
  normalizeScalar(
    (left.numerator * right.denominator) + (right.numerator * left.denominator),
    left.denominator * right.denominator,
  );

export const subtractPAdicScalars = (left: PAdicScalar, right: PAdicScalar): PAdicScalar =>
  normalizeScalar(
    (left.numerator * right.denominator) - (right.numerator * left.denominator),
    left.denominator * right.denominator,
  );

export const multiplyPAdicScalars = (left: PAdicScalar, right: PAdicScalar): PAdicScalar =>
  normalizeScalar(left.numerator * right.numerator, left.denominator * right.denominator);

export const dividePAdicScalars = (left: PAdicScalar, right: PAdicScalar): PAdicScalar => {
  if (right.numerator === 0n) {
    throw new Error("Cannot divide by zero p-adic scalar.");
  }

  return normalizeScalar(left.numerator * right.denominator, left.denominator * right.numerator);
};

export const equalPAdicScalars = (left: PAdicScalar, right: PAdicScalar): boolean =>
  left.numerator === right.numerator && left.denominator === right.denominator;

export const isZeroPAdicScalar = (value: PAdicScalar): boolean => value.numerator === 0n;

export const pAdicScalarToString = (value: PAdicScalar): string =>
  value.denominator === 1n ? value.numerator.toString() : `${value.numerator.toString()}/${value.denominator.toString()}`;

export const pAdicScalarToNumber = (value: PAdicScalar): number =>
  Number(value.numerator) / Number(value.denominator);

export const pAdicValuationOfScalar = (value: PAdicScalar, prime: number): number => {
  if (isZeroPAdicScalar(value)) {
    return Number.POSITIVE_INFINITY;
  }

  return vpInteger(value.numerator, prime) - vpInteger(value.denominator, prime);
};

export const pAdicNormExponentOfScalar = (value: PAdicScalar, prime: number): number => {
  if (isZeroPAdicScalar(value)) {
    return Number.POSITIVE_INFINITY;
  }

  return -pAdicValuationOfScalar(value, prime);
};

export const pAdicUnitResidueOfScalar = (value: PAdicScalar, prime: number): number | null => {
  if (isZeroPAdicScalar(value)) {
    return null;
  }

  const valuation = pAdicValuationOfScalar(value, prime);
  const p = BigInt(prime);
  const numerator =
    valuation >= 0
      ? divideByPrimePower(value.numerator, prime, valuation)
      : value.numerator;
  const denominator =
    valuation >= 0
      ? value.denominator
      : divideByPrimePower(value.denominator, prime, -valuation);

  const denominatorMod = modBigInt(denominator, p);
  const inverse = modInverse(denominatorMod, p);
  if (inverse === null) {
    return null;
  }

  return Number(modBigInt(modBigInt(numerator, p) * inverse, p));
};
